"""Additional probes: only in the isolated audit copy, local fake Stripe and dedicated database."""
import concurrent.futures, json, os, pathlib, secrets, subprocess, threading, time
import sys
ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tests"))
from helpers import BASE, client, call, request, signup, mock, sql, admin_login, env, set_plan
assert os.environ['DATABASE_URL'].split('?')[0].endswith('/squizz_audit_oct02_test')
assert BASE.endswith(':5274')
root = ROOT
output = pathlib.Path(os.environ.get("AUDIT_RESULTS_DIR", "/private/tmp/squizz-audit-oct02-results"))
output.mkdir(parents=True, exist_ok=True)
results=[]
def record(name, **details):
    results.append(dict(name=name, **details))
    (output/'deep-oct02-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
    print(json.dumps(results[-1],ensure_ascii=False),flush=True)

def buy(c): return request(c,'POST','/api/billing/checkout',{'pass':True},expect=None)

# Concurrent pass requests: warm the endpoint and customer without leaving a reusable page.
mock('reset',{})
c,_,_=signup('Audit pass concurrency '+secrets.token_hex(4))
buy(c)
mock('expire',{'session':next(iter(mock('state')['sessions']))})
mock('delay',{'path':'/v1/checkout/sessions','method':'POST','ms':600})
barrier=threading.Barrier(4)
def parallel(_):
    barrier.wait(); return buy(c)
try:
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        replies=list(pool.map(parallel,range(4)))
finally: mock('delay',{'clear':True})
opened=[s for s in mock('state')['sessions'].values() if s['status']=='open']
record('event_pass_concurrent',distinct_urls=len({r.get('url') for r in replies}),open_sessions=len(opened),errors=[r.get('error') for r in replies if r.get('error')])

# Deleting an organisation while a pass page is being created.
mock('reset',{})
c,_,pw=signup('Audit pass deletion '+secrets.token_hex(4))
buy(c)
mock('expire',{'session':next(iter(mock('state')['sessions']))})
org_id=request(c,'GET','/api/org')['organization']['id']
mock('delay',{'path':'/v1/checkout/sessions','method':'POST','ms':2000})
try:
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        future=pool.submit(buy,c)
        time.sleep(.7)
        deletion=request(c,'DELETE','/api/account',{'password':pw},expect=None)
        reply=future.result()
finally: mock('delay',{'clear':True})
opened=[s for s in mock('state')['sessions'].values() if s['status']=='open' and s.get('metadata',{}).get('organizationId')==org_id]
record('event_pass_delete_race',deletion=deletion,checkout=reply,organization_exists=int(sql(f'''SELECT count(*) FROM "Organization" WHERE id='{org_id}' ''')),open_sessions=len(opened))

# A caught 500 in the central game API should still appear in monitoring.
c,email,pw=signup('Audit API alerts '+secrets.token_hex(4))
mark='AUDIT_GAME_FAILURE_'+secrets.token_hex(4)
sql(f'''CREATE FUNCTION audit_game_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.title = '{mark}' THEN RAISE EXCEPTION '{mark}'; END IF; RETURN NEW; END; $$; CREATE TRIGGER audit_game_failure BEFORE INSERT ON "Quiz" FOR EACH ROW EXECUTE FUNCTION audit_game_failure();''')
try: reply=call(c,'save',expect=None,quiz={'title':mark,'questions':[{'text':'Q','options':['a','b'],'correct':0}]})
finally: sql('DROP TRIGGER audit_game_failure ON "Quiz"; DROP FUNCTION audit_game_failure();')
time.sleep(1)
alerts=int(sql(f'''SELECT count(*) FROM "SystemAlert" WHERE message LIKE '%{mark}%' '''))
record('game_api_monitoring',response=reply,recorded_alerts=alerts,all_game_api_alerts=int(sql("SELECT count(*) FROM \"SystemAlert\" WHERE context->>'path'='/api/game'")))

# A failed password write should not destroy a reset link that has changed nothing.
uid=sql(f'''SELECT id FROM "User" WHERE email='{email}' ''')
admin=admin_login(client(),env('SEED_SUPER_ADMIN_EMAIL'),env('SEED_SUPER_ADMIN_PASSWORD'))
link=request(admin,'POST',f'/api/admin/users/{uid}/reset')['link']
token=link.rsplit('/',1)[1]
sql(f'''CREATE FUNCTION audit_password_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.id = '{uid}' AND NEW."passwordHash" <> OLD."passwordHash" THEN RAISE EXCEPTION 'AUDIT_PASSWORD_FAILURE'; END IF; RETURN NEW; END; $$; CREATE TRIGGER audit_password_failure BEFORE UPDATE ON "User" FOR EACH ROW EXECUTE FUNCTION audit_password_failure();''')
try: first=request(client(),'POST','/api/account/reset',{'token':token,'password':'Audit-nouveau-mdp-123'},expect=None)
finally: sql('DROP TRIGGER audit_password_failure ON "User"; DROP FUNCTION audit_password_failure();')
retry=request(client(),'POST','/api/account/reset',{'token':token,'password':'Audit-nouveau-mdp-123'},expect=None)
record('reset_persistence_failure',first=first,retry=retry,token_marked_used=sql(f'''SELECT ("usedAt" IS NOT NULL)::text FROM "PasswordResetToken" WHERE "userId"='{uid}' '''))

# A queued join must not keep a Premium cap after the organisation is downgraded.
name='Audit queued join '+secrets.token_hex(4)
c,_,_=signup(name); oid=set_plan(name,'PREMIUM')
code=call(c,'create',quizId='geo')['code']
db=os.environ['DATABASE_URL'].split('?')[0]
locker=subprocess.Popen(['psql',db,'-X','-qAt'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
locker.stdin.write(f"BEGIN; SELECT pg_advisory_xact_lock(hashtext('{code}')); SELECT 'AUDIT_LOCK_READY';\n");locker.stdin.flush()
while locker.stdout.readline().strip()!='AUDIT_LOCK_READY': pass
players=[client() for _ in range(6)]
try:
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        futures=[pool.submit(call,p,'join',None,code=code,name=f'Queued-{i}') for i,p in enumerate(players)]
        time.sleep(.7)
        request(admin,'PATCH',f'/api/admin/organizations/{oid}',{'plan':'FREE'})
        locker.stdin.write('COMMIT;\\q\n');locker.stdin.flush()
        replies=[f.result() for f in futures]
finally:
    locker.terminate();locker.wait(timeout=5)
state=call(c,'state',code=code)
record('join_downgrade_race',limit=state['maxPlayers'],players=len(state['players']),rejected=sum('error' in r for r in replies))

# Fixture for a browser check; only test credentials, never production.
name='Audit browser '+secrets.token_hex(4)
c,email,pw=signup(name);set_plan(name,'PRO')
qid=call(c,'save',quiz={'title':'Audit du blind test','questions':[{'type':'blindtest','text':'Quel artiste ?','accepted':['Aznavour'],'media':[{'kind':'youtube','url':'https://youtu.be/dQw4w9WgXcQ?t=43','caption':'Réponse à masquer'}]}]})['quiz']['id']
(output/'browser-fixture-oct02.json').write_text(json.dumps({'email':email,'password':pw,'quizId':qid}))
