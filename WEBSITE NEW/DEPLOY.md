# QISMET — Netlify Deployment Guide
## Secure Admin Panel Setup

---

## Folder Structure

```
qismet-netlify/
├── index.html                        ← Your site
├── netlify.toml                      ← Netlify config
├── package.json                      ← Function dependencies (@netlify/blobs)
├── DEPLOY.md                         ← This file
└── netlify/
    └── functions/
        ├── admin-auth.js             ← Login endpoint
        ├── verify-token.js           ← Token checker
        └── products.js               ← Product storage (Netlify Blobs)
```

---

## What's New: Persistent Products

Products you add in the admin panel are now saved permanently using **Netlify Blobs** — Netlify's built-in storage. No extra setup or account needed; it works automatically once deployed.

- Anyone visiting your site can **see** the products list (read-only, no login needed)
- Only logged-in admins can **add or delete** products
- Product images and size charts are compressed and stored alongside each product
- Data persists across deploys, refreshes, and devices



## Step 1 — Upload to Netlify

**Option A: Drag & Drop (easiest)**
1. Go to https://app.netlify.com
2. Click "Add new site" → "Deploy manually"
3. Drag the entire `qismet-netlify` folder onto the page
4. Netlify deploys it instantly

**Option B: GitHub (recommended for updates)**
1. Push this folder to a GitHub repository
2. In Netlify: "Add new site" → "Import from Git"
3. Select your repo — Netlify auto-detects `netlify.toml`

---

## Step 2 — Set Environment Variables (REQUIRED)

This is the most important step. Without this, the admin login won't work.

1. In your Netlify dashboard, go to:
   **Site Settings → Environment Variables → Add a variable**

2. Add these three variables:

| Key | Value |
|-----|-------|
| `ADMIN_USERNAME` | Choose your username (e.g. `qismet_admin`) |
| `ADMIN_PASSWORD` | Choose a strong password (e.g. `Sh3rw@ni#Royal2024`) |
| `SESSION_SECRET` | A long random string (e.g. `xK9#mP2$qR7&nL4@vB8`) |

> **Tips for a strong password:**
> - At least 16 characters
> - Mix uppercase, lowercase, numbers, symbols
> - Never reuse a password from another site

3. After adding variables, **redeploy** your site:
   Deploys → Trigger deploy → Deploy site

---

## Step 3 — Test It

1. Visit your live Netlify URL
2. Press `Ctrl + Shift + A` (or triple-click the QISMET logo)
3. The "Darbar Access" login modal should appear
4. Enter your credentials from Step 2
5. You should be logged in and see the ⚙ MANAGE button

---

## How the Security Works

```
Browser                          Netlify Server
  │                                    │
  │── POST /admin-auth ──────────────► │
  │   { username, password }           │ Checks against
  │                                    │ ADMIN_USERNAME env var
  │◄─ { success, token } ─────────────│ ADMIN_PASSWORD env var
  │                                    │
  │  Stores token in sessionStorage    │
  │  (expires in 4 hours)              │
  │                                    │
  │── POST /verify-token ────────────► │
  │   { token }                        │ Verifies HMAC signature
  │◄─ { valid: true } ────────────────│ using SESSION_SECRET
```

- ✅ Credentials never appear in your HTML source code
- ✅ Rate limiting: 5 attempts, then 2-minute lockout (server-side)
- ✅ Sessions last 4 hours then require re-login
- ✅ Tokens are cryptographically signed (HMAC-SHA256)
- ✅ Admin entry point is hidden — no button visible to visitors

---

## Changing Your Password

1. Go to Netlify → Site Settings → Environment Variables
2. Update `ADMIN_PASSWORD` to your new value
3. Trigger a redeploy
4. Old sessions will expire within 4 hours

---

## Troubleshooting

**Login says "Connection error"**
→ Functions may not have deployed. Check Netlify → Functions tab — you should see `admin-auth` and `verify-token` listed.

**Login says "Server misconfiguration"**
→ Environment variables are not set. Go back to Step 2.

**Can't open the login modal**
→ Try `Ctrl + Shift + A`, or triple-click the QISMET logo slowly (3 clicks within 600ms).
