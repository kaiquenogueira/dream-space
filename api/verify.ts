import jwt from 'jsonwebtoken';

export default function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  const jwtSecret = process.env.JWT_SECRET || 'default-secret-change-me';

  try {
    jwt.verify(token, jwtSecret);
    return res.status(200).json({ valid: true });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
