const test = require('node:test');
const assert = require('node:assert/strict');
const { signToken, verifyToken, TOKEN_TTL_SECONDS } = require('./authTokens');

const secret = 'test-auth-secret-that-is-long-enough-to-sign-tokens';

test('signed tokens contain the user id and expire after seven days', () => {
  const token = signToken('user-123', secret, 1000);

  assert.deepEqual(verifyToken(token, secret, 1001), {
    sub: 'user-123',
    iat: 1000,
    exp: 1000 + TOKEN_TTL_SECONDS,
  });
  assert.equal(verifyToken(token, secret, 1000 + TOKEN_TTL_SECONDS), null);
});

test('rejects modified tokens and tokens signed with another secret', () => {
  const token = signToken('user-123', secret, 1000);
  const [header, payload, signature] = token.split('.');
  const replacement = signature.at(-1) === 'A' ? 'B' : 'A';
  const modified = `${header}.${payload}.${signature.slice(0, -1)}${replacement}`;

  assert.equal(verifyToken(modified, secret, 1001), null);
  assert.equal(verifyToken(token, `${secret}-different`, 1001), null);
});

test('requires a sufficiently strong signing secret', () => {
  assert.throws(() => signToken('user-123', 'too-short', 1000), /at least 32 bytes/);
});
