import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=path=>readFileSync(path,'utf8');
test('app bundle and migration files exist',()=>{
 for(const f of ['index.html','app.html','src/app.js','supabase/schema.sql','config.example.js','scripts/build-pages.mjs'])assert.ok(existsSync(f),f);
});
test('server secrets are never required by browser bundle',()=>{
 const app=read('src/app.js');
 assert.ok(app.includes('employer_applications'), 'employer applications RPC required');
 assert.ok(!app.includes('SUPABASE_SERVICE_ROLE_KEY'),'service role never reaches browser');
});
test('RLS and privacy policies exist',()=>{
 const sql=read('supabase/schema.sql');
 for(const table of ['profiles','companies','jobs','applications'])assert.ok(sql.includes('alter table public.'+table+' enable row level security'),table);
 assert.ok(sql.includes("values('candidate-cvs','candidate-cvs',false"),'private CV storage');
 assert.ok(sql.includes('grant execute on function public.employer_applications() to authenticated'));
 assert.ok(sql.includes('check_job_publication'));
});
