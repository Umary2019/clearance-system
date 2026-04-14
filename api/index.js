const dotenv = require('dotenv');
const connectDB = require('../server/src/config/db');
const app = require('../server/src/app');

dotenv.config({ path: './server/.env' });

let dbConnectionPromise;

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
  if (!dbConnectionPromise) {
    dbConnectionPromise = connectDB();
  }

  return dbConnectionPromise;
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
    return app(req, res);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Vercel API bootstrap failed:', error);
    return res.status(500).json({ message: error.message || 'Server bootstrap failed' });
  }
};
