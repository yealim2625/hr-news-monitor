const RSS_SOURCES = [
  // 고용노동부 공식
  {
    url: 'https://www.moel.go.kr/rss/lawinfo.do',
    source: '고용노동부(입법예고)',
    cat: '노무'
  },
  // 구글뉴스 - 노무/판례
  {
    url: 'https://news.google.com/rss/search?q=근로기준법+판례+행정해석&hl=ko&gl=KR&ceid=KR:ko',
    source: '구글뉴스',
    cat: '노무'
  },
  {
    url: 'https://news.google.com/rss/search?q=부당해고+노사관계+단체협약&hl=ko&gl=KR&ceid=KR:ko',
    source: '구글뉴스',
    cat: '노무'
  },
  {
    url: 'https://news.google.com/rss/search?q=고용노동부+행정해석+지침&hl=ko&gl=KR&ceid=KR:ko',
    source: '구글뉴스',
    cat: '노무'
  },
  // 구글뉴스 - 보상/평가
  {
    url: 'https://news.google.com/rss/search?q=통상임금+성과급+임금체계&hl=ko&gl=KR&ceid=KR:ko',
    source: '구글뉴스',
    cat: '평가·보상'
  },
  {
    url: 'https://news.google.com/rss/search?q=연봉인상+보상체계+직무급&hl=ko&gl=KR&ceid=KR:ko',
    source: '구글뉴스',
    cat: '평가·보상'
  },
  // 구글뉴스 - HR AI
  {
    url: 'https://news.google.com/rss/search?q=HR+AI+인사관리+테크&hl=ko&gl=KR&ceid=KR:ko',
    source: '구글뉴스',
    cat: 'HR AI'
  },
  {
    url: 'https://news.google.com/rss/search?q=AI+채용+면접+HR테크&hl=ko&gl=KR&ceid=KR:ko',
    source: '구글뉴스',
    cat: 'HR AI'
  },
  // 구글뉴스 - 채용
  {
    url: 'https://news.google.com/rss/search?q=채용트렌드+헤드헌팅+인재영입&hl=ko&gl=KR&ceid=KR:ko',
    source: '구글뉴스',
    cat: '채용'
  },
  // 구글뉴스 - 인재육성
  {
    url: 'https://news.google.com/rss/search?q=임직원교육+기업교육+리더십개발&hl=ko&gl=KR&ceid=KR:ko',
    source: '구글뉴스',
    cat: '인재육성'
  },
  // 구글뉴스 - 조직문화
  {
    url: 'https://news.google.com/rss/search?q=조직문화+직원경험+번아웃&hl=ko&gl=KR&ceid=KR:ko',
    source: '구글뉴스',
    cat: '조직문화'
  },
  // 구글뉴스 - 근태
  {
    url: 'https://news.google.com/rss/search?q=유연근무+육아휴직+모성보호&hl=ko&gl=KR&ceid=KR:ko',
    source: '구글뉴스',
    cat: '근태'
  },
  // 구글뉴스 - HR Insight (전략/트렌드)
  {
    url: 'https://news.google.com/rss/search?q=HR전략+인사전략+HRBP+조직설계&hl=ko&gl=KR&ceid=KR:ko',
    source: '구글뉴스',
    cat: 'HR Insight'
  },
  {
    url: 'https://news.google.com/rss/search?q=HR트렌드+인사조직+인력계획&hl=ko&gl=KR&ceid=KR:ko',
    source: '구글뉴스',
    cat: '인사전략'
  }
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
