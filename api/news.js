const RSS_SOURCES = [
  { url: 'https://www.moel.go.kr/rss/lawinfo.do', source: '고용노동부(입법예고)', cat: '노무' },
];

async function fetchRSS(source) {
  try {
    const res = await fetch(source.url);
    const text = await res.text();
    const items = [];
    const blocks = text.split('<item>').slice(1);
    for (const block of blocks) {
      const titleMatch = block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) ||
                         block.match(/<title>([\s\S]*?)<\/title>/);
      const title = (titleMatch?.[1] || '').replace(/<[^>]+>/g, '').trim();
      const linkMatch = block.match(/<link>([\s\S]*?)<\/link>/);
      const link = linkMatch?.[1]?.trim() || '';
      const descMatch = block.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) ||
                        block.match(/<description>([\s\S]*?)<\/description>/);
      const desc = (descMatch?.[1] || '').replace(/<[^>]+>/g, '').trim().slice(0, 200) || title;
      const dateMatch = block.match(/<dc:date>([\s\S]*?)<\/dc:date>/) ||
                        block.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
      const pubDate = dateMatch?.[1]?.trim() || new Date().toUTCString();
      if (title && link) {
        items.push({ title, description: desc, link, originallink: link, pubDate, _source: source.source, _cat: source.cat });
      }
    }
    return items;
  } catch(e) {
    console.error('RSS error:', e.message);
    return [];
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const query = req.query.query || 'HR 인사관리';

  try {
    const naverRes = await fetch(
      `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(query)}&display=20&sort=date`,
      {
        headers: {
          'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID,
          'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET,
        }
      }
    );
    const naverData = await naverRes.json();
    const naverItems = naverData.items || [];

    const rssResults = await Promise.all(RSS_SOURCES.map(fetchRSS));
    const rssItems = rssResults.flat();

    const allItems = [...naverItems, ...rssItems];
    res.status(200).json({ items: allItems, total: allItems.length });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
