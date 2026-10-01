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
print('PASS: export embeds own media only, isolation, import copies media and validates everything, idempotent, quota.')
