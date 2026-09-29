"""Run against a local SQuizz preview: python3 tests/game-flow.py."""
import http.cookiejar, json, urllib.request, urllib.error
BASE='http://127.0.0.1:5173/api/game'
def client(): return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
def call(c,action,expect=200,**data):
    req=urllib.request.Request(BASE,data=json.dumps(dict(action=action,**data)).encode(),headers={'Content-Type':'application/json'})
    try:
        r=c.open(req); status=r.status; out=json.load(r)
    except urllib.error.HTTPError as e: status=e.code;out=json.load(e)
    assert status==expect,(action,status,out)
    return out
host,a,b,stranger=client(),client(),client(),client()
quiz={'title':'Test fonctionnel','questions':[{'text':'Deux plus deux ?','options':['3','4','5','6'],'correct':1},{'text':'La planète rouge ?','options':['Mars','Terre','Vénus','Jupiter'],'correct':0}]}
call(host,'save',expect=400,quiz={'title':'Invalide','questions':[]})
qid=call(host,'save',quiz=quiz)['quiz']['id']
assert any(q['id']==qid for q in call(host,'list')['quizzes'])
assert all(q['id']!=qid for q in call(stranger,'list')['quizzes'])
code=call(host,'create',quizId=qid)['code']
call(host,'start',expect=400,code=code)
call(a,'join',code=code,name='Alice')
call(b,'join',expect=400,code=code,name='Alice')
call(b,'join',code=code,name='Bob')
call(a,'start',expect=403,code=code)
call(stranger,'state',expect=403,code=code)
call(host,'start',code=code)
call(stranger,'join',expect=400,code=code,name='Late')
for index,correct in enumerate([1,0]):
    state=call(a,'state',code=code)
    assert state['index']==index and 'correct' not in state['question']
    assert state['personal'] is None
    call(host,'next',expect=400,code=code,question=index)
    call(a,'answer',code=code,question=index,choice=correct)
    call(a,'answer',expect=400,code=code,question=index,choice=correct)
    hidden=call(a,'state',code=code)
    assert hidden['personal'] is None
    if index==0: assert all(p['score']==0 for p in hidden['players'])
    call(b,'answer',code=code,question=index,choice=3)
    state=call(a,'state',code=code)
    assert state['revealed'] and state['question']['correct']==correct
    assert state['myAnswer']['points']>0
    assert state['personal']['outcome']=='correct' and state['personal']['rank']==1
    assert state['personal']['points']>0 and state['personal']['correctCount']==index+1
    loser=call(b,'state',code=code)
    assert loser['personal']['outcome']=='incorrect' and loser['personal']['rank']==2
    call(host,'next',code=code,question=index)
state=call(host,'state',code=code)
assert call(a,'state',code=code)['personal']['correctCount']==2
assert state['phase']=='finished' and state['players'][0]['name']=='Alice'
assert state['players'][0]['score']>state['players'][1]['score']
print('PASS: quiz validation, durable save, ownership, lobby, host permissions, hidden answers, duplicate answers, scoring, progression and final ranking.')
