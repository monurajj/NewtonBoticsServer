const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const NewsletterSubscription = require('../models/NewsletterSubscription');
const { asyncHandler, validationErrorHandler } = require('../middleware/errorHandler');

// POST /api/newsletter/subscribe
router.post(
  '/subscribe',
  [
    body('email').isEmail().normalizeEmail().isLength({ max: 255 }),
    body('firstName').optional().isString().isLength({ max: 100 }),
    body('lastName').optional().isString().isLength({ max: 100 }),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw validationErrorHandler(errors);

    const { email, firstName, lastName } = req.body;
    const existing = await NewsletterSubscription.findOne({ email });
    if (existing) {
      if (!existing.isActive) {
        existing.isActive = true;
        existing.unsubscribedAt = undefined;
        if (firstName !== undefined) existing.firstName = firstName;
        if (lastName !== undefined) existing.lastName = lastName;
        await existing.save();
      }
      return res.json({ success: true, message: 'You are already subscribed', data: { subscription: existing } });
    }

    const sub = await NewsletterSubscription.create({ email, firstName, lastName, isActive: true });
    res.status(201).json({ success: true, message: 'Subscribed successfully', data: { subscription: sub } });
  })
);

// DELETE /api/newsletter/unsubscribe
router.delete(
  '/unsubscribe',
  [body('email').isEmail().normalizeEmail().isLength({ max: 255 })],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw validationErrorHandler(errors);
    const { email } = req.body;
    const sub = await NewsletterSubscription.findOne({ email });
    if (!sub || !sub.isActive) {
      return res.json({ success: true, message: 'Already unsubscribed' });
    }
    sub.isActive = false;
    sub.unsubscribedAt = new Date();
    await sub.save();
    res.json({ success: true, message: 'Unsubscribed successfully' });
  })
);

module.exports = router;



