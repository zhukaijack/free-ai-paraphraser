import { checkAndIncrementUsage, getUser } from '../lib/kv.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const API_KEY = process.env.QWEN_API_KEY;
  if (!API_KEY) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  // Usage check - use email if provided, otherwise IP-based
  const email = req.body._email || null;
  let usageCheck;

  if (email) {
    usageCheck = await checkAndIncrementUsage(email);
    if (!usageCheck.allowed) {
      return res.status(429).json({
        error: usageCheck.reason === 'limit_reached'
          ? 'Daily free limit (3) reached. Upgrade to Pro for unlimited access.'
          : 'User not found. Please register first.',
        code: usageCheck.reason,
        tier: usageCheck.tier,
      });
    }
  }

  try {
    const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + API_KEY,
      },
      body: JSON.stringify({
        model: req.body.model,
        messages: req.body.messages,
        max_tokens: req.body.max_tokens,
        temperature: req.body.temperature,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.message || 'API request failed' });
    }

    // Attach usage info to response
    if (email && usageCheck) {
      data._usage = {
        remaining: usageCheck.remaining,
        tier: usageCheck.tier,
      };
    }

    return res.status(200).json(data);
  } catch (e) {
    return res.status(502).json({ error: 'Upstream API error: ' + e.message });
  }
}
