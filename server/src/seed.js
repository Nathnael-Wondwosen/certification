import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import Course from './models/Course.js';
import Batch from './models/Batch.js';
import CertificateTemplate from './models/CertificateTemplate.js';
import Student from './models/Student.js';
import AdminUser from './models/AdminUser.js';
import bcrypt from 'bcryptjs';

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/te_certification';

async function run() {
  await mongoose.connect(MONGO_URI);
  const courseCode = process.env.SEED_COURSE_CODE || 'WD';
  const courseName = process.env.SEED_COURSE_NAME || 'Web Development';
  const batchCode = process.env.SEED_BATCH_CODE || '2025A';
  const studentName = process.env.SEED_STUDENT_NAME || 'John Doe';
  const studentId = process.env.SEED_PUBLIC_ID || 'WD-2025A-0001';
  const instructor = process.env.SEED_INSTRUCTOR || 'Instructor Name';
  const backgroundPath = process.env.SEED_TEMPLATE_PATH || path.join(__dirname, '../sample/template.png');

  const course = await Course.findOneAndUpdate(
    { code: courseCode },
    { name: courseName, code: courseCode },
    { upsert: true, new: true }
  );

  const batch = await Batch.findOneAndUpdate(
    { course: course._id, code: batchCode },
    { course: course._id, code: batchCode, name: batchCode },
    { upsert: true, new: true }
  );

  const textLayout = [
    { field: 'name', x: 800, y: 500, fontSize: 64, color: '#000', align: 'center' },
    { field: 'course', x: 800, y: 580, fontSize: 36, color: '#333', align: 'center' },
    { field: 'date', x: 800, y: 660, fontSize: 28, color: '#555', align: 'center' },
    { field: 'instructor', x: 800, y: 740, fontSize: 28, color: '#555', align: 'center' },
    { field: 'batch', x: 800, y: 820, fontSize: 22, color: '#666', align: 'center' }
  ];

  await CertificateTemplate.findOneAndUpdate(
    { course: course._id, batch: batch._id },
    { course: course._id, batch: batch._id, backgroundPath, textLayout, width: 1600, height: 1131 },
    { upsert: true, new: true }
  );

  await Student.findOneAndUpdate(
    { publicId: studentId },
    {
      name: studentName,
      email: undefined,
      course: course._id,
      batch: batch._id,
      publicId: studentId,
      status: 'complete',
      instructor,
      completionDate: new Date()
    },
    { upsert: true, new: true }
  );

  // Seed admin
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await AdminUser.findOneAndUpdate(
      { email: adminEmail },
      { email: adminEmail, passwordHash },
      { upsert: true, new: true }
    );
    console.log('Admin user ensured:', adminEmail);
  } else {
    console.log('ADMIN_EMAIL/ADMIN_PASSWORD not set; skipping admin seed');
  }

  console.log('Seed complete. Try this publicId:', studentId);
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
