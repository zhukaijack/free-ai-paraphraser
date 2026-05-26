import { createSubscription } from '../../lib/paypal.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const planId = process.env.PAYPAL_PLAN_ID;
  if (!planId) {
    return res.status(500).json({ error: 'PayPal plan not configured. Run setup script first.' });
  }

  try {
    const { subscriptionId, approvalUrl } = await createSubscription(planId);
    return res.status(200).json({ subscriptionId, approvalUrl });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
