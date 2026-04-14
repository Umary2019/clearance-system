const mongoose = require('mongoose');

const isLocalMongoUri = (uri) => /mongodb(?:\+srv)?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|::1)/i.test(uri);

const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error('MONGO_URI is missing in environment variables.');
  }

  if (process.env.VERCEL && isLocalMongoUri(uri)) {
    throw new Error('MONGO_URI points to a local MongoDB host. Use a cloud MongoDB URI (for example MongoDB Atlas) for Vercel deployment.');
  }

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
  });
  // eslint-disable-next-line no-console
  console.log('MongoDB connected');
};

module.exports = connectDB;
