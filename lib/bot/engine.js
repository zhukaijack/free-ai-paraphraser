// Bot engine — keyword detection, conversation scripts, link promotion

// Product info
const PRODUCT = {
  name: 'AivaDesk',
  url: 'https://free-ai-paraphraser.vercel.app',
  tagline: 'AI Writing Assistant — Rewrite, Email, Resume, Summary, Leave Request',
  freeNote: '3 free uses every day, no credit card needed',
};

// Keyword triggers grouped by intent
const KEYWORDS = {
  writing_help: [
    'how to write', 'writing tips', 'improve writing', 'writer block',
    'stuck writing', 'need help writing', 'writing advice', 'proofread',
    '怎么写', '写作技巧', '不会写', '写不出来', '润色', '改写',
    'rewrite', 'paraphrase', 'rephrase', 'polish', 'tone',
  ],
  email: [
    'email draft', 'write email', 'professional email', 'email template',
    'cold email', 'follow up email', '写邮件', '邮件模板', '邮件怎么写',
    'business email', 'formal email',
  ],
  resume: [
    'resume bullet', 'cv writing', 'resume help', 'resume tip',
    'update resume', '简历', '简历怎么写', 'resume point',
    'linkedin profile', 'job application',
  ],
  productivity: [
    'productivity tool', 'save time', 'writing tool', 'ai tool',
    'ai writing', 'writing app', '效率工具', '写作工具', 'AI写作',
    'automate writing', 'text generator',
  ],
  meeting: [
    'meeting notes', 'meeting summary', 'summarize meeting', 'meeting minutes',
    '会议纪要', '会议记录', '总结会议', 'action items',
  ],
};

// Engagement scripts — natural conversation openers
const CONVERSATION_STARTERS = [
  "I've been testing different AI writing tools lately. Some are surprisingly good for specific tasks like emails and resumes.",
  "Anyone else struggle with writing professional emails? Found a workflow that saves me so much time now.",
  "Hot take: AI writing tools aren't replacing writers. They're replacing writer's block. The good ones just help you get started faster.",
  "Been using an AI tool for resume bullet points. It's actually better at action verbs than I am 😅",
  "Question for the group: what's your go-to tool for polishing important emails before sending?",
];

// Natural follow-ups that drop the link
const SOFT_PROMOTIONS = [
  `I use ${PRODUCT.name} for that — ${PRODUCT.tagline}. ${PRODUCT.freeNote}. Here: ${PRODUCT.url}`,
  `Check out ${PRODUCT.name}. ${PRODUCT.freeNote}. ${PRODUCT.url}`,
  `Try ${PRODUCT.name} — it has specific tools for emails, resumes, and rewriting. ${PRODUCT.freeNote}. ${PRODUCT.url}`,
  `I built ${PRODUCT.name} actually. ${PRODUCT.tagline}. Would love feedback if anyone tries it: ${PRODUCT.url}`,
];

// Helpful responses without promotion (build rapport first)
const HELPFUL_TIPS = [
  "Quick tip: When rewriting, try changing the tone first (professional → casual or vice versa). Often that alone fixes 80% of the problem.",
  "For cold emails: subject line + first sentence are 90% of the battle. Personalize those two things and you're golden.",
  "Resume trick: start every bullet with a strong action verb (Led, Built, Launched, Reduced). Recruiters scan for those words.",
  "Meeting summaries don't need to be long. 3 bullet points: what was decided, what's next, who's doing what.",
  "Proofreading your own writing is nearly impossible. Read it out loud, or better yet, have a tool rephrase it — you'll catch things you missed.",
];

// Check if message contains keywords from a category
function matchCategory(message) {
  const lower = message.toLowerCase();
  const matches = {};
  for (const [category, keywords] of Object.entries(KEYWORDS)) {
    const score = keywords.filter(kw => lower.includes(kw)).length;
    if (score > 0) matches[category] = score;
  }
  return matches;
}

// Decide what to say based on message context
function generateResponse(message, chatType = 'group') {
  const matches = matchCategory(message);
  const categories = Object.keys(matches);

  // No relevant keywords — stay quiet
  if (categories.length === 0) return null;

  // Sort by match score
  categories.sort((a, b) => matches[b] - matches[a]);
  const topCategory = categories[0];

  // Pick response based on context
  const responses = [];

  // 1. Start with a helpful tip (80% of the time in groups)
  if (chatType === 'group' && Math.random() < 0.8) {
    const tip = HELPFUL_TIPS[Math.floor(Math.random() * HELPFUL_TIPS.length)];
    responses.push(tip);
  }

  // 2. Add a soft promotion (50% chance, or 100% if direct ask)
  const isDirectAsk = /recommend|suggest|tool for|any tool|what (do )?you (use|recommend)|有没有推荐|用什么工具/.test(message.toLowerCase());
  if (isDirectAsk || Math.random() < 0.5) {
    const promo = SOFT_PROMOTIONS[Math.floor(Math.random() * SOFT_PROMOTIONS.length)];
    responses.push(promo);
  }

  return responses.length > 0 ? responses.join('\n\n') : null;
}

// Generate social media post ideas based on trending topics
function generatePostIdeas(topics) {
  const templates = [
    {
      type: 'tip',
      title: 'Quick Writing Tip',
      body: `Struggling with {topic}? Here's a quick fix: {tip}. I use ${PRODUCT.name} for this — ${PRODUCT.freeNote}.`,
    },
    {
      type: 'question',
      title: 'Question for writers',
      body: `What's your biggest challenge with {topic}? For me it used to be getting started. Now I use ${PRODUCT.name} — ${PRODUCT.url}`,
    },
    {
      type: 'story',
      title: 'Writing hack I discovered',
      body: `Spent way too long on {topic} today. Finally caved and tried an AI tool. ${PRODUCT.name} — ${PRODUCT.freeNote}. Actually impressed.`,
    },
    {
      type: 'comparison',
      title: 'Before vs After',
      body: `Before: 30 min writing a {topic}.\nAfter: 2 min with ${PRODUCT.name}.\n\n${PRODUCT.url}`,
    },
  ];

  const topics_list = Array.isArray(topics) ? topics : [topics];
  const results = [];
  for (const topic of topics_list) {
    const template = templates[Math.floor(Math.random() * templates.length)];
    results.push({
      ...template,
      body: template.body.replace(/\{topic\}/g, topic),
      hashtags: generateHashtags(topic),
    });
  }
  return results;
}

function generateHashtags(topic) {
  const base = ['#writing', '#writingtips', '#productivity', '#aitools'];
  const specific = {
    email: ['#emailmarketing', '#businesswriting'],
    resume: ['#resume', '#career', '#jobsearch'],
    writing: ['#writerslife', '#contentcreation', '#copywriting'],
    meeting: ['#meetings', '#productivityhack', '#remotework'],
  };

  for (const [key, tags] of Object.entries(specific)) {
    if (topic.toLowerCase().includes(key)) return [...base, ...tags].join(' ');
  }
  return base.join(' ');
}

// Scrape trending topics from various sources
async function fetchTrendingTopics() {
  const topics = [];

  try {
    // Reddit r/writing hot posts
    const redditRes = await fetch('https://www.reddit.com/r/writing/hot.json?limit=10', {
      headers: { 'User-Agent': 'AivaDesk/1.0' },
      signal: AbortSignal.timeout(8000),
    });
    if (redditRes.ok) {
      const data = await redditRes.json();
      for (const post of (data?.data?.children || [])) {
        const title = post.data.title;
        if (title && !title.startsWith('[MOD]') && !title.startsWith('[Weekly]')) {
          topics.push({ source: 'reddit', title, url: `https://reddit.com${post.data.permalink}` });
        }
      }
    }
  } catch (e) {
    // Silently fail — scraping is best-effort
  }

  try {
    // Hacker News
    const hnRes = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json', {
      signal: AbortSignal.timeout(8000),
    });
    if (hnRes.ok) {
      const ids = (await hnRes.json()).slice(0, 10);
      const items = await Promise.all(ids.map(async (id) => {
        try {
          const itemRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, {
            signal: AbortSignal.timeout(5000),
          });
          return itemRes.ok ? itemRes.json() : null;
        } catch { return null; }
      }));
      for (const item of items) {
        if (item?.title && /(write|writing|text|content|email|blog|copy)/i.test(item.title)) {
          topics.push({ source: 'hn', title: item.title, url: `https://news.ycombinator.com/item?id=${item.id}` });
        }
      }
    }
  } catch (e) {
    // Silently fail
  }

  return topics;
}

export { generateResponse, generatePostIdeas, fetchTrendingTopics, CONVERSATION_STARTERS, PRODUCT };
