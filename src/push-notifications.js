// Web Push subscription: opt-in only and only on a user click.
export function supportedPush(){
 return typeof window!=="undefined"&&window.isSecureContext&&
   "serviceWorker" in navigator&&"PushManager" in window&&"Notification" in window;
}
const keyBytes=key=>{
 const base64=key.replace(/-/g,"+").replace(/_/g,"/");
 const padded=base64+"=".repeat((4-base64.length%4)%4);
 return Uint8Array.from(atob(padded),c=>c.charCodeAt(0));
};
const publicKey=()=>String(window.HYJOBS_VAPID_PUBLIC_KEY||"").trim();
export function isPushConfigured(){return /^[A-Za-z0-9_-]{80,110}$/.test(publicKey())}
export async function enableWebPush({db,request,user}){
 if(!supportedPush())throw Error("Thiết bị hoặc trình duyệt chưa hỗ trợ thông báo đẩy.");
 if(!isPushConfigured())throw Error("Máy chủ chưa cấu hình khóa Web Push. Chức năng sẽ sẵn sàng sau khi kích hoạt.");
 // Permission request must originate from the button's user gesture.
 const allowed=await Notification.requestPermission();
 if(allowed!=="granted")throw Error("Bạn chưa cấp quyền nhận thông báo.");
 const registration=await navigator.serviceWorker.register("./sw.js",{scope:"./"});
 await navigator.serviceWorker.ready;
 let subscription=await registration.pushManager.getSubscription();
 if(subscription){
   // Never attach an endpoint belonging to another account on a shared device.
   const owned=await request(db.from("web_push_subscriptions").select("id")
     .eq("user_id",user.id).eq("endpoint",subscription.endpoint).limit(1));
   if(!owned.length){await subscription.unsubscribe();subscription=null}
 }
 if(!subscription)subscription=await registration.pushManager.subscribe({
   userVisibleOnly:true,applicationServerKey:keyBytes(publicKey())
 });
 const data=subscription.toJSON(),keys=data.keys||{};
 if(!data.endpoint||!keys.p256dh||!keys.auth)throw Error("Trình duyệt không cung cấp đủ thông tin đăng ký Push.");
 try{
   await request(db.from("web_push_subscriptions").upsert({
     user_id:user.id,endpoint:data.endpoint,p256dh:keys.p256dh,auth_key:keys.auth,
     updated_at:new Date().toISOString()
   },{onConflict:"endpoint"}).select("id").single());
   await request(db.from("job_alert_preferences").upsert({
     user_id:user.id,push_opt_in:true,enabled:true,updated_at:new Date().toISOString()
   },{onConflict:"user_id"}).select("user_id").single());
 }catch(error){
   await subscription.unsubscribe().catch(()=>{});
   throw error;
 }
}
export async function disableWebPush({db,request,user}){
 // Stop deliveries first, even if browser Push API isn't available now.
 const existing=await request(db.from("job_alert_preferences").select("user_id")
   .eq("user_id",user.id).limit(1));
 if(existing.length)await request(db.from("job_alert_preferences").update({push_opt_in:false})
    .eq("user_id",user.id).select("user_id").single());
 await request(db.from("web_push_subscriptions").delete().eq("user_id",user.id));
 if(supportedPush()){
   const registration=await navigator.serviceWorker.getRegistration("./");
   const subscription=await registration?.pushManager.getSubscription();
   if(subscription)await subscription.unsubscribe();
 }
}
