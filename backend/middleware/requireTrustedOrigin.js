function getAllowedOrigins() {
  const origins = new Set(
    (process.env.FRONTEND_URL || '')
      .split(',')
      .map((origin) => origin.trim().replace(/\/$/, ''))
      .filter(Boolean),
  );

  if (process.env.NODE_ENV !== 'production') {
    origins.add('http://localhost:5173');
    origins.add('http://127.0.0.1:5173');
  }

  return origins;
}

function requireTrustedOrigin(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

  const origin = req.get('origin');
  if (!origin || !getAllowedOrigins().has(origin)) {
    return res.status(403).json({ message: 'Request origin is not allowed.' });
  }

  return next();
}

module.exports = { getAllowedOrigins, requireTrustedOrigin };
