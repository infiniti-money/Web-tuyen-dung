// Contact details belong to the authenticated user's private Supabase profile.
// Never use editable profile fields or Google metadata for authorization.
export function normalizePhone(input){
  const value=String(input??'').trim();
  if(!value)return null;
  const normalized=value.replace(/[\s().-]/g,'');
  if(!/^\+?[0-9]{9,15}$/.test(normalized)){
    throw Error('Số điện thoại phải có 9–15 chữ số, có thể bắt đầu bằng +84.');
  }
  return normalized;
}
export function normalizeBirthDate(input,today=new Date()){
  const value=String(input??'').trim();
  if(!value)return null;
  if(!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value))throw Error('Ngày sinh phải có định dạng YYYY-MM-DD.');
  const d=new Date(value+'T00:00:00Z');
  if(Number.isNaN(d.getTime())||d.toISOString().slice(0,10)!==value){
    throw Error('Ngày sinh không hợp lệ.');
  }
  const todayValue=[today.getFullYear(),String(today.getMonth()+1).padStart(2,'0'),String(today.getDate()).padStart(2,'0')].join('-');
  if(value<'1900-01-01'||value>todayValue)throw Error('Ngày sinh phải từ năm 1900 đến ngày hiện tại.');
  return value;
}
export function validateContactProfile({full_name,phone,birth_date},today){
  const name=String(full_name??'').trim();
  if(name.length>100)throw Error('Họ tên tối đa 100 ký tự.');
  return {full_name:name,phone:normalizePhone(phone),birth_date:normalizeBirthDate(birth_date,today)};
}
