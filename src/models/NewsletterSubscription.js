const mongoose = require('mongoose');

const newsletterSubscriptionSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, index: true, maxlength: 255, trim: true, lowercase: true },
    firstName: { type: String, maxlength: 100, trim: true },
    lastName: { type: String, maxlength: 100, trim: true },
    isActive: { type: Boolean, default: true, index: true },
    subscribedAt: { type: Date, default: Date.now },
    unsubscribedAt: { type: Date },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

module.exports = mongoose.model('NewsletterSubscription', newsletterSubscriptionSchema);



