import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

const read=p=>readFileSync(p,'utf8');

test('application, schema and public config exist',()=>{
 for(const f of ['index.html','app.html','src/app.js','supabase/schema.sql','config.public.js','scripts/build-pages.mjs'])
  assert.ok(existsSync(f),f);
});
test('only a publishable Supabase key is loaded in the browser',()=>{
 const conf=read('config.public.js'), app=read('app.html');
 assert.match(conf,/sb_publishable_/);
 assert.ok(!conf.includes('service_role'));
 assert.ok(!conf.includes('sb_secret_'));
 assert.match(app,/src="\.\/config\.public\.js"/);
 assert.ok(!app.includes('src="./config.js"'));
});
test('RLS, scoped employer access and private storage configured',()=>{
 const sql=read('supabase/schema.sql');
 for(const table of ['profiles','companies','jobs','applications'])
  assert.ok(sql.includes('alter table public.'+table+' enable row level security'),table);
 assert.ok(sql.includes("values('candidate-cvs','candidate-cvs',false"));
 assert.ok(sql.includes('app_private.employer_applications()'));
 assert.ok(sql.includes('revoke execute on function public.check_job_publication()'));
});
test('production artifact excludes source, database and workflow files',()=>{
 execFileSync('node',['scripts/build-pages.mjs'],{stdio:'pipe'});
 const top=readdirSync('dist').sort();
 assert.deepEqual(top,['.nojekyll','app.html','config.public.js','index.html','src']);
 assert.deepEqual(readdirSync('dist/src'),['app.css','app.js']);
 assert.ok(!existsSync('dist/supabase/schema.sql'));
});


test('Vietnamese statuses are presented without changing database status keys',()=>{
 const js=read('src/app.js');
 for(const [key,value] of [['submitted','Đã nộp'],['reviewing','Đang xem xét'],['shortlisted','Vào vòng tiếp theo'],['hired','Đã tuyển']])
  assert.ok(js.includes(key+":'"+value+"'"),key);
 assert.match(js,/value="'\+x\+'" /);
 assert.match(js,/roleLabels\[profile\?\.role\]/);
});
test('candidate duplicate application is checked before PDF upload',()=>{
 const js=read('src/app.js');
 const start=js.indexOf("async function apply(jobId)");
 const guard=js.indexOf("const existing=await request(db.from('applications')",start);
 const upload=js.indexOf("db.storage.from('candidate-cvs').upload(",start);
 assert.ok(start>=0&&guard>start&&upload>guard);
 assert.match(js,/if\(existing.length\)throw Error/);
 assert.match(js,/btn\.textContent='Đang gửi hồ sơ\.\.\.'/);
});
test('employer and admin changes confirm a persisted Supabase row',()=>{
 const js=read('src/app.js');
 assert.match(js,/update\(\{status:requested\}\).*?select\('id,status'\)\.single\(\)/s);
 assert.match(js,/s\.value=previous;fail\(ex\)/);
 assert.match(js,/update\(\{status:b\.dataset\.newstatus\}\)\.eq\('id',b\.dataset\.company\)\.select\('id,status'\)\.single\(\)/);
 assert.match(js,/update\(\{status:b\.dataset\.newstatus\}\)\.eq\('id',b\.dataset\.job\)\.select\('id,status'\)\.single\(\)/);
});

test('responsive application has dedicated stylesheet, visible navigation and accessible focus styles',()=>{
 const app=read('app.html'), css=read('src/app.css');
 assert.match(app,/href="\.\/src\/app\.css"/);
 assert.match(app,/class="skip-link"/);
 assert.match(app,/aria-label="Điều hướng chính"/);
 assert.match(css,/@media\(max-width:700px\)/);
 assert.match(css,/:focus-visible/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});
test('live job search and dashboard rely on actual Supabase records, never demo arrays',()=>{
 const js=read('src/app.js');
 assert.match(js,/\.from\('jobs'\)\.select/);
 assert.match(js,/\.eq\('status','published'\)/);
 assert.match(js,/\.rpc\('employer_applications'\)/);
 assert.match(js,/class="stats-grid"/);
 assert.match(js,/class="table-wrap"/);
 assert.match(js,/data-page/);
});
