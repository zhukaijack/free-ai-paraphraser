// Vercel API handler for Telegram Bot webhook
// Deploy to: api/bot/telegram.js
// Webhook URL: https://free-ai-paraphraser.vercel.app/api/bot/telegram

import { generateResponse } from '../../lib/bot/engine.js';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function sendMessage(chatId, text) {
  if (!BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN not set');
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: false,
    }),
  });
  return res.json();
}

async function answerCallback(callbackQueryId, text) {
  if (!BOT_TOKEN) return;
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text,
      show_alert: false,
    }),
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const update = req.body;
    console.log('Telegram update:', JSON.stringify(update).substring(0, 500));

    // Handle callback queries (inline button clicks)
    if (update.callback_query) {
      const cb = update.callback_query;
      if (cb.data === 'visit') {
        await answerCallback(cb.id, 'Opening AivaDesk...');
        await sendMessage(cb.message.chat.id,
          'Check it out: https://free-ai-paraphraser.vercel.app\n\n3 free uses daily, no credit card!');
      }
      return res.status(200).json({ ok: true });
    }

    // Handle messages
    const message = update.message || update.channel_post;
    if (!message || !message.text) {
      return res.status(200).json({ ok: true });
    }

    const chatId = message.chat.id;
    const chatType = message.chat.type; // 'private', 'group', 'supergroup', 'channel'
    const text = message.text;
    const fromUser = message.from?.username || message.from?.first_name || 'there';

    // Handle commands
    if (text.startsWith('/')) {
      const cmd = text.split(' ')[0].split('@')[0]; // Remove @botname mention
      switch (cmd) {
        case '/start':
          await sendMessage(chatId,
            `Hey ${fromUser}! 👋\n\nI'm the AivaDesk writing assistant bot.\n\n` +
            `Try these commands:\n` +
            `/write — Get writing help\n` +
            `/tools — See what AivaDesk can do\n` +
            `/link — Get the website link\n` +
            `/tip — Random writing tip`);
          break;

        case '/write':
          await sendMessage(chatId,
            `What do you need help with?\n\n` +
            `- Rewrite / Paraphrase\n` +
            `- Professional Email\n` +
            `- Resume Bullet Points\n` +
            `- Meeting Summary\n` +
            `- Leave Request\n\n` +
            `Try it free: https://free-ai-paraphraser.vercel.app`);
          break;

        case '/tools':
          await sendMessage(chatId,
            `<b>AivaDesk — 5 AI Writing Tools</b>\n\n` +
            `1. ✍️ Rewrite / Paraphrase — Change tone, fix grammar, polish text\n` +
            `2. 📧 Professional Email — Turn notes into polished emails\n` +
            `3. 📄 Resume Bullets — Experience → powerful bullet points\n` +
            `4. 📝 Meeting Summary — Notes → key points + action items\n` +
            `5. 🏖️ Leave Request — Polite, professional leave notes\n\n` +
            `<b>3 free uses every day. No credit card.</b>\n` +
            `https://free-ai-paraphraser.vercel.app`);
          break;

        case '/link':
          await sendMessage(chatId,
            `<b>AivaDesk — AI Writing Assistant</b>\n\n` +
            `Rewrite, polish, draft emails, generate resumes.\n` +
            `3 free daily, no credit card needed.\n\n` +
            `👉 https://free-ai-paraphraser.vercel.app`);
          break;

        case '/tip':
          await sendMessage(chatId, getRandomTip());
          break;

        case '/help':
          await sendMessage(chatId,
            `Commands: /start /write /tools /link /tip /help\n\n` +
            `I also respond when people talk about writing, emails, resumes, or productivity tools.`);
          break;

        default:
          // Unknown command — do nothing
          break;
      }
      return res.status(200).json({ ok: true });
    }

    // Non-command messages — check keywords
    // Only respond in groups if the bot is mentioned or high keyword match
    const isGroup = chatType === 'group' || chatType === 'supergroup';
    const isMentioned = text.includes('@aivadesk') || text.includes('@AivaDesk');

    if (isGroup && !isMentioned) {
      // In groups, only respond to direct mentions to avoid spam
      return res.status(200).json({ ok: true, skipped: 'group_no_mention' });
    }

    const response = generateResponse(text, chatType);
    if (response) {
      await sendMessage(chatId, response);
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('Bot error:', e);
    return res.status(200).json({ ok: true, error: e.message });
  }
}

function getRandomTip() {
  const tips = [
    'Quick tip: When rewriting, try changing the tone first. Professional → casual often fixes 80% of the problem.',
    'For cold emails: subject line + first sentence = 90% of success. Personalize those two things.',
    'Resume trick: start every bullet with a strong action verb (Led, Built, Launched, Reduced).',
    'Meeting summaries: 3 bullets max — what was decided, what\'s next, who\'s doing what.',
    'Proofreading your own work is hard. Read it out loud, or use a rewriting tool to catch mistakes.',
    'Writer\'s block? Just write anything — even "I don\'t know what to write." Then edit it into something useful.',
  ];
  return tips[Math.floor(Math.random() * tips.length)];
}
