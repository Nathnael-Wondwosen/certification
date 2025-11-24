import mongoose from 'mongoose';

const BatchSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    code: { type: String, required: true },
    year: { type: Number },
    name: { type: String }
  },
  { timestamps: true }
);

BatchSchema.index({ course: 1, code: 1 }, { unique: true });

export default mongoose.model('Batch', BatchSchema);
