// Social media content engine — generate posts for various platforms
// Usage: node bot/social.js [platform]

import { generatePostIdeas, fetchTrendingTopics, PRODUCT } from '../lib/bot/engine.js';

const PLATFORM_CONFIG = {
  twitter: {
    name: 'Twitter / X',
    maxLength: 280,
    bestTime: '8-10 AM EST weekdays',
    format: 'short',
    hashtagCount: 3,
  },
  reddit: {
    name: 'Reddit',
    maxLength: 40000,
    bestTime: '6-9 AM EST',
    format: 'long',
    subreddits: ['r/writing', 'r/freelanceWriters', 'r/productivity', 'r/copywriting', 'r/EmailMarketing'],
  },
  linkedin: {
    name: 'LinkedIn',
    maxLength: 3000,
    bestTime: '8-10 AM Tue-Thu',
    format: 'professional',
    hashtagCount: 5,
  },
  telegram: {
    name: 'Telegram',
    maxLength: 4096,
    bestTime: 'anytime',
    format: 'casual',
  },
};

function generateTwitterPost(topic) {
  const ideas = generatePostIdeas([topic]);
  const idea = ideas[0];
  let text = idea.body.substring(0, 240) + '\n\n' + idea.hashtags;
  if (text.length > 280) {
    text = idea.body.substring(0, 230) + '...\n\n' + idea.hashtags;
  }
  return { platform: 'twitter', text, topic };
}

function generateRedditPost(topic) {
  const titles = [
    `How I improved my ${topic.toLowerCase()} workflow with an AI tool`,
    `PSA: Found a free AI writing tool that actually helps with ${topic.toLowerCase()}`,
    `Quick tip for ${topic.toLowerCase()} — what worked for me`,
    `${topic}: My process changed completely after trying this`,
  ];
  const title = titles[Math.floor(Math.random() * titles.length)];
  const body = `I've been testing various tools for ${topic.toLowerCase()} and wanted to share what worked.\n\n` +
    `I use AivaDesk (${PRODUCT.url}) now. It's free — 3 uses per day, no credit card. What I like:\n\n` +
    `1. It has specific tools for different writing tasks (email, resume, rewrite, etc.)\n` +
    `2. You can pick tone: professional, casual, creative, academic\n` +
    `3. Results are actually good — not generic ChatGPT responses\n\n` +
    `The free tier is enough for occasional use. Pro is $5/month if you need more.\n\n` +
    `Not affiliated — just genuinely useful and wanted to share. What tools are you all using for ${topic.toLowerCase()}?`;

  return {
    platform: 'reddit',
    title,
    body,
    subreddits: PLATFORM_CONFIG.reddit.subreddits,
    topic,
  };
}

function generateLinkedInPost(topic) {
  const texts = [
    `One thing I learned about ${topic.toLowerCase()}: speed matters more than perfection.\n\nI used to spend way too long on every piece of writing. Then I realized — get it out first, polish later.\n\nA tool like AivaDesk helps with the polishing part. Free tier gives you 3 rewrites a day, which is usually enough.\n\nLink in comments if anyone's interested. 👇\n\nWhat's your ${topic.toLowerCase()} workflow?`,

    `${topic} doesn't have to take forever.\n\nHere's my 3-step approach:\n1. Write a rough draft (don't edit while writing)\n2. Let it sit for 5 minutes\n3. Use a rewrite tool to polish tone & grammar\n\nSaves me about 20 minutes per piece. At 5 pieces a week, that's almost 2 hours back.\n\nNot going to hard-sell — but AivaDesk has been my go-to for step 3. Free to try.`,
  ];

  return {
    platform: 'linkedin',
    text: texts[Math.floor(Math.random() * texts.length)] + '\n\n' + generateHashtags(topic),
    topic,
  };
}

function generateHashtags(topic) {
  const tags = ['#writing', '#productivity', '#writingtips', '#contentcreation'];
  if (/email/i.test(topic)) tags.push('#emailmarketing');
  if (/resume|cv/i.test(topic)) tags.push('#career', '#jobsearch');
  if (/meeting/i.test(topic)) tags.push('#meetings', '#productivityhack');
  return tags.join(' ');
}

function generateTelegramPost(topic) {
  const ideas = generatePostIdeas([topic]);
  const idea = ideas[0];
  return {
    platform: 'telegram',
    text: `📝 ${idea.title}\n\n${idea.body}`,
    topic,
  };
}

// Image post template — for platforms that support images (Instagram, Pinterest, etc.)
function generateImagePost(topic) {
  const layouts = [
    {
      title: 'Before → After',
      subtitle: `${topic} made easy`,
      cta: `Try free at ${PRODUCT.url}`,
      colors: { bg: '#6366f1', text: '#ffffff' },
    },
    {
      title: 'Writer\'s Block?',
      subtitle: `Fix your ${topic.toLowerCase()} in seconds`,
      cta: `${PRODUCT.freeNote}`,
      colors: { bg: '#0f172a', text: '#ffffff' },
    },
    {
      title: 'Write Smarter',
      subtitle: `5 AI tools for ${topic.toLowerCase()}`,
      cta: PRODUCT.url,
      colors: { bg: '#1e293b', text: '#6366f1' },
    },
  ];

  const layout = layouts[Math.floor(Math.random() * layouts.length)];
  return {
    platform: 'image',
    layout,
    topic,
    htmlTemplate: generateImageHTML(layout),
  };
}

function generateImageHTML(layout) {
  // Returns HTML that can be screenshotted or rendered to an image
  return `
<div style="width:800px;height:600px;background:${layout.colors.bg};display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:Arial,sans-serif;padding:60px;text-align:center">
  <h1 style="color:${layout.colors.text};font-size:48px;margin-bottom:20px">${layout.title}</h1>
  <p style="color:#94a3b8;font-size:28px;margin-bottom:40px">${layout.subtitle}</p>
  <div style="background:${layout.colors.text === '#ffffff' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'};padding:20px 40px;border-radius:12px;font-size:24px;color:#94a3b8">
    ${layout.cta}
  </div>
</div>`;
}

// Main content generator
async function generateContent(platform, topic) {
  if (!topic) {
    const trending = await fetchTrendingTopics();
    if (trending.length > 0) {
      topic = trending[Math.floor(Math.random() * trending.length)].title;
    } else {
      topic = 'writing'; // fallback
    }
  }

  switch (platform) {
    case 'twitter': return generateTwitterPost(topic);
    case 'reddit': return generateRedditPost(topic);
    case 'linkedin': return generateLinkedInPost(topic);
    case 'telegram': return generateTelegramPost(topic);
    case 'image': return generateImagePost(topic);
    case 'all':
      return {
        twitter: generateTwitterPost(topic),
        reddit: generateRedditPost(topic),
        linkedin: generateLinkedInPost(topic),
        telegram: generateTelegramPost(topic),
        image: generateImagePost(topic),
        trending: topic,
      };
    default:
      throw new Error(`Unknown platform: ${platform}. Try: twitter, reddit, linkedin, telegram, image, all`);
  }
}

// CLI
async function main() {
  const platform = process.argv[2] || 'all';
  const topic = process.argv[3] || null;

  console.log(`Generating content for: ${platform}\n`);
  const content = await generateContent(platform, topic);

  if (platform === 'all') {
    for (const [p, c] of Object.entries(content)) {
      if (p === 'trending') {
        console.log(`Topic: ${c}\n`);
        continue;
      }
      console.log(`=== ${c.platform.toUpperCase()} ===`);
      console.log(JSON.stringify(c, null, 2));
      console.log('');
    }
  } else {
    console.log(JSON.stringify(content, null, 2));
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });

export { generateContent, PLATFORM_CONFIG };
