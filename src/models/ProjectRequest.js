const mongoose = require('mongoose');

const projectRequestSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, maxlength: 255, trim: true, index: true },
    description: { type: String, required: true, maxlength: 5000 },
    objectives: [{ type: String, maxlength: 500 }],
    expectedOutcomes: [{ type: String, maxlength: 500 }],
    teamSize: { type: Number, required: true, min: 1, max: 20 },
    estimatedDurationMonths: { type: Number, required: true, min: 1, max: 24 },
    budgetEstimate: { type: Number, min: 0 },
    requiredResources: [{ type: String, maxlength: 200 }],
    mentorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    status: { type: String, enum: ['pending', 'under_review', 'approved', 'rejected', 'on_hold'], default: 'pending', index: true },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    submittedAt: { type: Date, default: Date.now, index: true },
    reviewedAt: { type: Date },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    reviewNotes: { type: String, maxlength: 2000 },
    approvalDate: { type: Date },
    startDate: { type: Date },
    endDate: { type: Date },
    teamMembers: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        proposedRole: { type: String, required: true, maxlength: 100 },
        skills: [{ type: String, maxlength: 100 }],
        availabilityHoursPerWeek: { type: Number, min: 1, max: 40 },
      },
    ],
    resources: [
      {
        resourceType: { type: String, enum: ['equipment', 'software', 'funding', 'space', 'other'], required: true },
        description: { type: String, required: true, maxlength: 500 },
        estimatedCost: { type: Number, min: 0 },
        priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
      },
    ],
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

module.exports = mongoose.model('ProjectRequest', projectRequestSchema);


