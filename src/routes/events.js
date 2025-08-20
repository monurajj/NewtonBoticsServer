const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const router = express.Router();
const { optionalAuth, verifyToken, requireTeamMember, requireMentor, requireAdmin } = require('../middleware/auth');
const Event = require('../models/Event');
const { asyncHandler, validationErrorHandler, notFoundErrorHandler } = require('../middleware/errorHandler');

// TODO: Implement events routes
// - GET /api/events - List events
// - GET /api/events/:id - Get event details
// - POST /api/events - Create event
// - PUT /api/events/:id - Update event
// - DELETE /api/events/:id - Delete event
// - POST /api/events/:id/register - Register for event
// - DELETE /api/events/:id/register - Unregister from event

router.get(
  '/',
  optionalAuth,
  [
    query('status').optional().isIn(['upcoming', 'ongoing', 'completed', 'cancelled']),
    query('type').optional().isString(),
    query('category').optional().isString(),
    query('isFeatured').optional().isBoolean().toBoolean(),
    query('q').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('skip').optional().isInt({ min: 0 }).toInt(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw validationErrorHandler(errors);
    const { status, type, category, isFeatured, q, limit = 20, skip = 0 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (category) filter.category = category;
    if (isFeatured !== undefined) filter.isFeatured = isFeatured;
    if (q) filter.title = { $regex: q, $options: 'i' };
    const [items, total] = await Promise.all([
      Event.find(filter).limit(limit).skip(skip).sort({ startDate: 1 }),
      Event.countDocuments(filter),
    ]);
    res.json({ success: true, data: { items, pagination: { total, limit, skip, hasMore: total > skip + items.length } } });
  })
);

router.post(
  '/',
  verifyToken,
  requireMentor,
  [
    body('title').isString().isLength({ min: 5, max: 255 }),
    body('description').isString().isLength({ min: 20, max: 5000 }),
    body('type').isString(),
    body('startDate').isISO8601(),
    body('endDate').isISO8601(),
    body('organizerId').optional().isString(),
    body('location').optional().isString(),
    body('maxCapacity').optional().isInt({ min: 1 }).toInt(),
    body('isFeatured').optional().isBoolean().toBoolean(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw validationErrorHandler(errors);
    const created = await Event.create(req.body);
    res.status(201).json({ success: true, message: 'Event created', data: { item: created } });
  })
);

router.put('/:id', verifyToken, requireMentor, [param('id').isString()], asyncHandler(async (req, res) => {
  const updated = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!updated) throw notFoundErrorHandler('Event');
  res.json({ success: true, message: 'Event updated', data: { item: updated } });
}));

router.delete('/:id', verifyToken, requireAdmin, [param('id').isString()], asyncHandler(async (req, res) => {
  const deleted = await Event.findByIdAndDelete(req.params.id);
  if (!deleted) throw notFoundErrorHandler('Event');
  res.json({ success: true, message: 'Event deleted' });
}));

router.get('/:id', [param('id').isString()], asyncHandler(async (req, res) => {
  const item = await Event.findById(req.params.id);
  if (!item) throw notFoundErrorHandler('Event');
  res.json({ success: true, data: { item } });
}));

module.exports = router;
