const RSS_SOURCES = [
  { url: 'https://www.moel.go.kr/rss/lawinfo.do', source: '고용노동부(입법예고)', cat: '노무' },
  { url: 'https://news.google.com/rss/search?q=근로기준법+판례+행정해석&hl=ko&gl=KR&ceid=KR:ko', source: '구글뉴스', cat: '노무' },
  { url: 'https://news.google.com/rss/search?q=부당해고+노사관계+단체협약&hl=ko&gl=KR&ceid=KR:ko', source: '구글뉴스', cat: '노무' },
  { url: 'https://news.google.com/rss/search?q=고용노동부+행정해석+지침&hl=ko&gl=KR&ceid=KR:ko', source: '구글뉴스', cat: '노무' },
  { url: 'https://news.google.com/rss/search?q=통상임금+성과급+임금체계&hl=ko&gl=KR&ceid=KR:ko', source: '구글뉴스', cat: '평가·보상' },
  { url: 'https://news.google.com/rss/search?q=연봉인상+보상체계+직무급&hl=ko&gl=KR&ceid=KR:ko', source: '구글뉴스', cat: '평가·보상' },
  { url: 'https://news.google.com/rss/search?q=HR+AI+인사관리+테크&hl=ko&gl=KR&ceid=KR:ko', source: '구글뉴스', cat: 'HR AI' },
  { url: 'https://news.google.com/rss/search?q=AI+채용+면접+HR테크&hl=ko&gl=KR&ceid=KR:ko', source: '구글뉴스', cat: 'HR AI' },
  { url: 'https://news.google.com/rss/search?q=채용트렌드+헤드헌팅+인재영입&hl=ko&gl=KR&ceid=KR:ko', source: '구글뉴스', cat: '채용' },
  { url: 'https://news.google.com/rss/search?q=임직원교육+기업교육+리더십개발&hl=ko&gl=KR&ceid=KR:ko', source: '구글뉴스', cat: '인재육성' },
  { url: 'https://news.google.com/rss/search?q=조직문화+직원경험+번아웃&hl=ko&gl=KR&ceid=KR:ko', source: '구글뉴스', cat: '조직문화' },
  { url: 'https://news.google.com/rss/search?q=유연근무+육아휴직+모성보호&hl=ko&gl=KR&ceid=KR:ko', source: '구글뉴스', cat: '근태' },
  { url: 'https://news.google.com/rss/search?q=HR전략+인사전략+HRBP+조직설계&hl=ko&gl=KR&ceid=KR:ko', source: '구글뉴스', cat: 'HR Insight' },
  { url: 'https://news.google.com/rss/search?q=HR트렌드+인사조직+인력계획&hl=ko&gl=KR&ceid=KR:ko', source: '구글뉴스', cat: 'HR Insight' },
  { url: 'https://news.google.com/rss/search?q=이레이버+HR+인사노무&hl=ko&gl=KR&ceid=KR:ko', source: '이레이버', cat: '노무' },
  { url: 'https://news.google.com/rss/search?q=site:elabor.co.kr&hl=ko&gl=KR&ceid=KR:ko', source: '이레이버', cat: 'HR Insight' }
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
      const title = titleMatch?.[1]?.trim().replace(/<[^>]+>/g, '') || '';
      const linkMatch = block.match(/<link>([\s\S]*?)<\/link>/);
      const link = linkMatch?.[1]?.trim() || '';
      const descMatch = block.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) ||
                        block.match(/<description>([\s\S]*?)<\/description>/);
      const rawDesc = descMatch?.[1]?.trim() || title;
      const desc = rawDesc
        .replace(/<a[^>]*>([\s\S]*?)<\/a>/gi, '$1')
        .replace(/<font[^>]*>([\s\S]*?)<\/font>/gi, '')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .trim()
        .slice(0, 150) || title;
      const dateMatch = block.match(/<dc:date>([\s\S]*?)<\/dc:date>/) ||
                        block.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
      const pubDate = dateMatch?.[1]?.trim() || new Date().toUTCString();
      if (title && link) {
        items.push({
          title,
          description: desc,
          link,
          originallink: link,
          pubDate,
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

    // RSS + 구글뉴스 소스들
    const rssResults = await Promise.all(RSS_SOURCES.map(fetchRSS));
    const rssItems = rssResults.flat();

    const allItems = [...naverItems, ...rssItems];
    res.status(200).json({ items: allItems, total: allItems.length });

  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
