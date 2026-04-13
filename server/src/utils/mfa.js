const crypto = require('crypto');

const generateSecret = () => crypto.randomBytes(20).toString('hex');

const base32Digest = (input) =>
  crypto.createHash('sha1').update(input).digest();

const hotp = (secret, counter) => {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac('sha1', Buffer.from(secret, 'hex')).update(buffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = ((hmac[offset] & 0x7f) << 24)
    | (hmac[offset + 1] << 16)
    | (hmac[offset + 2] << 8)
    | hmac[offset + 3];
  return String(code % 1000000).padStart(6, '0');
};

const totp = (secret, time = Date.now()) => {
  const step = Math.floor(time / 30000);
  return hotp(secret, step);
};

const verifyTotp = (secret, code, window = 1) => {
  const normalized = String(code || '').trim();
  const currentStep = Math.floor(Date.now() / 30000);

  for (let offset = -window; offset <= window; offset += 1) {
    if (hotp(secret, currentStep + offset) === normalized) {
      return true;
    }
  }

  return false;
};

const generateProvisioningUri = (email, secret, issuer = 'Clearance') =>
  `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;

module.exports = {
  generateSecret,
  totp,
  verifyTotp,
  generateProvisioningUri,
};