import { sign } from 'jsonwebtoken';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { passcode } = req.body;

  // Get the passcode from environment variables
  const adminPasscode = process.env.ADMIN_PASSCODE;

  if (!adminPasscode) {
    return res.status(500).json({ message: 'Server configuration error' });
  }

  if (passcode !== adminPasscode) {
    return res.status(401).json({ message: 'Invalid passcode' });
  }

  // Create JWT token
  const jwtValue = process.env.JWT_VALUE;
  
  if (!jwtValue) {
    return res.status(500).json({ message: 'Server configuration error' });
  }

  const token = sign(
    {
      admin: true,
    },
    jwtValue,
    {
      expiresIn: '24h', // Token expires in 24 hours
    }
  );

  return res.status(200).json({ token });
}