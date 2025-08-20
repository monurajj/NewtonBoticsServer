const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  registrationDate: { type: Date, default: Date.now },
  attendanceStatus: { type: String, enum: ['registered', 'attended', 'absent', 'cancelled'], default: 'registered' },
});

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, maxlength: 255, trim: true, index: true },
    description: { type: String, required: true, maxlength: 5000, trim: true },
    category: { type: String, maxlength: 100, trim: true, index: true },
    type: {
      type: String,
      required: true,
      enum: ['workshop', 'seminar', 'exhibition', 'training', 'networking', 'competition', 'technical', 'educational', 'showcase'],
      index: true,
    },
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, required: true, index: true },
    location: { type: String, maxlength: 255, trim: true },
    maxCapacity: { type: Number, min: 1 },
    currentRegistrations: { type: Number, default: 0, min: 0 },
    registrationDeadline: { type: Date, index: true },
    isFeatured: { type: Boolean, default: false, index: true },
    imageUrl: { type: String, maxlength: 500, trim: true },
    organizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    status: { type: String, enum: ['upcoming', 'ongoing', 'completed', 'cancelled'], default: 'upcoming', index: true },
    registrations: [registrationSchema],
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

eventSchema.index({ type: 1, startDate: 1 });

module.exports = mongoose.model('Event', eventSchema);


