const HR_QUERIES = [
  'HR 인사관리', '고용노동부 행정해석', '노무 판례 근로기준법',
  '임금 성과급 연봉', '채용 트렌드', '조직문화 직원',
  '유연근무 근로시간', '부당해고 징계', '직장 노사관계', '인재육성 교육'
];

const EXCLUDE_KEYWORDS = [
  '선거','후보','정당','국회','의원','대통령','정치','보수','진보',
  '야당','여당','주가','코스피','환율','증권','부동산','아파트','암세포'
];

const HR_MUST = [
  'hr','인사','노무','채용','임금','근로','직원','직장','조직',
  '고용','교육','육성','역량','성과','연봉','급여','근태',
  '휴가','해고','노사','취업규칙','판례','행정해석'
];

function isHRRelated(title, desc) {
  const text = (title + ' ' + desc).toLowerCase();
  if (EXCLUDE_KEYWORDS.some(k => text.includes(k))) return false;
  return HR_MUST.some(k => text.includes(k));
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
    '인사전략': ['hr전략','인사전략','hrbp','조직설계','인력계획','hr혁신'],
    '노무': ['노무','근로기준법','판례','행정해석','부당해고','노사관계','단체협약','취업규칙','임금체불','해고'],
    '보상': ['임금','성과급','연봉','급여','보상체계','통상임금','최저임금'],
    '채용': ['채용','공채','블라인드채용','면접','이력서','인재영입'],
    '인재육성': ['교육','육성','hrd','리더십','역량개발','코칭','멘토링','웨비나'],
    '조직문화': ['조직문화','번아웃','직원경험','몰입도','워크라이프','기업문화'],
    '근태': ['근태','유연근무','재택근무','연장근로','휴가','근로시간'],
  };
  for (const [cat, keywords] of Object.entries(KEYWORDS)) {
    if (keywords.some(k => text.includes(k))) return cat;
  }
  return '기타';
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
      news.push({ title, desc, link: item.link, pubDate: item.pubDate,
        date: formatDate(item.pubDate), cat: categorize(title, desc) });
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
    const today = new Date().toLocaleDateString('ko-KR', { year:'numeric', month:'long', day:'numeric', weekday:'short' });
    const top5 = news.slice(0, 5);

    const keywords = [...new Set(
      news.flatMap(n => [n.cat]).filter(c => c !== '기타')
    )].slice(0, 5);

    let message = `📋 *HR 이슈 브리핑 — ${today}*\n\n`;
    message += `🔑 *오늘의 주요 분야*: ${keywords.join(' · ')}\n`;
    message += `📰 *수집된 뉴스*: 총 ${news.length}건\n\n`;
    message += `━━━━━━━━━━━━━━━━\n`;
    message += `*📌 주요 뉴스 TOP 5*\n\n`;

    top5.forEach((item, i) => {
      const emoji = getCategoryEmoji(item.cat);
      message += `${i+1}. ${emoji} [${item.cat}] <${item.link}|${item.title}>\n`;
      message += `    _${item.date}_\n\n`;
    });

    message += `━━━━━━━━━━━━━━━━\n`;
    message += `👉 <https://hr-news-monitor.vercel.app|전체 뉴스 보기>`;

    await sendSlack(message);
    res.status(200).json({ ok: true, sent: top5.length });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
