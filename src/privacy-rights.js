// Privacy-rights intake only. Deliberately NEVER deletes CVs, applications, or Auth accounts.
const TYPES={
 access:'Xem / nhận bản sao dữ liệu',
 correction:'Chỉnh sửa thông tin',
 deletion:'Yêu cầu xóa dữ liệu',
 restriction:'Hạn chế xử lý dữ liệu',
 withdrawal:'Rút lại sự đồng ý',
 other:'Yêu cầu khác'
};
const STATUS={pending:'Đã tiếp nhận',in_review:'Đang xem xét',resolved:'Đã xử lý',rejected:'Không thể chấp thuận'};
export function createPrivacyFeatures({db,root,request,e,heading,note,getUser,getRole}){
 function privacy(){
  root.innerHTML=heading('Quyền riêng tư','Thông tin xử lý dữ liệu cá nhân','Bản mô tả thông tin để người dùng hiểu dữ liệu được sử dụng như thế nào.')+
   '<div class="panel privacy-article">'+
   '<p class="privacy-pending"><strong>Thông báo:</strong> Đây là bản thông tin đang được hoàn thiện và chờ đơn vị vận hành rà soát pháp lý. Chưa phải xác nhận tuân thủ đầy đủ pháp luật hay cam kết về thời hạn lưu trữ.</p>'+
   '<h2>1. Dữ liệu website tiếp nhận</h2><p>Tùy vai trò, Hưng Yên Jobs tiếp nhận thông tin tài khoản (email, tên, số điện thoại nếu cung cấp), thông tin nhà tuyển dụng và tin tuyển dụng, thư ứng tuyển, trạng thái xét tuyển, tệp CV PDF, dữ liệu tin đã lưu và lựa chọn thông báo việc làm.</p>'+
   '<h2>2. Mục đích sử dụng</h2><p>Vận hành tài khoản, kết nối Ứng viên với Nhà tuyển dụng, chuyển hồ sơ đã nộp đến doanh nghiệp đăng tin, xét duyệt nội dung và bảo vệ hệ thống. Email/Web Push việc làm phù hợp chỉ được gửi nếu bạn đã chủ động chọn đăng ký nhận tin và hệ thống đã kích hoạt nhà cung cấp.</p>'+
   '<h2>3. Ai có thể xem dữ liệu?</h2><p>Ứng viên được xem thông tin hồ sơ của mình. Nhà tuyển dụng được xem hồ sơ ứng tuyển vào các tin thuộc doanh nghiệp mà họ quản lý. Quản trị viên được cấp quyền phù hợp để kiểm duyệt và hỗ trợ. CV được lưu trong Supabase Storage không công khai; các liên kết xem CV có giới hạn thời gian.</p>'+
   '<h2>4. Nơi xử lý và các dịch vụ</h2><p>Giao diện được phân phối qua GitHub Pages; dữ liệu tài khoản, đơn ứng tuyển, tin tuyển dụng và CV được xử lý tại Supabase. Có thể có dịch vụ gửi thư hoặc Web Push khi được cấu hình. Cần hoàn thiện đánh giá phạm vi xử lý, vị trí lưu trữ và việc chuyển dữ liệu trước khi công bố bản chính thức.</p>'+
   '<h2>5. Quyền truy cập, chỉnh sửa và yêu cầu xóa</h2><p>Bạn có thể xem và cập nhật một phần thông tin trong tài khoản, xem CV cá nhân, rút lựa chọn nhận thông báo và gửi yêu cầu truy cập, điều chỉnh, hạn chế hoặc xóa dữ liệu. Yêu cầu xóa được nhân sự quản trị xem xét; hệ thống không tự xóa CV đang gắn với đơn ứng tuyển và không cam kết xóa tự động ngay sau khi gửi.</p>'+
   '<h2>6. Thời hạn lưu, sao lưu và đầu mối chịu trách nhiệm</h2><p>Thời hạn lưu cụ thể, phương án sao lưu và thông tin đơn vị chịu trách nhiệm đang được xác nhận. Các nội dung đó phải được bổ sung trước khi hệ thống được công bố là sẵn sàng tiếp nhận dữ liệu cá nhân ở quy mô thương mại.</p>'+
   '<div class="privacy-actions"><a class="button" href="#data-rights">Gửi yêu cầu về dữ liệu của tôi</a><a class="button secondary" href="#account">Đến tài khoản</a></div>'+
   '</div>';
 }
 async function requests(){
  const user=getUser();
  if(!user){
   root.innerHTML=heading('Quyền dữ liệu','Gửi yêu cầu riêng tư','Để xác minh danh tính, bạn cần đăng nhập bằng tài khoản có dữ liệu cần xử lý.')+
    '<div class="panel"><p>Không gửi CV hoặc mật khẩu qua biểu mẫu công khai.</p><a href="#account" class="button">Đăng nhập trước khi gửi yêu cầu</a></div>';
   return;
  }
  const rows=await request(db.from('data_rights_requests')
    .select('id,request_type,details,status,admin_response,created_at,reviewed_at')
    .eq('user_id',user.id).order('created_at',{ascending:false}).limit(50));
  root.innerHTML=heading('Bảo vệ thông tin','Yêu cầu về dữ liệu cá nhân','Chỉ tài khoản của bạn và quản trị viên được phân quyền mới xem được nội dung yêu cầu.')+
   '<div class="panel"><h2>Gửi yêu cầu</h2><p class="muted">Không nhập mật khẩu, mã đăng nhập hoặc nội dung CV vào ô mô tả. Chúng tôi sẽ xem xét yêu cầu qua tài khoản đã xác minh; đây không phải chức năng xóa tự động.</p>'+
   '<form id="dataRightsForm"><label for="rightsKind">Loại yêu cầu</label><select id="rightsKind" name="kind" required>'+
   Object.entries(TYPES).map(([k,v])=>'<option value="'+k+'">'+e(v)+'</option>').join('')+'</select>'+
   '<label for="rightsDetails">Mô tả ngắn (không bắt buộc)</label><textarea id="rightsDetails" name="details" maxlength="1500" placeholder="Ví dụ: Tôi muốn xem dữ liệu hồ sơ đã gửi..."></textarea>'+
   '<button type="submit">Gửi yêu cầu</button></form></div>'+
   '<section class="panel"><h2>Lịch sử yêu cầu</h2>'+
   (rows.length?'<div class="rights-list">'+rows.map(r=>
    '<article class="rights-item"><div class="rights-top"><strong>'+e(TYPES[r.request_type]||r.request_type)+'</strong><span class="badge">'+e(STATUS[r.status]||r.status)+'</span></div>'+
    '<p class="small-note">'+new Date(r.created_at).toLocaleDateString('vi-VN')+'</p>'+
    (r.details?'<p>'+e(r.details)+'</p>':'')+
    (r.admin_response?'<p class="rights-response"><strong>Phản hồi quản trị:</strong> '+e(r.admin_response)+'</p>':'')+
    '</article>').join('')+'</div>':
    '<div class="empty-state"><strong>Chưa có yêu cầu nào</strong><p>Bạn có thể gửi yêu cầu trực tiếp bằng biểu mẫu phía trên.</p></div>')+
   '</section><p class="small-note">Xem thêm <a href="#privacy">thông tin xử lý dữ liệu cá nhân</a>.</p>';
  root.querySelector('#dataRightsForm').onsubmit=async ev=>{
    ev.preventDefault();
    const btn=ev.currentTarget.querySelector('button'),data=new FormData(ev.currentTarget);
    const request_type=String(data.get('kind')),details=String(data.get('details')||'').trim();
    if(!Object.hasOwn(TYPES,request_type)){note('Loại yêu cầu không hợp lệ');return}
    btn.disabled=true;
    try{
     await request(db.from('data_rights_requests').insert({user_id:user.id,request_type,details})
       .select('id,status').single());
     note('Đã tiếp nhận yêu cầu. Bạn có thể xem trạng thái tại đây.');
     await requests();
    }catch(err){note(err?.code==='23505'?'Bạn đã có yêu cầu cùng loại đang được xử lý.':(err.message||'Không thể gửi yêu cầu.'));btn.disabled=false}
  };
 }
 async function adminQueue(){
  if(!getUser()||getRole()!=='admin'){
   root.innerHTML=heading('Quản trị','Không có quyền truy cập','Trang này chỉ dành cho quản trị viên.');return;
  }
  const rows=await request(db.from('data_rights_requests')
    .select('id,user_id,request_type,details,status,admin_response,created_at,reviewed_at')
    .order('created_at',{ascending:false}).limit(100));
  root.innerHTML=heading('Quyền riêng tư','Xử lý yêu cầu dữ liệu','Chỉ cập nhật trạng thái và phản hồi đã được kiểm chứng. Việc xóa dữ liệu phải thực hiện theo quy trình có sao lưu, không tự động tại đây.')+
    '<section class="panel"><p class="muted">Danh sách giới hạn 100 yêu cầu gần nhất. Không dán mật khẩu, tệp CV hoặc dữ liệu nhạy cảm vào phản hồi.</p>'+
    '<div class="admin-controls"><div><label for="rightsStatusFilter">Trạng thái yêu cầu</label><select id="rightsStatusFilter"><option value="">Tất cả</option>'+
    Object.entries(STATUS).map(([k,v])=>'<option value="'+k+'">'+e(v)+'</option>').join('')+
    '</select></div></div><p class="result-count" id="rightsQueueCount" role="status"></p><div id="rightsQueue"></div></section>';
  const list=root.querySelector('#rightsQueue');
  function draw(){
    const status=root.querySelector('#rightsStatusFilter').value,visible=rows.filter(r=>!status||r.status===status);
    root.querySelector('#rightsQueueCount').textContent=visible.length+' / '+rows.length+' yêu cầu';
    list.innerHTML=visible.length?visible.map(r=>
       '<article class="rights-item"><div class="rights-top"><strong>'+e(TYPES[r.request_type]||r.request_type)+'</strong><span class="badge">'+e(STATUS[r.status]||r.status)+'</span></div>'+
       '<p class="small-note">Mã tài khoản: <code>'+e(r.user_id)+'</code> · '+new Date(r.created_at).toLocaleDateString('vi-VN')+'</p>'+
       (r.details?'<p>'+e(r.details)+'</p>':'')+
       '<form class="rights-review" data-review="'+e(r.id)+'"><label for="rights-'+e(r.id)+'">Trạng thái</label><select id="rights-'+e(r.id)+'" name="status">'+
       Object.entries(STATUS).map(([k,v])=>'<option value="'+k+'"'+(r.status===k?' selected':'')+'>'+e(v)+'</option>').join('')+'</select>'+
       '<label>Phản hồi đến người yêu cầu</label><textarea name="response" maxlength="1500">'+e(r.admin_response||'')+'</textarea>'+
       '<button type="submit">Lưu phản hồi</button></form></article>').join(''):
       '<div class="empty-state"><strong>Không có yêu cầu phù hợp</strong></div>';
    list.querySelectorAll('[data-review]').forEach(form=>form.onsubmit=async ev=>{
      ev.preventDefault();
      const item=rows.find(x=>x.id===form.dataset.review);if(!item)return;
      const data=new FormData(form),status=String(data.get('status')),admin_response=String(data.get('response')||'').trim();
      if(!Object.hasOwn(STATUS,status)){note('Trạng thái không hợp lệ');return}
      if(['resolved','rejected'].includes(status)&&admin_response.length<10){
        note('Cần phản hồi cụ thể trước khi kết thúc yêu cầu');return;
      }
      const button=form.querySelector('button');button.disabled=true;
      try{
        await request(db.from('data_rights_requests').update({status,admin_response})
          .eq('id',item.id).select('id,status').single());
        note('Đã cập nhật yêu cầu');await adminQueue();
      }catch(error){note(error.message||'Không thể cập nhật');button.disabled=false}
    });
  }
  root.querySelector('#rightsStatusFilter').onchange=draw;draw();
 }
 return {privacy,requests,adminQueue};
}
