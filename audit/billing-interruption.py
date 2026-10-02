import json, os, pathlib, re, secrets, subprocess, sys, urllib.parse
root=pathlib.Path('/Users/xaviergerinette/SQuizz/squizz')
assert os.environ.get('NEXT_DIST_DIR') == '.next-e2e', 'Workflow e2e isolé obligatoire'
sys.path.insert(0,str(root/'tests'))
os.environ['SQUIZZ_URL']='http://127.0.0.1:5174'
from helpers import signup, request, mock
raw=next(l.split('=',1)[1].strip().strip('"') for l in (root/'.env').read_text().splitlines() if l.startswith('DATABASE_URL='))
u=urllib.parse.urlsplit(raw)
assert u.hostname in ('localhost','127.0.0.1')
db=urllib.parse.urlunsplit((u.scheme,u.netloc,'/squizz_e2e','',''))
c,_,_=signup('Audit interruption '+secrets.token_hex(4))
org=request(c,'GET','/api/org')['organization']['id']
assert re.fullmatch('[a-z0-9]+',org)
def sql(query):
    subprocess.run(['/opt/homebrew/bin/psql',db,'-v','ON_ERROR_STOP=1','-qc',query],check=True,capture_output=True)
sql("CREATE FUNCTION audit_checkout_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.id = '"+org+"' AND NEW.\"checkoutSessionId\" IS NOT NULL THEN RAISE EXCEPTION 'AUDIT simulated persistence failure'; END IF; RETURN NEW; END; $$; CREATE TRIGGER audit_checkout_failure BEFORE UPDATE ON \"Organization\" FOR EACH ROW EXECUTE FUNCTION audit_checkout_failure();")
try:
    first=request(c,'POST','/api/billing/checkout',{'plan':'PRO'},expect=None)
finally:
    sql('DROP TRIGGER audit_checkout_failure ON "Organization"; DROP FUNCTION audit_checkout_failure();')
second=request(c,'POST','/api/billing/checkout',{'plan':'PRO'},expect=None)
opened=[s for s in mock('state')['sessions'].values() if s['status']=='open' and s.get('organizationId')==org]
result={'name':'checkout_persistence_failure','first':first,'retry':second,'open_sessions':len(opened),'session_ids':[s['id'] for s in opened]}
print(json.dumps(result,ensure_ascii=False,indent=2))
pathlib.Path('/tmp/squizz-billing-interruption.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
