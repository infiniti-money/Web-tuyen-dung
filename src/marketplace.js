import {createBookmarks} from './bookmarks.js';

// Public marketplace uses published jobs and approved companies only.
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const pageSize=12;
const filterDefaults=()=>({keyword:'',location:'',industry:'',salary:'',sort:'newest'});
const cash=n=>n==null?'Thỏa thuận':new Intl.NumberFormat('vi-VN').format(Number(n))+' triệu';
function salaryLabel(job){
  if(job.salary_min==null&&job.salary_max==null)return 'Thỏa thuận';
  if(job.salary_min==null)return 'Đến '+cash(job.salary_max);
  if(job.salary_max==null)return 'Từ '+cash(job.salary_min);
  return cash(job.salary_min)+' – '+cash(job.salary_max);
}
function matchesSalary(job,band){
  const low=job.salary_min,high=job.salary_max;
  if(!band)return true;
  if(band==='negotiable')return low==null&&high==null;
  if(low==null&&high==null)return false;
  if(band==='lt10')return low!=null&&low<10;
  if(band==='10to15')return (high??low)>=10&&(low??high)<=15;
  if(band==='15to25')return (high??low)>=15&&(low??high)<=25;
  if(band==='ge25')return (high??low)>=25;
  return true;
}
export function createMarketplace({db,root,request,e,heading,onApply,onMessage=()=>{}}){
  let allJobs=null,loadedAt=0,filters=filterDefaults(),currentPage=1,selectedCompany='';
  const bookmarks=createBookmarks();
  const savedText=id=>bookmarks.has(id)?'♥ Đã lưu':'♡ Lưu tin';
  const savedAction=id=>'<button type="button" class="save-job secondary" data-save="'+e(id)+'" aria-pressed="'+bookmarks.has(id)+'" aria-label="'+(bookmarks.has(id)?'Bỏ lưu tin':'Lưu tin tuyển dụng')+'">'+savedText(id)+'</button>';
  function updateSavedCount(){for(const id of ['savedCounter','savedSummary']){const badge=document.getElementById(id);if(badge)badge.textContent=String(bookmarks.count())}}
  async function loadJobs(){if(!allJobs||Date.now()-loadedAt>60000){allJobs=await fetchJobs();loadedAt=Date.now()}return allJobs}
  function shareJob(id,title){
    if(!uuid.test(id))return;
    const url=window.location.origin+window.location.pathname+'#job/'+id;
    if(navigator.share){navigator.share({title,url}).catch(error=>{if(error?.name!=='AbortError')onMessage('Không thể chia sẻ liên kết')});return}
    if(navigator.clipboard?.writeText){navigator.clipboard.writeText(url).then(()=>onMessage('Đã sao chép liên kết việc làm')).catch(()=>onMessage('Không thể sao chép liên kết trên trình duyệt này'));return}
    onMessage('Trình duyệt không hỗ trợ chia sẻ tự động. Bạn có thể sao chép liên kết trên thanh địa chỉ.')
  }
  const norm=s=>String(s??'').normalize('NFC').toLocaleLowerCase('vi').trim();
  const link=(text,href,css='')=>'<a class="'+css+'" href="'+href+'">'+e(text)+'</a>';
  const empty=message=>'<div class="empty-state"><strong>'+e(message)+'</strong><p>Thử điều chỉnh bộ lọc hoặc quay lại danh sách việc làm.</p></div>';
  async function fetchJobs(){
    // Supabase/PostgREST caps individual queries; gather bounded recent batches.
    const results=[],size=200,max=1000;
    for(let start=0;start<max;start+=size){
      const batch=await request(db.from('jobs')
        .select('id,company_id,title,description,requirements,location,industry,salary_min,salary_max,created_at,companies(id,name)')
        .eq('status','published').order('created_at',{ascending:false}).range(start,start+size-1));
      results.push(...batch);
      if(batch.length<size)break;
    }
    return results;
  }
  function option(value,label,selected){
    return '<option value="'+e(value)+'"'+(value===selected?' selected':'')+'>'+e(label)+'</option>';
  }
  function jobCard(job){
    const name=job.companies?.name||'Doanh nghiệp Hưng Yên',initial=String(name).charAt(0).toUpperCase()||'H';
    return '<article class="job marketplace-job">'+
      '<div class="job-top"><div class="job-logo" aria-hidden="true">'+e(initial)+'</div><div class="job-main"><h3 class="job-title">'+link(job.title,'#job/'+job.id)+'</h3>'+
      '<a class="job-company company-text-link" href="#company/'+e(job.company_id)+'">'+e(name)+'</a></div>'+savedAction(job.id)+'</div>'+
      '<p class="job-description">'+e(String(job.description||'').slice(0,175))+(String(job.description||'').length>175?'…':'')+'</p>'+
      '<div class="job-meta"><span class="pill">⌖ '+e(job.location)+'</span><span class="pill">◈ '+e(job.industry)+'</span><span class="pill salary">'+e(salaryLabel(job))+'</span></div>'+
      '<div class="job-actions"><span class="hint">Đăng '+e(new Date(job.created_at).toLocaleDateString('vi-VN'))+'</span><div class="inline-actions">'+
      '<button type="button" class="share-job secondary" data-share="'+e(job.id)+'" data-title="'+e(job.title)+'" aria-label="Chia sẻ '+e(job.title)+'">↗ Chia sẻ</button><a class="button secondary" href="#job/'+e(job.id)+'">Xem chi tiết</a>'+
      '<button type="button" data-apply="'+e(job.id)+'">Ứng tuyển</button></div></div></article>';
  }
  function bindApply(){
    root.querySelectorAll('[data-apply]').forEach(button=>button.onclick=()=>onApply(button.dataset.apply));
    root.querySelectorAll('[data-save]').forEach(button=>button.onclick=()=>{
      const result=bookmarks.toggle(button.dataset.save);
      if(!result.ok){onMessage('Không thể lưu việc làm trên trình duyệt này');return}
      updateSavedCount();
      root.querySelectorAll('[data-save="'+button.dataset.save+'"]').forEach(b=>{
        b.setAttribute('aria-pressed',String(result.saved));b.textContent=savedText(button.dataset.save);
        b.setAttribute('aria-label',result.saved?'Bỏ lưu tin':'Lưu tin tuyển dụng');
      });
      if(root.querySelector('#savedList'))saved().catch(()=>onMessage('Không thể làm mới danh sách đã lưu'));
      else onMessage(result.saved?'Đã lưu tin tuyển dụng trên thiết bị':'Đã bỏ lưu tin tuyển dụng');
    });
    root.querySelectorAll('[data-share]').forEach(button=>button.onclick=()=>shareJob(button.dataset.share,button.dataset.title));
  }
  async function jobs(){
    await loadJobs();
    updateSavedCount();
    const locations=[...new Set(allJobs.map(j=>j.location).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'vi'));
    const industries=[...new Set(allJobs.map(j=>j.industry).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'vi'));
    const currentCompany=selectedCompany&&allJobs.find(j=>j.company_id===selectedCompany)?.companies?.name;
    root.innerHTML=
      '<section class="workspace-hero"><span class="eyebrow">✦ Cơ hội nghề nghiệp tại Hưng Yên</span>'+
      '<h1>Việc làm phù hợp.<br>Ứng tuyển dễ dàng.</h1><p>Lọc công việc theo ngành, mức lương và khu vực. Xem chi tiết trước khi gửi hồ sơ trực tiếp đến doanh nghiệp.</p>'+
      '<span class="hero-count"><b>'+allJobs.length+'</b> tin đang tuyển'+(allJobs.length>=1000?' (1000 tin mới nhất)':'')+'</span></section>'+
      '<section class="panel advanced-search" aria-label="Bộ lọc việc làm">'+
      '<div class="advanced-search-head"><h2>Bộ lọc tìm việc</h2><div class="inline-actions"><a class="button secondary" href="#saved">♥ Đã lưu (<span id="savedSummary">'+bookmarks.count()+'</span>)</a><button type="button" class="secondary" id="refreshJobs">↻ Làm mới</button><button type="button" class="secondary" id="clearFilters">Đặt lại bộ lọc</button></div></div>'+
      '<div class="advanced-fields"><div><label for="search">Vị trí hoặc doanh nghiệp</label><input type="search" id="search" maxlength="90" placeholder="Nhập chức danh, công ty..."></div>'+
      '<div><label for="region">Khu vực làm việc</label><select id="region">'+option('','Tất cả khu vực',filters.location)+locations.map(v=>option(v,v,filters.location)).join('')+'</select></div>'+
      '<div><label for="industry">Ngành nghề</label><select id="industry">'+option('','Tất cả ngành nghề',filters.industry)+industries.map(v=>option(v,v,filters.industry)).join('')+'</select></div>'+
      '<div><label for="salary">Mức lương (triệu/tháng)</label><select id="salary">'+[
        ['','Tất cả mức lương'],['lt10','Dưới 10 triệu'],['10to15','10 – 15 triệu'],
        ['15to25','15 – 25 triệu'],['ge25','Từ 25 triệu'],['negotiable','Thỏa thuận']
      ].map(([v,t])=>option(v,t,filters.salary)).join('')+'</select></div></div>'+
      (currentCompany?'<div class="active-company-filter">Đang xem việc làm của <strong>'+e(currentCompany)+'</strong><button type="button" class="secondary" id="clearCompany">Bỏ lọc doanh nghiệp</button></div>':'')+
      '<div class="quick-filters"><span>Ngành nổi bật:</span>'+industries.slice(0,4).map(v=>'<button type="button" class="quick-filter'+(filters.industry===v?' active':'')+'" data-quick="'+e(v)+'">'+e(v)+'</button>').join('')+'</div></section><section class="marketplace-results" aria-label="Kết quả tuyển dụng">'+
      '<div class="results-heading"><div><span class="eyebrow">VIỆC LÀM ĐÃ DUYỆT</span><h2>Cơ hội mới nhất</h2><div class="result-count" aria-live="polite"><strong id="resultCount">0</strong> việc làm phù hợp</div></div>'+
      '<div><label for="sort">Sắp xếp</label><select id="sort">'+[
        ['newest','Mới nhất'],['oldest','Cũ nhất'],['salarydesc','Lương cao trước'],['salaryasc','Lương thấp trước']
      ].map(([v,t])=>option(v,t,filters.sort)).join('')+'</select></div></div>'+
      '<div id="list" class="job-grid"></div><nav class="pagination" id="pagination" aria-label="Phân trang tin tuyển dụng"></nav></section>';
    const input=root.querySelector('#search');input.value=filters.keyword;
    function draw(){
      const keyword=norm(filters.keyword);
      root.querySelectorAll('[data-quick]').forEach(b=>{const selected=filters.industry===b.dataset.quick;b.classList.toggle('active',selected);b.setAttribute('aria-pressed',String(selected))});
      let visible=allJobs.filter(j=>
        (!keyword||norm([j.title,j.industry,j.description,j.companies?.name].join(' ')).includes(keyword))&&
        (!filters.location||j.location===filters.location)&&
        (!filters.industry||j.industry===filters.industry)&&matchesSalary(j,filters.salary)&&
        (!selectedCompany||j.company_id===selectedCompany));
      if(filters.sort==='oldest')visible.sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
      else if(filters.sort==='salarydesc')visible.sort((a,b)=>(b.salary_max??b.salary_min??-1)-(a.salary_max??a.salary_min??-1));
      else if(filters.sort==='salaryasc')visible.sort((a,b)=>(a.salary_min??a.salary_max??Infinity)-(b.salary_min??b.salary_max??Infinity));
      const total=visible.length,pages=Math.max(1,Math.ceil(total/pageSize));
      currentPage=Math.min(Math.max(1,currentPage),pages);
      root.querySelector('#resultCount').textContent=total;
      root.querySelector('#list').innerHTML=visible.slice((currentPage-1)*pageSize,currentPage*pageSize).map(jobCard).join('')||empty('Không tìm thấy vị trí phù hợp');
      bindApply();
      const nav=root.querySelector('#pagination');
      nav.innerHTML=pages<=1?'':'<button type="button" class="secondary" data-page-number="'+(currentPage-1)+'"'+(currentPage===1?' disabled':'')+'>← Trước</button>'+
        '<span>Trang '+currentPage+' / '+pages+'</span>'+
        '<button type="button" class="secondary" data-page-number="'+(currentPage+1)+'"'+(currentPage===pages?' disabled':'')+'>Sau →</button>';
      nav.querySelectorAll('[data-page-number]').forEach(b=>b.onclick=()=>{
        const next=Number(b.dataset.pageNumber);
        if(next<1||next>pages)return;
        currentPage=next;draw();
        root.querySelector('.marketplace-results').scrollIntoView({behavior:'smooth',block:'start'});
      });
    }
    root.querySelectorAll('[data-quick]').forEach(button=>button.onclick=()=>{filters.industry=filters.industry===button.dataset.quick?'':button.dataset.quick;root.querySelector('#industry').value=filters.industry;currentPage=1;draw()});
    input.oninput=()=>{filters.keyword=input.value;currentPage=1;draw()};
    for(const [id,key] of [['region','location'],['industry','industry'],['salary','salary'],['sort','sort']])
      root.querySelector('#'+id).onchange=event=>{filters[key]=event.target.value;currentPage=1;draw()};
    root.querySelector('#clearFilters').onclick=()=>{filters=filterDefaults();selectedCompany='';currentPage=1;return jobs()};
    root.querySelector('#refreshJobs').onclick=()=>{allJobs=null;currentPage=1;jobs().catch(()=>onMessage('Không thể tải lại danh sách việc làm'))};
    if(root.querySelector('#clearCompany'))root.querySelector('#clearCompany').onclick=()=>{selectedCompany='';currentPage=1;jobs()};
    draw();
  }

  async function saved(){
    await loadJobs();updateSavedCount();
    const ids=bookmarks.all(),items=ids.map(id=>allJobs.find(j=>j.id===id)).filter(Boolean);
    root.innerHTML=heading('Cơ hội yêu thích','Việc làm đã lưu','Các tin được lưu riêng trên trình duyệt thiết bị này, không đồng bộ với tài khoản trên thiết bị khác.')+
      '<div class="saved-overview panel"><div><span class="eyebrow">DANH SÁCH CỦA BẠN</span><h2>'+items.length+' tin tuyển dụng còn hiệu lực</h2>'+
      '<p class="muted">Chỉ hiển thị tin đang tuyển. Tin đã đóng sẽ không xuất hiện; liên kết chia sẻ vẫn kiểm tra quyền công khai.</p></div>'+
      '<a href="#jobs" class="button">Khám phá việc làm →</a></div>'+
      '<div id="savedList" class="job-grid saved-grid">'+(items.length?items.map(jobCard).join('')+
      '':empty('Bạn chưa lưu công việc nào đang tuyển'))+'</div>';
    bindApply();
  }
  async function jobDetail(id){
    if(!uuid.test(id)){root.innerHTML=empty('Đường dẫn công việc không hợp lệ');return}
    const job=await request(db.from('jobs')
      .select('id,company_id,title,description,requirements,location,industry,salary_min,salary_max,created_at,companies(id,name,description,location,status)')
      .eq('id',id).eq('status','published').maybeSingle());
    if(!job||job.companies?.status!=='approved'){root.innerHTML=empty('Tin tuyển dụng không còn được công khai');return}
    const company=job.companies;
    root.innerHTML='<div class="detail-breadcrumb">'+link('← Quay lại việc làm','#jobs')+'</div>'+
      '<div class="detail-layout"><article class="panel detail-primary">'+
      '<span class="eyebrow">TIN TUYỂN DỤNG ĐÃ KIỂM DUYỆT</span><h1>'+e(job.title)+'</h1>'+
      '<div class="detail-company">'+link(company.name,'#company/'+e(company.id),'company-text-link')+'</div><div class="detail-social-actions">'+savedAction(job.id)+'<button type="button" class="secondary" data-share="'+e(job.id)+'" data-title="'+e(job.title)+'">↗ Chia sẻ tin</button></div>'+
      '<div class="job-meta detail-chips"><span class="pill">⌖ '+e(job.location)+'</span><span class="pill">◈ '+e(job.industry)+'</span><span class="pill salary">'+e(salaryLabel(job))+'</span></div>'+
      '<h2>Giới thiệu công việc</h2><div class="long-copy">'+e(job.description||'Chưa có mô tả')+'</div>'+
      '<h2>Yêu cầu ứng viên</h2><div class="long-copy">'+e(job.requirements||'Nhà tuyển dụng chưa cập nhật yêu cầu chi tiết.')+'</div>'+
      '<p class="small-note">Tin đăng '+e(new Date(job.created_at).toLocaleDateString('vi-VN'))+'</p></article>'+
      '<aside class="detail-aside"><div class="panel"><span class="eyebrow">CƠ HỘI DÀNH CHO BẠN</span><h2>Ứng tuyển vị trí này</h2><p class="muted">Gửi thông tin giới thiệu và CV PDF an toàn đến doanh nghiệp.</p>'+
      '<button type="button" id="detailApply" class="wide-button">Ứng tuyển ngay →</button><p class="small-note">Tệp CV được lưu trong khu vực riêng tư.</p></div>'+
      '<div class="panel company-mini"><h2>Thông tin doanh nghiệp</h2><div class="company-avatar">'+e(company.name.charAt(0))+'</div><strong>'+e(company.name)+'</strong>'+
      '<p class="muted">⌖ '+e(company.location)+'</p><p>'+e(String(company.description||'').slice(0,180)||'Doanh nghiệp đã được kiểm duyệt trên Hưng Yên Jobs.')+'</p>'+
      link('Xem hồ sơ doanh nghiệp →','#company/'+e(company.id),'text-link')+'</div></aside></div>';
    root.querySelector('#detailApply').onclick=()=>onApply(job.id);
    bindApply();
  }
  async function companyProfile(id){
    if(!uuid.test(id)){root.innerHTML=empty('Đường dẫn doanh nghiệp không hợp lệ');return}
    const company=await request(db.from('companies').select('id,name,description,location,status')
      .eq('id',id).eq('status','approved').maybeSingle());
    if(!company){root.innerHTML=empty('Hồ sơ doanh nghiệp chưa được công khai');return}
    const companyJobs=await request(db.from('jobs')
      .select('id,company_id,title,description,location,industry,salary_min,salary_max,created_at,companies(id,name)')
      .eq('company_id',company.id).eq('status','published').order('created_at',{ascending:false}).limit(100));
    root.innerHTML='<div class="detail-breadcrumb">'+link('← Quay lại việc làm','#jobs')+'</div>'+
      '<section class="company-profile-hero"><div class="company-profile-logo">'+e(company.name.charAt(0).toUpperCase())+'</div>'+
      '<div><span class="eyebrow">HỒ SƠ DOANH NGHIỆP ĐÃ DUYỆT</span><h1>'+e(company.name)+'</h1><p>⌖ '+e(company.location)+'</p></div></section>'+
      '<div class="detail-layout"><div class="panel detail-primary"><h2>Giới thiệu doanh nghiệp</h2>'+
      '<div class="long-copy">'+e(company.description||'Doanh nghiệp chưa cập nhật phần giới thiệu. Vui lòng xem các vị trí đang tuyển phía dưới.')+'</div>'+
      '<div class="results-heading"><h2>Vị trí đang tuyển</h2><span class="result-count">'+companyJobs.length+' công việc</span></div>'+
      '<div class="company-job-grid">'+(companyJobs.length?companyJobs.map(jobCard).join(''):empty('Doanh nghiệp chưa có vị trí đang tuyển'))+'</div></div>'+
      '<aside class="detail-aside"><div class="panel"><h2>Thông tin tuyển dụng</h2>'+
      '<div class="company-summary-number">'+companyJobs.length+'</div><p class="muted">Tin tuyển dụng đã xuất bản</p>'+
      '<button id="viewCompanyJobs" type="button" class="wide-button">Tìm việc tại doanh nghiệp →</button></div></aside></div>';
    bindApply();
    root.querySelector('#viewCompanyJobs').onclick=()=>{selectedCompany=company.id;currentPage=1;location.hash='jobs'};
  }
  return {jobs,saved,jobDetail,companyProfile,bookmarks};
}
