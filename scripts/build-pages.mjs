import {cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {dirname} from 'node:path';

const target='dist';
rmSync(target,{recursive:true,force:true});
for(const file of ['index.html','app.html','src/app.js','src/marketplace.js','src/bookmarks.js','src/app.css','config.public.js']){
  if(!existsSync(file)) throw Error('Missing production asset: '+file);
  mkdirSync(dirname(target+'/'+file),{recursive:true});
  cpSync(file,target+'/'+file);
}
const config=readFileSync('config.public.js','utf8');
const match=config.match(/window\.HYJOBS_CONFIG\s*=\s*(\{[\s\S]*?\});/);
if(!match)throw Error('Invalid config.public.js');
const data=JSON.parse(match[1]);
if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(data.url||''))throw Error('Invalid public Supabase URL');
if(!String(data.anonKey||'').startsWith('sb_publishable_'))throw Error('Must use Supabase publishable key');
if(readFileSync('app.html','utf8').includes('src="./config.js"'))throw Error('app.html uses obsolete config.js path');
if(!readFileSync('app.html','utf8').includes('src="./config.public.js"'))throw Error('app.html must load public config');
if(!readFileSync('app.html','utf8').includes('href="./src/app.css"'))throw Error('app.html must load responsive stylesheet');
writeFileSync(target+'/.nojekyll','');
console.log('Built GitHub Pages site with only 7 public assets. No database migrations or private files published.');
