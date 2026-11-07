import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import worker, { pingSupabase } from "../cloudflare/supabase-keepalive/src/index.mjs";

const URL = "https://lxarzbxymgjomsztftqj.supabase.co";
const KEY = "sb_publishable_keepalive_test_fixture";
const ID = "a0000000-0000-4000-8000-000000000001";
const env = Object.freeze({ SUPABASE_URL: URL, SUPABASE_PUBLISHABLE_KEY: KEY });
const controller = Object.freeze({ cron: "17 */6 * * *", scheduledTime: 1794001020000 });

test("reads only one published job ID with the public key and no session", async () => {
  let requests = 0;
  const count = await pingSupabase(env, async (url, options) => {
    requests++;
    assert.equal(url, URL + "/rest/v1/jobs?select=id&status=eq.published&limit=1");
    assert.equal(options.method, "GET");
    assert.deepEqual(options.headers, {
      apikey: KEY,
      Accept: "application/json",
      "Cache-Control": "no-store",
    });
    assert.equal(options.cache, "no-store");
    assert.equal(options.redirect, "manual");
    assert.ok(options.signal instanceof AbortSignal);
    assert.equal(options.body, undefined);
    return Response.json([{ id: ID }]);
  });
  assert.equal(count, 1);
  assert.equal(requests, 1);
});

test("an empty public jobs table still counts as a successful SELECT", async () => {
  assert.equal(await pingSupabase(env, async () => Response.json([])), 0);
});

test("rejects missing or different project URLs before making any request", async () => {
  let requests = 0;
  const fetchImpl = async () => { requests++; };
  for (const badEnv of [
    undefined,
    {},
    { ...env, SUPABASE_URL: "https://mswiegltusllzvuavjdh.supabase.co" },
    { ...env, SUPABASE_URL: "http://lxarzbxymgjomsztftqj.supabase.co" },
    { ...env, SUPABASE_URL: URL + "/" },
    { ...env, SUPABASE_URL: URL + ".example.org" },
  ]) {
    await assert.rejects(pingSupabase(badEnv, fetchImpl), /Unexpected Supabase project URL/);
  }
  assert.equal(requests, 0);
});

test("rejects secret, service-role, user JWT and missing keys before fetching", async () => {
  let requests = 0;
  const fetchImpl = async () => { requests++; };
  for (const key of [undefined, null, "", "sb_secret_test_fixture", "service_role",
    "eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.fixture",
    "eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYXV0aGVudGljYXRlZCJ9.fixture",
    "sb_publishable_", KEY + "\n", " " + KEY, 123]) {
    await assert.rejects(
      pingSupabase({ ...env, SUPABASE_PUBLISHABLE_KEY: key }, fetchImpl),
      /^Error: SUPABASE_PUBLISHABLE_KEY must be a publishable key$/,
    );
  }
  assert.equal(requests, 0);
});

test("HTTP failures and partial responses reject without parsing or logging bodies", async () => {
  for (const status of [206, 301, 302, 307, 308, 401, 403, 429, 500, 503]) {
    let parsed = false;
    await assert.rejects(pingSupabase(env, async () => ({
      status,
      json: async () => { parsed = true; throw new Error(KEY); },
    })), new RegExp("^Error: Supabase REST read failed: HTTP " + status + "$"));
    assert.equal(parsed, false);
  }
});

test("network errors do not expose request details", async () => {
  await assert.rejects(pingSupabase(env, async () => {
    throw new Error("Request with apikey=" + KEY + " failed; body=" + ID);
  }), /^Error: Supabase REST read failed: network error or timeout$/);
});

test("outbound reads have a 20-second timeout and report aborts safely", async (t) => {
  t.mock.method(AbortSignal, "timeout", (milliseconds) => {
    assert.equal(milliseconds, 20_000);
    return AbortSignal.abort(new DOMException(KEY, "TimeoutError"));
  });
  await assert.rejects(pingSupabase(env, async (_url, { signal }) => {
    signal.throwIfAborted();
  }), /^Error: Supabase REST read failed: network error or timeout$/);
});

test("invalid JSON errors do not expose the response or key", async () => {
  await assert.rejects(pingSupabase(env, async () => ({
    status: 200,
    json: async () => { throw new Error(KEY + ID); },
  })), /^Error: Supabase REST response was not valid JSON$/);
});

test("rejects unexpected payloads instead of reporting false success", async () => {
  for (const payload of [null, {}, { error: "denied" }, [null], [{}], [{ id: 1 }],
    [{ id: ID }, { id: ID }]]) {
    await assert.rejects(pingSupabase(env, async () => Response.json(payload)),
      /Unexpected Supabase REST response/);
  }
});

test("the scheduled handler logs only status, count and schedule metadata", async (t) => {
  const messages = [];
  let requests = 0;
  t.mock.method(globalThis, "fetch", async () => {
    requests++;
    return Response.json([{ id: ID }]);
  });
  t.mock.method(console, "info", (message) => messages.push(message));
  await worker.scheduled(controller, env);
  assert.equal(requests, 1);
  assert.deepEqual(messages.map(JSON.parse), [{
    event: "hyjobs-supabase-keepalive",
    status: "ok",
    httpStatus: 200,
    rows: 1,
    cron: controller.cron,
    scheduledTime: new Date(controller.scheduledTime).toISOString(),
  }]);
  assert.ok(!messages.join("").includes(KEY));
  assert.ok(!messages.join("").includes(ID));
  assert.equal(worker.fetch, undefined);
});

test("the scheduled handler fails the invocation on an unsuccessful SELECT", async (t) => {
  let successes = 0;
  t.mock.method(globalThis, "fetch", async () => new Response(null, { status: 503 }));
  t.mock.method(console, "info", () => { successes++; });
  await assert.rejects(worker.scheduled(controller, env), /HTTP 503/);
  assert.equal(successes, 0);
});

test("cron is every six hours and HTTP access stays disabled", () => {
  const config = readFileSync(new globalThis.URL(
    "../cloudflare/supabase-keepalive/wrangler.toml", import.meta.url), "utf8");
  const publicConfig = readFileSync(new globalThis.URL("../config.public.js", import.meta.url), "utf8");
  const { url } = JSON.parse(publicConfig.match(/window\.HYJOBS_CONFIG\s*=\s*(\{[\s\S]*?\});/)[1]);
  assert.equal(url, URL);
  assert.match(config, /SUPABASE_URL\s*=\s*"https:\/\/lxarzbxymgjomsztftqj\.supabase\.co"/);
  assert.match(config, /crons\s*=\s*\["17 \*\/6 \* \* \*"\]/);
  assert.match(config, /workers_dev\s*=\s*false/);
  assert.match(config, /preview_urls\s*=\s*false/);
  assert.match(config, /routes\s*=\s*\[\]/);
  assert.match(config, /enabled\s*=\s*true/);
  assert.doesNotMatch(config, /SUPABASE_PUBLISHABLE_KEY\s*=/);
});
