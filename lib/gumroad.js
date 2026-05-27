const GUMROAD_BASE = 'https://api.gumroad.com/v2';

function getToken() {
  const token = process.env.GUMROAD_ACCESS_TOKEN;
  if (!token) throw new Error('GUMROAD_ACCESS_TOKEN not configured');
  return token;
}

/**
 * Verify a license key for a product.
 * Used when a user manually enters their license key after purchase.
 */
export async function verifyLicense(licenseKey, productPermalink) {
  const res = await fetch(`${GUMROAD_BASE}/licenses/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      product_permalink: productPermalink,
      license_key: licenseKey,
    }).toString(),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'License verification failed');
  return data;
}

/**
 * Validate a Gumroad webhook request.
 * Gumroad sends a "sales" event with email when someone purchases.
 */
export function parseWebhookEvent(body) {
  // Gumroad sends form-encoded webhook data
  // The event is identified by the presence of sale/email fields
  if (!body || !body.email) return null;

  // Determine event type
  // Gumroad doesn't have explicit event types like PayPal — we infer from fields

  // subscription_cancelled → body has 'cancelled' field
  if (body.type === 'cancellation') {
    return { type: 'cancellation', email: body.email };
  }

  // New sale or subscription payment
  if (body.seller_id && body.email) {
    return {
      type: 'sale',
      email: body.email,
      productName: body.product_name,
      permalink: body.permalink,
      price: body.price,
      licenseKey: body.license_key || null,
    };
  }

  return null;
}

/**
 * Get the Gumroad product URL for redirecting users.
 */
export function getProductUrl() {
  const username = process.env.GUMROAD_USERNAME;
  const productId = process.env.GUMROAD_PRODUCT_ID;
  if (!username || !productId) throw new Error('Gumroad product not configured');
  return `https://${username}.gumroad.com/l/${productId}`;
}
