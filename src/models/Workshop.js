const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  registrationDate: { type: Date, default: Date.now },
  attendanceStatus: {
    type: String,
    enum: ['registered', 'attended', 'absent', 'cancelled'],
    default: 'registered',
  },
  feedbackRating: { type: Number, min: 1, max: 5 },
  feedbackComment: { type: String, maxlength: 1000 },
});

const workshopSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, maxlength: 255, trim: true, index: true },
    description: { type: String, required: true, maxlength: 5000, trim: true },
    instructorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    category: { type: String, maxlength: 100, trim: true, index: true },
    level: { type: String, required: true, enum: ['beginner', 'intermediate', 'advanced'], index: true },
    maxParticipants: { type: Number, required: true, min: 1 },
    currentParticipants: { type: Number, default: 0, min: 0 },
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, required: true, index: true },
    location: { type: String, maxlength: 255, trim: true },
    onlineUrl: { type: String, maxlength: 500, trim: true },
    materialsUrl: { type: String, maxlength: 500, trim: true },
    videoRecordingUrl: { type: String, maxlength: 500, trim: true },
    status: { type: String, enum: ['upcoming', 'ongoing', 'completed', 'cancelled'], default: 'upcoming', index: true },
    credits: { type: Number, default: 0, min: 0 },
    registrations: [registrationSchema],
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

workshopSchema.index({ status: 1, startDate: 1 });

module.exports = mongoose.model('Workshop', workshopSchema);


