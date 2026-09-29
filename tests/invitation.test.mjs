import assert from 'node:assert/strict';
import { invitationOrigin } from '../lib/invitation.ts';
assert.equal(invitationOrigin('http://127.0.0.1:5173','192.168.1.79'),'http://192.168.1.79:5173');
assert.equal(invitationOrigin('http://localhost:5173','192.168.1.79'),'http://192.168.1.79:5173');
assert.equal(invitationOrigin('http://192.168.1.79:5173','192.168.1.79'),'http://192.168.1.79:5173');
assert.equal(invitationOrigin('https://www.squizz.fun','192.168.1.79'),'https://www.squizz.fun');
assert.equal(invitationOrigin('http://localhost:5173'),'http://localhost:5173');
console.log('PASS: local invitations use LAN address; deployed origin is preserved.');
