const express = require('express');
const ClearanceRequest = require('../models/ClearanceRequest');
const Notification = require('../models/Notification');
const { protect, allowRoles } = require('../middleware/auth');
const { STAFF_ROLES, UNITS } = require('../utils/constants');
const { deriveClearanceStatus } = require('../utils/clearance');

const router = express.Router();

router.patch('/:requestId', protect, allowRoles(...STAFF_ROLES, 'admin'), async (req, res) => {
  try {
    const { requestId } = req.params;
    const { unit: chosenUnit, status, comment = '' } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be approved or rejected' });
    }

    const request = await ClearanceRequest.findById(requestId).populate('student', 'name email');

    if (!request) {
      return res.status(404).json({ message: 'Clearance request not found' });
    }

    const unit = req.user.role === 'admin' ? String(chosenUnit || '').trim() : req.user.role;

    if (!UNITS.includes(unit)) {
      return res.status(400).json({ message: 'Valid unit is required for this action' });
    }

    const approval = request.approvals.find((entry) => entry.unit === unit);

    if (!approval) {
      return res.status(404).json({ message: `Unit ${unit} not found in this request` });
    }

    const sanitizedComment = String(comment || '').trim().slice(0, 500);
    const previousStatus = approval.status;

    approval.status = status;
    approval.comment = sanitizedComment;
    approval.approvedBy = req.user._id;
    approval.date = new Date();

    request.approvalHistory.push({
      unit,
      status,
      comment: sanitizedComment,
      actor: req.user._id,
      previousStatus,
      createdAt: new Date(),
    });

    request.status = deriveClearanceStatus(request.approvals);
    await request.save();

    await Notification.create({
      user: request.student._id,
      message: `${unit} marked your clearance as ${status}.`,
    });

    return res.json(request);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post('/:requestId/reassign', protect, allowRoles('admin'), async (req, res) => {
  try {
    const { requestId } = req.params;
    const { assignedTo, note = '' } = req.body;

    const request = await ClearanceRequest.findById(requestId).populate('student', 'name email');
    if (!request) {
      return res.status(404).json({ message: 'Clearance request not found' });
    }

    request.assignedTo = assignedTo || null;
    request.approvalHistory.push({
      unit: req.user.role,
      status: 'approved',
      comment: `Reassigned: ${String(note || '').trim()}`,
      actor: req.user._id,
      previousStatus: request.status,
      createdAt: new Date(),
    });
    await request.save();

    return res.json({ message: 'Request reassigned successfully', request });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post('/:requestId/escalate', protect, allowRoles(...STAFF_ROLES, 'admin'), async (req, res) => {
  try {
    const { requestId } = req.params;
    const { escalatedTo = null, note = '' } = req.body;

    const request = await ClearanceRequest.findById(requestId).populate('student', 'name email');
    if (!request) {
      return res.status(404).json({ message: 'Clearance request not found' });
    }

    request.escalatedTo = escalatedTo || null;
    request.priority = 'urgent';
    request.approvalHistory.push({
      unit: req.user.role,
      status: 'approved',
      comment: `Escalated: ${String(note || '').trim()}`,
      actor: req.user._id,
      previousStatus: request.status,
      createdAt: new Date(),
    });
    await request.save();

    return res.json({ message: 'Request escalated successfully', request });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;
