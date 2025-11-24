import mongoose from 'mongoose';

const StudentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    amharicName: { type: String },
    email: { type: String },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true, index: true },
    publicId: { type: String, required: true, unique: true, index: true },
    status: { type: String, enum: ['pending', 'in_progress', 'complete', 'blocked'], default: 'pending', index: true },
    instructor: { type: String },
    completionDate: { type: Date },
    amharicDate: { type: Date },
    customFields: { type: Map, of: String } // For custom certificate fields
  },
  { timestamps: true }
);

export default mongoose.model('Student', StudentSchema);
