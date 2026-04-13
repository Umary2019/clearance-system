const UNITS = ['department', 'library', 'hostel', 'bursary'];

const STAFF_ROLES = ['department', 'library', 'hostel', 'bursary'];

const USER_ROLES = ['student', 'admin', ...STAFF_ROLES];

module.exports = {
  UNITS,
  STAFF_ROLES,
  USER_ROLES,
};
