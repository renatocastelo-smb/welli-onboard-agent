// POST /api/faq-track  { id: 'hr-eligibility' }
// Increments a click counter for a FAQ question ID in Vercel KV.
const { kv } = require('@vercel/kv');

const VALID_IDS = new Set([
  'hr-eligibility','hr-billing','hr-add-remove','hr-multicountry','hr-reports','hr-wellhubplus',
  'emp-free','emp-home','emp-family','emp-signup','emp-included','emp-cancel',
]);

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).end();

  const { id } = req.body || {};
  if (!id || !VALID_IDS.has(id)) return res.status(400).json({ error: 'invalid id' });

  try {
    await kv.incr(`faq_clicks:${id}`);
    res.status(200).json({ ok: true });
  } catch (e) {
    // Never let tracking failures surface to the user
    console.error('faq-track error:', e.message);
    res.status(200).json({ ok: false });
  }
};
