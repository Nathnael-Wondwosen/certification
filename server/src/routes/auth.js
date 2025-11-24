import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import AdminUser from '../models/AdminUser.js';
import { getCachedDbConnection } from '../utils/db.js';

const router = express.Router();

// Middleware to ensure database connection
router.use(async (req, res, next) => {
  try {
    const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/te_certification';
    await getCachedDbConnection(MONGO_URI);
    next();
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ message: 'Database connection failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    console.log('Login request received:', req.body);
    const { email, password } = req.body || {};
    if (!email || !password) {
      console.log('Missing email or password');
      return res.status(400).json({ message: 'email and password required' });
    }
    
    console.log('Looking for user:', email);
    const user = await AdminUser.findOne({ email });
    console.log('User found:', user);
    
    if (!user) {
      console.log('User not found');
      return res.status(401).json({ message: 'invalid credentials' });
    }
    
    console.log('Comparing passwords');
    const ok = await bcrypt.compare(password, user.passwordHash);
    console.log('Password comparison result:', ok);
    
    if (!ok) {
      console.log('Invalid password');
      return res.status(401).json({ message: 'invalid credentials' });
    }
    
    console.log('Generating token');
    const token = jwt.sign({ sub: user._id.toString(), email: user.email }, process.env.JWT_SECRET || 'devsecret', { expiresIn: '7d' });
    console.log('Token generated successfully');
    res.json({ token });
  } catch (e) {
    console.error('Login error:', e);
    res.status(500).json({ message: 'server error' });
  }
});

export default router;