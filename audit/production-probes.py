import json, urllib.request, urllib.error
base='http://127.0.0.1:5190'
def probe(path, body=None, headers=None, method=None):
    req=urllib.request.Request(base+path, data=None if body is None else json.dumps(body).encode(), headers={'Content-Type':'application/json', **(headers or {})}, method=method)
    try:
        with urllib.request.urlopen(req,timeout=30) as r:
            return r.status,r.headers, r.read()
    except urllib.error.HTTPError as e:
        return e.code,e.headers,e.read()
checks=[]
for path in ('/api/org','/api/account/export','/api/admin/organizations','/api/admin/audit','/api/admin/users/x/reset'):
    status,headers,body=probe(path, {} if path.endswith('/reset') else None)
    assert status==401,(path,status)
    checks.append({'path':path,'status':status})
status,headers,_=probe('/connexion')
assert status==200 and "object-src 'none'" in headers.get('Content-Security-Policy','')
assert headers.get('X-Content-Type-Options')=='nosniff'
checks.append({'production_security_headers':'PASS'})
statuses=[probe('/api/account/signup',{}, {'X-Real-IP':'192.0.2.101'})[0] for _ in range(6)]
assert statuses==[400]*5+[429], statuses
checks.append({'production_signup_limit':statuses})
bad=[None,[],0,'bad',{}, {'title':'X','questions':[None]}, {'title':'X','questions':[{'text':'Q','options':{},'correct':0}]}]
statuses=[probe('/api/game',{'action':'save','quiz':draft})[0] for draft in bad]
assert all(s==401 for s in statuses), statuses
checks.append({'unauthenticated_malformed_inputs':statuses})
path='/partie/000000'
status,_,_=probe(path)
checks.append({'unknown_game_page':status})
print(json.dumps(checks,indent=2))
open('/tmp/squizz-prod-results.json','w').write(json.dumps(checks,indent=2))
