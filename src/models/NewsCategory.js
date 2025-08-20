const mongoose = require('mongoose');

const newsCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, maxlength: 100, trim: true, index: true },
    description: { type: String, maxlength: 1000, trim: true },
    color: { type: String, maxlength: 7 },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

module.exports = mongoose.model('NewsCategory', newsCategorySchema);


