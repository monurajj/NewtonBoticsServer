const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const router = express.Router();
const { optionalAuth, verifyToken, requireTeamMember, requireMentor, requireAdmin } = require('../middleware/auth');
const { sendInventoryCheckoutEmail } = require('../services/emailService');
const Equipment = require('../models/Equipment');
const EquipmentCategory = require('../models/EquipmentCategory');
const { asyncHandler, validationErrorHandler, notFoundErrorHandler } = require('../middleware/errorHandler');

// TODO: Implement inventory routes
// - GET /api/inventory/equipment - List equipment
// - GET /api/inventory/equipment/:id - Get equipment details
// - POST /api/inventory/equipment - Create equipment
// - PUT /api/inventory/equipment/:id - Update equipment
// - DELETE /api/inventory/equipment/:id - Delete equipment
// - GET /api/inventory/categories - List equipment categories
// - POST /api/inventory/equipment/:id/checkout - Checkout equipment
// - PUT /api/inventory/equipment/:id/return - Return equipment

// Equipment list with filters
router.get(
  '/equipment',
  optionalAuth,
  [
    query('categoryId').optional().isString(),
    query('status').optional().isIn(['available', 'low_stock', 'out_of_stock', 'maintenance', 'retired']),
    query('q').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('skip').optional().isInt({ min: 0 }).toInt(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw validationErrorHandler(errors);
    const { categoryId, status, q, limit = 20, skip = 0 } = req.query;
    const filter = {};
    if (categoryId) filter.categoryId = categoryId;
    if (status) filter.status = status;
    if (q) filter.name = { $regex: q, $options: 'i' };
    const [items, total] = await Promise.all([
      Equipment.find(filter).limit(limit).skip(skip).sort({ createdAt: -1 }),
      Equipment.countDocuments(filter),
    ]);
    res.json({ success: true, data: { items, pagination: { total, limit, skip, hasMore: total > skip + items.length } } });
  })
);

// Equipment get by id
router.get(
  '/equipment/:id',
  [param('id').isString()],
  asyncHandler(async (req, res) => {
    const eq = await Equipment.findById(req.params.id);
    if (!eq) throw notFoundErrorHandler('Equipment');
    res.json({ success: true, data: { item: eq } });
  })
);

// Create/update restricted to team members or higher; delete to mentor/admin
router.post(
  '/equipment',
  verifyToken,
  requireTeamMember,
  [
    body('name').isString().isLength({ min: 2, max: 255 }),
    body('categoryId').isString(),
    body('currentQuantity').optional().isInt({ min: 0 }).toInt(),
    body('status').optional().isIn(['available', 'low_stock', 'out_of_stock', 'maintenance', 'retired']),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw validationErrorHandler(errors);
    const created = await Equipment.create(req.body);
    res.status(201).json({ success: true, message: 'Equipment created', data: { item: created } });
  })
);

router.put(
  '/equipment/:id',
  verifyToken,
  requireTeamMember,
  [param('id').isString()],
  asyncHandler(async (req, res) => {
    const updated = await Equipment.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) throw notFoundErrorHandler('Equipment');
    res.json({ success: true, message: 'Equipment updated', data: { item: updated } });
  })
);

router.delete(
  '/equipment/:id',
  verifyToken,
  requireMentor,
  [param('id').isString()],
  asyncHandler(async (req, res) => {
    const deleted = await Equipment.findByIdAndDelete(req.params.id);
    if (!deleted) throw notFoundErrorHandler('Equipment');
    res.json({ success: true, message: 'Equipment deleted' });
  })
);

// Checkout/Return require auth (team members+)
router.post('/equipment/:id/checkout', verifyToken, requireTeamMember, async (req, res) => {
  try {
    const equipment = await Equipment.findById(req.params.id);
    if (!equipment) return res.status(404).json({ success: false, message: 'Equipment not found' });
    const quantity = Math.max(1, Number(req.body.quantity || 1));
    const expectedReturnDate = req.body.expectedReturnDate || new Date(Date.now() + 7*24*60*60*1000);
    if (equipment.currentQuantity < quantity) return res.status(400).json({ success: false, message: 'Insufficient quantity' });
    equipment.currentQuantity -= quantity;
    equipment.checkouts.push({ userId: req.user.id, quantity, expectedReturnDate });
    await equipment.save();
    try { await sendInventoryCheckoutEmail({ equipment, userEmail: req.user.email, quantity, expectedReturnDate }); } catch (_) {}
    res.status(201).json({ success: true, message: 'Checked out', data: { currentQuantity: equipment.currentQuantity } });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to checkout' });
  }
});

router.put(
  '/equipment/:id/return',
  verifyToken,
  requireTeamMember,
  [param('id').isString(), body('checkoutId').optional().isString()],
  asyncHandler(async (req, res) => {
    const eq = await Equipment.findById(req.params.id);
    if (!eq) throw notFoundErrorHandler('Equipment');
    // Find last active checkout by this user, unless checkoutId provided
    let idx = -1;
    if (req.body.checkoutId) {
      idx = eq.checkouts.findIndex(c => String(c._id) === String(req.body.checkoutId));
    } else {
      for (let i = eq.checkouts.length - 1; i >= 0; i -= 1) {
        const c = eq.checkouts[i];
        if (String(c.userId) === String(req.user.id) && c.status === 'checked_out') { idx = i; break; }
      }
    }
    if (idx === -1) return res.status(404).json({ success: false, message: 'Active checkout not found' });
    const checkout = eq.checkouts[idx];
    if (checkout.status !== 'checked_out') return res.status(400).json({ success: false, message: 'Already returned' });
    checkout.status = 'returned';
    checkout.actualReturnDate = new Date();
    eq.currentQuantity += checkout.quantity;
    await eq.save();
    res.json({ success: true, message: 'Returned', data: { currentQuantity: eq.currentQuantity } });
  })
);

// Categories CRUD
router.get('/categories', optionalAuth, asyncHandler(async (req, res) => {
  const items = await EquipmentCategory.find({}).sort({ name: 1 });
  res.json({ success: true, data: { items } });
}));

router.post('/categories', verifyToken, requireTeamMember, [body('name').isString().isLength({ min: 2, max: 100 })], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) throw validationErrorHandler(errors);
  const created = await EquipmentCategory.create({ name: req.body.name, description: req.body.description, parentCategoryId: req.body.parentCategoryId });
  res.status(201).json({ success: true, message: 'Category created', data: { item: created } });
}));

router.put('/categories/:id', verifyToken, requireTeamMember, [param('id').isString()], asyncHandler(async (req, res) => {
  const updated = await EquipmentCategory.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!updated) throw notFoundErrorHandler('Category');
  res.json({ success: true, message: 'Category updated', data: { item: updated } });
}));

router.delete('/categories/:id', verifyToken, requireMentor, [param('id').isString()], asyncHandler(async (req, res) => {
  const deleted = await EquipmentCategory.findByIdAndDelete(req.params.id);
  if (!deleted) throw notFoundErrorHandler('Category');
  res.json({ success: true, message: 'Category deleted' });
}));

module.exports = router;
