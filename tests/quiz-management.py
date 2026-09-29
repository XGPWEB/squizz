"""Run against a local SQuizz preview: python3 tests/quiz-management.py."""
import urllib.request, urllib.error
from helpers import BASE, client, call, signup
owner,_,_=signup()
other,_,_=signup()
anon=client()
call(anon,'list',expect=401)
call(anon,'save',expect=401,quiz={'title':'x','questions':[]})
q=lambda title,n=1:{'title':title,'questions':[{'text':f'Question {i}','options':['a','b','c','d'],'correct':0} for i in range(n)]}
qid=call(owner,'save',quiz=q('Avant'))['quiz']['id']

# Update keeps the id, validates input and is restricted to the owner.
updated=call(owner,'update',quizId=qid,quiz=q('Après',2))['quiz']
assert updated['id']==qid and updated['title']=='Après' and len(updated['questions'])==2
mine=[x for x in call(owner,'list')['quizzes'] if x['id']==qid]
assert len(mine)==1 and mine[0]['title']=='Après'
call(owner,'update',expect=400,quizId=qid,quiz={'title':'','questions':[]})
call(other,'update',expect=404,quizId=qid,quiz=q('Piraté'))
call(owner,'update',expect=403,quizId='general',quiz=q('Démo'))

# A running game keeps its snapshot after the quiz is deleted.
code=call(owner,'create',quizId=qid)['code']
call(other,'delete',expect=404,quizId=qid)
call(owner,'delete',expect=403,quizId='general')
call(owner,'delete',quizId=qid)
call(owner,'delete',expect=404,quizId=qid)
assert all(x['id']!=qid for x in call(owner,'list')['quizzes'])
call(owner,'create',expect=404,quizId=qid)
assert call(owner,'state',code=code)['title']=='Après'

# Mutations are POST-only; unknown actions are rejected.
try: urllib.request.urlopen(BASE+'/api/game?action=delete&quizId=x'); raise AssertionError('GET delete accepted')
except urllib.error.HTTPError as e: assert e.code==405
call(owner,'nope',expect=400)
call(owner,'toString',expect=400)
print('PASS: quiz update, delete, ownership, demo protection, snapshot survival and method checks.')
