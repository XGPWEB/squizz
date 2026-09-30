"""Verify result for an unanswered question against the local preview."""
import time,urllib.error
from helpers import signup, request
c,_,_=signup()
def call(action,**data):
    out=request(c,'POST','/api/game',dict(action=action,**data),expect=None)
    if 'error' in out: raise urllib.error.HTTPError('', 400, out['error'], None, None)
    return out
code=call('create',quizId='general')['code']
call('join',code=code,name='Chrono')
call('start',code=code)
time.sleep(23)
s=call('state',code=code)
assert s['revealed'] and s['remaining']==0
assert s['personal']['outcome']=='timeout' and s['personal']['points']==0 and s['personal']['rank']==1
try:
    call('answer',code=code,question=0,choice=1)
    raise AssertionError('Late answer accepted')
except urllib.error.HTTPError as e:
    assert e.code==400
print('PASS: timed-out player receives a zero-point result and rank; late answer rejected.')
