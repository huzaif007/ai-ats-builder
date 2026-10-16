const User = require('../models/User');
const { verifyToken } = require('../utils/authTokens');

function readAuthCookie(req) {
  const cookies = req.headers.cookie?.split(';') || [];
  const authCookie = cookies.find((cookie) => cookie.trim().startsWith('ats_auth='));
  if (!authCookie) return null;

  const value = authCookie.slice(authCookie.indexOf('=') + 1).trim();
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

async function requireAuth(req, res, next) {
  const claims = verifyToken(readAuthCookie(req), process.env.AUTH_SECRET);
  if (!claims) {
    return res.status(401).json({ message: 'Please sign in to continue.' });
  }

  try {
    const user = await User.findById(claims.sub).select('_id email');
    if (!user) {
      return res.status(401).json({ message: 'Please sign in to continue.' });
    }
    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = requireAuth;
