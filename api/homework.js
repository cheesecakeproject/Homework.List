import { createClient } from '@vercel/edge-config';
import { verify } from 'jsonwebtoken';

// Check if environment variable exists
if (!process.env.EDGE_CONFIG) {
  console.error('EDGE_CONFIG environment variable is missing');
}

// Create Edge Config client
const edgeConfig = createClient(process.env.EDGE_CONFIG);

// Helper function to verify JWT token
const verifyToken = (token) => {
  try {
    return verify(token, process.env.JWT_VALUE);
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
};

export default async function handler(req, res) {
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
      // Log the request data for debugging
      console.log('Request body:', req.body);
      console.log('Auth header:', req.headers.authorization);
      
      // Verify authentication token
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const token = authHeader.split(' ')[1];
      
      try {
        // Log JWT value for debugging
        console.log('Using JWT_VALUE:', process.env.JWT_VALUE ? 'exists' : 'missing');
        const decoded = verifyToken(token);
        
        if (!decoded || !decoded.admin) {
          return res.status(401).json({ message: 'Invalid or expired token' });
        }
      } catch (tokenError) {
        console.error('Token verification error:', tokenError);
        return res.status(401).json({ message: 'Token verification failed' });
      }
      
      const { date, id, content } = req.body;
      
      if (!date || !id || !content) {
        return res.status(400).json({ message: 'Date, ID, and content are required' });
      }
      
      // Log Edge Config access
      console.log('Using EDGE_CONFIG:', process.env.EDGE_CONFIG ? 'exists' : 'missing');
      
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
  
  // Handle unsupported methods
  return res.status(405).json({ message: 'Method not allowed' });
}