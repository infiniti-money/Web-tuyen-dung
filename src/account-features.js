import {enableWebPush,disableWebPush,isPushConfigured,supportedPush} from './push-notifications.js';
import {validateCvPdf} from './pdf-safety.js';
// Candidate-facing account features. Opt-in channels are stored with RLS; no client sends.
export function createAccountFeatures({db,root,request,e,heading,note,getUser,getRole}){
  const empty=(title,desc)=>'<div class="empty-state"><strong>'+e(title)+'</strong><p>'+e(desc)+'</p></div>';
  const formatSize=n=>(Number(n)/1048576).toFixed(2)+' MB';
  const clean=s=>String(s||'').trim().toLocaleLowerCase('vi');
  async function requireCandidate(){
    const user=getUser();
    if(!user||getRole()!=='candidate'){
      root.innerHTML=heading('Khu vực ứng viên','Vui lòng đăng nhập','Chức năng này dành cho tài khoản Ứng viên đã xác minh.')+
        '<div class="panel"><a class="button" href="#account">Đăng nhập tài khoản ứng viên →</a></div>';
      return null;
    }
    return user;
  }
  async function openCV(path){
    const {data,error}=await db.storage.from('candidate-cvs').createSignedUrl(path,60);
    if(error||!data?.signedUrl)throw error||Error('Không thể mở CV');
    window.open(data.signedUrl,'_blank','noopener,noreferrer');
  }
  async function cv(){
    const user=await requireCandidate();if(!user)return;
    const [docs,apps]=await Promise.all([
      request(db.from('candidate_documents').select('id,file_path,original_name,file_size,created_at').eq('user_id',user.id).order('created_at',{ascending:false})),
      request(db.from('applications').select('cv_path,created_at,jobs(title)').eq('candidate_id',user.id).order('created_at',{ascending:false}))
    ]);
    const used=new Set(apps.map(a=>a.cv_path).filter(Boolean));
    const legacy=apps.filter(a=>a.cv_path&&!docs.some(d=>d.file_path===a.cv_path));
    root.innerHTML=heading('Hồ sơ ứng viên','Quản lý CV cá nhân','Tải lên, xem lại và chọn CV cho các lần ứng tuyển. Tất cả PDF được lưu riêng tư.')+
      '<div class="stats-grid">'+
       '<div class="stat-card"><span class="stat-label">CV trong thư viện</span><strong>'+docs.length+'</strong><small>Chỉ tài khoản của bạn truy cập</small></div>'+
       '<div class="stat-card"><span class="stat-label">CV đã gửi cùng hồ sơ</span><strong>'+used.size+'</strong><small>Không thể xóa khi đang gắn với đơn ứng tuyển</small></div></div>'+
      '<section class="panel"><h2>Tải CV mới</h2><p class="muted">Chỉ hỗ trợ tệp PDF tối đa 5 MB. Bạn sẽ chủ động chọn CV khi ứng tuyển.</p>'+
      '<form id="cvLibraryForm"><label for="cvLibraryInput">Chọn PDF</label><input type="file" id="cvLibraryInput" name="cv" accept="application/pdf,.pdf" required>'+
      '<p id="cvLibraryHint" role="status" class="small-note">Chưa chọn tệp</p>'+
      '<button type="submit">Lưu vào thư viện CV</button></form></section>'+
      '<section class="panel"><h2>CV của tôi</h2>'+
      (docs.length?'<div class="cv-library-list">'+docs.map(d=>
        '<article class="cv-library-item"><div><strong>▤ '+e(d.original_name)+'</strong><p class="small-note">'+formatSize(d.file_size)+' · '+new Date(d.created_at).toLocaleDateString('vi-VN')+(used.has(d.file_path)?' · Đã gắn với hồ sơ ứng tuyển':'')+'</p></div>'+
        '<div class="inline-actions"><button class="secondary" data-view-cv="'+e(d.file_path)+'" type="button">Xem CV</button>'+
        '<button class="secondary" data-delete-cv="'+e(d.id)+'" type="button"'+(used.has(d.file_path)?' disabled title="CV đang được dùng trong hồ sơ ứng tuyển"':'')+'>Xóa</button></div></article>').join('')+'</div>':
      empty('Chưa có CV lưu trong thư viện','Bạn có thể tải lên một bản PDF để sử dụng cho nhiều lần ứng tuyển.'))+'</section>'+
      (legacy.length?'<section class="panel"><h2>CV đã gửi trước đây</h2><p class="muted">Các CV dưới đây đang gắn với hồ sơ ứng tuyển; chúng được bảo vệ và không thể xóa tại đây.</p>'+
       legacy.map(a=>'<div class="cv-library-item"><div><strong>'+e(a.jobs?.title||'CV đã nộp')+'</strong><p class="small-note">'+new Date(a.created_at).toLocaleDateString('vi-VN')+'</p></div><button class="secondary" data-view-cv="'+e(a.cv_path)+'" type="button">Xem CV</button></div>').join('')+'</section>':'');
    const fileInput=root.querySelector('#cvLibraryInput'),hint=root.querySelector('#cvLibraryHint');
    fileInput.onchange=()=>{const f=fileInput.files?.[0];hint.textContent=f?f.name+' · '+formatSize(f.size):'Chưa chọn tệp'};
    root.querySelector('#cvLibraryForm').onsubmit=async ev=>{
      ev.preventDefault();const btn=ev.target.querySelector('button'),f=fileInput.files?.[0];
      if(!f){note('Vui lòng chọn CV');return}
      btn.disabled=true;btn.textContent='Đang kiểm tra CV...';
      const path=user.id+'/'+crypto.randomUUID()+'.pdf';
      try{
        await validateCvPdf(f);
        btn.textContent='Đang tải CV...';
        await request(db.storage.from('candidate-cvs').upload(path,f,{contentType:'application/pdf',upsert:false}));
        try{
          await request(db.from('candidate_documents').insert({user_id:user.id,file_path:path,original_name:f.name.slice(0,180),file_size:f.size}).select('id').single());
        }catch(error){await db.storage.from('candidate-cvs').remove([path]);throw error}
        note('Đã lưu CV vào thư viện');await cv();
      }catch(error){note(error.message||'Không thể lưu CV')}finally{btn.disabled=false}
    };
    root.querySelectorAll('[data-view-cv]').forEach(b=>b.onclick=async()=>{try{await openCV(b.dataset.viewCv)}catch(error){note(error.message||'Không thể mở CV')}});
    root.querySelectorAll('[data-delete-cv]').forEach(b=>b.onclick=async()=>{
      const doc=docs.find(d=>d.id===b.dataset.deleteCv);if(!doc||used.has(doc.file_path))return;
      if(!window.confirm('Xóa CV này khỏi thư viện? Không thể hoàn tác.'))return;
      b.disabled=true;
      try{
        await request(db.storage.from('candidate-cvs').remove([doc.file_path]));
        await request(db.from('candidate_documents').delete().eq('id',doc.id).eq('user_id',user.id).select('id').single());
        note('Đã xóa CV');await cv();
      }catch(error){note(error.message||'Không thể xóa CV');b.disabled=false}
    });
  }
  async function alerts(){
    const user=await requireCandidate();if(!user)return;
    const [rows,jobs]=await Promise.all([
      request(db.from('job_alert_preferences').select('*').eq('user_id',user.id).limit(1)),
      request(db.from('jobs').select('id,title,industry,location,salary_min,salary_max,created_at,companies(name)').eq('status','published').order('created_at',{ascending:false}).limit(200))
    ]);
    const pref=rows[0]||null,enabled=pref?.enabled??true;
    const match=job=>{
      if(!enabled||!pref)return false;
      if(clean(pref.keyword)&&!clean([job.title,job.industry,job.companies?.name].join(' ')).includes(clean(pref.keyword)))return false;
      if(clean(pref.location)&&!clean(job.location).includes(clean(pref.location)))return false;
      if(clean(pref.industry)&&!clean(job.industry).includes(clean(pref.industry)))return false;
      if(pref.min_salary!=null&&(job.salary_max??job.salary_min??0)<pref.min_salary)return false;
      return true;
    };
    const matching=jobs.filter(match),unread=matching.filter(job=>new Date(job.created_at)>new Date(pref?.last_seen_at||0));
    root.innerHTML=heading('Gợi ý nghề nghiệp','Thông báo việc làm phù hợp','Thiết lập ngành nghề và khu vực để xem các tin tuyển dụng phù hợp ngay trên website.')+
      '<div class="stats-grid"><div class="stat-card"><span class="stat-label">Tin phù hợp</span><strong>'+matching.length+'</strong><small>Trong 200 tin được xem gần nhất</small></div>'+
      '<div class="stat-card"><span class="stat-label">Tin mới chưa xem</span><strong>'+unread.length+'</strong><small>Kể từ khi bạn đánh dấu đã xem</small></div></div>'+
      '<section class="panel"><h2>Tùy chọn thông báo</h2><p class="muted">Tùy chọn của bạn được lưu riêng theo tài khoản. Email chỉ hoạt động khi hệ thống gửi thư đã được cấu hình; thông báo đẩy cần được bạn cho phép trên thiết bị.</p>'+
      '<form id="alertPrefsForm"><label for="alertEnabled">Bật thông báo tại website</label><select id="alertEnabled" name="enabled"><option value="true"'+(enabled?' selected':'')+'>Bật</option><option value="false"'+(!enabled?' selected':'')+'>Tắt</option></select>'+
      '<div class="form-row"><div><label for="alertKeyword">Từ khóa vị trí</label><input id="alertKeyword" name="keyword" maxlength="120" value="'+e(pref?.keyword||'')+'" placeholder="Ví dụ: nhân viên kho"></div>'+
      '<div><label for="alertLocation">Khu vực</label><input id="alertLocation" name="location" maxlength="120" value="'+e(pref?.location||'')+'" placeholder="Ví dụ: Mỹ Hào"></div></div>'+
      '<div class="form-row"><div><label for="alertIndustry">Ngành nghề</label><input id="alertIndustry" name="industry" maxlength="120" value="'+e(pref?.industry||'')+'" placeholder="Ví dụ: Kho vận"></div>'+
      '<div><label for="alertSalary">Lương tối thiểu mong muốn (triệu/tháng)</label><input type="number" id="alertSalary" name="min_salary" min="0" max="100000" value="'+e(pref?.min_salary??'')+'"></div></div>'+
      '<div class="alert-channels"><label class="opt-in-field"><input type="checkbox" name="email_opt_in" '+(pref?.email_opt_in?'checked':'')+'><span><strong>Nhận email việc làm phù hợp</strong><small>Chỉ gửi tin được xuất bản sau khi bạn đăng ký. Có thể bỏ chọn bất cứ lúc nào.</small></span></label></div>'+
      '<button type="submit">Lưu tùy chọn thông báo</button></form>'+
      '<div class="push-opt-in"><h3>Thông báo đẩy trên thiết bị</h3>'+
      '<p class="muted" id="pushStatus" role="status">'+
      (!supportedPush()?'Trình duyệt/thiết bị hiện chưa hỗ trợ Push. Trên iPhone, hãy thêm website vào Màn hình chính.':
      !isPushConfigured()?'Hệ thống chưa kích hoạt khóa Web Push; tính năng này sẽ hoạt động sau khi máy chủ được cấu hình.':
      pref?.push_opt_in?'Bạn đã bật nhận thông báo đẩy.':'Chỉ nhấn Bật khi bạn muốn nhận thông báo trên thiết bị này.')+
      '</p><div class="inline-actions"><button id="enablePush" type="button" '+(!supportedPush()||!isPushConfigured()?'disabled':'')+'>Bật thông báo đẩy</button>'+
      '<button id="disablePush" class="secondary" type="button">Tắt thông báo đẩy</button></div></div></section>'+
      '<section class="panel"><div class="results-heading"><div><h2>Việc làm gợi ý</h2><p class="muted">Ưu tiên tin đã xuất bản và doanh nghiệp được duyệt.</p></div>'+
      (pref?'<button id="markAlertsSeen" class="secondary" type="button">Đánh dấu đã xem</button>':'')+'</div>'+
      (!pref?empty('Chưa thiết lập thông báo','Nhập tiêu chí và lưu để xem việc làm phù hợp.'):
      matching.length?'<div class="alert-job-list">'+matching.slice(0,30).map(j=>
        '<a class="alert-job-item" href="#job/'+e(j.id)+'"><strong>'+e(j.title)+'</strong><span>'+e(j.companies?.name||'Doanh nghiệp')+' · '+e(j.location)+'</span>'+
        (unread.some(n=>n.id===j.id)?'<span class="badge">Mới</span>':'')+'</a>').join('')+'</div>':
      empty('Chưa có việc làm phù hợp','Bạn có thể thay đổi từ khóa, khu vực hoặc mức lương.'))+'</section>';
    root.querySelector('#alertPrefsForm').onsubmit=async ev=>{
      ev.preventDefault();const btn=ev.target.querySelector('button'),f=new FormData(ev.target);
      btn.disabled=true;
      const amount=f.get('min_salary')===''?null:Number(f.get('min_salary'));
      try{
        if(amount!==null&&(!Number.isInteger(amount)||amount<0||amount>100000))throw Error('Lương tối thiểu không hợp lệ');
        await request(db.from('job_alert_preferences').upsert({
          user_id:user.id,enabled:f.get('enabled')==='true',email_opt_in:f.get('email_opt_in')==='on',keyword:String(f.get('keyword')).trim(),
          location:String(f.get('location')).trim(),industry:String(f.get('industry')).trim(),
          min_salary:amount,updated_at:new Date().toISOString(),
          last_seen_at:pref?.last_seen_at||new Date().toISOString()
        },{onConflict:'user_id'}).select('user_id').single());
        note('Đã lưu tùy chọn thông báo');await alerts();
      }catch(error){note(error.message||'Không thể lưu thông báo')}finally{btn.disabled=false}
    };
    const enableButton=root.querySelector('#enablePush');
    if(enableButton)enableButton.onclick=async()=>{
      enableButton.disabled=true;
      try{await enableWebPush({db,request,user});note('Đã đăng ký nhận thông báo đẩy trên thiết bị');await alerts()}
      catch(error){note(error.message||'Không thể bật thông báo đẩy');enableButton.disabled=false}
    };
    const disableButton=root.querySelector('#disablePush');
    if(disableButton)disableButton.onclick=async()=>{
      disableButton.disabled=true;
      try{await disableWebPush({db,request,user});note('Đã tắt thông báo đẩy');await alerts()}
      catch(error){note(error.message||'Không thể tắt thông báo');disableButton.disabled=false}
    };
    const seen=root.querySelector('#markAlertsSeen');
    if(seen)seen.onclick=async()=>{
      seen.disabled=true;
      try{await request(db.from('job_alert_preferences').update({last_seen_at:new Date().toISOString()}).eq('user_id',user.id).select('user_id').single());await alerts();note('Đã đánh dấu các tin là đã xem')}
      catch(error){note(error.message||'Không thể cập nhật');seen.disabled=false}
    };
  }
  return {cv,alerts};
}
