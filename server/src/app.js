import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import path from 'path'
import { fileURLToPath } from 'url'
import rateLimit from 'express-rate-limit'
import cors from 'cors'
import compression from 'compression'

// Ensure models are registered before routes use populate
import './models/Course.js'
import './models/Batch.js'
import './models/Instructor.js'

import publicRoutes from './routes/public.js'
import adminRoutes from './routes/admin.js'
import authRoutes from './routes/auth.js'
import healthRoutes from './routes/health.js'
import testRoutes from './routes/test.js'
import { authMiddleware } from './middleware/auth.js'
import { getCachedDbConnection } from './utils/db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

// Health check endpoint (placed before middleware for faster response)
app.use('/health', healthRoutes)

// Test endpoint for verifying deployment
app.use('/test', testRoutes)

// CORS configuration
// Defensive CORS header middleware to ensure all responses include necessary headers.
app.use((req, res, next) => {
  const origin = req.headers.origin
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Vary', 'Origin')
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200)
  }
  next()
})

// Primary CORS handling via cors package (kept for fine-grained origin validation)
const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean)
const allowedRegex = process.env.ALLOWED_ORIGINS_REGEX ? new RegExp(process.env.ALLOWED_ORIGINS_REGEX) : null

// Provide sensible defaults for local and common deploys
const defaultAllowed = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true)
    if (process.env.NODE_ENV === 'development') return callback(null, true)
    if (allowed.includes(origin)) return callback(null, true)
    if (allowedRegex && allowedRegex.test(origin)) return callback(null, true)
    // Allow default localhost dev
    if (defaultAllowed.includes(origin)) return callback(null, true)
    // Allow Vercel app frontends by host suffix (e.g., https://*.vercel.app)
    try {
      const { host } = new URL(origin)
      if (host && host.endsWith('.vercel.app')) return callback(null, true)
    } catch (_) { /* ignore URL parse errors */ }
    return callback(new Error('Not allowed by CORS'))
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}

// Preflight handling and CORS headers
app.options('*', cors(corsOptions))
app.use((req, res, next) => {
  res.setHeader('Vary', 'Origin')
  return cors(corsOptions)(req, res, next)
})

// Middleware optimized for serverless environments
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
    },
  },
}))
// Enable gzip/deflate/brotli compression
app.use(compression())
app.use(express.json({ limit: '10mb' }))

// Only use morgan in development
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'))
}

const limiter = rateLimit({ 
  windowMs: 60 * 1000, 
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
})
app.use(limiter)

// Ensure DB connection for all API routes (cached, low overhead)
app.use(async (req, res, next) => {
  try {
    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/te_certification'
    await getCachedDbConnection(uri)
    next()
  } catch (err) {
    console.error('DB connection error:', err)
    res.status(500).json({ error: 'Database connection failed' })
  }
})

// Root route - return a simple message
app.get('/', (req, res) => {
  res.json({ 
    message: 'TE Certification Backend Server is running', 
    timestamp: new Date().toISOString(),
    routes: {
      public: '/public/*',
      auth: '/auth/*',
      admin: '/admin/*',
      health: '/health',
      test: '/test'
    }
  });
});

// API routes
app.use('/public', publicRoutes)
app.use('/auth', authRoutes)
app.use('/admin', authMiddleware, adminRoutes)

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Export the app directly for Vercel
export default app;

// Also export the app for direct use
export { app };