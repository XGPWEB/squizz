"""Quiz export/import (.squizz): python3 tests/transfer.py (dev server, seeded super-admin)."""
import base64, json, secrets, uuid, urllib.request
from helpers import BASE, client, call, request, signup, set_plan

# A tiny real WebP (1x1) and a fake one (PNG bytes declared as WebP).
WEBP = base64.b64decode('UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=')

def upload(c, data, mime='image/webp'):
    boundary = uuid.uuid4().hex
    body = (f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="x"\r\nContent-Type: {mime}\r\n\r\n').encode() + data + f'\r\n--{boundary}--\r\n'.encode()
    req = urllib.request.Request(BASE + '/api/media', data=body, method='POST', headers={'Content-Type': f'multipart/form-data; boundary={boundary}'})
    return json.loads(c.open(req).read())['media']['url']

tag = secrets.token_hex(3)
src_org, dst_org = f'Org export {tag}', f'Org import {tag}'
src, _, _ = signup(src_org); set_plan(src_org, 'PRO')
dst, _, _ = signup(dst_org); set_plan(dst_org, 'PRO')

url = upload(src, WEBP)
quiz = {'title': 'À exporter', 'questions': [
    {'text': 'Avec image ?', 'options': ['a', 'b'], 'correct': 1, 'media': [{'kind': 'image', 'url': url, 'caption': 'Légende'}]},
    {'type': 'slide', 'text': 'Diapo', 'body': 'Texte', 'media': [{'kind': 'image', 'url': '/originals/management-fpt/code.webp', 'caption': ''}]},
]}
qid = call(src, 'save', quiz=quiz)['quiz']['id']

# Export: the organisation's image is embedded, other links stay as they are.
f = call(src, 'export', quizId=qid)['file']
assert f['format'] == 'squizz-quiz' and len(f['files']) == 1 and base64.b64decode(f['files'][0]['data']) == WEBP
assert f['questions'][0]['media'][0]['url'] == 'squizz-media:1'
assert f['questions'][1]['media'][0]['url'] == '/originals/management-fpt/code.webp'
# Another organisation cannot export it.
call(dst, 'export', expect=404, quizId=qid)

# Import into the other organisation: a new quiz, with its own copy of the image.
key = 'imp-' + secrets.token_hex(8)
imported = call(dst, 'import', file=f, clientKey=key)['quiz']
new_url = imported['questions'][0]['media'][0]['url']
assert imported['title'] == 'À exporter' and imported['mine'] and new_url.startswith('/api/media/') and new_url != url
assert urllib.request.urlopen(BASE + new_url).read() == WEBP
assert imported['questions'][1]['media'][0]['url'] == '/originals/management-fpt/code.webp'
# The same import retried gives the same quiz.
assert call(dst, 'import', file=f, clientKey=key)['quiz']['id'] == imported['id']

# Refused: not a .squizz file, a file whose content lies about its format, invalid questions.
call(dst, 'import', expect=400, file={'title': 'x'})
fake = dict(f, files=[{'ref': '1', 'mime': 'image/webp', 'data': base64.b64encode(b'\x89PNG\r\n\x1a\nfaux').decode()}])
call(dst, 'import', expect=400, file=fake)
call(dst, 'import', expect=400, file=dict(f, questions=[]))
# The quiz quota applies (free plan: 1 quiz).
free, _, _ = signup()
call(free, 'save', quiz={'title': 'Seul', 'questions': [{'text': 'Q', 'options': ['a', 'b'], 'correct': 0}]})
call(free, 'import', expect=403, file=f)

# --- Several different images: one reference each, a repeated image keeps its reference -------------------
import os, threading
from helpers import sql
images = [WEBP + bytes([n]) * (n + 1) for n in range(4)]  # four different files
urls = [upload(src, data) for data in images]
order = [0, 1, 2, 3, 0, 2]  # the first and third images are used twice
rich = {'title': 'Plusieurs images', 'questions': [
    {'text': f'Image {n} ?', 'options': ['a', 'b'], 'correct': 0, 'media': [{'kind': 'image', 'url': urls[i], 'caption': ''}]}
    for n, i in enumerate(order)]}
rich_id = call(src, 'save', quiz=rich)['quiz']['id']
for _ in range(5):  # the files are read in parallel: the result must not depend on which read ends first
    rf = call(src, 'export', quizId=rich_id)['file']
    by_ref = {x['ref']: base64.b64decode(x['data']) for x in rf['files']}
    assert len(rf['files']) == len(by_ref) == 4, [x['ref'] for x in rf['files']]
    refs = [q['media'][0]['url'] for q in rf['questions']]
    assert all(r.startswith('squizz-media:') for r in refs) and refs[4] == refs[0] and refs[5] == refs[2] and len(set(refs)) == 4
    assert [by_ref[r.split(':', 1)[1]] for r in refs] == [images[i] for i in order]
copy = call(dst, 'import', file=rf, clientKey='imp-' + secrets.token_hex(8))['quiz']
copied = [q['media'][0]['url'] for q in copy['questions']]
assert [urllib.request.urlopen(BASE + u).read() for u in copied] == [images[i] for i in order]
assert copied[4] == copied[0] and len(set(copied)) == 4  # one stored copy per image

# --- A refused import leaves nothing behind: no quiz, no file, no quota used -----------------------------
MEDIA_DIR = os.environ['MEDIA_DIR']
oid = lambda name: sql(f"""SELECT id FROM "Organization" WHERE name = '{name}'""")
state = lambda org: (int(sql(f"""SELECT count(*) FROM "Quiz" WHERE "organizationId" = '{org}'""")),
                     sql(f"""SELECT count(*), coalesce(sum(size), 0) FROM "Media" WHERE "organizationId" = '{org}'"""),
                     len(os.listdir(MEDIA_DIR)))
dst_id = oid(dst_org)
before = state(dst_id)
bad_question = dict(rf, questions=rf['questions'] + [{'text': '', 'options': ['seule'], 'correct': 3}])
call(dst, 'import', expect=400, file=bad_question)  # valid media first, an invalid question after them
bad_media = dict(rf, files=rf['files'][:3] + [dict(rf['files'][3], data=base64.b64encode(b'\x89PNG\r\n\x1a\nfaux').decode())])
call(dst, 'import', expect=400, file=bad_media)     # three valid files, then one that lies about its format
call(dst, 'import', expect=400, file=dict(rf, files=rf['files'] + [rf['files'][0]]))  # two files, one reference
call(dst, 'import', expect=400, file=dict(rf, files=rf['files'][1:]))                 # a referenced file is missing
call(dst, 'import', expect=400, file=dict(rf, title=''))
assert state(dst_id) == before, (before, state(dst_id))
assert urllib.request.urlopen(BASE + copied[0]).read() == images[0]  # what was there is untouched

# Quotas are checked before anything is stored: quiz quota, then media quota (free plan: 1 quiz, 10 Mo).
free_org = f'Org gratuite {tag}'
tight, _, _ = signup(free_org)
free_id = oid(free_org)
key = 'imp-' + secrets.token_hex(8)
first = call(tight, 'import', file=rf, clientKey=key)['quiz']
full = state(free_id)
assert full[0] == 1 and full[1].startswith('4|')
call(tight, 'import', expect=403, file=rf, clientKey='imp-' + secrets.token_hex(8))  # another quiz: quota reached
assert state(free_id) == full
# The same request retried (answer lost on the way) gets its quiz back, although the quota is now reached.
again = call(tight, 'import', file=rf, clientKey=key)['quiz']
assert again['id'] == first['id'] and state(free_id) == full
MP4 = lambda mb, n: b'\x00\x00\x00\x18ftypmp42' + bytes([n]) * (mb * 1024 * 1024)
heavy = {'format': 'squizz-quiz', 'version': 1, 'title': 'Trop lourd', 'files': [
    {'ref': str(n), 'mime': 'video/mp4', 'data': base64.b64encode(MP4(6, n)).decode()} for n in (1, 2)],
    'questions': [{'text': 'Vidéo ?', 'options': ['a', 'b'], 'correct': 0, 'media': [{'kind': 'video', 'url': f'squizz-media:{n}', 'caption': ''}]} for n in (1, 2)]}
roomy_org = f'Org vide {tag}'
roomy, _, _ = signup(roomy_org)  # no quiz yet, but 12 Mo of media do not fit in 10 Mo
out = call(roomy, 'import', expect=429, file=heavy)
assert 'limite' in out['error'] and state(oid(roomy_org))[:2] == (0, '0|0'), out

# --- The same import sent several times at once: one quiz, and only its media ----------------------------
race_org = f'Org course {tag}'
racer, _, _ = signup(race_org); set_plan(race_org, 'PRO')
race_id = oid(race_org)
files_before = len(os.listdir(MEDIA_DIR))
key, answers = 'imp-' + secrets.token_hex(8), []
threads = [threading.Thread(target=lambda: answers.append(call(racer, 'import', expect=None, file=rf, clientKey=key))) for _ in range(5)]
[t.start() for t in threads]; [t.join() for t in threads]
assert len({a['quiz']['id'] for a in answers}) == 1, answers
kept = {q['media'][0]['url'] for q in answers[0]['quiz']['questions']}
assert state(race_id)[:2] == (1, f'4|{sum(len(i) for i in images)}'), state(race_id)
assert len(os.listdir(MEDIA_DIR)) == files_before + 4
assert {u.rsplit('/', 1)[1] for u in kept} == set(sql(f"""SELECT id FROM "Media" WHERE "organizationId" = '{race_id}'""").split())

# --- Same ceiling on export and import: a quiz too heavy for a file is refused with an explanation -------
big_urls = [upload(src, MP4(8, n), 'video/mp4') for n in (1, 2)]  # 16 Mo of video: above the 14 Mo of a file
big_id = call(src, 'save', quiz={'title': 'Vidéos lourdes', 'questions': [
    {'text': 'Vidéo ?', 'options': ['a', 'b'], 'correct': 0, 'media': [{'kind': 'video', 'url': u, 'caption': ''}]} for u in big_urls]})['quiz']['id']
out = call(src, 'export', expect=413, quizId=big_id)
assert '16 Mo' in out['error'] and '14 Mo' in out['error'] and 'YouTube' in out['error'], out
# Just under the ceiling: exported, and that very file is imported back.
ok_id = call(src, 'save', quiz={'title': 'Vidéo de 8 Mo', 'questions': [
    {'text': 'Vidéo ?', 'options': ['a', 'b'], 'correct': 0, 'media': [{'kind': 'video', 'url': big_urls[0], 'caption': ''}]}]})['quiz']['id']
back = call(dst, 'import', file=call(src, 'export', quizId=ok_id)['file'])['quiz']
assert len(urllib.request.urlopen(BASE + back['questions'][0]['media'][0]['url']).read()) == len(MP4(8, 1))
print('PASS: export embeds own media only, isolation, import copies media and validates everything, idempotent, quota; '
      'distinct references for distinct images, refused imports leave nothing, retry at quota, concurrent imports, '
      'same size ceiling on export and import.')
