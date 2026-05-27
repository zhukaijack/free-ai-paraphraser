import { parseWebhookEvent } from '../../lib/gumroad.js';
import { updateUser } from '../../lib/kv.js';

async function readBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body;
  }
  // Read raw body for form-encoded data
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf-8');
  const params = new URLSearchParams(raw);
  const body = {};
  for (const [k, v] of params) body[k] = v;
  return body;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = await readBody(req);
    const event = parseWebhookEvent(body);

    if (!event) {
      return res.status(200).json({ received: true, skipped: true });
    }

    if (event.type === 'sale') {
      const email = event.email?.toLowerCase();
      if (email) {
        await updateUser(email, {
          tier: 'pro',
          proExpiry: new Date(Date.now() + 30 * 86400000).toISOString(),
        });
      }
    }

    if (event.type === 'cancellation') {
      const email = event.email?.toLowerCase();
      if (email) {
        await updateUser(email, { tier: 'free', proExpiry: null });
      }
    }

    return res.status(200).json({ received: true });
  } catch (e) {
    console.error('Webhook error:', e);
    return res.status(200).json({ received: true, error: e.message });
  }
}
