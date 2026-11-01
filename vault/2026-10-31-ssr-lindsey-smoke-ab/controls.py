"""Read-only, origin-scoped Smoke HTTP controls; no redirects or raw metadata."""
import json, os, pathlib, sys, urllib.request, urllib.error
from html.parser import HTMLParser
from deploy_smoke import api, PROJECT, TEAM, OUT, SHA

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args): return None

class RootMarker(HTMLParser):
    def __init__(self): super().__init__(); self.ssr = False
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get('id') == 'root': self.ssr = attrs.get('data-server-rendered') == 'true'

def main():
    cohort, target = sys.argv[1:]
    assert cohort in ['A','B'] and target in ['candidate','alias']
    assert cohort == 'A' or target == 'candidate'
    destination = OUT/(cohort+'-'+target+'-controls.json')
    assert not destination.exists(), 'Controls already attempted; no rerun'
    record = json.loads((OUT/(cohort+'-deployment.json')).read_text())
    deployed = api('/v13/deployments/'+record['id']+'?teamId='+TEAM)
    assert deployed['projectId'] == PROJECT and deployed['readyState'] == 'READY'
    assert deployed.get('meta',{}).get('githubCommitSha') == SHA
    host = deployed['url'] if target == 'candidate' else 'sparkle-suite-smoke.vercel.app'
    if target == 'alias':
        alias = api('/v4/aliases/'+host+'?teamId='+TEAM)
        assert alias['projectId'] == PROJECT and (alias.get('deploymentId') or alias['deployment']['id']) == record['id']
    project = api('/v9/projects/'+PROJECT+'?teamId='+TEAM)
    assert project['id'] == PROJECT
    bypasses = [(key,value) for key,value in project.get('protectionBypass',{}).items() if value.get('scope') == 'automation-bypass']
    assert len(bypasses) == 1, 'Unambiguous existing automation bypass required'
    bypass = bypasses[0][0]
    opener = urllib.request.build_opener(NoRedirect)
    rows=[]
    for slug in ['milehighfizz','dudesfizzfest','blingkitchen','smokecodex']:
        for page,path in [('home',''),('trade','/trade'),('join','/join')]:
            expected = slug == 'dudesfizzfest' or (slug == 'milehighfizz' and cohort == 'A')
            req = urllib.request.Request('https://'+host+'/'+slug+path,headers={'x-vercel-protection-bypass':bypass})
            row = dict(slug=slug,page=page,expectedSSR=expected,status=None,serverRendered=None,pass_=False)
            try:
                with opener.open(req,timeout=60) as response:
                    row['status']=response.status
                    marker=RootMarker(); marker.feed(response.read().decode('utf8'))
                    row['serverRendered']=marker.ssr
                    row['pass_']=response.status == 200 and marker.ssr == expected
            except urllib.error.HTTPError as error: row['status']=error.code
            except Exception: row['error']='GET failed; raw details suppressed'
            rows.append(row)
            destination.write_text(json.dumps(dict(cohort=cohort,target=target,host=host,deploymentId=record['id'],sha=SHA,rows=rows,passed=sum(r['pass_'] for r in rows),total=12),indent=2))
            print(json.dumps(row),flush=True)
    print(json.dumps({'cohort':cohort,'target':target,'passed':sum(r['pass_'] for r in rows),'total':12}))
    return 0 if all(r['pass_'] for r in rows) else 1

if __name__ == '__main__':
    try: sys.exit(main())
    except Exception:
        print('Smoke control preparation failed; details suppressed. No requests retried.')
        sys.exit(1)
