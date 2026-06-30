// netlify/functions/verify-token.js
// Called on page load to check if a stored token is still valid.

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': process.env.SITE_URL || '*',
  };

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body;
  try { body = JSON.parse(event.body); } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ valid: false }) };
  }

  const { token } = body;
  if (!token || !token.includes('.')) {
    return { statusCode: 200, headers, body: JSON.stringify({ valid: false }) };
  }

  const [expires, sig] = token.split('.');
  const now = Date.now();

  if (parseInt(expires) < now) {
    return { statusCode: 200, headers, body: JSON.stringify({ valid: false, reason: 'expired' }) };
  }

  const crypto = require('crypto');
  const secret = process.env.SESSION_SECRET || 'fallback-secret-change-me';
  const expected = crypto.createHmac('sha256', secret).update(expires).digest('hex');

  const valid = crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  return { statusCode: 200, headers, body: JSON.stringify({ valid }) };
};
