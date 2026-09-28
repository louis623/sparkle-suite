// Read-only. Never prints secret values. VERCEL_TOKEN stays in the process environment.
import { TEAM, targetFor, assertEnvironment, assertDeployment, assertCronDisabled } from './guards.mjs';
const [product, deploymentId, sha] = process.argv.slice(2);
const target = targetFor(product);
if (!process.env.VERCEL_TOKEN) throw Error('Set VERCEL_TOKEN from an authenticated secret store');
async function get(path) {
  const response = await fetch(`https://api.vercel.com${path}${path.includes('?') ? '&' : '?'}teamId=${TEAM}`, {headers:{Authorization:`Bearer ${process.env.VERCEL_TOKEN}`}});
  if (!response.ok) throw Error(`Vercel read failed: ${response.status}`);
  return response.json();
}
const project = await get(`/v9/projects/${target.project}`);
assertCronDisabled(product, project);
const envResponse = await get(`/v10/projects/${target.project}/env?decrypt=true`);
const decrypted = [];
for (const entry of envResponse.envs) {
  const detail = await get(`/v1/projects/${target.project}/env/${entry.id}`);
  if (!detail.decrypted) throw Error('Cannot verify encrypted env value');
  decrypted.push({...entry,value:detail.value});
}
for (const scope of ['preview','production']) {
  const env = Object.fromEntries(decrypted.filter(e => e.target.includes(scope)).map(e => [e.key,e.value]));
  assertEnvironment(product, env);
}
if (deploymentId) {
  assertDeployment(product, await get(`/v13/deployments/${encodeURIComponent(deploymentId)}`), sha);
  const alias = await get(`/v4/aliases/${new URL(target.origin).hostname}`);
  if (alias.deploymentId !== deploymentId && alias.deployment?.id !== deploymentId) throw Error('Smoke alias deployment mismatch');
}
console.log(JSON.stringify({product,project:target.project,stagingRef:target.ref,origin:target.origin,environment:'verified',cron:'verified',deployment:deploymentId ?? 'not checked'}));
