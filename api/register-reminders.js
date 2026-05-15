// POST /api/register-reminders  { email, company, launchDate }
// Saves reminder registration to KV so the daily cron can send emails.
const { kv } = require('@vercel/kv');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).end();

  const { email, company, launchDate } = req.body || {};

  if (!email || !launchDate || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'invalid input' });
  }

  const data = {
    email,
    company: company || 'your company',
    launchDate,          // YYYY-MM-DD
    registeredAt: new Date().toISOString(),
    sent: {},            // { upload: true, invites: false, ... } — filled by cron
  };

  // Store record (TTL: 90 days — covers all 7 steps including D+30)
  await kv.set(`reminder:${email}`, data, { ex: 90 * 24 * 3600 });
  // Maintain a set of all registered emails for the cron to iterate
  await kv.sadd('reminder_emails', email);

  res.status(200).json({ ok: true });
};
