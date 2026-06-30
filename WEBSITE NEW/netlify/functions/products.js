// netlify/functions/products.js
// CRUD endpoint for products, backed by Netlify Blobs.
// GET    -> list all products
// POST   -> add a new product (auth required)
// DELETE -> remove a product by sku (auth required)

const { getStore } = require('@netlify/blobs');
const crypto = require('crypto');

function verifyAuth(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
  const token = authHeader.slice(7);
  if (!token.includes('.')) return false;
  const [expires, sig] = token.split('.');
  if (parseInt(expires) < Date.now()) return false;
  const secret = process.env.SESSION_SECRET || 'fallback-secret-change-me';
  const expected = crypto.createHmac('sha256', secret).update(expires).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': process.env.SITE_URL || '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  const store = getStore({
    name: 'qismet-products',
    consistency: 'strong',
    siteID: process.env.NETLIFY_SITE_ID,
    token: process.env.NETLIFY_API_TOKEN,
  });

const { getStore } = require('@netlify/blobs');
const crypto = require('crypto');

function verifyAuth(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;

  const token = authHeader.slice(7);

  if (!token.includes('.')) return false;

  const [expires, sig] = token.split('.');

  if (parseInt(expires) < Date.now()) return false;

  const secret =
    process.env.SESSION_SECRET ||
    'fallback-secret-change-me';

  const expected = crypto
    .createHmac('sha256', secret)
    .update(expires)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(sig),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}

exports.handler = async (event) => {

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin":
      process.env.SITE_URL || "*",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization",
    "Access-Control-Allow-Methods":
      "GET, POST, PUT, PATCH, DELETE, OPTIONS"
  };

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers,
      body: ""
    };
  }

  const store = getStore({
    name: "qismet-products",
    consistency: "strong",
    siteID: process.env.NETLIFY_SITE_ID,
    token: process.env.NETLIFY_API_TOKEN
  });

  // ============================
  // PUBLIC GET
  // ============================

  if (event.httpMethod === "GET") {

    const { blobs } = await store.list();

    const products = [];

    for (const blob of blobs) {

      const product =
        await store.get(blob.key, {
          type: "json"
        });

      if (product)
        products.push(product);

    }

    products.sort(
      (a, b) =>
        (b.createdAt || 0) -
        (a.createdAt || 0)
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        count: products.length,
        products
      })
    };

  }

  // Everything below requires admin login

  if (!verifyAuth(event.headers.authorization)) {

    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({
        error: "Unauthorized"
      })
    };

  }

    const { sku, name, price, comparePrice, category, status, fabric, colour, description, badge, sizes, swatch, media, sizeChart } = body;

    if (!sku || !name || !price) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'sku, name, and price are required' }) };
    }

    const existing = await store.get(sku, { type: 'json' });
    if (existing) {
      return { statusCode: 409, headers, body: JSON.stringify({ error: `SKU "${sku}" already exists` }) };
    }

    const product = {
      sku, name, price, comparePrice: comparePrice || null,
      category: category || '', status: status || 'Active',
      fabric: fabric || '', colour: colour || '',
      description: description || '', badge: badge || '',
      sizes: sizes || [], swatch: swatch || 's1',
      media: media || [],       // array of base64 data URLs (small images only — see note)
      sizeChart: sizeChart || null,
      createdAt: Date.now(),
    };

    await store.setJSON(sku, product);
    return { statusCode: 201, headers, body: JSON.stringify({ success: true, product }) };
  }

  // ── DELETE: remove a product ──
  if (event.httpMethod === 'DELETE') {
    let body;
    try { body = JSON.parse(event.body); } catch {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
    }
    const { sku } = body;
    if (!sku) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'sku is required' }) };
    }
    await store.delete(sku);
    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
};
