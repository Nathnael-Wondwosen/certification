import mongoose from 'mongoose';

const InstructorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  },
  { timestamps: true }
);

InstructorSchema.index({ course: 1, name: 1 }, { unique: true });

export default mongoose.model('Instructor', InstructorSchema);
