import mongoose from 'mongoose';

const TextPosSchema = new mongoose.Schema(
  {
    field: { type: String, required: true },
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    fontSize: { type: Number, default: 48 },
    color: { type: String, default: '#000000' },
    align: { type: String, enum: ['left', 'center', 'right'], default: 'center' },
    visible: { type: Boolean, default: true } // Add visible property
  },
  { _id: false }
);

const CertificateTemplateSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true, index: true },
    backgroundPath: { type: String },
    backgroundFileId: { type: String },
    textLayout: { type: [TextPosSchema], default: [] },
    width: { type: Number, default: 1600 },
    height: { type: Number, default: 1131 }
  },
  { timestamps: true }
);

CertificateTemplateSchema.index({ course: 1, batch: 1 }, { unique: true });

export default mongoose.model('CertificateTemplate', CertificateTemplateSchema);