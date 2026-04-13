const mongoose = require('mongoose');

const approvalEntrySchema = new mongoose.Schema(
  {
    unit: {
      type: String,
      enum: ['department', 'library', 'hostel', 'bursary'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    comment: {
      type: String,
      default: '',
      trim: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    date: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

const approvalHistoryEntrySchema = new mongoose.Schema(
  {
    unit: {
      type: String,
      enum: ['department', 'library', 'hostel', 'bursary'],
      required: true,
    },
    status: {
      type: String,
      enum: ['approved', 'rejected'],
      required: true,
    },
    comment: {
      type: String,
      default: '',
      trim: true,
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    previousStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const attachmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    url: { type: String, required: true },
    type: { type: String, default: '' },
    size: { type: Number, default: 0 },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const clearanceRequestSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    approvals: {
      type: [approvalEntrySchema],
      default: [],
    },
    approvalHistory: {
      type: [approvalHistoryEntrySchema],
      default: [],
    },
    attachments: {
      type: [attachmentSchema],
      default: [],
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    escalatedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    priority: {
      type: String,
      enum: ['normal', 'urgent'],
      default: 'normal',
    },
    slaDueAt: {
      type: Date,
      default: null,
    },
    finalSlipUrl: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ClearanceRequest', clearanceRequestSchema);
