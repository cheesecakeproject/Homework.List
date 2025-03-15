export default async function handler(req, res) {
    try {
      if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
      }
  
      const { passcode } = req.body;
  
      if (!passcode) {
        return res.status(400).json({ message: 'Passcode is required' });
      }
  
      // Get the passcode from environment variables
      const adminPasscode = process.env.ADMIN_PASSCODE;
  
      // Debug environment variables (will appear in Vercel logs)
      console.log('Environment check:', {
        adminPasscodeExists: !!process.env.ADMIN_PASSCODE,
        jwtValueExists: !!process.env.JWT_VALUE
      });
  
      if (!adminPasscode) {
        return res.status(500).json({ message: 'Server configuration error: ADMIN_PASSCODE environment variable is missing' });
      }
  
      if (passcode !== adminPasscode) {
        return res.status(401).json({ message: 'Invalid passcode' });
      }
  
      // Create JWT token
      const jwtValue = process.env.JWT_VALUE;
      
      if (!jwtValue) {
        return res.status(500).json({ message: 'Server configuration error: JWT_VALUE environment variable is missing' });
      }
  
      // Dynamic import of jsonwebtoken to avoid potential initialization errors
      const { sign } = await import('jsonwebtoken');
      
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
    } catch (error) {
      console.error('Authentication error:', error);
      return res.status(500).json({ 
        message: 'Server error during authentication',
        error: error.message
      });
    }
  }