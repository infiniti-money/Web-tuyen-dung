// Only the public Cloudflare Turnstile site key is allowed in this file.
// Enabled because Supabase Auth is already requiring CAPTCHA (user observed no captcha_token found).
// NEVER commit the Turnstile secret key; enter it only in Supabase Dashboard.
window.HYJOBS_TURNSTILE = { enabled: true, siteKey: '0x4AAAAAAFwnrkqSwSGeSus7' };
