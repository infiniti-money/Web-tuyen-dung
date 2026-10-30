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
 assert.deepEqual(readdirSync('dist/src'),['app.js']);
 assert.ok(!existsSync('dist/supabase/schema.sql'));
});
