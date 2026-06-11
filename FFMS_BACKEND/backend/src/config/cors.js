const logger = require('./logger');

// ─── CORS Origin List ────────────────────────────────────────────────────────
const PRODUCTION_ORIGINS = [
  'https://field-force-mnt-sys.pages.dev',
  'https://field-force-mnt-sys.vercel.app',
  'https://eazzio-payroll.vercel.app',
];

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(origin => origin);

if (process.env.FRONTEND_URL && !allowedOrigins.includes(process.env.FRONTEND_URL)) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

PRODUCTION_ORIGINS.forEach(origin => {
  if (!allowedOrigins.includes(origin)) allowedOrigins.push(origin);
});

if (process.env.NODE_ENV !== 'production') {
  const localOrigins = [
    'http://localhost:3000',
    'http://localhost:5001',
    'http://127.0.0.1:5001',
    'http://192.168.1.6',
    'http://192.168.1.8:5001',
  ];
  localOrigins.forEach(origin => {
    if (!allowedOrigins.includes(origin)) allowedOrigins.push(origin);
  });
}

if (allowedOrigins.length === 0) {
  allowedOrigins.push('http://localhost:3000');
}

// ─── Origin Validator ────────────────────────────────────────────────────────
/**
 * Returns true if the given origin is allowed.
 * Centralised here so Express CORS and Socket.IO CORS use identical logic.
 *
 * Allowed patterns:
 *  1. No origin (server-to-server / curl)
 *  2. Exact match in allowedOrigins list
 *  3. localhost.com variants          e.g. http://localhost.com:3000
 *  4. Cloudflare Pages previews       e.g. https://abc123.field-force-mnt-sys.pages.dev
 *  5. Vercel canonical preview        e.g. https://field-force-mnt-abc.vercel.app
 *  6. Vercel project-scoped previews  e.g. https://field-force-mnt-sys-rahul-kumar0012223552s-projects.vercel.app
 *  7. Vercel git-branch previews      e.g. https://field-force-mnt-sys-git-temp-rahul-kumar0012223552s-projects.vercel.app
 */
const isOriginAllowed = (origin) => {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;

  // localhost.com (dev convenience)
  if (/https?:\/\/(localhost\.com)(:\d+)?$/.test(origin)) return true;

  // Cloudflare Pages preview deployments
  if (/https:\/\/[a-z0-9-]+\.field-force-mnt-sys\.pages\.dev$/.test(origin)) return true;

  // Vercel canonical preview  (field-force-mnt-<hash>.vercel.app)
  if (/https:\/\/field-force-mnt-[a-z0-9-]+\.vercel\.app$/.test(origin)) return true;

  // Vercel project-scoped preview  (*-rahul-kumar0012223552s-projects.vercel.app)
  if (/https:\/\/[a-z0-9-]+-rahul-kumar0012223552s-projects\.vercel\.app$/.test(origin)) return true;

  // Vercel git-branch preview  (field-force-mnt-sys-git-<branch>-*-projects.vercel.app)
  if (/https:\/\/field-force-mnt-sys-git-[a-z0-9-]+-rahul-kumar0012223552s-projects\.vercel\.app$/.test(origin)) return true;

  return false;
};

module.exports = {
  isOriginAllowed,
  allowedOrigins
};
