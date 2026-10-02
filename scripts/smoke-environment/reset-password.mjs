// Admin password rotation for one synthetic Smoke identity only. Does not delete data.
// node reset-password.mjs suite codex /private/staging-env.json /private/demo-credentials.json
import fs from 'node:fs';
import crypto from 'node:crypto';
import { assertEnvironment } from './guards.mjs';
const [product, person, envFile, credentialFile] = process.argv.slice(2);
if (!['louis','sam','codex'].includes(person)) throw Error('Unknown synthetic persona');
const read = p => JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const env = read(envFile), target = assertEnvironment(product,env), credentials = read(credentialFile);
const entry = credentials[`${product}:${person}`], email = `${person}@smoke.example.test`;
if (!entry || entry.email !== email || !/^[a-f0-9-]{36}$/.test(entry.userId)) throw Error('Missing verified credential record');
const endpoint = `https://${target.ref}.supabase.co/auth/v1/admin/users/${entry.userId}`;
const headers = {apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:`Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,'Content-Type':'application/json'};
const response = await fetch(endpoint,{headers});
if (!response.ok) throw Error(`Identity lookup failed: ${response.status}`);
const user = await response.json();
if (user.id !== entry.userId || user.email !== email || user.app_metadata?.smoke_environment !== 'sparkle-smoke-20260926') throw Error('Identity fence failed');
const password = crypto.randomBytes(24).toString('base64url');
// Save a recoverable pending password before requesting rotation; never print it.
fs.writeFileSync(`${credentialFile}.pending`, JSON.stringify({...entry,password}), {mode:0o600});
const updated = await fetch(endpoint,{method:'PUT',headers,body:JSON.stringify({password})});
if (!updated.ok) throw Error(`Rotation failed: ${updated.status}; existing credential file unchanged`);
entry.password=password;
fs.writeFileSync(credentialFile,JSON.stringify(credentials,null,2),{mode:0o600});
console.log(JSON.stringify({product,email,passwordRotated:true,note:'Refresh encrypted handoff from private credential file. No rows deleted.'}));
