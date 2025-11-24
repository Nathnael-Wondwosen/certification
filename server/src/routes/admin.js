import express from 'express';
import multer from 'multer';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import fs from 'fs';
import { parse } from 'csv-parse';
import Course from '../models/Course.js';
import Batch from '../models/Batch.js';
import CertificateTemplate from '../models/CertificateTemplate.js';
import Student from '../models/Student.js';
import Instructor from '../models/Instructor.js';
import { customAlphabet } from 'nanoid';
import { uploadFile as awUpload, deleteFile as awDelete, downloadFile as awDownload } from '../services/appwrite.js';

const nano = customAlphabet('123456789ABCDEFGHJKLMNPQRSTUVWXYZ', 8);

const router = express.Router();

// Health check endpoint for authenticated connections
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Authenticated connection is working',
    user: req.user,
    timestamp: new Date().toISOString()
  });
});

const uploadsDir = process.env.UPLOADS_DIR || path.join(os.tmpdir(), 'uploads', 'templates');
fs.mkdirSync(uploadsDir, { recursive: true });
const csvDiskStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.csv';
    const name = `upload_${Date.now()}${ext}`;
    cb(null, name);
  }
});
const csvUpload = multer({ storage: csvDiskStorage });
const imageUpload = multer({ storage: multer.memoryStorage() });

// Add caching for frequently accessed data
const courseCache = new Map();
const batchCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Helper function to get course with caching
async function getCourseByCodeCached(code) {
  if (!code) return null;
  
  // Check cache first
  const cached = courseCache.get(code);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  
  // Fetch from database
  const course = await Course.findOne({ code });
  
  // Cache the result
  if (course) {
    courseCache.set(code, {
      data: course,
      timestamp: Date.now()
    });
  }
  
  return course;
}

// Helper function to get batch with caching
async function getBatchByCodeCached(courseId, code) {
  if (!courseId || !code) return null;
  
  // Create cache key
  const cacheKey = `${courseId}_${code}`;
  
  // Check cache first
  const cached = batchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  
  // Fetch from database
  const batch = await Batch.findOne({ course: courseId, code });
  
  // Cache the result
  if (batch) {
    batchCache.set(cacheKey, {
      data: batch,
      timestamp: Date.now()
    });
  }
  
  return batch;
}

// Update the helper functions to use caching
async function getCourseByCode(code) {
  return getCourseByCodeCached(code);
}

async function getBatchByCode(courseId, code) {
  return getBatchByCodeCached(courseId, code);
}

function pad4(n) { return String(n).padStart(4, '0'); }
async function generatePublicId(courseCode, batchCode) {
  const prefix = `${courseCode}-${batchCode}-`;
  const regex = new RegExp('^' + prefix.replace(/[-]/g, '\\-') + '(\\d+)$');
  const candidates = await Student.find({ publicId: { $regex: '^' + prefix } }, { publicId: 1 }).limit(1000);
  let max = 0;
  for (const c of candidates) {
    const m = c.publicId.match(regex);
    if (m && Number(m[1]) > max) max = Number(m[1]);
  }
  return prefix + pad4(max + 1);
}

// Courses
router.post('/courses', async (req, res) => {
  try {
    const { name, code } = req.body;
    if (!name || !code) return res.status(400).json({ message: 'name and code required' });
    const course = await Course.create({ name, code });
    
    // Clear course cache when a new course is added
    courseCache.clear();
    
    res.json(course);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});
router.get('/courses', async (req, res) => {
  const courses = await Course.find().sort({ createdAt: -1 }).lean();
  res.json(courses);
});

// Update course
router.put('/courses/:id', async (req, res) => {
  try {
    const { name, code } = req.body || {};
    if (!name || !code) return res.status(400).json({ message: 'name and code required' });
    const updated = await Course.findByIdAndUpdate(
      req.params.id,
      { name, code },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: 'course not found' });
    courseCache.clear();
    res.json(updated);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Delete course
router.delete('/courses/:id', async (req, res) => {
  try {
    const doc = await Course.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: 'course not found' });
    courseCache.clear();
    res.json({ message: 'course deleted successfully' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Batches
router.post('/batches', async (req, res) => {
  try {
    const { courseCode, courseId, code, year, name } = req.body;
    let course = courseId ? await Course.findById(courseId) : await getCourseByCode(courseCode);
    if (!course) return res.status(400).json({ message: 'course not found' });
    const batch = await Batch.create({ course: course._id, code, year, name: name || code });
    
    // Clear batch cache when a new batch is added
    batchCache.clear();
    
    res.json(batch);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});
router.get('/batches', async (req, res) => {
  const { courseId } = req.query;
  const q = courseId ? { course: courseId } : {};
  const batches = await Batch.find(q).sort({ createdAt: -1 }).lean();
  res.json(batches);
});

// Update batch
router.put('/batches/:id', async (req, res) => {
  try {
    const { courseCode, courseId, code, year, name } = req.body || {};
    let course = courseId ? await Course.findById(courseId) : await getCourseByCode(courseCode);
    const update = { };
    if (course) update.course = course._id;
    if (code !== undefined) update.code = code;
    if (year !== undefined) update.year = year;
    if (name !== undefined) update.name = name;
    const updated = await Batch.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ message: 'batch not found' });
    batchCache.clear();
    res.json(updated);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Delete batch
router.delete('/batches/:id', async (req, res) => {
  try {
    const doc = await Batch.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: 'batch not found' });
    batchCache.clear();
    res.json({ message: 'batch deleted successfully' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Template upload
router.post('/templates', imageUpload.single('background'), async (req, res) => {
  try {
    const { courseCode, batchCode, width, height, textLayout } = req.body;
    if (!req.file) return res.status(400).json({ message: 'background file required' });
    const course = await getCourseByCode(courseCode);
    if (!course) return res.status(400).json({ message: 'course not found' });
    const batch = await getBatchByCode(course._id, batchCode);
    if (!batch) return res.status(400).json({ message: 'batch not found' });
    const layout = textLayout ? JSON.parse(textLayout) : [];
    // Upload to Appwrite
    const fileId = await awUpload(req.file.buffer, req.file.originalname || 'background.png');
    const tpl = await CertificateTemplate.findOneAndUpdate(
      { course: course._id, batch: batch._id },
      {
        course: course._id,
        batch: batch._id,
        backgroundFileId: fileId,
        width: Number(width) || 1600,
        height: Number(height) || 1131,
        textLayout: layout
      },
      { upsert: true, new: true }
    );
    res.json(tpl);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Serve template background images
router.get('/templates/:id/background', async (req, res) => {
  try {
    const template = await CertificateTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    
    if (template.backgroundFileId) {
      const fileData = await awDownload(template.backgroundFileId);
      // fileData can be Buffer/Uint8Array; set headers and send
      res.setHeader('Content-Type', 'image/*');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.send(Buffer.from(fileData));
    }
    if (template.backgroundPath) {
      const absolutePath = path.resolve(template.backgroundPath);
      return res.sendFile(absolutePath);
    }
    return res.status(404).json({ message: 'No background image for this template' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get templates
router.get('/templates', async (req, res) => {
  try {
    const templates = await CertificateTemplate.find().populate('course batch').sort({ createdAt: -1 }).lean();
    const mapped = templates.map(tpl => ({
      _id: tpl._id,
      courseId: tpl.course._id,
      courseCode: tpl.course.code,
      courseName: tpl.course.name,
      batchId: tpl.batch._id,
      batchCode: tpl.batch.code,
      width: tpl.width,
      height: tpl.height,
      textLayout: tpl.textLayout, // This should include the visible property
      backgroundPath: tpl.backgroundPath,
      createdAt: tpl.createdAt
    }));
    res.json(mapped);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Get single template by ID
router.get('/templates/:id', async (req, res) => {
  try {
    const template = await CertificateTemplate.findById(req.params.id).populate('course batch').lean();
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    const mapped = {
      _id: template._id,
      courseId: template.course._id,
      courseCode: template.course.code,
      courseName: template.course.name,
      batchId: template.batch._id,
      batchCode: template.batch.code,
      width: template.width,
      height: template.height,
      textLayout: template.textLayout, // This includes the visible property
      backgroundPath: template.backgroundPath,
      createdAt: template.createdAt
    };
    res.json(mapped);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Update template
router.put('/templates/:id', imageUpload.single('background'), async (req, res) => {
  try {
    const { courseCode, batchCode, width, height, textLayout } = req.body;
    const course = await getCourseByCode(courseCode);
    if (!course) return res.status(400).json({ message: 'course not found' });
    const batch = await getBatchByCode(course._id, batchCode);
    if (!batch) return res.status(400).json({ message: 'batch not found' });
    
    const updateData = {
      course: course._id,
      batch: batch._id,
      width: Number(width) || 1600,
      height: Number(height) || 1131,
      textLayout: textLayout ? JSON.parse(textLayout) : []
    };
    
    // Only update background if a new file was uploaded
    if (req.file) {
      // Upload new image to Appwrite
      const newFileId = await awUpload(req.file.buffer, req.file.originalname || 'background.png');
      updateData.backgroundFileId = newFileId;
      // Optionally clean up old Appwrite file
      const current = await CertificateTemplate.findById(req.params.id);
      if (current?.backgroundFileId) {
        awDelete(current.backgroundFileId).catch(() => {});
      }
    }
    
    const tpl = await CertificateTemplate.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    
    if (!tpl) {
      return res.status(404).json({ message: 'Template not found' });
    }
    
    res.json(tpl);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Delete template
router.delete('/templates/:id', async (req, res) => {
  try {
    const template = await CertificateTemplate.findByIdAndDelete(req.params.id);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    
    // Delete the background image from Appwrite if present, otherwise try disk
    if (template.backgroundFileId) {
      await awDelete(template.backgroundFileId).catch(() => {});
    } else if (template.backgroundPath) {
      try { fs.unlinkSync(template.backgroundPath); } catch {}
    }
    
    res.json({ message: 'Template deleted successfully' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// CSV import students
router.post('/students/import', csvUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'CSV file required' });
    const rows = [];
    const parser = fs.createReadStream(req.file.path).pipe(parse({ columns: true, trim: true }));
    for await (const record of parser) rows.push(record);

    const results = { upserted: 0, errors: [] };
    for (const r of rows) {
      try {
        const course = await getCourseByCode(r.courseCode);
        if (!course) throw new Error('course not found: ' + r.courseCode);
        const batch = await getBatchByCode(course._id, r.batchCode);
        if (!batch) throw new Error('batch not found: ' + r.batchCode);
        const publicId = (r.publicId && r.publicId.trim()) || nano();
        const status = ['pending', 'in_progress', 'complete', 'blocked'].includes((r.status||'').trim()) ? r.status.trim() : 'pending';
        const completionDate = r.completionDate ? new Date(r.completionDate) : undefined;
        
        // Extract custom fields (any field that's not a standard field)
        const standardFields = ['name', 'email', 'courseCode', 'batchCode', 'publicId', 'status', 'instructor', 'completionDate'];
        const customFields = {};
        Object.keys(r).forEach(key => {
          if (!standardFields.includes(key) && r[key]) {
            customFields[key] = r[key];
          }
        });
        
        const updateData = {
          name: r.name,
          email: r.email || undefined,
          course: course._id,
          batch: batch._id,
          publicId,
          status,
          instructor: r.instructor || undefined,
          completionDate
        };
        
        // Add custom fields if any exist
        if (Object.keys(customFields).length > 0) {
          updateData.customFields = customFields;
        }
        
        await Student.findOneAndUpdate(
          { publicId },
          updateData,
          { upsert: true, new: true }
        );
        results.upserted += 1;
      } catch (e) {
        results.errors.push({ row: r, message: e.message });
      }
    }
    res.json(results);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Create single student
router.post('/students', async (req, res) => {
  try {
    const { name, email, courseCode, batchCode, status, instructor, completionDate, publicId, customFields } = req.body || {};
    if (!name || !courseCode || !batchCode) return res.status(400).json({ message: 'name, courseCode, batchCode required' });
    const course = await getCourseByCode(courseCode);
    if (!course) return res.status(400).json({ message: 'course not found' });
    const batch = await getBatchByCode(course._id, batchCode);
    if (!batch) return res.status(400).json({ message: 'batch not found' });
    let pid = (publicId && publicId.trim()) || await generatePublicId(course.code, batch.code);
    const st = ['pending', 'in_progress', 'complete', 'blocked'].includes((status||'').trim()) ? status.trim() : 'pending';
    const doc = await Student.create({
      name,
      email: email || undefined,
      course: course._id,
      batch: batch._id,
      publicId: pid,
      status: st,
      instructor: instructor || undefined,
      completionDate: completionDate ? new Date(completionDate) : undefined,
      customFields: customFields || undefined
    });
    return res.json({
      _id: doc._id,
      name: doc.name,
      publicId: doc.publicId,
      status: doc.status,
      courseCode: course.code,
      batchCode: batch.code
    });
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ message: 'publicId already exists' });
    res.status(500).json({ message: e.message });
  }
});

// Update student status
router.patch('/students/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'in_progress', 'complete', 'blocked'].includes(status)) {
      return res.status(400).json({ message: 'invalid status' });
    }
    const s = await Student.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!s) return res.status(404).json({ message: 'student not found' });
    res.json(s);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Update student
router.put('/students/:id', async (req, res) => {
  try {
    const { name, email, courseCode, batchCode, status, instructor, completionDate, customFields } = req.body || {};
    if (!name || !courseCode || !batchCode) return res.status(400).json({ message: 'name, courseCode, batchCode required' });
    
    const course = await getCourseByCode(courseCode);
    if (!course) return res.status(400).json({ message: 'course not found' });
    
    const batch = await getBatchByCode(course._id, batchCode);
    if (!batch) return res.status(400).json({ message: 'batch not found' });
    
    const st = ['pending', 'in_progress', 'complete', 'blocked'].includes((status||'').trim()) ? status.trim() : 'pending';
    
    const updateData = {
      name,
      email: email || undefined,
      course: course._id,
      batch: batch._id,
      status: st,
      instructor: instructor || undefined,
      completionDate: completionDate ? new Date(completionDate) : undefined
    };
    
    // Add customFields if provided
    if (customFields !== undefined) {
      updateData.customFields = customFields;
    }
    
    const doc = await Student.findByIdAndUpdate(req.params.id, updateData, { new: true });
    
    if (!doc) return res.status(404).json({ message: 'student not found' });
    
    res.json({
      _id: doc._id,
      name: doc.name,
      email: doc.email,
      publicId: doc.publicId,
      status: doc.status,
      courseCode: course.code,
      batchCode: batch.code,
      instructor: doc.instructor,
      completionDate: doc.completionDate
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Delete student
router.delete('/students/:id', async (req, res) => {
  try {
    const doc = await Student.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: 'student not found' });
    res.json({ message: 'student deleted successfully' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// List students (basic)
router.get('/students', async (req, res) => {
  const { courseCode, batchCode, status } = req.query;
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const page = Math.max(Number(req.query.page) || 1, 1);
  const skip = (page - 1) * limit;
  let course, batch;
  if (courseCode) course = await getCourseByCode(courseCode);
  if (course && batchCode) batch = await getBatchByCode(course._id, batchCode);
  const q = {};
  if (course) q.course = course._id;
  if (batch) q.batch = batch._id;
  if (status) q.status = status;
  const list = await Student.find(q).populate('course batch').sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
  const mapped = list.map(s => ({
    _id: s._id,
    name: s.name,
    email: s.email,
    publicId: s.publicId,
    status: s.status,
    courseCode: s.course?.code,
    batchCode: s.batch?.code,
    customFields: s.customFields || {},
    createdAt: s.createdAt
  }));
  res.json(mapped);
});

// Instructors management
router.get('/instructors', async (req, res) => {
  const { courseCode } = req.query;
  let course;
  if (courseCode) course = await getCourseByCode(courseCode);
  const q = course ? { course: course._id } : {};
  const list = await Instructor.find(q).sort({ name: 1 }).lean();
  if (list.length > 0) {
    return res.json(list.map(i => ({ _id: i._id, name: i.name, courseCode: course ? course.code : undefined })));
  }
  // Fallback: derive from existing students if no Instructor docs yet
  const names = await Student.distinct('instructor', { instructor: { $ne: null } });
  const filtered = names.filter(Boolean).sort();
  res.json(filtered.map((n, idx) => ({ _id: String(idx), name: n })));
});

router.post('/instructors', async (req, res) => {
  try {
    const { courseCode, name } = req.body || {};
    if (!courseCode || !name) return res.status(400).json({ message: 'courseCode and name are required' });
    const course = await getCourseByCode(courseCode);
    if (!course) return res.status(400).json({ message: 'course not found' });
    const doc = await Instructor.findOneAndUpdate(
      { course: course._id, name },
      { course: course._id, name },
      { upsert: true, new: true }
    );
    res.json({ _id: doc._id, name: doc.name, courseCode: course.code });
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ message: 'instructor exists' });
    res.status(500).json({ message: e.message });
  }
});

// Update instructor
router.put('/instructors/:id', async (req, res) => {
  try {
    const { name } = req.body || {};
    if (!name) return res.status(400).json({ message: 'name required' });
    const updated = await Instructor.findByIdAndUpdate(req.params.id, { name }, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ message: 'instructor not found' });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Delete instructor
router.delete('/instructors/:id', async (req, res) => {
  try {
    const doc = await Instructor.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: 'instructor not found' });
    res.json({ message: 'instructor deleted successfully' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

export default router;