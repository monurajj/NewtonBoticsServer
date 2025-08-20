const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { asyncHandler, validationErrorHandler, notFoundErrorHandler } = require('../middleware/errorHandler');
const { requireAdmin } = require('../middleware/auth');
const RoleApproval = require('../models/RoleApproval');

const router = express.Router();

const upsertValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('allowedRoles')
    .isArray({ min: 1 })
    .withMessage('allowedRoles must be a non-empty array'),
  body('allowedRoles.*')
    .isIn(['student', 'team_member', 'mentor', 'researcher', 'community', 'admin'])
    .withMessage('Invalid role value in allowedRoles'),
  body('note')
    .optional()
    .isString()
    .isLength({ max: 500 })
];

// @route   GET /api/role-approvals
// @desc    List all role approvals
// @access  Private (Admin)
router.get('/', requireAdmin, asyncHandler(async (req, res) => {
  const approvals = await RoleApproval.find().sort({ email: 1 });
  res.json({ success: true, data: { approvals } });
}));

// @route   GET /api/role-approvals/:email
// @desc    Get role approval by email
// @access  Private (Admin)
router.get('/:email', requireAdmin, asyncHandler(async (req, res) => {
  const email = req.params.email.toLowerCase();
  const approval = await RoleApproval.findOne({ email });
  if (!approval) {
    throw notFoundErrorHandler('RoleApproval');
  }
  res.json({ success: true, data: { approval } });
}));

// @route   POST /api/role-approvals
// @desc    Create or update role approval for email
// @access  Private (Admin)
router.post('/', requireAdmin, upsertValidation, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw validationErrorHandler(errors);
  }

  const { email, allowedRoles, note } = req.body;
  const update = {
    email: email.toLowerCase(),
    allowedRoles: Array.from(new Set(allowedRoles)),
    note,
    updatedBy: req.user?.id,
  };

  const approval = await RoleApproval.findOneAndUpdate(
    { email: update.email },
    { $set: update, $setOnInsert: { createdBy: req.user?.id, isActive: true } },
    { upsert: true, new: true }
  );

  res.status(201).json({ success: true, message: 'Role approval saved', data: { approval } });
}));

// @route   DELETE /api/role-approvals/:email
// @desc    Delete role approval
// @access  Private (Admin)
router.delete('/:email', requireAdmin, asyncHandler(async (req, res) => {
  const email = req.params.email.toLowerCase();
  const approval = await RoleApproval.findOneAndDelete({ email });
  if (!approval) {
    throw notFoundErrorHandler('RoleApproval');
  }
  res.json({ success: true, message: 'Role approval removed' });
}));

module.exports = router;


