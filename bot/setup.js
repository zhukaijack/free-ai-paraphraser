// Bot setup — register webhook and configure bot profile
// Usage: node bot/setup.js

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_URL = process.env.BOT_WEBHOOK_URL || 'https://free-ai-paraphraser.vercel.app/api/bot/telegram';

if (!BOT_TOKEN) {
  console.error('Set TELEGRAM_BOT_TOKEN env var');
  process.exit(1);
}

const API = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function api(method, body = {}) {
  const res = await fetch(`${API}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function main() {
  console.log('Setting up AivaDesk Bot...\n');

  // 1. Get bot info
  const me = await api('getMe');
  console.log('Bot:', me.result?.username, '-', me.result?.first_name);
  if (!me.ok) {
    console.error('Invalid token! Get one from @BotFather on Telegram.');
    process.exit(1);
  }

  // 2. Set bot profile
  console.log('\n--- Configuring profile ---');
  await api('setMyName', { name: 'AivaDesk Assistant' });
  await api('setMyDescription', {
    description: 'AI writing assistant. I help with rewriting, emails, resumes, and more. Add me to your writing groups!',
  });
  await api('setMyShortDescription', { short_description: 'AI writing helper — rewrite, email, resume, summary' });

  // 3. Set commands
  await api('setMyCommands', {
    commands: [
      { command: 'start', description: 'Start the bot' },
      { command: 'write', description: 'Get writing help' },
      { command: 'tools', description: 'See all 5 writing tools' },
      { command: 'link', description: 'Get AivaDesk website link' },
      { command: 'tip', description: 'Random writing tip' },
      { command: 'help', description: 'Show all commands' },
    ],
  });

  // 4. Register webhook
  console.log('\n--- Registering webhook ---');
  const webhook = await api('setWebhook', {
    url: WEBHOOK_URL,
    allowed_updates: ['message', 'channel_post', 'callback_query'],
    drop_pending_updates: true,
  });
  console.log('Webhook:', webhook.description || webhook.ok ? 'OK' : JSON.stringify(webhook));

  // 5. Verify webhook
  const info = await api('getWebhookInfo');
  console.log('\nWebhook info:');
  console.log('  URL:', info.result?.url);
  console.log('  Pending:', info.result?.pending_update_count);
  console.log('  Last error:', info.result?.last_error_message || 'none');

  console.log('\n--- Setup complete ---');
  console.log('Bot is live! Add @' + me.result?.username + ' to your groups.');
  console.log('Or share: https://t.me/' + me.result?.username);
  console.log('\nImportant: Set TELEGRAM_BOT_TOKEN in Vercel environment variables.');
}

main().catch(e => { console.error(e.message); process.exit(1); });
