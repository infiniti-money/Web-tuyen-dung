/**
 * Adapted from infiniti-money/Web-Design's cron-only Supabase keepalive.
 * One public SELECT per invocation; no Auth session, writes or private tables.
 */
const EXPECTED_SUPABASE_URL = "https://lxarzbxymgjomsztftqj.supabase.co";

export async function pingSupabase(env, fetchImpl = fetch) {
  if (env?.SUPABASE_URL !== EXPECTED_SUPABASE_URL) {
    throw new Error("Unexpected Supabase project URL");
  }

  const key = env?.SUPABASE_PUBLISHABLE_KEY;
  if (typeof key !== "string" || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) {
    throw new Error("SUPABASE_PUBLISHABLE_KEY must be a publishable key");
  }

  let response;
  try {
    response = await fetchImpl(
      EXPECTED_SUPABASE_URL + "/rest/v1/jobs?select=id&status=eq.published&limit=1",
      {
        method: "GET",
        headers: {
          apikey: key,
          Accept: "application/json",
          "Cache-Control": "no-store",
        },
        cache: "no-store",
        // Workers supports manual/follow, not error. Reject all non-200 responses below.
        // Never forward the API key to a redirect destination.
        redirect: "manual",
        signal: AbortSignal.timeout(20_000),
      },
    );
  } catch {
    // Network exceptions can contain request details. Do not log their contents.
    throw new Error("Supabase REST read failed: network error or timeout");
  }

  if (response.status !== 200) {
    throw new Error("Supabase REST read failed: HTTP " + response.status);
  }

  let rows;
  try {
    rows = await response.json();
  } catch {
    throw new Error("Supabase REST response was not valid JSON");
  }
  if (
    !Array.isArray(rows) ||
    rows.length > 1 ||
    rows.some((row) => !row || typeof row.id !== "string")
  ) {
    throw new Error("Unexpected Supabase REST response: expected at most one job ID");
  }

  // Return only a count. Never return or log keys, row contents, or response bodies.
  return rows.length;
}

export default {
  async scheduled(controller, env) {
    const rows = await pingSupabase(env);
    console.info(JSON.stringify({
      event: "hyjobs-supabase-keepalive",
      status: "ok",
      httpStatus: 200,
      rows,
      cron: controller.cron,
      scheduledTime: new Date(controller.scheduledTime).toISOString(),
    }));
  },
};
