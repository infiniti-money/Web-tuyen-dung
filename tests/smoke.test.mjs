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
 assert.deepEqual(readdirSync('dist/src'),['app.css','app.js','bookmarks.js','marketplace.js']);
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
 const marketplace=read('src/marketplace.js');
 assert.match(js+marketplace,/\.from\('jobs'\)\.select/);
 assert.match(marketplace,/\.eq\('status','published'\)/);
 assert.match(js,/\.rpc\('employer_applications'\)/);
 assert.match(js,/class="stats-grid"/);
 assert.match(js,/class="table-wrap"/);
 assert.match(js,/data-page/);
});

test('marketplace uses published jobs and approved company profiles only',()=>{
 const m=read('src/marketplace.js');
 assert.match(m,/\.eq\('status','published'\)/);
 assert.match(m,/\.eq\('status','approved'\)/);
 assert.match(m,/async function jobDetail\(id\)/);
 assert.match(m,/async function companyProfile\(id\)/);
 assert.match(m,/const uuid=/);
 assert.match(m,/if\(!uuid\.test\(id\)\)/);
});
test('search offers advanced filters, sorting and bounded pagination',()=>{
 const m=read('src/marketplace.js');
 for(const name of ['search','region','industry','salary','sort','clearFilters','resultCount','pagination'])
   assert.ok(m.includes("'"+name+"'")||m.includes('id="'+name+'"'),name);
 assert.match(m,/pageSize=12/);
 assert.match(m,/for\(let start=0;start<max;start\+=size\)/);
 assert.match(m,/limit\(100\)/);
});
test('application routes to published job and approved company details',()=>{
 const main=read('src/app.js'),m=read('src/marketplace.js');
 assert.match(main,/createMarketplace\(/);
 assert.match(main,/marketplace\.jobDetail/);
 assert.match(main,/marketplace\.companyProfile/);
 assert.match(main,/hashchange/);
 assert.match(m,/href="#job\//);
 assert.match(m,/href="#company\//);
});
test('admin moderation dashboard is search/filter oriented and keeps confirmed writes',()=>{
 const main=read('src/app.js');
 for(const field of ['adminSearch','companyFilter','jobFilter','adminCompanies','adminJobs'])
   assert.ok(main.includes(field),field);
 assert.match(main,/statCard\('Tin chờ duyệt'/);
 assert.match(main,/update\(\{status:b\.dataset\.newstatus\}\).*?\.select\('id,status'\)\.single\(\)/s);
});

test('marketplace JavaScript module parses in Node 22',()=>{
 execFileSync('node',['--check','src/marketplace.js'],{stdio:'pipe'});
});

test('company page renders job cards or empty state without swallowing sidebar markup',()=>{
 const module=read('src/marketplace.js');
 assert.match(module,/companyJobs\.length\?companyJobs\.map\(jobCard\)\.join\(''\):empty\(/);
 assert.match(module,/<button id="viewCompanyJobs"/);
 assert.ok(!module.includes("companyJobs.map(jobCard).join('')||empty("));
});

test('bookmarks persist only validated IDs and reject corrupt or unavailable storage',async()=>{
 const {createBookmarks}=await import('../src/bookmarks.js');
 const values=new Map(),storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
 const saved=createBookmarks(storage);
 const id='6b11db28-62f5-48f3-91d7-404a356cf31d';
 assert.deepEqual(saved.all(),[]);
 assert.equal(saved.toggle(id).saved,true);
 assert.equal(saved.has(id),true);
 assert.equal(saved.count(),1);
 assert.equal(saved.toggle(id).saved,false);
 assert.equal(saved.count(),0);
 assert.equal(saved.toggle('not-a-uuid').ok,false);
 const blocked=createBookmarks({getItem(){throw Error('disabled')},setItem(){throw Error('disabled')}});
 assert.deepEqual(blocked.all(),[]);
 assert.equal(blocked.toggle(id).ok,false);
});
test('saved jobs, share actions, quick categories and mobile navigation are present',()=>{
 const main=read('src/app.js'),module=read('src/marketplace.js'),shell=read('app.html');
 const css=read('src/app.css');
 assert.match(main,/marketplace\.saved\(\)/);
 assert.match(shell,/href="#saved"/);
 assert.match(module,/data-save=/);
 assert.match(module,/data-share=/);
 assert.match(module,/data-quick=/);
 assert.match(module,/aria-pressed/);
 assert.match(module,/navigator\.share/);
 assert.match(module,/navigator\.clipboard/);
 assert.match(css,/\.saved-grid/);
});
test('recruiter applicant filtering and file upload feedback remain scoped',()=>{
 const main=read('src/app.js');
 for(const id of ['applicantSearch','applicantFilter','applicantCount','candidateCVFile','cvFileHint'])assert.ok(main.includes(id),id);
 assert.match(main,/const match=\(!status\|\|app\.status===status\)/);
 assert.match(main,/createSignedUrl\(b\.dataset\.cv,60\)/);
});
