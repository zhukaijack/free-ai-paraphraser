const PAYPAL_BASE = 'https://api-m.paypal.com';

function getAuth() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_SECRET;
  if (!clientId || !secret) throw new Error('PayPal credentials not configured');
  return 'Basic ' + Buffer.from(clientId + ':' + secret).toString('base64');
}

let cachedToken = null;
let tokenExpiry = 0;

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': getAuth(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return cachedToken;
}

export async function createSubscription(planId) {
  const token = await getAccessToken();
  const res = await fetch(`${PAYPAL_BASE}/v1/billing/subscriptions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      plan_id: planId,
      application_context: {
        brand_name: 'AivaDesk',
        locale: 'en-US',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'SUBSCRIBE_NOW',
        return_url: process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}/?subscribed=1` : 'https://free-ai-paraphraser.vercel.app/?subscribed=1',
        cancel_url: process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}/?cancelled=1` : 'https://free-ai-paraphraser.vercel.app/?cancelled=1',
      },
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Subscription creation failed');

  // Find approval URL
  const approvalLink = data.links?.find(l => l.rel === 'approve');
  return { subscriptionId: data.id, approvalUrl: approvalLink?.href };
}

export async function getSubscription(subscriptionId) {
  const token = await getAccessToken();
  const res = await fetch(`${PAYPAL_BASE}/v1/billing/subscriptions/${subscriptionId}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  return res.json();
}

export async function verifyWebhook(headers, body) {
  const token = await getAccessToken();
  const res = await fetch(`${PAYPAL_BASE}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      auth_algo: headers['paypal-auth-algo'],
      cert_url: headers['paypal-cert-url'],
      transmission_id: headers['paypal-transmission-id'],
      transmission_sig: headers['paypal-transmission-sig'],
      transmission_time: headers['paypal-transmission-time'],
      webhook_id: process.env.PAYPAL_WEBHOOK_ID,
      webhook_event: body,
    }),
  });
  const data = await res.json();
  return data.verification_status === 'SUCCESS';
}

export async function createProductAndPlan() {
  const token = await getAccessToken();

  // Create product
  const productRes = await fetch(`${PAYPAL_BASE}/v1/catalogs/products`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'AivaDesk Pro',
      description: 'Unlimited AI rewriting, all styles, priority speed.',
      type: 'SERVICE',
      category: 'SOFTWARE',
    }),
  });
  const product = await productRes.json();
  if (!productRes.ok) throw new Error('Product creation failed: ' + JSON.stringify(product));

  // Create plan
  const planRes = await fetch(`${PAYPAL_BASE}/v1/billing/plans`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      product_id: product.id,
      name: 'AivaDesk Pro Monthly',
      description: 'Unlimited access to all AivaDesk AI tools.',
      status: 'ACTIVE',
      billing_cycles: [{
        frequency: { interval_unit: 'MONTH', interval_count: 1 },
        tenure_type: 'REGULAR',
        sequence: 1,
        total_cycles: 0,
        pricing_scheme: {
          fixed_price: { value: '5.00', currency_code: 'USD' },
        },
      }],
      payment_preferences: {
        auto_bill_outstanding: true,
        payment_failure_threshold: 3,
      },
    }),
  });
  const plan = await planRes.json();
  if (!planRes.ok) throw new Error('Plan creation failed: ' + JSON.stringify(plan));

  return { productId: product.id, planId: plan.id };
}
