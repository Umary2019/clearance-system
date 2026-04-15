const dotenv = require('dotenv');

dotenv.config({ path: './server/.env' });

let dbConnectionPromise;
let cachedConnectDB;
let cachedApp;

const getMissingConfig = () => {
  const missing = [];

  if (!process.env.MONGO_URI) {
    missing.push('MONGO_URI');
  }

  if (!process.env.JWT_SECRET) {
    missing.push('JWT_SECRET');
  }

  return missing;
};

const ensureDbConnection = async () => {
  if (!cachedConnectDB) {
    cachedConnectDB = require('../server/src/config/db');
  }

  if (!dbConnectionPromise) {
    dbConnectionPromise = cachedConnectDB().catch((error) => {
      // Allow later invocations to retry instead of pinning a rejected promise.
      dbConnectionPromise = undefined;
      throw error;
    });
  }

  return dbConnectionPromise;
};

const getApp = () => {
  if (!cachedApp) {
    cachedApp = require('../server/src/app');
  }

  return cachedApp;
};

module.exports = async (req, res) => {
  try {
    const missingConfig = getMissingConfig();

    if (missingConfig.length > 0) {
      return res.status(500).json({
        message: `Missing required environment variables: ${missingConfig.join(', ')}. Configure them in Vercel and redeploy.`,
      });
    }

    await ensureDbConnection();
    const app = getApp();
    return app(req, res);
  } catch (error) {
    const message = String(error?.message || 'Server bootstrap failed');

    if (/contains unescaped characters|mongo_uri contains unescaped special characters/i.test(message)) {
      return res.status(500).json({
        message:
          'MongoDB connection string is invalid. URL-encode special characters in username/password in MONGO_URI (for example @ as %40, : as %3A, / as %2F), then redeploy.',
      });
    }

    if (/bad auth|authentication failed/i.test(message)) {
      return res.status(500).json({
        message:
          'MongoDB authentication failed. Verify Vercel MONGO_URI credentials (URL-encode special characters in username/password) and ensure your database network access allows Vercel.',
      });
    }

    // eslint-disable-next-line no-console
    console.error('Vercel API bootstrap failed:', error);
    return res.status(500).json({ message });
  }
};
