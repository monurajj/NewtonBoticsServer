const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const router = express.Router();
const { optionalAuth, verifyToken, requireMentor, requireAdmin } = require('../middleware/auth');
const News = require('../models/News');
const NewsCategory = require('../models/NewsCategory');
const { asyncHandler, validationErrorHandler, notFoundErrorHandler } = require('../middleware/errorHandler');

// TODO: Implement news routes
// - GET /api/news - List news articles
// - GET /api/news/:id - Get news article details
// - POST /api/news - Create news article
// - PUT /api/news/:id - Update news article
// - DELETE /api/news/:id - Delete news article
// - GET /api/news/categories - List news categories
// - POST /api/newsletter/subscribe - Subscribe to newsletter

router.get(
  '/',
  optionalAuth,
  [
    query('isPublished').optional().isBoolean().toBoolean(),
    query('isFeatured').optional().isBoolean().toBoolean(),
    query('categoryId').optional().isString(),
    query('q').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('skip').optional().isInt({ min: 0 }).toInt(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw validationErrorHandler(errors);
    const { isPublished, isFeatured, categoryId, q, limit = 20, skip = 0 } = req.query;
    const filter = {};
    if (isPublished !== undefined) filter.isPublished = isPublished;
    if (isFeatured !== undefined) filter.isFeatured = isFeatured;
    if (categoryId) filter.categoryId = categoryId;
    if (q) filter.title = { $regex: q, $options: 'i' };
    const [items, total] = await Promise.all([
      News.find(filter).limit(limit).skip(skip).sort({ publishedAt: -1, createdAt: -1 }),
      News.countDocuments(filter),
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
    body('content').isString().isLength({ min: 20, max: 10000 }),
    body('authorId').isString(),
    body('categoryId').optional().isString(),
    body('isPublished').optional().isBoolean().toBoolean(),
    body('publishedAt').optional().isISO8601(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw validationErrorHandler(errors);
    const created = await News.create(req.body);
    res.status(201).json({ success: true, message: 'News created', data: { item: created } });
  })
);

router.put('/:id', verifyToken, requireMentor, [param('id').isString()], asyncHandler(async (req, res) => {
  const updated = await News.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!updated) throw notFoundErrorHandler('News');
  res.json({ success: true, message: 'News updated', data: { item: updated } });
}));

router.delete('/:id', verifyToken, requireAdmin, [param('id').isString()], asyncHandler(async (req, res) => {
  const deleted = await News.findByIdAndDelete(req.params.id);
  if (!deleted) throw notFoundErrorHandler('News');
  res.json({ success: true, message: 'News deleted' });
}));

router.get('/categories', optionalAuth, asyncHandler(async (req, res) => {
  const items = await NewsCategory.find({}).sort({ name: 1 });
  res.json({ success: true, data: { items } });
}));

router.post('/categories', verifyToken, requireMentor, [body('name').isString().isLength({ min: 2, max: 100 })], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) throw validationErrorHandler(errors);
  const created = await NewsCategory.create({ name: req.body.name, description: req.body.description, color: req.body.color });
  res.status(201).json({ success: true, message: 'Category created', data: { item: created } });
}));

router.put('/categories/:id', verifyToken, requireMentor, [param('id').isString()], asyncHandler(async (req, res) => {
  const updated = await NewsCategory.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!updated) throw notFoundErrorHandler('NewsCategory');
  res.json({ success: true, message: 'Category updated', data: { item: updated } });
}));

router.delete('/categories/:id', verifyToken, requireAdmin, [param('id').isString()], asyncHandler(async (req, res) => {
  const deleted = await NewsCategory.findByIdAndDelete(req.params.id);
  if (!deleted) throw notFoundErrorHandler('NewsCategory');
  res.json({ success: true, message: 'Category deleted' });
}));

module.exports = router;
