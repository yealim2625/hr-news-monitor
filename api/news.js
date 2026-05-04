const RSS_SOURCES = [
  { url: 'https://www.moel.go.kr/rss/lawinfo.do', source: '고용노동부(입법예고)', cat: '노무' }
];

async function fetchRSS(source) {
  try {
    const res = await fetch(source.url);
    const text = await res.text();
    const items = [];
    const itemMatches = [...text.matchAll(/<item>([\s\S]*?)<\/item>/g)];
    for (const match of itemMatches) {
      const block = match[1];
      const title = (block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) ||
                     block.match(/<title>(.*?)<\/title>/))?.[1]?.trim() || '';
      const link  = block.match(/<link>([^<]*)<\/link>/)?.[1]?.trim() || '';
      const desc  = (block.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) ||
                     block.match(/<description>([\s\S]*?)<\/description>/))?.[1]?.trim() || '';
      const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1]?.trim() || '';
      if (title && link) {
        items.push({
          title: title.replace(/<[^>]+>/g, ''),
          description: desc.replace(/<[^>]+>/g, '').slice(0, 200),
          link,
          originallink: link,
          pubDate: pubDate || new Date().toUTCString(),
          _source: source.source,
          _cat: source.cat
        });
      }
    }
    return items;
  } catch(e) {
    console.error('RSS fetch error:', source.url, e.message);
    return [];
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const query = req.query.query || 'HR 인사관리';

  try {
    // 네이버 뉴스 API
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

    // 고용노동부 RSS 항상 추가
    const rssResults = await Promise.all(RSS_SOURCES.map(fetchRSS));
    const rssItems = rssResults.flat();

    // 합치기
    const allItems = [...naverItems, ...rssItems];
    res.status(200).json({ items: allItems, total: allItems.length });

  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
