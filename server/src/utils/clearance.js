const { UNITS } = require('./constants');

const createInitialApprovals = () =>
  UNITS.map((unit) => ({
    unit,
    status: 'pending',
    comment: '',
    approvedBy: null,
    date: null,
  }));

const deriveClearanceStatus = (approvals) => {
  if (approvals.some((entry) => entry.status === 'rejected')) {
    return 'rejected';
  }

  if (approvals.every((entry) => entry.status === 'approved')) {
    return 'approved';
  }

  return 'pending';
};

module.exports = {
  createInitialApprovals,
  deriveClearanceStatus,
};
