import crypto from 'crypto';

// Helper function to create an expiring token
function createToken(data, secret, expiresInHours = 24) {
  const payload = {
    data,
    exp: Date.now() + (expiresInHours * 60 * 60 * 1000) // Expiry time in milliseconds
  };
  
  // Convert payload to string and create a signature
  const payloadStr = JSON.stringify(payload);
  const hmac = crypto.createHmac('sha256', secret);
  const signature = hmac.update(payloadStr).digest('hex');
  
  // Base64 encode the payload and combine with signature
  const encodedPayload = Buffer.from(payloadStr).toString('base64');
  return `${encodedPayload}.${signature}`;
}

export default function handler(req, res) {
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
    
    if (!adminPasscode) {
      return res.status(500).json({ message: 'Server configuration error: ADMIN_PASSCODE not set' });
    }
    
    if (passcode !== adminPasscode) {
      return res.status(401).json({ message: 'Invalid passcode' });
    }
    
    // Use JWT_VALUE as our secret key, or create a fallback
    const secret = process.env.JWT_VALUE || 'default-secret-key-for-development-only';
    
    // Create a simple token
    const token = createToken({ admin: true }, secret);
    
    return res.status(200).json({ token });
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({ 
      message: 'Server error during authentication',
      error: error.message
    });
  }
}