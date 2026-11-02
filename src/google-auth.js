// Google sign-in is delegated to Supabase Auth; the browser never receives
// a Google Client Secret. Do not enable before Google provider + Redirect URLs
// have been configured in the Supabase Dashboard.
export function createGoogleSignIn(config=globalThis.HYJOBS_GOOGLE_AUTH||{}){
 const enabled=config.enabled===true;
 function redirectUrl(locationLike=globalThis.location){
   if(!locationLike?.origin||!locationLike?.pathname)throw Error('Không xác định được địa chỉ quay lại website.');
   // Strip search params and hash; allow only a clean, same-origin app URL.
   return new URL(locationLike.pathname,locationLike.origin).href;
 }
 async function signIn(db,locationLike=globalThis.location){
   if(!enabled)throw Error('Đăng nhập Google chưa được kích hoạt. Quản trị viên cần cấu hình Google OAuth trong Supabase.');
   if(!db?.auth?.signInWithOAuth)throw Error('Chưa có kết nối xác thực Supabase.');
   const {data,error}=await db.auth.signInWithOAuth({
     provider:'google',
     options:{redirectTo:redirectUrl(locationLike)}
   });
   if(error)throw error;
   return data;
 }
 return {enabled,redirectUrl,signIn};
}
