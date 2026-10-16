const crypto = require('crypto');
const { promisify } = require('util');
const express = require('express');
const User = require('../models/User');
const requireAuth = require('../middleware/requireAuth');
const { signToken, TOKEN_TTL_SECONDS } = require('../utils/authTokens');

const router = express.Router();
const scrypt = promisify(crypto.scrypt);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COOKIE_NAME = 'ats_auth';

function cookieOptions() {
  const production = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: production,
    sameSite: 'lax',
    path: '/',
    maxAge: TOKEN_TTL_SECONDS * 1000,
  };
}

async function createPasswordHash(password, salt) {
  return (await scrypt(password, salt, 64)).toString('hex');
}

function setAuthCookie(res, userId) {
  const token = signToken(userId, process.env.AUTH_SECRET);
  res.cookie(COOKIE_NAME, token, cookieOptions());
}

function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

router.post('/signup', async (req, res, next) => {
  const email = normalizeEmail(req.body?.email);
  const password = req.body?.password;

  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    return res.status(400).json({ message: 'Enter a valid email address.' });
  }
  if (typeof password !== 'string' || password.length < 12 || password.length > 128) {
    return res.status(400).json({ message: 'Password must be between 12 and 128 characters.' });
  }
  if (!process.env.AUTH_SECRET || Buffer.byteLength(process.env.AUTH_SECRET) < 32) {
    return res.status(503).json({ message: 'Authentication is not configured on the server.' });
  }

  try {
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = await createPasswordHash(password, salt);
    const user = await User.create({ email, passwordHash, passwordSalt: salt });
    setAuthCookie(res, user._id);
    return res.status(201).json({ user: { id: user._id, email: user.email } });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }
    return next(error);
  }
});

router.post('/login', async (req, res, next) => {
  const email = normalizeEmail(req.body?.email);
  const password = req.body?.password;

  if (!EMAIL_PATTERN.test(email) || typeof password !== 'string' || password.length > 128) {
    return res.status(401).json({ message: 'Email or password is incorrect.' });
  }
  if (!process.env.AUTH_SECRET || Buffer.byteLength(process.env.AUTH_SECRET) < 32) {
    return res.status(503).json({ message: 'Authentication is not configured on the server.' });
  }

  try {
    const user = await User.findOne({ email }).select('+passwordHash +passwordSalt');
    const salt = user?.passwordSalt || crypto.randomBytes(16).toString('hex');
    const candidate = await createPasswordHash(password, salt);
    const expected = user?.passwordHash || '0'.repeat(candidate.length);
    const matches = crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(expected));

    if (!user || !matches) {
      return res.status(401).json({ message: 'Email or password is incorrect.' });
    }

    setAuthCookie(res, user._id);
    return res.status(200).json({ user: { id: user._id, email: user.email } });
  } catch (error) {
    return next(error);
  }
});

router.get('/me', requireAuth, (req, res) => {
  res.status(200).json({ user: { id: req.user._id, email: req.user.email } });
});

router.post('/logout', (_req, res) => {
  const { maxAge, ...clearOptions } = cookieOptions();
  res.clearCookie(COOKIE_NAME, clearOptions);
  res.status(200).json({ message: 'Signed out.' });
});

module.exports = router;
