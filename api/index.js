const dotenv = require('dotenv');
const connectDB = require('../server/src/config/db');
const app = require('../server/src/app');

dotenv.config({ path: './server/.env' });

let dbConnectionPromise;

const ensureDbConnection = async () => {
  if (!dbConnectionPromise) {
    dbConnectionPromise = connectDB();
  }

  return dbConnectionPromise;
};

module.exports = async (req, res) => {
  try {
    await ensureDbConnection();
    return app(req, res);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Vercel API bootstrap failed:', error);
    return res.status(500).json({ message: 'Server bootstrap failed' });
  }
};
