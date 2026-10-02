"""Exercise all 15 question types and media persistence against the local server."""
import base64,json,urllib.request,urllib.error
from helpers import BASE, client, call, signup
host,_,_=signup()
a,b=client(),client()
png=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1kAAAAASUVORK5CYII=')
def upload(data,mime,name,expect=200):
    boundary='squizz-test-boundary'
    body=(f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="{name}"\r\nContent-Type: {mime}\r\n\r\n'.encode()+data+f'\r\n--{boundary}--\r\n'.encode())
    req=urllib.request.Request(BASE+'/api/media',data=body,headers={'Content-Type':f'multipart/form-data; boundary={boundary}'})
    try:r=host.open(req,timeout=60);status=r.status;out=json.load(r)
    except urllib.error.HTTPError as e:status=e.code;out=json.load(e)
    assert status==expect,(status,out)
    return out
upload(b'<html>not an image</html>','image/png','fake.png',400)
# Photos over 2 MB (not optimised by the editor) and GIFs over 5 MB are refused by the server.
upload(png+b'\0'*(2*1024*1024),'image/png','lourde.png',413)
upload(b'GIF89a'+b'\0'*(5*1024*1024),'image/gif','lourd.gif',413)
media=upload(png,'image/png','pixel.png')['media']
assert host.open(BASE+media['url']).read()==png
r=host.open(urllib.request.Request(BASE+media['url'],headers={'Range':'bytes=0-7'}))
assert r.status==206 and r.read()==png[:8]
# Blind test extract: an MP3 is accepted as audio, a renamed file is not.
mp3=b'ID3\x03\x00\x00\x00\x00\x00\x0a'+b'\0'*64
upload(b'<html>not a song</html>','audio/mpeg','fake.mp3',400)
song=upload(mp3,'audio/mp3','extrait.mp3')['media']
assert song['kind']=='audio' and host.open(BASE+song['url']).headers['Content-Type']=='audio/mpeg'
song['caption']='La Bohème'
q=lambda kind,**extra:dict(type=kind,text='Test '+kind,duration=240,**extra)
questions=[q('quiz',options=['A','B','C','D'],multiple=True,correctAnswers=[0,2],points='double'),q('truefalse',correctAnswers=[1],points='none'),q('text',accepted=['Éléphant']),q('blindtest',accepted=['La Bohème','Aznavour'],media=[song]),q('slider',target=50,tolerance=2),q('pin',media=[media]),q('puzzle',options=['Premier','Deuxième','Troisième'],order=[0,1,2]),q('poll',options=['Oui','Non'],multiple=True),q('scale'),q('nps'),q('pinpoll',media=[media]),q('wordcloud'),q('open'),q('brainstorm'),q('slide',body='Fin de la présentation',media=[{'kind':'youtube','url':'https://youtu.be/dQw4w9WgXcQ','caption':'YouTube'},{'kind':'link','url':'https://example.com/','caption':'Lien'}])]
id=call(host,'save',quiz={'title':'Tous les formats','questions':questions})['quiz']['id']
saved=next(q for q in call(host,'list')['quizzes'] if q['id']==id)
assert saved['questions'][5]['media'][0]['url']==media['url']
code=call(host,'create',quizId=id)['code']
call(a,'join',code=code,name='Alice');call(b,'join',code=code,name='Bob');call(host,'start',code=code)
for index,original in enumerate(questions):
    s=call(a,'state',code=code);question=s['question'];kind=question['type']
    assert kind==original['type'] and s['duration']==240
    if kind=='slide':
        assert s['revealed'] and question['body']=='Fin de la présentation'
        call(a,'answer',expect=400,code=code,question=index,answer={'text':'No'})
        call(host,'next',code=code,question=index);continue
    for secret in ['correctAnswers','accepted','target','pin','order']:assert secret not in question
    answer={'quiz':{'choices':[0,2]},'truefalse':{'choices':[1]},'text':{'text':'elephant'},'blindtest':{'text':'la boheme'},'slider':{'value':52},'pin':{'x':.5,'y':.5},'poll':{'choices':[0,1]},'scale':{'value':5},'nps':{'value':10},'pinpoll':{'x':.3,'y':.6},'wordcloud':{'text':'Équipe'},'open':{'text':'Mon avis'},'brainstorm':{'ideas':['Idée 1','Idée 2']}}.get(kind)
    if kind=='puzzle':answer={'order':[question['options'].index(x) for x in ['Premier','Deuxième','Troisième']]}
    if kind=='blindtest':
        # The extract plays on the host's screen only: players get no link or caption before the reveal.
        assert question['media']==[] and call(host,'state',code=code)['question']['media']==[song]
        call(host,'save',expect=400,quiz={'title':'Sans extrait','questions':[q('blindtest',accepted=['x'])]})
    call(a,'answer',code=code,question=index,answer=answer)
    interim=call(a,'state',code=code);assert interim['personal'] is None and interim['aggregate'] is None
    call(a,'answer',code=code,question=index,answer=answer)  # sent twice: counted once
    assert call(a,'state',code=code)['answered']==1
    call(b,'answer',code=code,question=index,answer=answer)
    s=call(a,'state',code=code)
    assert s['revealed'] and s['aggregate']['responses']==2
    if kind=='blindtest':assert s['question']['media']==[song] and s['personal']['outcome']=='correct' and s['personal']['points']>0
    if kind=='quiz':assert s['personal']['points']>1000
    if kind=='truefalse':assert s['personal']['points']==0 and s['personal']['outcome']=='correct' and s['personal']['correctCount']==2
    if kind=='nps':assert s['aggregate']['nps']==100
    if kind=='wordcloud':assert s['aggregate']['texts'][0]['count']==2
    if index>=7:assert s['personal']['points']==0 and s['personal']['outcome']=='opinion'
    call(host,'next',code=code,question=index)
s=call(a,'state',code=code)
assert s['phase']=='finished' and s['totalScored']==7 and s['personal']['correctCount']==7
print('PASS: 15 types played end-to-end; blind test extract hidden from players; configurable timers, double/no points, exact multi-selection, hidden answers, media upload/read/range, NPS, word cloud, slide and final total.')
