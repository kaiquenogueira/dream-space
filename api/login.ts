import { compare } from 'bcryptjs';
import jwt from 'jsonwebtoken';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Missing username or password' });
  }

  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
  const jwtSecret = process.env.JWT_SECRET || 'default-secret-change-me';

  if (!adminUsername || !adminPasswordHash) {
    console.error("Admin credentials not configured in environment variables");
    return res.status(500).json({ error: 'Server configuration error' });
  }

  console.log(`Login attempt for user: ${username}`);
  console.log(`Admin Username configured: ${adminUsername}`);
  console.log(`Hash configured (start): ${adminPasswordHash.substring(0, 10)}...`);

  if (username !== adminUsername) {
    console.log(`Username mismatch: ${username} !== ${adminUsername}`);
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  try {
    const isPasswordValid = await compare(password, adminPasswordHash);
    console.log(`Password valid? ${isPasswordValid}`);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ username }, jwtSecret, { expiresIn: '7d' });

    return res.status(200).json({ token });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
