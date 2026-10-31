/* Notification worker for the /Web-tuyen-dung/ GitHub Pages scope.
   No CV, tokens, cookies or credential details are placed in notification payloads. */
self.addEventListener("install",()=>self.skipWaiting());
self.addEventListener("activate",event=>event.waitUntil(self.clients.claim()));
self.addEventListener("push",event=>{
 let payload={};
 try{payload=event.data?.json()||{}}catch{payload={}}
 const title=String(payload.title||"Hưng Yên Jobs").slice(0,80);
 const body=String(payload.body||"Có tin tuyển dụng mới phù hợp.").slice(0,150);
 let destination=new URL("./app.html#alerts",self.registration.scope);
 try{
   const candidate=new URL(String(payload.url||""),self.registration.scope);
   const path=new URL("./app.html",self.registration.scope).pathname;
   if(candidate.origin===self.location.origin&&candidate.pathname===path&&
     /^#job\/[0-9a-f-]{36}$/i.test(candidate.hash))destination=candidate;
 }catch{}
 const options={body,tag:"hyjobs-"+destination.hash,renotify:false,
   data:{url:destination.href}};
 event.waitUntil(self.registration.showNotification(title,options));
});
self.addEventListener("notificationclick",event=>{
 event.notification.close();
 const url=event.notification.data?.url||new URL("./app.html#alerts",self.registration.scope).href;
 event.waitUntil((async()=>{
   const clients=await self.clients.matchAll({type:"window",includeUncontrolled:true});
   for(const client of clients){
     if(client.url.startsWith(self.registration.scope)){
       await client.navigate(url);return client.focus();
     }
   }
   return self.clients.openWindow(url);
 })());
});
