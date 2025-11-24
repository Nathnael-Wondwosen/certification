import mongoose from 'mongoose';

const AdminUserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, default: 'admin' }
  },
  { timestamps: true }
);

export default mongoose.model('AdminUser', AdminUserSchema);
