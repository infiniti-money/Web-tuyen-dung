const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_ITEMS=100;
const KEY='hung-yen-jobs:saved-jobs:v1';

// Browser-only bookmarks: UUIDs, not CVs, account info, or credentials.
// Remains local to this device/browser; intentionally not server-synced.
export function createBookmarks(storage){
  const getStorage=()=>{try{return storage||globalThis.localStorage}catch{return null}};
  function read(){
    try{
      const value=JSON.parse(getStorage()?.getItem(KEY)||'[]');
      return Array.isArray(value)?[...new Set(value.filter(v=>typeof v==='string'&&UUID_RE.test(v)))].slice(0,MAX_ITEMS):[];
    }catch{return []}
  }
  function write(values){
    try{const target=getStorage();if(!target)return false;target.setItem(KEY,JSON.stringify(values));return true}catch{return false}
  }
  function toggle(id){
    if(!UUID_RE.test(String(id)))return {saved:false,ok:false};
    const values=read();
    if(values.includes(id)){
      const next=values.filter(v=>v!==id);
      return {saved:false,ok:write(next),count:next.length};
    }
    const next=[id,...values].slice(0,MAX_ITEMS);
    return {saved:true,ok:write(next),count:next.length};
  }
  function has(id){return read().includes(id)}
  return {all:read,has,toggle,count:()=>read().length};
}
