"""AI account of an organisation: python3 tests/ai.py (npm run dev on :5173, AI_KEY_SECRET set).
The generation itself is only tried with a made-up key, which the provider refuses (nothing is billed)."""
import json, os, secrets
from helpers import request, signup

admin, email, _ = signup()
fake = 'sk-ant-api03-' + secrets.token_hex(24)

state = request(admin, 'GET', '/api/org/ai')
assert state['ready'] and state['provider'] is None and state['canEdit'], state
request(admin, 'POST', '/api/ai/generate', {'text': 'Bonjour', 'count': 5, 'types': ['quiz']}, expect=409)
request(admin, 'PUT', '/api/org/ai', {'provider': 'anthropic', 'key': 'trop-court'}, expect=400)
request(admin, 'PUT', '/api/org/ai', {'provider': 'mistral', 'key': fake}, expect=400)
saved = request(admin, 'PUT', '/api/org/ai', {'provider': 'anthropic', 'key': fake, 'model': ''})
assert saved['provider'] == 'anthropic' and saved['hint'] == fake[-4:], saved
assert fake not in json.dumps(saved)
# The key is never sent back, to anyone: settings, account export, organisation overview.
assert fake not in json.dumps(request(admin, 'GET', '/api/org/ai'))
assert fake not in json.dumps(request(admin, 'GET', '/api/org'))
assert 'aiKey' not in json.dumps(request(admin, 'GET', '/api/org'))
# Changing the model keeps the key.
request(admin, 'PUT', '/api/org/ai', {'provider': 'anthropic', 'key': '', 'model': 'claude-sonnet-5-5'})
assert request(admin, 'GET', '/api/org/ai')['model'] == 'claude-sonnet-5-5'
# Switching provider needs a new key.
request(admin, 'PUT', '/api/org/ai', {'provider': 'openai', 'key': ''}, expect=400)

request(admin, 'PUT', '/api/org/ai', {'provider': 'anthropic', 'key': fake})

# Bad inputs are refused before calling anyone.
request(admin, 'POST', '/api/ai/generate', {'text': '', 'count': 5, 'types': ['quiz']}, expect=400)
request(admin, 'POST', '/api/ai/generate', {'text': 'x', 'count': 7, 'types': ['quiz']}, expect=400)
request(admin, 'POST', '/api/ai/generate', {'text': 'x', 'count': 5, 'types': []}, expect=400)
if os.environ.get('SQUIZZ_AI_ONLINE'):
    out = request(admin, 'POST', '/api/ai/generate', {'text': 'Paris est la capitale de la France.', 'count': 5, 'types': ['quiz']}, expect=422)
    assert 'clé' in out['error'], out

request(admin, 'DELETE', '/api/org/ai')
assert request(admin, 'GET', '/api/org/ai')['provider'] is None
print('ai: ok')
