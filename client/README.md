# TE Certification Admin Frontend

This is the frontend for the TE Certification admin panel.

## Deployment to Vercel

When deploying this frontend to Vercel:

1. Set the root directory to `/client`
2. Use the build command: `npm run build`
3. Set the output directory to `dist`
4. Ensure environment variables are set:
   - `VITE_API_URL` - The URL of your backend API (e.g., https://your-backend.vercel.app)

The `vercel.json` file in this directory contains the necessary rewrite rules for client-side routing with React Router.