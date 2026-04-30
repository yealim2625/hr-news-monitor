const HR_KEYWORDS = [
  'HR', '인사관리', '고용노동부 고용', '노무 판례', '노무 행정해석'
  '임금', '채용 트렌드', '조직문화','핵심인재', '성과관리', '연봉'
  '유연근무 근로시간', '부당해고 징계', '직장 노사관계', '인재육성','직원 교육','HR AI', 'HR Analytics',
  '근로기준법','노동법','채용','HR DATA'
];

async function fetchByQuery(query) {
  const res = await fetch(
    `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(query)}&display=20&sort=date`,
    {
      headers: {
        'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID,
        'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET,
      }
    }
  );
  const data = await res.json();
  return data.items || [];
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const query = req.query.query;

    let items = [];
    if (query) {
      items = await fetchByQuery(query);
    } else {
      const results = await Promise.all(HR_KEYWORDS.map(fetchByQuery));
      const seen = new Set();
      results.forEach(list => {
        list.forEach(item => {
          if (!seen.has(item.link)) {
            seen.add(item.link);
            items.push(item);
          }
        });
      });
      items.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    }

    res.status(200).json({ items, total: items.length });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
