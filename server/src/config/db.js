const mongoose = require('mongoose');

const isLocalMongoUri = (uri) => /mongodb(?:\+srv)?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|::1)/i.test(uri);

const normalizeMongoConnectionError = (error) => {
  const message = String(error?.message || '');

  if (/contains unescaped characters/i.test(message)) {
    return new Error(
      'MONGO_URI contains unescaped special characters in the username or password. URL-encode credentials (for example @ as %40, : as %3A, / as %2F) and try again.'
    );
  }

  return error;
};

const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error('MONGO_URI is missing in environment variables.');
  }

  if (process.env.VERCEL && isLocalMongoUri(uri)) {
    throw new Error('MONGO_URI points to a local MongoDB host. Use a cloud MongoDB URI (for example MongoDB Atlas) for Vercel deployment.');
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
  } catch (error) {
    throw normalizeMongoConnectionError(error);
  }
  // eslint-disable-next-line no-console
  console.log('MongoDB connected');
};

module.exports = connectDB;
