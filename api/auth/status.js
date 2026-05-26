import { getUser } from '../../lib/kv.js';

export default async function handler(req, res) {
  const email = req.query.email;
  if (!email) {
    return res.status(400).json({ error: 'Email required' });
  }

  try {
    const user = await getUser(email);
    if (!user) {
      return res.status(200).json({ tier: 'free', usageToday: 0, remaining: 3, isNew: true });
    }

    const today = new Date().toISOString().slice(0, 10);
    const usageToday = user.lastResetDate === today ? user.usageToday : 0;
    const remaining = user.tier === 'pro' || user.tier === 'api' ? Infinity : Math.max(0, 3 - usageToday);

    return res.status(200).json({
      tier: user.tier,
      usageToday,
      remaining,
      referralCode: user.referralCode,
      referralCount: user.referralCount || 0,
      proExpiry: user.proExpiry,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
