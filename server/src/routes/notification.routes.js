const express = require('express');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, async (req, res) => {
  const notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 });
  return res.json({ notifications });
});

router.patch('/:id/read', protect, async (req, res) => {
  const updated = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { readStatus: true },
    { new: true }
  );

  if (!updated) {
    return res.status(404).json({ message: 'Notification not found' });
  }

  return res.json({ notification: updated });
});

router.patch('/read-all', protect, async (req, res) => {
  await Notification.updateMany({ user: req.user._id, readStatus: false }, { readStatus: true });
  return res.json({ message: 'All notifications marked as read' });
});

module.exports = router;
