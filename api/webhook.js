import { verifyWebhook, getSubscription } from '../../lib/paypal.js';
import { updateUser, getUser, createUser } from '../../lib/kv.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify webhook signature
    const verified = await verifyWebhook(req.headers, req.body);
    if (!verified) {
      return res.status(403).json({ error: 'Invalid webhook signature' });
    }

    const event = req.body;
    const eventType = event.event_type;

    if (eventType === 'BILLING.SUBSCRIPTION.ACTIVATED' || eventType === 'BILLING.SUBSCRIPTION.CREATED') {
      const subscriptionId = event.resource.id;
      const sub = await getSubscription(subscriptionId);
      const email = sub.subscriber?.email_address;

      if (email) {
        await updateUser(email, {
          tier: 'pro',
          proExpiry: new Date(Date.now() + 30 * 86400000).toISOString(),
        });

        // Send activation to subscriber.payer.email as well
        const payerEmail = sub.subscriber?.payer?.email_address;
        if (payerEmail && payerEmail !== email) {
          await updateUser(payerEmail, {
            tier: 'pro',
            proExpiry: new Date(Date.now() + 30 * 86400000).toISOString(),
          });
        }
      }
    }

    if (eventType === 'BILLING.SUBSCRIPTION.CANCELLED' || eventType === 'BILLING.SUBSCRIPTION.EXPIRED') {
      const subscriptionId = event.resource.id;
      const sub = await getSubscription(subscriptionId);
      const email = sub.subscriber?.email_address;

      if (email) {
        await updateUser(email, { tier: 'free', proExpiry: null });
      }
    }

    return res.status(200).json({ received: true });
  } catch (e) {
    console.error('Webhook error:', e);
    // Always return 200 to PayPal to prevent retries
    return res.status(200).json({ received: true, error: e.message });
  }
}
