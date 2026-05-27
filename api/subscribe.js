import { getProductUrl } from '../lib/gumroad.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const url = getProductUrl();
    return res.status(200).json({ productUrl: url });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
