const express = require('express');
const PDFDocument = require('pdfkit');
const ClearanceRequest = require('../models/ClearanceRequest');
const { protect, allowRoles } = require('../middleware/auth');

const router = express.Router();

router.get('/slip/:requestId', protect, allowRoles('student', 'admin'), async (req, res) => {
  try {
    const { requestId } = req.params;

    const request = await ClearanceRequest.findById(requestId)
      .populate('student', 'name email')
      .populate('approvals.approvedBy', 'name role');

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    const isOwner = req.user.role === 'student' && request.student._id.toString() === req.user._id.toString();

    if (req.user.role === 'student' && !isOwner) {
      return res.status(403).json({ message: 'Not allowed to access this slip' });
    }

    if (request.status !== 'approved') {
      return res.status(400).json({ message: 'Final slip is available only for approved requests' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=clearance-${request._id}.pdf`);

    const doc = new PDFDocument();
    doc.pipe(res);

    doc.fontSize(20).text('Student Final Clearance Slip', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Student: ${request.student.name}`);
    doc.text(`Email: ${request.student.email}`);
    doc.text(`Request ID: ${request._id}`);
    doc.text(`Status: ${request.status.toUpperCase()}`);
    doc.text(`Generated: ${new Date().toLocaleString()}`);
    doc.moveDown();

    doc.fontSize(14).text('Unit Approvals');
    doc.moveDown(0.5);

    request.approvals.forEach((approval) => {
      const approver = approval.approvedBy ? approval.approvedBy.name : 'N/A';
      doc.fontSize(12).text(`${approval.unit.toUpperCase()}: ${approval.status.toUpperCase()}`);
      doc.text(`Approver: ${approver}`);
      doc.text(`Comment: ${approval.comment || 'No comment'}`);
      doc.text(`Date: ${approval.date ? new Date(approval.date).toLocaleString() : 'N/A'}`);
      doc.moveDown(0.5);
    });

    doc.end();
    return undefined;
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get('/export', protect, allowRoles('admin'), async (_req, res) => {
  try {
    const requests = await ClearanceRequest.find()
      .populate('student', 'name email role')
      .populate('assignedTo', 'name email role')
      .populate('escalatedTo', 'name email role')
      .sort({ createdAt: -1 });

    const headers = [
      'Student',
      'Email',
      'Status',
      'Assigned To',
      'Escalated To',
      'Priority',
      'Created At',
      'SLA Due At',
      'Attachment Count',
    ];

    const rows = requests.map((request) => [
      request.student?.name || '',
      request.student?.email || '',
      request.status || '',
      request.assignedTo?.name || '',
      request.escalatedTo?.name || '',
      request.priority || 'normal',
      request.createdAt ? new Date(request.createdAt).toISOString() : '',
      request.slaDueAt ? new Date(request.slaDueAt).toISOString() : '',
      request.attachments?.length || 0,
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=clearance-report.csv');
    return res.send(csv);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;
