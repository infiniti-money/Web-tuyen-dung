import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=p=>readFileSync(p,'utf8');
const fn=read('supabase/functions/job-alert-dispatch/index.ts');
const dispatch=read('.github/workflows/dispatch-job-alerts.yml');
const sql=read('supabase/migrations/20261031071529_opt_in_job_email_webpush_foundation.sql');
const publicKey=read('config.notifications.js');
const front=read('src/account-features.js');
const push=read('src/push-notifications.js');

test('no credentials or production push keys are exposed to public web files',()=>{
 for(const x of [publicKey,front,push]){
  assert.ok(!/sb_secret_[A-Za-z0-9]+/.test(x));
  assert.ok(!/sk_(?:live|test|proj)_[A-Za-z0-9]+/.test(x));
  assert.ok(!x.includes('VAPID_PRIVATE_KEY'));
  assert.ok(!x.includes('SERVICE_ROLE_KEY'));
 }
 assert.match(publicKey,/HYJOBS_VAPID_PUBLIC_KEY = ''/);
});

test('outbound dispatcher rejects requests without a full-length shared secret before privileged client creation',()=>{
 const guard=fn.indexOf('await equalToken(req.headers.get("x-alert-job-secret")');
 const client=fn.indexOf('const db=createClient(');
 assert.ok(guard>=0&&client>guard);
 assert.match(fn,/a.length<32\|\|b.length<32/);
 assert.match(fn,/return json\(\{error:"unauthorized"\},401\)/);
 assert.match(fn,/if\(req.method!=="POST"\)/);
 assert.match(fn,/if\(!configured.email&&!configured.push\)/);
});

test('delivery is opt-in and unique per user job and channel',()=>{
 assert.match(sql,/email_opt_in boolean not null default false/);
 assert.match(sql,/push_opt_in boolean not null default false/);
 assert.match(sql,/unique\(user_id,job_id,channel\)/);
 assert.match(sql,/revoke all on public.job_notification_deliveries from public,anon,authenticated/);
 assert.match(fn,/pref\[channel\+"_opt_in"\]!==true/);
 assert.match(fn,/email_confirmed_at/);
 assert.match(fn,/isKnownPushEndpoint/);
 assert.match(fn,/status:"processing"/);
 assert.match(fn,/23505/);
});

test('disabled by default and no secrets printed by hourly scheduler',()=>{
 assert.match(dispatch,/if \[\[ "\$ENABLED" != "true" \]\]/);
 assert.match(dispatch,/HYJOBS_ALERT_DISPATCH_ENABLED/);
 assert.match(dispatch,/HYJOBS_ALERT_JOB_SECRET/);
 assert.ok(!dispatch.includes('echo "$SHARED_SECRET"'));
 assert.match(dispatch,/curl --fail-with-body/);
});

test('push needs user gesture and records unsubscribe ahead of browser unsubscribe',()=>{
 assert.match(push,/Notification.requestPermission\(\)/);
 assert.match(push,/userVisibleOnly:true/);
 const start=push.indexOf('export async function disableWebPush');
 const revoke=push.indexOf('push_opt_in:false',start);
 const unsub=push.indexOf('await subscription.unsubscribe()',start);
 assert.ok(start>=0&&revoke>start&&unsub>revoke);
 assert.match(front,/name="email_opt_in"/);
});
