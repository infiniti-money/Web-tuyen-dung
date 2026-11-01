// Browser-side preflight for CV uploads. Storage also enforces the 5MB/MIME limit.
// This checks the PDF header but is not a replacement for server-side malware scanning.
export const MAX_CV_BYTES=5*1024*1024;
export async function validateCvPdf(file){
  if(!file||typeof file.slice!=='function'||typeof file.arrayBuffer!=='function'){
    throw Error('Vui lòng chọn tệp CV PDF hợp lệ.');
  }
  if(!/\.pdf$/i.test(String(file.name||''))){
    throw Error('Tên tệp CV phải có phần mở rộng .pdf.');
  }
  if(file.type&&file.type!=='application/pdf'){
    throw Error('Chỉ cho phép CV định dạng PDF.');
  }
  if(!Number.isFinite(file.size)||file.size<5||file.size>MAX_CV_BYTES){
    throw Error('CV PDF phải có nội dung và không vượt quá 5 MB.');
  }
  const start=new Uint8Array(await file.slice(0,5).arrayBuffer());
  const expected=[0x25,0x50,0x44,0x46,0x2d]; // ASCII %PDF-
  if(expected.some((byte,i)=>start[i]!==byte)){
    throw Error('Nội dung tệp không có chữ ký PDF hợp lệ. Vui lòng chọn CV PDF khác.');
  }
  return true;
}
