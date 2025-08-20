const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, maxlength: 255, trim: true, index: true },
    description: { type: String, maxlength: 2000, trim: true },
    fileUrl: { type: String, required: true, maxlength: 500 },
    thumbnailUrl: { type: String, maxlength: 500 },
    fileType: { type: String, required: true, enum: ['image', 'video', 'document', 'audio'], index: true },
    fileSize: { type: Number, min: 0 },
    dimensions: { type: String, maxlength: 50 },
    duration: { type: Number, min: 0 },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'MediaCategory', index: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tags: [{ type: String, maxlength: 100, index: true }],
    isFeatured: { type: Boolean, default: false, index: true },
    viewCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

module.exports = mongoose.model('Media', mediaSchema);


