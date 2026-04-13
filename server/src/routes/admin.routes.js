const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const ClearanceRequest = require('../models/ClearanceRequest');
const { protect, allowRoles } = require('../middleware/auth');
const { USER_ROLES } = require('../utils/constants');

const router = express.Router();

router.use(protect, allowRoles('admin'));

router.get('/users', async (req, res) => {
  const role = String(req.query.role || 'all').trim().toLowerCase();
  const search = String(req.query.search || '').trim();
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  if (role !== 'all' && !USER_ROLES.includes(role)) {
    return res.status(400).json({ message: 'Invalid role filter' });
  }

  const query = {
    ...(role === 'all' ? {} : { role }),
    ...(search
      ? {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
          ],
        }
      : {}),
  };

  const [users, total] = await Promise.all([
    User.find(query).select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(query),
  ]);

  return res.json({
    users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  });
});

router.post('/users', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'Name, email, password and role are required' });
    }

    if (!USER_ROLES.includes(role)) {
      return res.status(400).json({ message: 'Invalid role selected' });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      password: hashed,
      role,
    });

    return res.status(201).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.delete('/users/:id', async (req, res) => {
  const { id } = req.params;

  if (String(req.user._id) === String(id)) {
    return res.status(400).json({ message: 'Admin cannot delete own account' });
  }

  const target = await User.findById(id);

  if (!target) {
    return res.status(404).json({ message: 'User not found' });
  }

  if (target.role === 'student') {
    const hasActiveRequest = await ClearanceRequest.exists({
      student: target._id,
      status: { $in: ['pending', 'approved'] },
    });

    if (hasActiveRequest) {
      return res.status(400).json({ message: 'Cannot delete student with active clearance records' });
    }
  }

  await User.findByIdAndDelete(id);
  return res.json({ message: 'User removed' });
});

router.get('/analytics', async (_req, res) => {
  const [totalUsers, totalRequests, pending, approved, rejected, usersByRole, trends, byUnit] = await Promise.all([
    User.countDocuments(),
    ClearanceRequest.countDocuments(),
    ClearanceRequest.countDocuments({ status: 'pending' }),
    ClearanceRequest.countDocuments({ status: 'approved' }),
    ClearanceRequest.countDocuments({ status: 'rejected' }),
    User.aggregate([{ $group: { _id: '$role', total: { $sum: 1 } } }]),
    ClearanceRequest.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          total: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 14 },
    ]),
    ClearanceRequest.aggregate([
      { $unwind: '$approvals' },
      { $group: { _id: '$approvals.unit', pending: { $sum: { $cond: [{ $eq: ['$approvals.status', 'pending'] }, 1, 0] } }, approved: { $sum: { $cond: [{ $eq: ['$approvals.status', 'approved'] }, 1, 0] } }, rejected: { $sum: { $cond: [{ $eq: ['$approvals.status', 'rejected'] }, 1, 0] } } } },
    ]),
  ]);

  const roleSummary = usersByRole.reduce((acc, row) => {
    acc[row._id] = row.total;
    return acc;
  }, {});

  return res.json({
    totalUsers,
    totalRequests,
    pending,
    approved,
    rejected,
    roleSummary,
    trends,
    byUnit,
    bottlenecks: byUnit
      .filter((item) => item.pending > 0)
      .sort((a, b) => b.pending - a.pending)
      .map((item) => ({ unit: item._id, pending: item.pending, risk: item.pending > 5 ? 'high' : 'medium' })),
  });
});

router.get('/audit', async (_req, res) => {
  const audit = await ClearanceRequest.find()
    .sort({ updatedAt: -1 })
    .limit(50)
    .populate('student', 'name email role')
    .populate('assignedTo', 'name email role')
    .populate('escalatedTo', 'name email role')
    .populate('approvalHistory.actor', 'name email role');

  return res.json({ audit });
});

router.get('/views', async (_req, res) => {
  return res.json({
    views: [
      { id: 'default', name: 'Default Overview', role: 'all' },
      { id: 'overdue', name: 'Overdue Requests', role: 'admin' },
      { id: 'pending', name: 'Pending Queue', role: 'staff' },
    ],
  });
});

module.exports = router;
