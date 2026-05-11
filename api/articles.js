const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;
const KEY = 'hr-articles';

async function kvGet() {
  const res = await fetch(KV_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(['GET', KEY])
  });
  const { result } = await res.json();
  return result ? JSON.parse(result) : [];
}

async function kvSet(articles) {
  await fetch(KV_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(['SET', KEY, JSON.stringify(articles)])
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const articles = await kvGet();
    return res.status(200).json({ articles, total: articles.length });
  }

  if (req.method === 'POST') {
    const { articles: incoming } = req.body;
    if (!Array.isArray(incoming)) return res.status(400).json({ error: 'articles array required' });

    const existing = await kvGet();
    const existingLinks = new Set(existing.map(a => a.link));
    const newOnly = incoming.filter(a => !existingLinks.has(a.link));
    const merged = [...newOnly, ...existing]
      .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
      .slice(0, 1000);

    await kvSet(merged);
    return res.status(200).json({ total: merged.length, added: newOnly.length });
  }

  res.status(405).end();
};
