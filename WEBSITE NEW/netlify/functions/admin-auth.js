// netlify/functions/admin-auth.js
// Secure server-side authentication for QISMET admin panel.
// Credentials never leave the server — they live in Netlify environment variables.

const RATE_LIMIT = {}; // In-memory store (resets on cold start — fine for this use case)
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 2 * 60 * 1000; // 2 minutes

exports.handler = async (event) => {
  // Only accept POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': process.env.SITE_URL || '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid request' }) };
  }

  const { username, password } = body;

  if (!username || !password) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing credentials' }) };
  }

  // Rate limiting by IP
  const ip = event.headers['x-forwarded-for']?.split(',')[0].trim() || 'unknown';
  const now = Date.now();
  const record = RATE_LIMIT[ip] || { attempts: 0, lockedUntil: 0 };

  if (record.lockedUntil > now) {
    const secondsLeft = Math.ceil((record.lockedUntil - now) / 1000);
    return {
      statusCode: 429,
      headers,
      body: JSON.stringify({ error: 'locked', secondsLeft }),
    };
  }

  // Check credentials against environment variables
  const validUser = process.env.ADMIN_USERNAME;
  const validPass = process.env.ADMIN_PASSWORD;

  if (!validUser || !validPass) {
    console.error('ADMIN_USERNAME or ADMIN_PASSWORD environment variables not set.');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Server misconfiguration. Contact the site owner.' }),
    };
  }

  const isValid = username === validUser && password === validPass;

  if (isValid) {
    // Reset rate limit on success
    RATE_LIMIT[ip] = { attempts: 0, lockedUntil: 0 };

    // Generate a short-lived signed token (simple HMAC approach)
    const secret = process.env.SESSION_SECRET || 'fallback-secret-change-me';
    const expires = now + 4 * 60 * 60 * 1000; // 4 hours
    const payload = `${expires}`;
    const crypto = require('crypto');
    const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    const token = `${expires}.${sig}`;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, token }),
    };
  } else {
    // Failed attempt
    record.attempts = (record.attempts || 0) + 1;
    if (record.attempts >= MAX_ATTEMPTS) {
      record.lockedUntil = now + LOCKOUT_MS;
    }
    RATE_LIMIT[ip] = record;

    const attemptsLeft = Math.max(0, MAX_ATTEMPTS - record.attempts);
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({
        error: 'invalid_credentials',
        attemptsLeft,
        locked: record.lockedUntil > now,
        secondsLeft: record.lockedUntil > now ? Math.ceil((record.lockedUntil - now) / 1000) : 0,
      }),
    };
  }
};
