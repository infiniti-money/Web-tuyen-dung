/**
 * Cloudflare Turnstile for Supabase Auth forms.
 * Only the PUBLIC sitekey belongs in config.turnstile.js. Supabase Auth performs
 * server-side validation after CAPTCHA protection is enabled in Auth settings.
 *
 * The feature stays disabled until BOTH the sitekey and Supabase secret are ready.
 * Never treat this browser-only module as a security gate for database inserts.
 */
const SCRIPT_URL='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let scriptPromise;
const states=new Map();

export function createAuthTurnstile(config=globalThis.HYJOBS_TURNSTILE||{}){
  const enabled=config.enabled===true;
  const siteKey=String(config.siteKey||'').trim();
  const validSiteKey=/^[0-9A-Za-z_-]{8,120}$/.test(siteKey);
  const required=()=>enabled;
  function loadScript(){
    if(!enabled)return Promise.resolve(null);
    if(!validSiteKey)return Promise.reject(Error('Turnstile chưa được cấu hình site key hợp lệ.'));
    if(globalThis.turnstile?.render)return Promise.resolve(globalThis.turnstile);
    if(!scriptPromise){
      scriptPromise=new Promise((resolve,reject)=>{
        const script=document.createElement('script');
        script.src=SCRIPT_URL;
        script.async=true;
        script.defer=true;
        script.onload=()=>globalThis.turnstile?.render
          ?resolve(globalThis.turnstile)
          :reject(Error('Không tải được Cloudflare Turnstile.'));
        script.onerror=()=>reject(Error('Không tải được Cloudflare Turnstile. Vui lòng kiểm tra mạng.'));
        document.head.append(script);
      }).catch(error=>{scriptPromise=null;throw error});
    }
    return scriptPromise;
  }
  function dispose(){
    const widget=globalThis.turnstile;
    for(const state of states.values()){
      if(state.widgetId!=null&&widget?.remove){
        try{widget.remove(state.widgetId)}catch{}
      }
    }
    states.clear();
  }
  async function mount(ids){
    if(!enabled)return;
    if(!validSiteKey)throw Error('Chưa cấu hình khóa công khai Cloudflare Turnstile.');
    dispose();
    const widget=await loadScript();
    for(const id of ids){
      const form=document.getElementById(id);
      if(!form?.isConnected)continue;
      const holder=document.createElement('div');
      holder.className='auth-turnstile';
      holder.setAttribute('aria-label','Xác minh bảo vệ chống bot');
      const status=document.createElement('p');
      status.className='small-note captcha-status';
      status.setAttribute('role','status');
      status.textContent='Vui lòng hoàn thành kiểm tra Cloudflare trước khi gửi.';
      const submit=form.querySelector('button[type="submit"],button:not([type])');
      if(!submit)continue;
      submit.before(holder,status);
      const state={token:'',widgetId:null};
      states.set(id,state);
      state.widgetId=widget.render(holder,{
        sitekey:siteKey,
        theme:'auto',
        language:'vi',
        'callback':token=>{
          state.token=String(token||'');
          status.textContent='Đã xác minh. Bạn có thể gửi biểu mẫu.';
        },
        'expired-callback':()=>{
          state.token='';
          status.textContent='Phiên xác minh đã hết hạn. Vui lòng xác minh lại.';
        },
        'error-callback':()=>{
          state.token='';
          status.textContent='Không thể xác minh. Vui lòng thử lại.';
        },
        'timeout-callback':()=>{
          state.token='';
          status.textContent='Quá thời gian xác minh. Vui lòng thử lại.';
        }
      });
    }
  }
  function authOptions(id){
    if(!enabled)return {};
    if(!validSiteKey)throw Error('Turnstile chưa được cấu hình trên website.');
    const token=states.get(id)?.token||'';
    if(!token||token.length>2048)throw Error('Bạn cần hoàn thành xác minh Cloudflare Turnstile trước khi tiếp tục.');
    return {captchaToken:token};
  }
  function reset(id){
    if(!enabled)return;
    const state=states.get(id);
    if(!state)return;
    state.token='';
    try{globalThis.turnstile?.reset(state.widgetId)}catch{}
  }
  return {required,mount,authOptions,reset,dispose};
}
