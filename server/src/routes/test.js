import express from 'express';
const router = express.Router();

// Test endpoint to verify backend is working
router.get('/test', (req, res) => {
  res.status(200).json({
    message: 'Backend is working correctly!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

export default router;