import { kv } from '@vercel/kv';

export async function getUser(email) {
  const data = await kv.get(`user:${email.toLowerCase()}`);
  return data ? JSON.parse(data) : null;
}

export async function createUser(email, referralCode = null) {
  const key = email.toLowerCase();
  const existing = await getUser(key);
  if (existing) return existing;

  const user = {
    email: key,
    tier: 'free',
    usageToday: 0,
    lastResetDate: new Date().toISOString().slice(0, 10),
    proExpiry: null,
    referralCode: generateCode(),
    referredBy: referralCode,
    referralCount: 0,
    createdAt: new Date().toISOString(),
  };

  await kv.set(`user:${key}`, JSON.stringify(user));

  // Increment referrer's count if applicable
  if (referralCode) {
    const referrer = await findByReferralCode(referralCode);
    if (referrer) {
      referrer.referralCount = (referrer.referralCount || 0) + 1;
      // Auto-upgrade if 3+ referrals
      if (referrer.referralCount >= 3 && referrer.tier === 'free') {
        referrer.tier = 'pro';
        referrer.proExpiry = new Date(Date.now() + 30 * 86400000).toISOString();
      }
      await kv.set(`user:${referrer.email}`, JSON.stringify(referrer));
    }
  }

  return user;
}

export async function updateUser(email, updates) {
  const user = await getUser(email);
  if (!user) return null;
  const updated = { ...user, ...updates };
  await kv.set(`user:${email.toLowerCase()}`, JSON.stringify(updated));
  return updated;
}

export async function checkAndIncrementUsage(email) {
  const user = await getUser(email);
  if (!user) return { allowed: false, reason: 'not_found' };

  const today = new Date().toISOString().slice(0, 10);

  // Reset daily counter if new day
  if (user.lastResetDate !== today) {
    user.usageToday = 0;
    user.lastResetDate = today;
  }

  // Pro/API users: unlimited
  if (user.tier === 'pro' || user.tier === 'api') {
    if (user.tier === 'pro' && user.proExpiry && new Date(user.proExpiry) < new Date()) {
      user.tier = 'free';
      user.proExpiry = null;
    } else {
      user.usageToday++;
      await kv.set(`user:${email.toLowerCase()}`, JSON.stringify(user));
      return { allowed: true, remaining: Infinity, tier: user.tier };
    }
  }

  // Free users: 3 per day
  if (user.usageToday >= 3) {
    await kv.set(`user:${email.toLowerCase()}`, JSON.stringify(user));
    return { allowed: false, reason: 'limit_reached', remaining: 0, tier: 'free' };
  }

  user.usageToday++;
  await kv.set(`user:${email.toLowerCase()}`, JSON.stringify(user));
  return { allowed: true, remaining: 3 - user.usageToday, tier: 'free' };
}

export async function findByReferralCode(code) {
  // Scan for user with this referral code (limited scan)
  const keys = await kv.keys('user:*');
  for (const key of keys) {
    const data = await kv.get(key);
    if (data) {
      const user = JSON.parse(data);
      if (user.referralCode === code) return user;
    }
  }
  return null;
}

function generateCode() {
  return 'av' + Math.random().toString(36).substring(2, 8);
}
