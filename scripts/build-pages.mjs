import {cpSync, mkdirSync, writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
for(const file of ['index.html','app.html','src/app.js']) {
 mkdirSync(dirname('dist/'+file),{recursive:true});
 cpSync(file,'dist/'+file);
}
writeFileSync('dist/.nojekyll','');
const url=(process.env.SUPABASE_URL||'').trim();
const anonKey=(process.env.SUPABASE_PUBLISHABLE_KEY||'').trim();
if(Boolean(url)!==Boolean(anonKey))throw Error('Set BOTH SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY repository variables');
if(url&&!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url))throw Error('Invalid Supabase project URL');
if(anonKey&&(anonKey.length<20||/\s/.test(anonKey)))throw Error('Invalid publishable key format');
writeFileSync('dist/config.js','window.HYJOBS_CONFIG = '+JSON.stringify({url,anonKey})+';\n');
console.log(url?'Supabase project config included in static site (public publishable key only)':'Supabase not configured; publishing landing page with setup screen for app');
