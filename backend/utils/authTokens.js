const crypto = require('crypto');

const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

function signToken(userId, secret, now = Math.floor(Date.now() / 1000)) {
  if (!secret || Buffer.byteLength(secret) < 32) {
    throw new Error('AUTH_SECRET must be at least 32 bytes.');
  }

  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    sub: userId.toString(),
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  })).toString('base64url');
  const data = `${header}.${payload}`;
  const signature = crypto.createHmac('sha256', secret).update(data).digest('base64url');

  return `${data}.${signature}`;
}

function verifyToken(token, secret, now = Math.floor(Date.now() / 1000)) {
  if (!secret || Buffer.byteLength(secret) < 32 || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, payload, signature] = parts;
  const data = `${header}.${payload}`;
  const expected = crypto.createHmac('sha256', secret).update(data).digest();
  let actual;

  try {
    actual = Buffer.from(signature, 'base64url');
    if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;

    const decodedHeader = JSON.parse(Buffer.from(header, 'base64url').toString('utf8'));
    const decodedPayload = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (
      decodedHeader.alg !== 'HS256' ||
      typeof decodedPayload.sub !== 'string' ||
      !decodedPayload.sub ||
      !Number.isInteger(decodedPayload.exp) ||
      decodedPayload.exp <= now
    ) {
      return null;
    }

    return decodedPayload;
  } catch {
    return null;
  }
}

module.exports = { signToken, verifyToken, TOKEN_TTL_SECONDS };
