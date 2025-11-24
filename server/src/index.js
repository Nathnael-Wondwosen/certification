import dotenv from 'dotenv';
import app from './app.js';

dotenv.config();

// Only start the server if not running in a serverless environment
if (process.env.VERCEL !== '1') {
  const PORT = process.env.PORT || 5000;
  
  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

export default app;