const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const router = express.Router();
const { optionalAuth, verifyToken, requireTeamMember, requireMentor, requireAdmin } = require('../middleware/auth');
const Media = require('../models/Media');
const MediaCategory = require('../models/MediaCategory');
const MediaCollection = require('../models/MediaCollection');
const { asyncHandler, validationErrorHandler, notFoundErrorHandler } = require('../middleware/errorHandler');

// TODO: Implement media routes
// - GET /api/media - List media files
// - GET /api/media/:id - Get media file details
// - POST /api/media - Create media file
// - PUT /api/media/:id - Update media file
// - DELETE /api/media/:id - Delete media file
// - GET /api/media/categories - List media categories
// - POST /api/media/upload - Upload media file
// - GET /api/media/search - Search media files

router.get(
  '/',
  optionalAuth,
  [
    query('fileType').optional().isIn(['image', 'video', 'document', 'audio']),
    query('categoryId').optional().isString(),
    query('q').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('skip').optional().isInt({ min: 0 }).toInt(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw validationErrorHandler(errors);
    const { fileType, categoryId, q, limit = 20, skip = 0 } = req.query;
    const filter = {};
    if (fileType) filter.fileType = fileType;
    if (categoryId) filter.categoryId = categoryId;
    if (q) filter.title = { $regex: q, $options: 'i' };
    const [items, total] = await Promise.all([
      Media.find(filter).limit(limit).skip(skip).sort({ createdAt: -1 }),
      Media.countDocuments(filter),
    ]);
    res.json({ success: true, data: { items, pagination: { total, limit, skip, hasMore: total > skip + items.length } } });
  })
);

router.post(
  '/',
  verifyToken,
  requireTeamMember,
  [
    body('title').isString().isLength({ min: 2, max: 255 }),
    body('fileUrl').isString(),
    body('fileType').isIn(['image', 'video', 'document', 'audio']),
    body('uploadedBy').isString(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw validationErrorHandler(errors);
    const created = await Media.create(req.body);
    res.status(201).json({ success: true, message: 'Media created', data: { item: created } });
  })
);

router.put('/:id', verifyToken, requireTeamMember, [param('id').isString()], asyncHandler(async (req, res) => {
  const updated = await Media.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!updated) throw notFoundErrorHandler('Media');
  res.json({ success: true, message: 'Media updated', data: { item: updated } });
}));

router.delete('/:id', verifyToken, requireMentor, [param('id').isString()], asyncHandler(async (req, res) => {
  const deleted = await Media.findByIdAndDelete(req.params.id);
  if (!deleted) throw notFoundErrorHandler('Media');
  res.json({ success: true, message: 'Media deleted' });
}));

// Media categories
router.get('/categories', optionalAuth, asyncHandler(async (req, res) => {
  const items = await MediaCategory.find({}).sort({ name: 1 });
  res.json({ success: true, data: { items } });
}));

router.post('/categories', verifyToken, requireTeamMember, [body('name').isString().isLength({ min: 2, max: 100 })], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) throw validationErrorHandler(errors);
  const created = await MediaCategory.create({ name: req.body.name, description: req.body.description, parentCategoryId: req.body.parentCategoryId });
  res.status(201).json({ success: true, message: 'Category created', data: { item: created } });
}));

router.put('/categories/:id', verifyToken, requireTeamMember, [param('id').isString()], asyncHandler(async (req, res) => {
  const updated = await MediaCategory.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!updated) throw notFoundErrorHandler('MediaCategory');
  res.json({ success: true, message: 'Category updated', data: { item: updated } });
}));

router.delete('/categories/:id', verifyToken, requireMentor, [param('id').isString()], asyncHandler(async (req, res) => {
  const deleted = await MediaCategory.findByIdAndDelete(req.params.id);
  if (!deleted) throw notFoundErrorHandler('MediaCategory');
  res.json({ success: true, message: 'Category deleted' });
}));

// Media collections (basic create/list)
router.get('/collections', optionalAuth, asyncHandler(async (req, res) => {
  const items = await MediaCollection.find({}).sort({ createdAt: -1 });
  res.json({ success: true, data: { items } });
}));

router.post('/collections', verifyToken, requireTeamMember, [body('name').isString().isLength({ min: 2, max: 255 })], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) throw validationErrorHandler(errors);
  const created = await MediaCollection.create({ name: req.body.name, description: req.body.description, coverMediaId: req.body.coverMediaId, isPublic: req.body.isPublic, createdBy: req.user.id, mediaItems: req.body.mediaItems || [] });
  res.status(201).json({ success: true, message: 'Collection created', data: { item: created } });
}));

module.exports = router;
