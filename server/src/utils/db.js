// Utility functions for database connections optimized for serverless environments

let cachedDb = null;
let cachedConnection = null;

/**
 * Get a cached database connection for serverless environments
 * @param {string} uri - MongoDB connection URI
 * @returns {Promise<Object>} Mongoose connection object
 */
export async function getCachedDbConnection(uri) {
  // In serverless environments, we might have a cached connection
  if (cachedDb && cachedConnection && cachedConnection.readyState === 1) {
    return cachedDb;
  }

  try {
    // If we have a cached db but connection is not ready, disconnect first
    if (cachedConnection && cachedConnection.readyState !== 0) {
      await cachedConnection.close();
    }
    
    // Create new connection
    const mongoose = (await import('mongoose')).default;
    cachedDb = await mongoose.connect(uri);
    cachedConnection = cachedDb.connection;
    
    console.log('New MongoDB connection established');
    return cachedDb;
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error;
  }
}

/**
 * Close database connection (useful for development)
 */
export async function closeDbConnection() {
  if (cachedConnection && cachedConnection.readyState !== 0) {
    await cachedConnection.close();
    cachedDb = null;
    cachedConnection = null;
    console.log('MongoDB connection closed');
  }
}