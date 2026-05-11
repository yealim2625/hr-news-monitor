// 매일 오전 7시(KST) 자동 실행 + 새로고침 버튼으로도 호출 가능
const QUERIES = [
  // HR 전반
  'HR 인사관리', '고용노동부 행정해석', '인사 트렌드',
  // 노무·법령
  '노무 판례 근로기준법', '부당해고 징계', '직장 노사관계',
  '근로감독 인사노무', '취업규칙 단체협약', '근로자성 대법원 판례',
  '근로기준법 개정안', '근로기준법 개정', '노동법 개정',
  '중대재해처벌법 안전보건', '산업재해 근로자', '임금체불 체불임금',
  // 평가·보상
  '임금 성과급 연봉', '성과관리 보상체계', '연봉인상 임금체계',
  '인사평가 KPI', '직무급 임금체계', '연봉 인상', '성과급', '최저임금',
  // 채용
  '채용 트렌드', '헤드헌팅 경력채용', '수시채용 공채',
  '채용브랜딩 온보딩', '인재확보 전략',
  // 인재육성
  '임직원교육 기업교육', '리스킬링 업스킬링', 'HRD 역량개발',
  // 조직문화
  '조직문화 직원', '직원경험 웰빙 몰입', '다양성 포용 직장문화',
  // 근태
  '유연근무 근로시간', '모성보호 제도', '주4일제 근무시간', '탄력근로제 52시간',
  // HR AI
  'AI HR HR테크', 'AI 채용 인사', '생성AI 직장',
  '인공지능 인사관리', 'AI 면접 평가', 'HR 디지털전환', 'HRtech 스타트업'
];

const RSS_SOURCES = [
  { url: 'https://www.moel.go.kr/rss/lawinfo.do', source: '고용노동부(입법예고)', cat: '노무' },
  { url: 'https://www.moel.go.kr/rss/news.do',    source: '고용노동부(보도자료)', cat: '노무' },
];

const EXCLUDE_KEYWORDS = [
  '선거','후보','정당','대통령','정치','보수','진보',
  '야당','여당','주가','코스피','환율','증권','부동산','아파트','암세포',
  '장학','장학생','중학교','고등학교','초등학교','청소년','입시','수능',
  '지역인재','드림플러스','인베스터','스마트팜','농업','귀농','봉사'
];

const HR_MUST = [
  'hr','인사관리','인사팀','노무','채용','임금','근로','직원','직장','조직',
  '고용','역량','성과','연봉','급여','근태','휴가','해고','노사',
  '취업규칙','판례','행정해석','인재관리','헤드헌팅',
  '임직원교육','기업교육','사내교육','직무교육',
  '보상체계','근로감독','모성보호','육아휴직','hr테크',
  'hr data','hr analytics','hr trend','인사조직','인사노무',
  '산재','중대재해','안전보건','직업병','임금체불',
  '리스킬','업스킬','온보딩','채용브랜딩',
  '웰빙','번아웃','몰입도','다양성','포용','심리적 안전'
];

const CAT_KEYWORDS = {
  'HR AI':    ['ai hr','hr ai','hr테크','hr tech','hr data','hr analytics','ai 채용','ai 면접','챗gpt','생성ai',
               'ai 인사','인공지능 채용','인공지능 인사','ai 역량','ai 성과','hrtech','hr 디지털','디지털 hr','ai 기반 hr','생성형 ai'],
  '노무':     ['노무','근로기준법','판례','행정해석','부당해고','노사관계','단체협약','취업규칙','임금체불','해고','근로감독','인사노무',
               '중대재해','중대재해처벌법','산업재해','산재','직업병','안전보건','과로','체불임금'],
  '인재육성': ['임직원교육','기업교육','사내교육','직무교육','hrd','리더십','역량개발','코칭','멘토링',
               '리스킬링','업스킬링','재교육','e러닝','온라인교육','학습조직','인재개발'],
  '채용':     ['채용','채용공고','채용절차','공개채용','블라인드채용','면접','헤드헌팅','인재영입','채용시장','채용트렌드',
               '수시채용','온보딩','채용브랜딩','인재확보','공채','경력직','신입'],
  '조직문화': ['조직문화','번아웃','직원경험','몰입도','워크라이프','기업문화',
               'dei','다양성','포용','심리적 안전','웰빙','직원만족','esg','일터','수평적','세대'],
  '근태':     ['근태','유연근무','재택근무','연장근로','휴가','근로시간','모성보호','육아휴직',
               '주4일','52시간','탄력근로','선택근로','포괄임금','연차','출퇴근','재택'],
  '평가·보상':['임금','성과급','연봉','급여','보상체계','통상임금','최저임금','연봉인상','성과관리','평가제도','인사평가','kpi','okr',
               '직무급','성과연봉','연봉제','임금체계개편','보상전략'],
  'HR Insight':['hr전략','인사전략','hrbp','조직설계','인력계획','hr혁신','인사조직개편',
                'hr트렌드','인사혁신','인력운영','피플애널리틱스','chro','인사제도','탤런트'],
};

function clean(s) {
  return (s||'').replace(/<[^>]+>/g,'').replace(/&quot;/g,'"').replace(/&amp;/g,'&')
    .replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ').trim();
}

function isHR(title, desc) {
  const t = (title+' '+desc).toLowerCase();
  if (EXCLUDE_KEYWORDS.some(k => t.includes(k))) return false;
  return HR_MUST.some(k => t.includes(k));
}

function getCats(title, desc) {
  const t = (title+' '+desc).toLowerCase();
  const cats = Object.entries(CAT_KEYWORDS)
    .filter(([, kws]) => kws.some(k => t.includes(k)))
    .map(([cat]) => cat);
  return cats.length > 0 ? cats : ['HR Insight'];
}

function formatDate(p) {
  if (!p) return '';
  const d = new Date(p);
  if (isNaN(d)) return '';
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
}
function toYMD(p) {
  if (!p) return '';
  const d = new Date(p);
  if (isNaN(d)) return '';
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

async function fetchRSS(source) {
  try {
    const res = await fetch(source.url);
    const text = await res.text();
    return text.split('<item>').slice(1).map(block => {
      const titleMatch = block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) || block.match(/<title>([\s\S]*?)<\/title>/);
      const title = (titleMatch?.[1]||'').replace(/<[^>]+>/g,'').trim();
      const linkMatch = block.match(/<link>([\s\S]*?)<\/link>/);
      const link = linkMatch?.[1]?.trim()||'';
      const descMatch = block.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) || block.match(/<description>([\s\S]*?)<\/description>/);
      const desc = (descMatch?.[1]||'').replace(/<[^>]+>/g,'').trim().slice(0,200)||title;
      const dateMatch = block.match(/<dc:date>([\s\S]*?)<\/dc:date>/) || block.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
      const pubDate = dateMatch?.[1]?.trim()||new Date().toUTCString();
      if (!title||!link) return null;
      return { title, description: desc, link, originallink: link, pubDate, _source: source.source };
    }).filter(Boolean);
  } catch(e) { return []; }
}

async function kvGet() {
  const res = await fetch(process.env.KV_REST_API_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(['GET', 'hr-articles'])
  });
  const { result } = await res.json();
  return result ? JSON.parse(result) : [];
}

async function kvSet(articles) {
  await fetch(process.env.KV_REST_API_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(['SET', 'hr-articles', JSON.stringify(articles)])
  });
}

module.exports = async function handler(req, res) {
  try {
    const [naverResults, rssResults] = await Promise.all([
      Promise.all(QUERIES.map(q =>
        fetch(`https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(q)}&display=20&sort=date`, {
          headers: {
            'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID,
            'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET,
          }
        }).then(r => r.json()).catch(() => ({ items: [] }))
      )),
      Promise.all(RSS_SOURCES.map(fetchRSS))
    ]);

    const seen = new Set();
    const fresh = [];
    [...naverResults.flatMap(d => d.items||[]), ...rssResults.flat()].forEach(item => {
      if (seen.has(item.link)) return;
      seen.add(item.link);
      const title = clean(item.title);
      const desc = clean(item.description);
      if (!isHR(title, desc)) return;
      const source = item._source || (() => {
        try { return new URL(item.originallink||item.link).hostname.replace('www.',''); } catch { return '뉴스'; }
      })();
      fresh.push({
        title, desc, link: item.link, source,
        date: formatDate(item.pubDate), ymd: toYMD(item.pubDate),
        pubDate: item.pubDate, cats: getCats(title, desc)
      });
    });
    fresh.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

    const existing = await kvGet();
    const existingLinks = new Set(existing.map(a => a.link));
    const newOnly = fresh.filter(a => !existingLinks.has(a.link));
    const merged = [...newOnly, ...existing]
      .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
      .slice(0, 1000);

    await kvSet(merged);
    res.status(200).json({ total: merged.length, added: newOnly.length });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
};
