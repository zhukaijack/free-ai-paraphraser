import { getUser, createUser } from '../../lib/kv.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, referralCode } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  try {
    let user = await getUser(email);
    if (!user) {
      user = await createUser(email, referralCode || null);
      return res.status(201).json({ user, isNew: true });
    }
    return res.status(200).json({ user, isNew: false });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
