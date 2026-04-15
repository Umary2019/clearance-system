const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const ClearanceRequest = require('../models/ClearanceRequest');
const Notification = require('../models/Notification');
const { protect, allowRoles } = require('../middleware/auth');
const { STAFF_ROLES, UNITS } = require('../utils/constants');
const { createInitialApprovals } = require('../utils/clearance');

const router = express.Router();

const getUploadsDir = () => {
  if (process.env.VERCEL) {
    return path.join('/tmp', 'uploads');
  }

  return path.join(process.cwd(), 'uploads');
};

const uploadsDir = getUploadsDir();

try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (error) {
  // eslint-disable-next-line no-console
  console.warn(`Uploads directory is unavailable at ${uploadsDir}: ${error.message}`);
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const safeName = `${Date.now()}-${file.originalname}`.replace(/\s+/g, '-');
    cb(null, safeName);
  },
});

const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

const buildAttachmentPayload = (file, userId) => ({
  name: file.originalname,
  url: `/uploads/${file.filename}`,
  type: file.mimetype,
  size: file.size,
  uploadedBy: userId,
  createdAt: new Date(),
});

const markOverdue = (request) => {
  if (!request?.slaDueAt) {
    return false;
  }

  return request.status === 'pending' && new Date(request.slaDueAt).getTime() < Date.now();
};

router.post('/request', protect, allowRoles('student'), async (req, res) => {
  try {
    const existing = await ClearanceRequest.findOne({
      student: req.user._id,
      status: { $in: ['pending', 'approved'] },
    });

    if (existing) {
      return res.status(400).json({ message: 'Clearance already started' });
    }

    const request = await ClearanceRequest.create({
      student: req.user._id,
      approvals: createInitialApprovals(),
      slaDueAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      priority: 'normal',
    });

    await Notification.create({
      user: req.user._id,
      message: 'Clearance request submitted successfully.',
    });

    return res.status(201).json(request);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get('/my', protect, allowRoles('student'), async (req, res) => {
  try {
    const request = await ClearanceRequest.findOne({ student: req.user._id })
      .sort({ createdAt: -1 })
      .populate('approvals.approvedBy', 'name email role')
      .populate('assignedTo', 'name email role')
      .populate('escalatedTo', 'name email role')
      .populate('attachments.uploadedBy', 'name email role')
      .populate('approvalHistory.actor', 'name email role');

    return res.json({ request, overdue: markOverdue(request) });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get('/unit', protect, allowRoles(...STAFF_ROLES, 'admin'), async (req, res) => {
  try {
    const unit = req.user.role === 'admin' ? String(req.query.unit || '').trim() : req.user.role;
    const statusFilter = String(req.query.status || 'all').trim().toLowerCase();
    const search = String(req.query.search || '').trim();
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    if (!unit) {
      return res.status(400).json({ message: 'Unit is required for admin query' });
    }

    if (!UNITS.includes(unit)) {
      return res.status(400).json({ message: 'Invalid unit supplied' });
    }

    if (statusFilter !== 'all' && !['pending', 'approved', 'rejected'].includes(statusFilter)) {
      return res.status(400).json({ message: 'Invalid status filter' });
    }

    const query = {
      approvals: { $elemMatch: { unit } },
      ...(statusFilter === 'all' ? {} : { status: statusFilter }),
    };

    if (search) {
      query.$or = [
        { 'studentProfile.name': { $regex: search, $options: 'i' } },
        { 'studentProfile.email': { $regex: search, $options: 'i' } },
      ];
    }

    const pipeline = [
      {
        $lookup: {
          from: 'users',
          localField: 'student',
          foreignField: '_id',
          as: 'studentProfile',
        },
      },
      {
        $unwind: '$studentProfile',
      },
      {
        $match: query,
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $facet: {
          rows: [{ $skip: skip }, { $limit: limit }],
          meta: [{ $count: 'total' }],
        },
      },
    ];

    const [result] = await ClearanceRequest.aggregate(pipeline);
    const rows = result?.rows || [];
    const total = result?.meta?.[0]?.total || 0;

    const requests = await ClearanceRequest.populate(rows, {
      path: 'approvals.approvedBy approvalHistory.actor assignedTo escalatedTo attachments.uploadedBy',
      select: 'name email role',
    });

    requests.forEach((item) => {
      item.student = {
        _id: item.studentProfile._id,
        name: item.studentProfile.name,
        email: item.studentProfile.email,
      };
      delete item.studentProfile;
    });

    return res.json({
      requests,
      unit,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post('/:requestId/attachments', protect, allowRoles('student'), upload.array('files', 5), async (req, res) => {
  try {
    const { requestId } = req.params;
    const request = await ClearanceRequest.findOne({ _id: requestId, student: req.user._id });

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    const files = (req.files || []).map((file) => buildAttachmentPayload(file, req.user._id));
    request.attachments.push(...files);
    await request.save();

    return res.json({ request });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post('/:requestId/route', protect, allowRoles('admin'), async (req, res) => {
  try {
    const { requestId } = req.params;
    const { assignedTo = null, escalatedTo = null, priority = 'normal', note = '' } = req.body;

    const request = await ClearanceRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({ message: 'Clearance request not found' });
    }

    request.assignedTo = assignedTo || null;
    request.escalatedTo = escalatedTo || null;
    request.priority = ['normal', 'urgent'].includes(priority) ? priority : 'normal';
    if (note) {
      request.approvalHistory.push({
        unit: 'department',
        status: 'approved',
        comment: String(note).trim().slice(0, 500),
        actor: req.user._id,
        previousStatus: request.status,
        createdAt: new Date(),
      });
    }
    await request.save();

    return res.json({ message: 'Request routed successfully', request });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get('/audit', protect, allowRoles('admin'), async (req, res) => {
  try {
    const audit = await ClearanceRequest.find()
      .sort({ updatedAt: -1 })
      .limit(50)
      .populate('student', 'name email role')
      .populate('assignedTo', 'name email role')
      .populate('escalatedTo', 'name email role')
      .populate('approvalHistory.actor', 'name email role');

    return res.json({ audit });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;
