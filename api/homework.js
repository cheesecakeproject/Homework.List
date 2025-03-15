import { createClient } from '@vercel/edge-config';
import crypto from 'crypto';

// Check if environment variable exists
if (!process.env.EDGE_CONFIG) {
  console.error('EDGE_CONFIG environment variable is missing');
}

// Create Edge Config client with robust error handling
let edgeConfig;
try {
  edgeConfig = createClient(process.env.EDGE_CONFIG);
} catch (error) {
  console.error('Failed to initialize Edge Config client:', error);
}

// Helper function to verify our custom token
function verifyToken(token) {
  try {
    // Use JWT_VALUE as our secret key, or create a fallback
    const secret = process.env.JWT_VALUE || 'default-secret-key-for-development-only';
    
    // Split the token into parts
    const [encodedPayload, signature] = token.split('.');
    
    // Decode the payload
    const payloadStr = Buffer.from(encodedPayload, 'base64').toString();
    const payload = JSON.parse(payloadStr);
    
    // Check if token is expired
    if (payload.exp < Date.now()) {
      return null; // Token expired
    }
    
    // Verify the signature
    const hmac = crypto.createHmac('sha256', secret);
    const expectedSignature = hmac.update(payloadStr).digest('hex');
    
    if (signature !== expectedSignature) {
      return null; // Invalid signature
    }
    
    return payload.data;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

// Helper function to authenticate requests
const authenticate = async (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { authenticated: false, message: 'Authentication required' };
  }
  
  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  
  if (!decoded || !decoded.admin) {
    return { authenticated: false, message: 'Invalid or expired token' };
  }
  
  return { authenticated: true, user: decoded };
};

export default async function handler(req, res) {
  // Handle error if Edge Config is not initialized
  if (!edgeConfig) {
    return res.status(500).json({ message: 'Server configuration error: Edge Config not initialized' });
  }

  // Handle GET request (retrieve homework)
  if (req.method === 'GET') {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ message: 'Date parameter is required' });
    }

    try {
      console.log('GET: Using EDGE_CONFIG:', process.env.EDGE_CONFIG ? 'exists' : 'missing');
      // Get homework data from Edge Config
      const homeworkData = await edgeConfig.get(date) || { items: [] };
      return res.status(200).json(homeworkData);
    } catch (error) {
      console.error('Error fetching homework:', error);
      return res.status(500).json({ message: 'Failed to fetch homework data', error: error.message });
    }
  }
  
  // Handle POST request (add homework)
  if (req.method === 'POST') {
    try {
      // Authenticate request
      const authResult = await authenticate(req, res);
      if (!authResult.authenticated) {
        return res.status(401).json({ message: authResult.message });
      }
      
      const { date, id, content } = req.body;
      
      if (!date || !id || !content) {
        return res.status(400).json({ message: 'Date, ID, and content are required' });
      }
      
      // Get existing data for this date
      const existingData = await edgeConfig.get(date) || { items: [] };
      
      // Add new homework item
      const updatedData = {
        items: [
          ...existingData.items,
          {
            id,
            content,
            createdAt: new Date().toISOString()
          }
        ]
      };
      
      // Store updated data in Edge Config
      await edgeConfig.set(date, updatedData);
      
      return res.status(200).json({ message: 'Homework added successfully' });
    } catch (error) {
      console.error('Error in POST handler:', error);
      return res.status(500).json({ message: 'Failed to add homework data', error: error.message });
    }
  }
  
  // Handle DELETE request (delete homework)
  if (req.method === 'DELETE') {
    try {
      // Authenticate request
      const authResult = await authenticate(req, res);
      if (!authResult.authenticated) {
        return res.status(401).json({ message: authResult.message });
      }
      
      const { date, id } = req.query;
      
      if (!date || !id) {
        return res.status(400).json({ message: 'Date and ID parameters are required' });
      }
      
      // Get existing data for this date
      const existingData = await edgeConfig.get(date) || { items: [] };
      
      // Find and remove the item with the specified ID
      const filteredItems = existingData.items.filter(item => item.id !== id);
      
      // Check if any items were removed
      if (filteredItems.length === existingData.items.length) {
        return res.status(404).json({ message: 'Homework item not found' });
      }
      
      // Update data in Edge Config
      const updatedData = {
        items: filteredItems
      };
      
      await edgeConfig.set(date, updatedData);
      
      return res.status(200).json({ message: 'Homework deleted successfully' });
    } catch (error) {
      console.error('Error in DELETE handler:', error);
      return res.status(500).json({ message: 'Failed to delete homework data', error: error.message });
    }
  }
  
  // Handle unsupported methods
  return res.status(405).json({ message: 'Method not allowed' });
}