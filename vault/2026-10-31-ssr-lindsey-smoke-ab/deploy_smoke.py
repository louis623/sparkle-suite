"""One deployment attempt per invocation; credential values never printed."""
import json, os, pathlib, subprocess, sys, tempfile, urllib.request

ROOT = pathlib.Path('/workspace/codex-runs/lindsey-smoke-ab-source')
OUT = pathlib.Path(__file__).parent
PROJECT = 'prj_VTY0rpz2O3VBJqJv69iBz8tzLexQ'
TEAM = 'team_kvcmZ4RlZB0Hah65NE3280x5'
SHA = '5eaefb1f0e903c7d0b2b0a78389672c7920aab6c'
BRANCH = 'codex/ssr-per-rep-allowlist'

def api(path):
    req = urllib.request.Request('https://api.vercel.com' + path,
        headers={'Authorization': 'Bearer ' + os.environ['VERCEL_TOKEN']})
    with urllib.request.urlopen(req, timeout=30) as response:
        return json.load(response)

def main():
    label = sys.argv[1]
    assert label in ['A', 'B']
    receipt = OUT / (label + '-deployment.json')
    assert not receipt.exists(), 'Attempt already recorded; no retry'
    assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip() == SHA
    assert subprocess.check_output(['git','branch','--show-current'],cwd=ROOT,text=True).strip() == BRANCH
    assert not subprocess.check_output(['git','status','--porcelain'],cwd=ROOT,text=True).strip()
    alias = api('/v4/aliases/sparkle-suite-smoke.vercel.app?teamId=' + TEAM)
    assert alias['projectId'] == PROJECT
    assert (alias.get('deploymentId') or alias['deployment']['id']) == 'dpl_2tsBNUCP3cFyvf9Au155cMTX3s51'
    plan = json.loads((ROOT/'vault/2026-10-29-release-ssr-finder/planned-deployment-env-names.json').read_text())
    names = plan['plannedOverrideNames']
    assert len(names) == len(set(names)) == 39
    env = {name: '' for name in names}
    metadata = api('/v10/projects/' + PROJECT + '/env?teamId=' + TEAM)
    for name in plan['bindingNames']:
        matches = [r for r in metadata['envs'] if r['key'] == name and 'preview' in r.get('target',[]) and not r.get('gitBranch')]
        assert len(matches) == 1, 'Ambiguous Smoke binding source'
        value = api('/v1/projects/' + PROJECT + '/env/' + matches[0]['id'] + '?teamId=' + TEAM)
        assert value.get('decrypted') and value.get('value'), 'Smoke binding unavailable'
        env[name] = str(value['value']).strip().strip('"').strip()
    env.update(NEXT_PUBLIC_SPARKLE_ENVIRONMENT='smoke', SPARKLE_ENVIRONMENT='smoke',
        SPARKLE_RELEASE_REPOSITORY='louis623/sparkle-suite', SPARKLE_RELEASE_BRANCH=BRANCH,
        REP_RENDER_V2_SLUGS='dudesfizzfest,milehighfizz' if label == 'A' else 'dudesfizzfest')
    assert set(env) == set(names)
    config = json.loads((ROOT/'scripts/smoke-environment/vercel.json').read_text())
    config.update(env=env, build={'env': env})
    receipt.write_text(json.dumps({'attemptStarted': True, 'sha': SHA, 'projectId': PROJECT, 'cohort': label}))
    with tempfile.TemporaryDirectory(prefix='lindsey-smoke-deploy-', dir='/tmp') as tmp:
        config_path = pathlib.Path(tmp)/'vercel.json'
        config_path.write_text(json.dumps(config)); config_path.chmod(0o600)
        args = ['vercel','deploy','--yes','--target','preview','--no-wait','--format','json',
            '--project',PROJECT,'--scope',TEAM,'--local-config',str(config_path),
            '--meta','githubCommitSha='+SHA,'--meta','githubCommitRef='+BRANCH,'--meta','ssrSmokeCohort='+label]
        result = subprocess.run(args,cwd=ROOT,env={**os.environ,'VERCEL_PROJECT_ID':PROJECT,'VERCEL_ORG_ID':TEAM},capture_output=True,text=True)
        if result.returncode:
            receipt.write_text(json.dumps({'attemptStarted':True,'sha':SHA,'projectId':PROJECT,'cohort':label,'creationFailed':True,'exitCode':result.returncode}))
            print('Deployment creation failed; raw output suppressed. STOP; no retry.')
            return result.returncode
        data = json.loads(result.stdout)
        for key in ['deployment','result']:
            if key in data and isinstance(data[key],dict): data = data[key]
        safe = {key:data.get(key) for key in ['id','url','readyState','projectId','target']}
        assert safe['id'] and safe['url'], 'Creation response missing deployment identity; no retry'
        safe.update(sha=SHA,cohort=label,overrideNames=names,runtimeOverrideCount=39,buildOverrideCount=39)
        receipt.write_text(json.dumps(safe,indent=2))
        print(json.dumps(safe))
    return 0

if __name__ == '__main__':
    try: sys.exit(main())
    except Exception:
        print('Smoke preparation/deployment failed; details suppressed. STOP; no retry.')
        sys.exit(1)
