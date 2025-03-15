import { createClient } from '@vercel/edge-config';
import { verify } from 'jsonwebtoken';

// Create Edge Config client
const edgeConfig = createClient(process.env.EDGE_CONFIG);

// Helper function to verify JWT token
const verifyToken = (token) => {
  try {
    return verify(token, process.env.JWT_VALUE);
  } catch (error) {
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
      // Get homework data from Edge Config
      const homeworkData = await edgeConfig.get(date) || { items: [] };
      return res.status(200).json(homeworkData);
    } catch (error) {
      console.error('Error fetching homework:', error);
      return res.status(500).json({ message: 'Failed to fetch homework data' });
    }
  }
  
  // Handle POST request (add homework)
  if (req.method === 'POST') {
    // Verify authentication token
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    
    if (!decoded || !decoded.admin) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    
    const { date, id, content } = req.body;
    
    if (!date || !id || !content) {
      return res.status(400).json({ message: 'Date, ID, and content are required' });
    }
    
    try {
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
      console.error('Error adding homework:', error);
      return res.status(500).json({ message: 'Failed to add homework data' });
    }
  }
  
  // Handle unsupported methods
  return res.status(405).json({ message: 'Method not allowed' });
}