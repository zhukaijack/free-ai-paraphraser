import { verifyLicense } from '../../lib/gumroad.js';
import { updateUser } from '../../lib/kv.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, licenseKey } = req.body || {};

  if (!email || !licenseKey) {
    return res.status(400).json({ error: 'Email and license key are required.' });
  }

  const productPermalink = process.env.GUMROAD_PRODUCT_ID;
  if (!productPermalink) {
    return res.status(500).json({ error: 'Gumroad product not configured.' });
  }

  try {
    const result = await verifyLicense(licenseKey, productPermalink);

    if (!result.success) {
      return res.status(400).json({ error: 'Invalid license key. Please check and try again.' });
    }

    // License is valid — activate Pro for 30 days
    await updateUser(email, {
      tier: 'pro',
      proExpiry: new Date(Date.now() + 30 * 86400000).toISOString(),
    });

    return res.status(200).json({
      success: true,
      tier: 'pro',
      message: 'License verified! Your Pro access is now active.',
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
