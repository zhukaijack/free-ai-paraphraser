// Run this script ONCE to create PayPal product & plan.
// Usage: node scripts/setup-paypal.js
// Requires env vars: PAYPAL_CLIENT_ID, PAYPAL_SECRET

const PAYPAL_BASE = 'https://api-m.paypal.com';

async function getToken() {
  const auth = Buffer.from(process.env.PAYPAL_CLIENT_ID + ':' + process.env.PAYPAL_SECRET).toString('base64');
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: { 'Authorization': 'Basic ' + auth, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  const data = await res.json();
  if (!res.ok) throw new Error('Auth failed: ' + JSON.stringify(data));
  return data.access_token;
}

async function main() {
  const token = await getToken();
  console.log('Authenticated with PayPal\n');

  // Create Product
  const productRes = await fetch(`${PAYPAL_BASE}/v1/catalogs/products`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'AivaDesk Pro',
      description: 'Unlimited AI rewriting, all styles, priority speed. Monthly subscription.',
      type: 'SERVICE',
      category: 'SOFTWARE',
    }),
  });
  const product = await productRes.json();
  if (!productRes.ok) throw new Error('Product failed: ' + JSON.stringify(product));
  console.log('Product created:', product.id);

  // Create Plan
  const planRes = await fetch(`${PAYPAL_BASE}/v1/billing/plans`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      product_id: product.id,
      name: 'AivaDesk Pro Monthly',
      description: 'Unlimited access to all AivaDesk AI tools. $5/month.',
      status: 'ACTIVE',
      billing_cycles: [{
        frequency: { interval_unit: 'MONTH', interval_count: 1 },
        tenure_type: 'REGULAR',
        sequence: 1,
        total_cycles: 0,
        pricing_scheme: { fixed_price: { value: '5.00', currency_code: 'USD' } },
      }],
      payment_preferences: {
        auto_bill_outstanding: true,
        payment_failure_threshold: 3,
      },
    }),
  });
  const plan = await planRes.json();
  if (!planRes.ok) throw new Error('Plan failed: ' + JSON.stringify(plan));
  console.log('Plan created:', plan.id);
  console.log('\nDone! Add to Vercel environment variables:');
  console.log('  PAYPAL_PLAN_ID=' + plan.id);
}

main().catch(e => { console.error(e.message); process.exit(1); });
