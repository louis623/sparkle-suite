export const TEAM = 'team_kvcmZ4RlZB0Hah65NE3280x5';
export const TARGETS = Object.freeze({
  suite: Object.freeze({ project: 'prj_VTY0rpz2O3VBJqJv69iBz8tzLexQ', ref: 'pukemqiwlyqmyytxkdmo', origin: 'https://sparkle-suite-smoke.vercel.app' }),
  finder: Object.freeze({ project: 'prj_PvqPYv0R3DclFbFmM6vVNX2Q50gl', ref: 'awdwtxcqkqrzgdikrwab', origin: 'https://sparkle-finder-smoke.vercel.app' }),
});
export function targetFor(product) {
  if (!Object.hasOwn(TARGETS, product)) throw Error('Expected suite or finder');
  return TARGETS[product];
}
export function assertEnvironment(product, env) {
  const t = targetFor(product);
  if (env.NEXT_PUBLIC_SUPABASE_URL !== `https://${t.ref}.supabase.co`) throw Error('Wrong database');
  if (env.SPARKLE_ENVIRONMENT !== 'smoke' || env.NEXT_PUBLIC_SPARKLE_ENVIRONMENT !== 'smoke') throw Error('Missing Smoke marker');
  const originKey = product === 'suite' ? 'NEXT_PUBLIC_APP_URL' : 'NEXT_PUBLIC_SITE_URL';
  if (env[originKey] !== t.origin) throw Error('Wrong application origin');
  for (const key of ['SUPABASE_SERVICE_ROLE_KEY', product === 'suite' ? 'NEXT_PUBLIC_SUPABASE_ANON_KEY' : 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY']) {
    let payload;
    try { payload = JSON.parse(Buffer.from(env[key].split('.')[1], 'base64url')); } catch { throw Error(`Invalid staging JWT: ${key}`); }
    if (payload.ref !== t.ref || payload.role !== (key === 'SUPABASE_SERVICE_ROLE_KEY' ? 'service_role' : 'anon')) throw Error(`Wrong staging key: ${key}`);
  }
  const blocked = /^(STRIPE|RESEND|TELNYX|SIGNWELL|OPENAI|ANTHROPIC|PHOTOROOM|GOOGLE_CLIENT|GOOGLE_OAUTH).*?(KEY|TOKEN|SECRET|PASSWORD|CLIENT_ID)$/i;
  for (const [key,value] of Object.entries(env)) {
    if (blocked.test(key) && value) throw Error(`Provider credentials require a separate sandbox review: ${key}`);
    if (/bqhzfkgkjyuhlsozpylf|pzksocboqauqjdtsgpdp|https:\/\/(www\.)?yoursparkle(suite|finder)\.com/i.test(String(value))) throw Error(`Production reference: ${key}`);
  }
  const off = product === 'suite' ? ['SPARKLE_SELF_SERVE_ENABLED','SPARKLE_PRE_SHOW_SMS_ENABLED','SPARKLE_PRE_SHOW_EMAIL_ENABLED','SIGNWELL_SEND_ENABLED','SPARKLE_LAB_MANUAL_RUNS_ENABLED','SPARKLE_LAB_WEEKLY_RUNS_ENABLED','SPARKLE_LAB_MODEL_SYNTHESIS_ENABLED'] : ['SPARKLE_FINDER_ENABLE_PAID_BILLING'];
  for (const key of off) if (env[key] !== 'false') throw Error(`Unsafe feature flag: ${key}`);
  if (product === 'finder') for (const key of ['SPARKLE_SUITE_FINDER_API_BASE_URL','NEXT_PUBLIC_SPARKLE_SUITE_FINDER_API_BASE_URL']) if (env[key] !== TARGETS.suite.origin) throw Error('Wrong Suite bridge');
  return t;
}
export function assertDeployment(product, d, sha) {
  const t = targetFor(product);
  if (!/^[a-f0-9]{40}$/.test(sha)) throw Error('Full immutable SHA required');
  if (d.projectId !== t.project || d.readyState !== 'READY') throw Error('Wrong project or deployment not ready');
  if (d.meta?.githubCommitSha !== sha) throw Error('Deployment source SHA mismatch');
  if (product === 'finder' && d.target === 'production') throw Error('Finder must use true preview target to avoid live-domain redirect');
  return t;
}
export function assertCronDisabled(product, project) {
  if (project.id !== targetFor(product).project) throw Error('Wrong project');
  if (product === 'suite' && !(project.crons?.disabledAt > (project.crons?.enabledAt ?? 0))) throw Error('Suite Smoke cron feature must be disabled');
  if (product === 'finder' && project.crons?.definitions?.length) throw Error('Unexpected Finder scheduled jobs');
}
