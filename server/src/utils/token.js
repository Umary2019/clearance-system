const jwt = require('jsonwebtoken');

const signToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });

module.exports = signToken;
