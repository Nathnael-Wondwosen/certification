# TE Certification - MVP

A lightweight MERN-ready backend MVP for certificate downloads by ID, with course+batch templates and status gating.

## Run (backend)
1. Install node dependencies
```
cd server
npm install
```
2. Copy env and set MongoDB
```
cp .env.example .env
# edit MONGO_URI if needed
```
3. Start server
```
npm run dev
```

## Run (frontend)
1. Install node dependencies
```
cd client
npm install
```
2. Start development server
```
npm run dev
```

## Deploy to Vercel

This project is configured for deployment to Vercel with performance optimizations:

1. The existing [api/index.js](file:///C:/Users/Developer/Documents/GitHub/Portal/TE-certificate/api/index.js) file serves as the Vercel serverless function entry point
2. Database connection caching has been implemented for faster response times
3. Optimized middleware configuration for serverless environments

To deploy:
1. Push your code to a Git repository
2. Connect it to Vercel
3. Set your environment variables in Vercel project settings
4. Deploy!

## Project Structure
- Main page: Certificate download page where users enter their ID
- Admin section: Accessible via `/admin/login` with default credentials:
  - Email: admin@example.com
  - Password: StrongPassword123

## Data Model
- Course(code)
- Batch(course, code)
- CertificateTemplate(course, batch, backgroundPath, textLayout)
- Student(name, publicId, status, course, batch, completionDate, instructor)

## Seeding quick tips (Mongo shell)
Insert a course, batch, template, and a complete student with a known publicId. Place a background image file path in `backgroundPath` (absolute path recommended during dev) and a minimal textLayout e.g.:
```js
[
  { field: 'name', x: 800, y: 500, fontSize: 64, color: '#000', align: 'center' },
  { field: 'course', x: 800, y: 580, fontSize: 36, color: '#333', align: 'center' },
  { field: 'date', x: 800, y: 660, fontSize: 28, color: '#555', align: 'center' },
  { field: 'instructor', x: 800, y: 740, fontSize: 28, color: '#555', align: 'center' },
  { field: 'batch', x: 800, y: 820, fontSize: 22, color: '#666', align: 'center' }
]
```
Then open `/`, enter the `publicId`, and download PNG/PDF.

## Next
- Admin APIs (courses, batches, templates upload via Multer, CSV import, status update)
- React client for admin and public UI
- Storage adapter for Appwrite later