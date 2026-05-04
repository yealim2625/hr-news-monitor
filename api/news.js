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
  { url: 'https://news.google.com/rss/search?q=HR트렌드+인사조직+인력계획&hl=ko&gl=KR&ceid=KR:ko', source: '구글뉴스', cat: 'HR Insight' }
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
      const desc = descMatch?.[1]?.trim().replace(/<[^>]+>/g, '').slice(0, 200) || title;
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

async function fetchELabor() {
  try {
    const res = await fetch('https://www.elabor.co.kr/report/index.asp?inx=1&pType=list', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ko-KR,ko;q=0.9',
      }
    });

    const buffer = await res.arrayBuffer();
    const decoder = new TextDecoder('euc-kr');
    const html = decoder.decode(buffer);

    const items = [];

    // 카테고리 매핑
    const catMap = {
      '인사전략': 'HR Insight',
      '노무이슈': '노무',
      '임금이슈': '평가·보상',
      '채용이슈': '채용',
      '조직문화': '조직문화',
      '근태관리': '근태',
      '직장내이슈': 'HR Insight',
      '노무실무정보': '노무',
    };

    // 제목과 링크 추출
    const linkRegex = /href="(\/report\/view\.asp[^"]+)"[^>]*>[\s\S]*?<img[^>]*>\s*<\/a>\s*[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/gi;
    const titleRegex = /<dt[^>]*>([\s\S]*?)<\/dt>[\s\S]*?<dd[^>]*class="[^"]*cate[^"]*"[^>]*>([\s\S]*?)<\/dd>[\s\S]*?href="(\/report\/view\.asp[^"]*)"[^>]*>\s*([\s\S]*?)\s*<\/a>/gi;

    // 더 단순한 방식으로 파싱
    const blocks = html.split('report/view.asp');
    for (let i = 1; i < blocks.length && items.length < 15; i++) {
      const block = blocks[i];

      // 링크 추출
      const urlMatch = block.match(/^([^"]*)/);
      const url = urlMatch ? 'https://www.elabor.co.kr/report/view.asp' + urlMatch[1].split('"')[0] : '';

      // 제목 추출 (한글 텍스트 찾기)
      const titleMatch = block.match(/>\s*([가-힣][^<]{5,80})\s*</);
      const title = titleMatch?.[1]?.trim() || '';

      // 카테고리 추출
      const catMatch = block.match(/cate[^>]*>([^<]+)</);
      const catKr = catMatch?.[1]?.trim() || '';
      const cat = catMap[catKr] || 'HR Insight';

      // 날짜 추출
      const dateMatch = block.match(/(\d{4}\.\d{2}\.\d{2})/);
      const dateStr = dateMatch?.[1] || '';
      const pubDate = dateStr ? new Date(dateStr.replace(/\./g, '-')).toUTCString() : new Date().toUTCString();

      if (title && url && title.length > 5) {
        const isDup = items.some(i => i.link === url);
        if (!isDup) {
          items.push({
            title,
            description: title,
            link: url,
            originallink: url,
            pubDate,
            _source: '이레이버',
            _cat: cat
          });
        }
      }
    }

    return items;
  } catch(e) {
    console.error('eLabor fetch error:', e.message);
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

    // RSS 소스들
    const rssResults = await Promise.all(RSS_SOURCES.map(fetchRSS));
    const rssItems = rssResults.flat();

    // 이레이버 크롤링
    const elaborItems = await fetchELabor();

    const allItems = [...naverItems, ...rssItems, ...elaborItems];
    res.status(200).json({ items: allItems, total: allItems.length });

  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
