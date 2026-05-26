import { sql } from '@vercel/postgres';

// Ensure table exists
let tableReady = false;
async function ensureTable() {
  if (tableReady) return;
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      email TEXT PRIMARY KEY,
      tier TEXT DEFAULT 'free',
      usage_today INTEGER DEFAULT 0,
      last_reset_date TEXT DEFAULT '',
      pro_expiry TEXT,
      referral_code TEXT UNIQUE,
      referred_by TEXT,
      referral_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT ''
    )
  `;
  tableReady = true;
}

export async function getUser(email) {
  await ensureTable();
  const { rows } = await sql`SELECT * FROM users WHERE email = ${email.toLowerCase()}`;
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    email: r.email,
    tier: r.tier,
    usageToday: r.usage_today,
    lastResetDate: r.last_reset_date,
    proExpiry: r.pro_expiry,
    referralCode: r.referral_code,
    referredBy: r.referred_by,
    referralCount: r.referral_count,
    createdAt: r.created_at,
  };
}

function generateCode() {
  return 'av' + Math.random().toString(36).substring(2, 8);
}

export async function createUser(email, referralCode = null) {
  await ensureTable();
  const key = email.toLowerCase();
  const existing = await getUser(key);
  if (existing) return existing;

  const code = generateCode();
  const now = new Date().toISOString();

  await sql`
    INSERT INTO users (email, tier, usage_today, last_reset_date, referral_code, referred_by, created_at)
    VALUES (${key}, 'free', 0, ${now.slice(0, 10)}, ${code}, ${referralCode}, ${now})
  `;

  // Increment referrer
  if (referralCode) {
    const referrer = await findByReferralCode(referralCode);
    if (referrer) {
      const newCount = (referrer.referralCount || 0) + 1;
      await sql`UPDATE users SET referral_count = ${newCount} WHERE email = ${referrer.email}`;
      if (newCount >= 3 && referrer.tier === 'free') {
        const expiry = new Date(Date.now() + 30 * 86400000).toISOString();
        await sql`UPDATE users SET tier = 'pro', pro_expiry = ${expiry} WHERE email = ${referrer.email}`;
      }
    }
  }

  return getUser(key);
}

export async function updateUser(email, updates) {
  await ensureTable();
  const user = await getUser(email);
  if (!user) return null;

  const tier = updates.tier ?? user.tier;
  const usageToday = updates.usageToday ?? user.usageToday;
  const lastResetDate = updates.lastResetDate ?? user.lastResetDate;
  const proExpiry = updates.proExpiry ?? user.proExpiry;
  const referralCount = updates.referralCount ?? user.referralCount;

  await sql`
    UPDATE users SET
      tier = ${tier},
      usage_today = ${usageToday},
      last_reset_date = ${lastResetDate},
      pro_expiry = ${proExpiry},
      referral_count = ${referralCount}
    WHERE email = ${email.toLowerCase()}
  `;

  return getUser(email);
}

export async function checkAndIncrementUsage(email) {
  await ensureTable();
  const user = await getUser(email);
  if (!user) return { allowed: false, reason: 'not_found' };

  const today = new Date().toISOString().slice(0, 10);
  let { usageToday, lastResetDate, tier, proExpiry } = user;

  if (lastResetDate !== today) {
    usageToday = 0;
    lastResetDate = today;
  }

  // Check Pro expiry
  if (tier === 'pro' && proExpiry && new Date(proExpiry) < new Date()) {
    tier = 'free';
    proExpiry = null;
  }

  if (tier === 'pro' || tier === 'api') {
    usageToday++;
    await sql`UPDATE users SET usage_today = ${usageToday}, last_reset_date = ${lastResetDate}, tier = ${tier}, pro_expiry = ${proExpiry} WHERE email = ${email.toLowerCase()}`;
    return { allowed: true, remaining: Infinity, tier };
  }

  if (usageToday >= 3) {
    await sql`UPDATE users SET last_reset_date = ${lastResetDate}, tier = ${tier}, pro_expiry = ${proExpiry} WHERE email = ${email.toLowerCase()}`;
    return { allowed: false, reason: 'limit_reached', remaining: 0, tier: 'free' };
  }

  usageToday++;
  await sql`UPDATE users SET usage_today = ${usageToday}, last_reset_date = ${lastResetDate}, tier = ${tier}, pro_expiry = ${proExpiry} WHERE email = ${email.toLowerCase()}`;
  return { allowed: true, remaining: 3 - usageToday, tier: 'free' };
}

export async function findByReferralCode(code) {
  await ensureTable();
  const { rows } = await sql`SELECT * FROM users WHERE referral_code = ${code}`;
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    email: r.email,
    tier: r.tier,
    referralCount: r.referral_count,
  };
}
