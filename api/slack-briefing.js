// collect.js가 매일 07:00 KST에 KV에 저장해 둔 기사를 읽어서 TOP3 전송
// → Naver API 직접 호출 없음, 실행 1초 이내, 타임아웃 없음

// 긴급 법령 변경 (+6점)
const URGENT_LAW_KEYWORDS = [
  '개정안 통과','개정안 의결','본회의 통과','국회 통과',
  '공포','시행일','개정안 가결','법 시행','법률 개정','노동법 개정',
  '근로기준법 개정','최저임금 결정','최저임금 고시'
];

// 일반 법/판례/정책 (+3점)
const LAW_KEYWORDS = [
  '판례','개정','시행','위반','행정해석','고시','지침','가이드라인',
  '과태료','처벌','금지','의무','법원','대법원','고등법원','근로기준법'
];

// 트렌드 (+2점)
const TREND_KEYWORDS = [
  '트렌드','확산','증가','급증','변화','전망','조사','설문',
  '리포트','보고서','통계','역대','최고','최저','처음'
];

// HR AI (+4점)
const AI_KEYWORDS = [
  'ai hr','hr ai','hr테크','hr tech','hr data','hr analytics',
  'ai 채용','ai 면접','챗gpt','생성ai',
  'ai 인사','인공지능 채용','인공지능 인사','ai 역량','ai 성과',
  'hrtech','hr 디지털','디지털 hr','생성형 ai'
];

function getCategoryEmoji(cat) {
  const map = {
    'HR Insight': '💡', 'HR AI': '🤖', '노무': '⚖️',
    '인재육성': '📚', '채용': '🔍', '조직문화': '🌱',
    '근태': '🕐', '평가·보상': '💰'
  };
  return map[cat] || '💡';
}

function scoreNews(newsList) {
  const titleWords = newsList.map(n =>
    n.title.replace(/[^\w가-힣]/g, ' ').split(' ').filter(w => w.length > 1)
  );

  return newsList.map((item, i) => {
    let score = 0;
    const titleLower = item.title.toLowerCase();
    const fullLower = (item.title + ' ' + (item.desc || '')).toLowerCase();

    // 긴급 법령 변경 +6점
    if (URGENT_LAW_KEYWORDS.some(k => fullLower.includes(k))) score += 6;
    // HR AI +4점
    if (AI_KEYWORDS.some(k => titleLower.includes(k))) score += 4;
    // 법/판례/정책 +3점
    if (LAW_KEYWORDS.some(k => titleLower.includes(k))) score += 3;
    // 트렌드 +2점
    if (TREND_KEYWORDS.some(k => titleLower.includes(k))) score += 2;

    // 중복 보도 점수
    const myWords = new Set(titleWords[i]);
    let dupCount = 0;
    titleWords.forEach((words, j) => {
      if (i === j) return;
      if (words.filter(w => myWords.has(w) && w.length > 1).length >= 2) dupCount++;
    });
    if (dupCount >= 2) score += 3;
    else if (dupCount === 1) score += 1;

    // 오늘 기사 +1점 (KST 기준)
    const todayKST = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const itemKST  = new Date(new Date(item.pubDate).getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
    if (itemKST === todayKST) score += 1;

    return { ...item, score };
  });
}

function pickTop3(news) {
  const scored = scoreNews(news).sort((a, b) => b.score - a.score);
  const selected = [];
  const usedCats = new Set();
  const usedLinks = new Set();

  for (const item of scored) {
    if (!usedCats.has(item.cat) && !usedLinks.has(item.link)) {
      selected.push(item);
      usedCats.add(item.cat);
      usedLinks.add(item.link);
    }
    if (selected.length >= 3) break;
  }
  if (selected.length < 3) {
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

async function kvGetArticles() {
  const res = await fetch(process.env.KV_REST_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(['GET', 'hr-articles'])
  });
  const { result } = await res.json();
  return result ? JSON.parse(result) : [];
}

async function sendSlack(message) {
  await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`
    },
    body: JSON.stringify({ channel: process.env.SLACK_CHANNEL_ID, text: message, unfurl_links: false })
  });
}

module.exports = async function handler(req, res) {
  try {
    // KV에서 기사 로드 (collect가 07:00 KST에 이미 수집해 둠)
    const allArticles = await kvGetArticles();

    // 최근 48시간 기사를 우선 사용, 부족하면 최신 200개 사용
    const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const cutoff = new Date(kstNow.getTime() - 48 * 60 * 60 * 1000).toISOString();
    const recent = allArticles.filter(a => a.pubDate && a.pubDate >= cutoff);
    const news = (recent.length >= 10 ? recent : allArticles.slice(0, 200))
      // cats 배열 → cat 단일값 변환 (점수 계산·표시용)
      .map(a => ({ ...a, cat: (a.cats && a.cats[0]) || 'HR Insight' }));

    const today = kstNow.toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
      timeZone: 'Asia/Seoul'
    });

    const top3 = pickTop3(news);
    const keywords = [...new Set(news.map(n => n.cat).filter(c => c !== 'HR Insight'))].slice(0, 5);

    let message = `📡 *HR Radar 브리핑 — ${today}*\n\n`;
    message += `🔑 *오늘의 주요 분야*: ${keywords.join(' · ')}\n`;
    message += `📰 *수집된 뉴스*: 총 ${news.length}건\n\n`;
    message += `━━━━━━━━━━━━━━━━\n`;
    message += `*📌 주목할 뉴스 TOP 3*\n\n`;
    top3.forEach((item, i) => {
      message += `${i + 1}. ${getCategoryEmoji(item.cat)} [${item.cat}] <${item.link}|${item.title}>\n`;
      message += `    _${item.date}_\n\n`;
    });
    message += `━━━━━━━━━━━━━━━━\n`;
    message += `👉 <https://hr-news-monitor.vercel.app|HR Radar 전체 뉴스 보기>`;

    await sendSlack(message);
    res.status(200).json({ ok: true, sent: top3.length, total: news.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
