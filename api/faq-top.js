// GET /api/faq-top
// Returns FAQ question IDs sorted by click count, per category.
// Requires: KV_REST_API_URL + KV_REST_API_TOKEN (set by Upstash via Vercel marketplace)
const { kv } = require('@vercel/kv');

const HR_IDS  = ['hr-eligibility','hr-billing','hr-add-remove','hr-multicountry','hr-reports','hr-wellhubplus'];
const EMP_IDS = ['emp-free','emp-home','emp-family','emp-signup','emp-included','emp-cancel'];
const ALL_IDS = [...HR_IDS, ...EMP_IDS];

const DEFAULT = { hr: HR_IDS, emp: EMP_IDS };

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  try {
    const counts = await kv.mget(...ALL_IDS.map(id => `faq_clicks:${id}`));

    const scored = ALL_IDS.map((id, i) => ({ id, count: Number(counts[i] || 0) }));

    const sort = ids => ids
      .map(id => scored.find(x => x.id === id))
      .sort((a, b) => b.count - a.count)
      .map(x => x.id);

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    res.status(200).json({ hr: sort(HR_IDS), emp: sort(EMP_IDS) });
  } catch (e) {
    console.error('faq-top error:', e.message);
    res.status(200).json(DEFAULT); // fall back to default order on any error
  }
};
