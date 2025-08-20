const mongoose = require('mongoose');

const contactSubmissionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, maxlength: 255 },
    email: { type: String, required: true, maxlength: 255, index: true },
    subject: { type: String, required: true, maxlength: 255, index: true },
    message: { type: String, required: true, maxlength: 5000 },
    phone: { type: String, maxlength: 20 },
    department: { type: String, maxlength: 100, index: true },
    status: { type: String, enum: ['new', 'in_progress', 'resolved', 'closed'], default: 'new', index: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium', index: true },
    response: { type: String, maxlength: 5000 },
    respondedAt: { type: Date },
    respondedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

module.exports = mongoose.model('ContactSubmission', contactSubmissionSchema);


