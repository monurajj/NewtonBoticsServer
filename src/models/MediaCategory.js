const mongoose = require('mongoose');

const mediaCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, maxlength: 100, trim: true, index: true },
    description: { type: String, maxlength: 1000, trim: true },
    parentCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'MediaCategory', index: true },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

module.exports = mongoose.model('MediaCategory', mediaCategorySchema);


