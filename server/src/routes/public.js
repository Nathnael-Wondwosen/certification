import express from 'express';
import Student from '../models/Student.js';
import CertificateTemplate from '../models/CertificateTemplate.js';
import { renderCertificatePNG, renderCertificatePDF } from '../services/render.js';

const router = express.Router();

// Health check endpoint for frontend-backend connectivity
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Frontend-backend connection is working',
    timestamp: new Date().toISOString()
  });
});

// Check if certificate exists
router.get('/certificate/:publicId', async (req, res) => {
  try {
    const publicId = (req.params.publicId || '').trim();
    const student = await Student.findOne({ publicId }).populate('course batch').lean();
    if (!student) return res.status(404).json({ message: 'Certificate not found' });
    if (student.status !== 'complete') {
      return res.status(403).json({ message: 'Not eligible to download yet', status: student.status });
    }
    // Avoid caching eligibility checks
    res.setHeader('Cache-Control', 'no-store');
    return res.json({
      publicId: student.publicId,
      name: student.name,
      course: student.course?.name,
      batch: student.batch?.code,
      status: student.status
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// Download certificate as PNG
router.get('/certificate/:publicId/png', async (req, res) => {
  try {
    const publicId = (req.params.publicId || '').trim();
    const student = await Student.findOne({ publicId }).populate('course batch').lean();
    if (!student) return res.status(404).json({ message: 'Certificate not found' });
    if (student.status !== 'complete') {
      return res.status(403).json({ message: 'Not eligible to download yet', status: student.status });
    }

    const template = await CertificateTemplate.findOne({ course: student.course._id, batch: student.batch._id }).lean();
    if (!template) return res.status(404).json({ message: 'Template not configured for this course and batch' });

    // Create a base payload with standard fields
    const payload = {
      name: student.name,
      amharicName: student.amharicName || '',
      course: student.course.name,
      date: student.completionDate ? new Date(student.completionDate).toLocaleDateString() : new Date().toLocaleDateString(),
      amharicDate: student.amharicDate || '',
      instructor: student.instructor || '',
      batch: student.batch.code
    };
    
    // Add any custom fields from student document that match template fields
    // This allows for custom fields to be added to the student document and used in templates
    if (student.customFields) {
      Object.assign(payload, student.customFields);
    }

    const png = await renderCertificatePNG({ template, payload });
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="${student.publicId}.png"`);
    // Cache generated certificates for a day (adjust as needed)
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    return res.send(png);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// Download certificate as PDF
router.get('/certificate/:publicId/pdf', async (req, res) => {
  try {
    const publicId = (req.params.publicId || '').trim();
    const student = await Student.findOne({ publicId }).populate('course batch').lean();
    if (!student) return res.status(404).json({ message: 'Certificate not found' });
    if (student.status !== 'complete') {
      return res.status(403).json({ message: 'Not eligible to download yet', status: student.status });
    }

    const template = await CertificateTemplate.findOne({ course: student.course._id, batch: student.batch._id }).lean();
    if (!template) return res.status(404).json({ message: 'Template not configured for this course and batch' });

    // Create a base payload with standard fields
    const payload = {
      name: student.name,
      course: student.course.name,
      date: student.completionDate ? new Date(student.completionDate).toLocaleDateString() : new Date().toLocaleDateString(),
      instructor: student.instructor || '',
      batch: student.batch.code
    };
    
    // Add any custom fields from student document that match template fields
    // This allows for custom fields to be added to the student document and used in templates
    if (student.customFields) {
      Object.assign(payload, student.customFields);
    }

    const pdf = await renderCertificatePDF({ template, payload });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${student.publicId}.pdf"`);
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    return res.send(pdf);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;