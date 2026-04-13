const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const signToken = require('../utils/token');
const { USER_ROLES } = require('../utils/constants');
const { generateSecret, totp, verifyTotp, generateProvisioningUri } = require('../utils/mfa');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedRole = role || 'student';

    if (!USER_ROLES.includes(normalizedRole)) {
      return res.status(400).json({ message: 'Invalid role selected' });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      password: hashed,
      role: normalizedRole,
    });

    const token = signToken(user._id);

    return res.status(201).json({
      token,
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

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (user.mfaEnabled) {
      const challengeToken = jwt.sign(
        { id: user._id, purpose: 'mfa-login' },
        process.env.JWT_SECRET,
        { expiresIn: '10m' }
      );

      return res.status(206).json({
        mfaRequired: true,
        challengeToken,
        message: 'Multi-factor authentication required',
      });
    }

    const token = signToken(user._id);

    return res.json({
      token,
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

router.post('/login/mfa', async (req, res) => {
  try {
    const { challengeToken, code } = req.body;

    if (!challengeToken || !code) {
      return res.status(400).json({ message: 'Challenge token and code are required' });
    }

    const decoded = jwt.verify(challengeToken, process.env.JWT_SECRET);

    if (decoded.purpose !== 'mfa-login') {
      return res.status(400).json({ message: 'Invalid MFA challenge' });
    }

    const user = await User.findById(decoded.id);
    if (!user || !user.mfaEnabled || !user.mfaSecret) {
      return res.status(400).json({ message: 'MFA is not enabled for this account' });
    }

    if (!verifyTotp(user.mfaSecret, code)) {
      return res.status(401).json({ message: 'Invalid MFA code' });
    }

    const token = signToken(user._id);
    return res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    return res.status(401).json({ message: 'Invalid MFA challenge' });
  }
});

router.get('/profile', protect, async (req, res) => {
  return res.json({ user: req.user });
});

router.patch('/profile', protect, async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail, _id: { $ne: req.user._id } });

    if (existing) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    const updated = await User.findByIdAndUpdate(
      req.user._id,
      {
        name: String(name).trim(),
        email: normalizedEmail,
      },
      { new: true }
    ).select('-password');

    return res.json({ user: updated });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.patch('/password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long' });
    }

    const user = await User.findById(req.user._id);
    const matches = await bcrypt.compare(currentPassword, user.password);

    if (!matches) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.json({ message: 'Password updated successfully' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email: String(email).trim().toLowerCase() });

    if (!user) {
      return res.json({ message: 'If the account exists, a reset link has been generated.' });
    }

    const resetToken = crypto.randomBytes(24).toString('hex');
    user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.passwordResetExpires = new Date(Date.now() + 1000 * 60 * 30);
    await user.save();

    return res.json({
      message: 'Password reset token generated.',
      resetToken,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post('/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || String(password).length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    const hashedToken = crypto.createHash('sha256').update(String(token)).digest('hex');
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Reset token is invalid or expired' });
    }

    user.password = await bcrypt.hash(password, 10);
    user.passwordResetToken = '';
    user.passwordResetExpires = null;
    await user.save();

    return res.json({ message: 'Password reset successfully' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post('/mfa/setup', protect, async (req, res) => {
  try {
    const secret = generateSecret();
    const uri = generateProvisioningUri(req.user.email, secret, 'Clearance');
    const code = totp(secret);

    req.user.mfaSecret = secret;
    req.user.mfaEnabled = false;
    await req.user.save();

    return res.json({ secret, uri, code, mfaEnabled: req.user.mfaEnabled });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post('/mfa/enable', protect, async (req, res) => {
  try {
    const { code } = req.body;

    if (!req.user.mfaSecret) {
      return res.status(400).json({ message: 'Set up MFA before enabling it' });
    }

    if (!verifyTotp(req.user.mfaSecret, code)) {
      return res.status(400).json({ message: 'Invalid MFA code' });
    }

    req.user.mfaEnabled = true;
    await req.user.save();

    return res.json({ message: 'MFA enabled successfully', mfaEnabled: true });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.patch('/mfa/toggle', protect, async (req, res) => {
  try {
    const { enabled } = req.body;
    req.user.mfaEnabled = Boolean(enabled);
    await req.user.save();
    return res.json({ message: 'MFA updated', mfaEnabled: req.user.mfaEnabled });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;
