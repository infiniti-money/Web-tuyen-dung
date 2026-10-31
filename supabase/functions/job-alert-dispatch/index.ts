// Scheduled server-only dispatcher; never exposes credentials or sends without opt-in.
// Secrets needed: ALERT_JOB_SECRET (>=32 chars), RESEND_API_KEY, ALERT_FROM_EMAIL,
// VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_CONTACT_EMAIL.
// Supabase project built-ins SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are server-only.
import { createClient } from "npm:@supabase/supabase-js@2.75.0";
import webPush from "npm:web-push@3.6.7";

const serviceUrl=Deno.env.get("SUPABASE_URL")||"";
const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const alertSecret=Deno.env.get("ALERT_JOB_SECRET")||"";
const resendToken=Deno.env.get("RESEND_API_KEY")||"";
const fromEmail=Deno.env.get("ALERT_FROM_EMAIL")||"";
const vapidPublic=Deno.env.get("VAPID_PUBLIC_KEY")||"";
const vapidPrivate=Deno.env.get("VAPID_PRIVATE_KEY")||"";
const vapidContact=Deno.env.get("VAPID_CONTACT_EMAIL")||"";
const base="https://infiniti-money.github.io/Web-tuyen-dung/app.html#job/";
const perRunLimit=80;
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{"Cache-Control":"no-store"}});
const isUuid=(s:string)=>/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(s);

async function equalToken(a:string,b:string){
  if(a.length<32||b.length<32)return false;
  const buf=async(s:string)=>new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s)));
  const aa=await buf(a),bb=await buf(b);
  let diff=0;for(let i=0;i<aa.length;i++)diff|=aa[i]^bb[i];
  return diff===0;
}
function normalize(s:unknown){return String(s??"").trim().toLocaleLowerCase("vi")}
function matches(pref:Record<string,unknown>,job:Record<string,unknown>){
  if(pref.enabled!==true)return false;
  const term=normalize(pref.keyword),location=normalize(pref.location),industry=normalize(pref.industry);
  if(term&&!normalize([job.title,job.industry,job.company_name].join(" ")).includes(term))return false;
  if(location&&!normalize(job.location).includes(location))return false;
  if(industry&&!normalize(job.industry).includes(industry))return false;
  if(pref.min_salary!==null&&pref.min_salary!==undefined
      &&Number(job.salary_max??job.salary_min??0)<Number(pref.min_salary))return false;
  return true;
}
function isKnownPushEndpoint(raw:string){
  try{
    const u=new URL(raw);
    if(u.protocol!=="https:"||u.username||u.password||u.port)return false;
    return u.hostname==="fcm.googleapis.com"||
      u.hostname==="updates.push.services.mozilla.com"||
      u.hostname==="web.push.apple.com"||
      u.hostname.endsWith(".push.apple.com")||
      u.hostname.endsWith(".notify.windows.com");
  }catch{return false}
}
function escapeHtml(s:unknown){
  return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!));
}
function api<T>(data:{data:T,error:{message:string,code?:string}|null},label:string):T{
  if(data.error)throw Error(label+": "+data.error.message);
  return data.data;
}
async function sendEmail(email:string,job:Record<string,unknown>){
  if(!resendToken||!fromEmail)throw Error("email_provider_not_configured");
  const url=base+String(job.id);
  const subject="Hưng Yên Jobs: "+String(job.title).slice(0,130);
  const html='<p>Có việc làm mới phù hợp với tiêu chí bạn đã đăng ký.</p>'+
    '<p><strong>'+escapeHtml(job.title)+'</strong></p>'+
    '<p>'+escapeHtml(job.company_name)+' — '+escapeHtml(job.location)+'</p>'+
    '<p><a href="'+url+'">Xem thông tin tuyển dụng</a></p>'+
    '<p>Bạn có thể tắt email tại <a href="https://infiniti-money.github.io/Web-tuyen-dung/app.html#alerts">Tùy chọn thông báo</a>.</p>';
  const res=await fetch("https://api.resend.com/emails",{
    method:"POST",headers:{"Authorization":"Bearer "+resendToken,"Content-Type":"application/json"},
    body:JSON.stringify({from:fromEmail,to:[email],subject,html})
  });
  if(!res.ok)throw Error("email_provider_http_"+res.status);
}
async function sendPush(subs:Record<string,unknown>[],job:Record<string,unknown>){
  if(!vapidPublic||!vapidPrivate||!vapidContact)throw Error("webpush_not_configured");
  webPush.setVapidDetails(vapidContact,vapidPublic,vapidPrivate);
  const payload=JSON.stringify({
    title:"Việc làm mới tại Hưng Yên",
    body:String(job.title).slice(0,110),
    url:base+String(job.id)
  });
  let success=0;
  for(const sub of subs.slice(0,8)){
    if(!isKnownPushEndpoint(String(sub.endpoint)))continue;
    try{
      await webPush.sendNotification({
        endpoint:String(sub.endpoint),
        keys:{p256dh:String(sub.p256dh),auth:String(sub.auth_key)}
      },payload,{TTL:3600,urgency:"normal"});
      success++;
    }catch(error){
      const status=(error as {statusCode?:number})?.statusCode;
      if(status===404||status===410){
        // Device subscription expired. Best effort cleanup below is delegated to the caller.
        console.info("push_subscription_expired");
      }else console.error("push_delivery_failed",{status:status||"unknown"});
    }
  }
  if(!success)throw Error("push_no_active_subscriptions");
}

Deno.serve(async(req:Request)=>{
  if(req.method!=="POST")return json({error:"method_not_allowed"},405);
  if(!(await equalToken(req.headers.get("x-alert-job-secret")||"",alertSecret)))return json({error:"unauthorized"},401);
  if(!serviceKey||!serviceUrl)return json({error:"backend_not_configured"},503);
  const configured={email:!!(resendToken&&fromEmail),push:!!(vapidPublic&&vapidPrivate&&vapidContact)};
  if(!configured.email&&!configured.push)return json({error:"delivery_providers_not_configured"},503);
  const db=createClient(serviceUrl,serviceKey,{auth:{autoRefreshToken:false,persistSession:false}});
  const summary={checked:0,claimed:0,sent:0,failed:0};
  try{
    const prefs=api(await db.from("job_alert_preferences")
      .select("user_id,enabled,keyword,location,industry,min_salary,email_opt_in,push_opt_in,email_opted_in_at,push_opted_in_at")
      .eq("enabled",true).or("email_opt_in.eq.true,push_opt_in.eq.true").limit(500),"preferences");
    if(!prefs.length)return json({ok:true,...summary});
    const jobs=api(await db.from("jobs")
      .select("id,title,industry,location,salary_min,salary_max,published_at,companies!inner(name,status)")
      .eq("status","published").not("published_at","is",null).eq("companies.status","approved")
      .order("published_at",{ascending:false}).limit(200),"jobs");
    outer:for(const job of jobs){
      const work={...job,company_name:(job.companies as {name?:string})?.name||"Doanh nghiệp"};
      if(!isUuid(String(job.id)))continue;
      for(const pref of prefs){
        if(summary.claimed>=perRunLimit)break outer;
        summary.checked++;
        if(!matches(pref,work))continue;
        for(const channel of ["email","push"] as const){
          if(summary.claimed>=perRunLimit)break outer;
          if(!configured[channel]||pref[channel+"_opt_in"]!==true)continue;
          const since=pref[channel+"_opted_in_at"];
          if(!since||new Date(String(job.published_at))<new Date(String(since)))continue;
          if(channel==="push"){
            const found=api(await db.from("web_push_subscriptions").select("endpoint,p256dh,auth_key")
              .eq("user_id",pref.user_id).limit(8),"push_subscriptions");
            if(!found.length)continue;
          }
          // Unique constraint claims the pair before any outbound send: never double-send.
          const claim=await db.from("job_notification_deliveries")
            .insert({user_id:pref.user_id,job_id:job.id,channel,status:"processing"})
            .select("id").single();
          if(claim.error){
            if(claim.error.code==="23505")continue;
            console.error("claim_failed",{code:claim.error.code||"unknown"});continue;
          }
          summary.claimed++;
          try{
            if(channel==="email"){
              const acct=api(await db.auth.admin.getUserById(String(pref.user_id)),"auth_user").user;
              if(!acct?.email||!acct.email_confirmed_at)throw Error("email_not_verified");
              await sendEmail(acct.email,work);
            }else{
              const found=api(await db.from("web_push_subscriptions").select("endpoint,p256dh,auth_key")
                .eq("user_id",pref.user_id).limit(8),"push_subscriptions");
              await sendPush(found,work);
            }
            api(await db.from("job_notification_deliveries")
              .update({status:"sent",sent_at:new Date().toISOString()}).eq("id",claim.data.id),"delivery_success");
            summary.sent++;
          }catch(error){
            const code=String((error as Error).message||"delivery_failed").slice(0,90);
            await db.from("job_notification_deliveries").update({status:"failed",error_code:code})
              .eq("id",claim.data.id);
            console.error("delivery_error",{channel,code});
            summary.failed++;
          }
        }
      }
    }
    // Aggregate counters only; do not expose emails, endpoints, personal data in logs.
    return json({ok:true,...summary});
  }catch(error){
    console.error("job_alert_dispatch_error",{code:String((error as Error).message||"internal_error").slice(0,120)});
    return json({error:"dispatch_failed"},500);
  }
});
