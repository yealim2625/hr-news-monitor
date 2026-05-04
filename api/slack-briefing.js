const HR_QUERIES = [
  'HR 인사관리', '고용노동부 행정해석', '노무 판례 근로기준법',
  '임금 성과급 연봉', '채용 트렌드', '조직문화 직원',
  '유연근무 근로시간', '부당해고 징계', '직장 노사관계',
  '임직원교육 기업교육', '헤드헌팅 경력채용', 'AI HR HR테크',
  '성과관리 보상체계', '연봉인상 임금체계', '근로감독 인사노무',
  '모성보호 제도'
];

const EXCLUDE_KEYWORDS = [
  '선거','후보','정당','국회','의원','대통령','정치','보수','진보',
  '야당','여당','주가','코스피','환율','증권','부동산','아파트','암세포',
  '장학','장학생','중학교','고등학교','초등학교','청소년','입시','수능',
  '지역인재'
];

const HR_MUST = [
  'hr','인사','노무','채용','임금','근로','직원','직장','조직',
  '고용','역량','성과','연봉','급여','근태','휴가','해고','노사',
  '취업규칙','판례','행정해석','인사관리','인재관리','헤드헌팅',
  '임직원','보상체계','근로감독','모성보호','육아휴직','hr테크',
  'hr data','hr analytics','hr trend','인사조직','사회공헌'
];

const LAW_KEYWORDS = [
  '판례','개정','시행','위반','행정해석','고시','지침','가이드라인',
  '과태료','처벌','금지','의무','법원','대법원','고등법원','근로기준법'
];

const TREND_KEYWORDS = [
  '트렌드','확산','증가','급증','변화','전망','조사','설문',
  '리포트','보고서','통계','역대','최고','최저','처음'
];

function isHRRelated(title, desc) {
  const text = (title + ' ' + desc).toLowerCase();
  if (EXCLUDE_KEYWORDS.some(k => text.includes(k.toLowerCase()))) return false;
  return HR_MUST.some(k => text.includes(k.toLowerCase()));
}

function formatDate(pubDate) {
  if (!pubDate) return '';
  const d = new Date(pubDate);
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
}

function getCategoryEmoji(cat) {
  const map = {
    '인사전략': '🎯', '노무': '⚖️', '보상': '💰',
    '채용': '🔍', '인재육성': '📚', '조직문화': '🌱',
    '근태': '🕐', '기타': '📌'
  };
  return map[cat] || '📌';
}

function categorize(title, desc) {
  const text = (title + ' ' + desc).toLowerCase();
  const KEYWORDS = {
    '인사전략': ['hr전략','인사전략','hrbp','조직설계','인력계획','hr혁신','인사조직개편','성과관리'],
    '노무': ['노무','근로기준법','판례','행정해석','부당해고','노사관계','단체협약','취업규칙','임금체불','해고','근로감독','인사노무'],
    '보상': ['임금','성과급','연봉','급여','보상체계','통상임금','최저임금','연봉인상','임금체계'],
    '채용': ['채용공고','채용절차','공개채용','블라인드채용','면접전형','헤드헌팅','인재영입','채용브랜딩'],
    '인재육성': ['임직원교육','기업교육','hrd','리더십','역량개발','코칭','멘토링','직무교육','hr세미나'],
    '조직문화': ['조직문화','번아웃','직원경험','몰입도','워크라이프','기업문화','사회공헌'],
    '근태': ['근태','유연근무','재택근무','연장근로','휴가','근로시간','모성보호','육아휴직'],
  };
  for (const [cat, keywords] of Object.entries(KEYWORDS)) {
    if (keywords.some(k => text.includes(k))) return cat;
  }
  return '기타';
}

function scoreNews(newsList) {
  // 중복 보도 감지 — 유사 제목 키워드 추출
  const titleWords = newsList.map(n =>
    n.title.replace(/[^\w가-힣]/g, ' ').split(' ').filter(w => w.length > 1)
  );

  return newsList.map((item, i) => {
    let score = 0;
    const titleLower = item.title.toLowerCase();

    // ① 법/판례/정책 키워드 +3점
    if (LAW_KEYWORDS.some(k => titleLower.includes(k.toLowerCase()))) score += 3;

    // ② 트렌드 키워드 +2점
    if (TREND_KEYWORDS.some(k => titleLower.includes(k.toLowerCase()))) score += 2;

    // ③ 중복 보도 점수 — 다른 기사와 공통 단어 2개 이상이면 +3점
    const myWords = new Set(titleWords[i]);
    let dupCount = 0;
    titleWords.forEach((words, j) => {
      if (i === j) return;
      const common = words.filter(w => myWords.has(w) && w.length > 1);
      if (common.length >= 2) dupCount++;
    });
    if (dupCount >= 2) score += 3;
    else if (dupCount === 1) score += 1;

    // ④ 최신 기사 소폭 우대 +1점 (오늘 날짜)
    const today = new Date().toDateString();
    if (new Date(item.pubDate).toDateString() === today) score += 1;

    return { ...item, score };
  });
}

function pickTop3(news) {
  const scored = scoreNews(news).sort((a, b) => b.score - a.score);
  const selected = [];
  const usedCats = new Set();

  // 카테고리 다양성 우선
  for (const item of scored) {
    if (!usedCats.has(item.cat)) {
      selected.push(item);
      usedCats.add(item.cat);
    }
    if (selected.length >= 3) break;
  }

  // 부족하면 점수 높은 순으로 채우기
  if (selected.length < 3) {
    const usedLinks = new Set(selected.map(i => i.link));
    for (const item of scored) {
      if (!usedLinks.has(item.link)) {
        selected.push(item);
        usedLinks.add(item.link);
      }
      if (selected.length >= 3) break;
    }
  }

  return selected;
}

async function fetchNews() {
  const results = await Promise.all(
    HR_QUERIES.map(q =>
      fetch(`https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(q)}&display=20&sort=date`, {
        headers: {
          'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID,
          'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET,
        }
      }).then(r => r.json())
    )
  );

  const seen = new Set();
  const news = [];
  results.forEach(data => {
    (data.items || []).forEach(item => {
      if (seen.has(item.link)) return;
      seen.add(item.link);
      const title = item.title.replace(/<[^>]+>/g, '');
      const desc = item.description.replace(/<[^>]+>/g, '');
      if (!isHRRelated(title, desc)) return;
      news.push({
        title, desc, link: item.link, pubDate: item.pubDate,
        date: formatDate(item.pubDate), cat: categorize(title, desc)
      });
    });
  });

  return news.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
}

async function sendSlack(message) {
  await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`
    },
    body: JSON.stringify({
      channel: process.env.SLACK_CHANNEL_ID,
      text: message,
      unfurl_links: false
    })
  });
}

module.exports = async function handler(req, res) {
  try {
    const news = await fetchNews();
    const today = new Date().toLocaleDateString('ko-KR', {
      year:'numeric', month:'long', day:'numeric', weekday:'short'
    });
    const top3 = pickTop3(news);

    const keywords = [...new Set(
      news.map(n => n.cat).filter(c => c !== '기타')
    )].slice(0, 5);

    let message = `📋 *HR 이슈 브리핑 — ${today}*\n\n`;
    message += `🔑 *오늘의 주요 분야*: ${keywords.join(' · ')}\n`;
    message += `📰 *수집된 뉴스*: 총 ${news.length}건\n\n`;
    message += `━━━━━━━━━━━━━━━━\n`;
    message += `*📌 주목할 뉴스 TOP 3*\n\n`;

    top3.forEach((item, i) => {
      const emoji = getCategoryEmoji(item.cat);
      message += `${i+1}. ${emoji} [${item.cat}] <${item.link}|${item.title}>\n`;
      message += `    _${item.date}_\n\n`;
    });

    message += `━━━━━━━━━━━━━━━━\n`;
    message += `👉 <https://hr-news-monitor.vercel.app|전체 뉴스 보기>`;

    await sendSlack(message);
    res.status(200).json({ ok: true, sent: top3.length });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
