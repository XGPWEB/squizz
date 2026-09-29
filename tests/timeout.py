"""Verify result for an unanswered question against the local preview."""
import http.cookiejar,json,urllib.request,urllib.error,time
c=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
def call(action,**data):
    r=c.open(urllib.request.Request('http://127.0.0.1:5173/api/game',data=json.dumps(dict(action=action,**data)).encode(),headers={'Content-Type':'application/json'}));return json.load(r)
code=call('create',quizId='general')['code']
call('join',code=code,name='Chrono')
call('start',code=code)
time.sleep(21)
s=call('state',code=code)
assert s['revealed'] and s['remaining']==0
assert s['personal']['outcome']=='timeout' and s['personal']['points']==0 and s['personal']['rank']==1
try:
    call('answer',code=code,question=0,choice=1)
    raise AssertionError('Late answer accepted')
except urllib.error.HTTPError as e:
    assert e.code==400
print('PASS: timed-out player receives a zero-point result and rank; late answer rejected.')
