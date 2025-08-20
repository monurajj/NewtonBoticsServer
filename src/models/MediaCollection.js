const mongoose = require('mongoose');

const mediaCollectionItemSchema = new mongoose.Schema({
  mediaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Media', required: true },
  position: { type: Number, min: 0 },
  addedAt: { type: Date, default: Date.now },
});

const mediaCollectionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, maxlength: 255, trim: true, index: true },
    description: { type: String, maxlength: 2000, trim: true },
    coverMediaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Media' },
    isPublic: { type: Boolean, default: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    mediaItems: [mediaCollectionItemSchema],
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

module.exports = mongoose.model('MediaCollection', mediaCollectionSchema);


