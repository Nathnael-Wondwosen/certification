# Backend Server for Vercel Deployment

This directory contains the backend server configured for deployment on Vercel.

## Vercel Deployment Setup

1. Create a new project in Vercel
2. Select this `server` directory as the root directory
3. Set the following environment variables in your Vercel project settings:
   - `MONGO_URI`: Your MongoDB connection string
   - `JWT_SECRET`: A secure secret key for JWT tokens
   - `ADMIN_EMAIL`: Email for the admin user
   - `ADMIN_PASSWORD`: Password for the admin user
   - `APPWRITE_ENDPOINT`: Appwrite endpoint (usually https://cloud.appwrite.io/v1)
   - `APPWRITE_PROJECT_ID`: Your Appwrite project ID
   - `APPWRITE_API_KEY`: Your Appwrite API key
   - `APPWRITE_BUCKET_ID`: Your Appwrite bucket ID
   - `ALLOWED_ORIGINS`: Comma-separated list of allowed origins (e.g., https://your-frontend.vercel.app)

## Required Configuration

The server is configured to work with Vercel's serverless environment. The key files for deployment are:

- `vercel.json`: Vercel configuration
- `api/index.js`: Entry point for Vercel
- `src/app.js`: Main Express application
- `src/index.js`: Conditional server starter

## Local Development

To run the server locally:

```bash
cd server
npm install
npm run dev
```

The server will start on port 5000 by default, or the port specified in the PORT environment variable.

## Seeding Initial Data

To seed initial data including the admin user:

```bash
npm run seed
```