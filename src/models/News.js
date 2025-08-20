const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, maxlength: 255, trim: true, index: true },
    content: { type: String, required: true, maxlength: 10000 },
    excerpt: { type: String, maxlength: 500 },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'NewsCategory', index: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    featuredImageUrl: { type: String, maxlength: 500 },
    tags: [{ type: String, maxlength: 100, index: true }],
    isFeatured: { type: Boolean, default: false, index: true },
    isPublished: { type: Boolean, default: false, index: true },
    publishedAt: { type: Date, index: true },
    viewCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

module.exports = mongoose.model('News', newsSchema);


