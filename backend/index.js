// backend/index.js
// Entry point for the Express backend server.

require('dotenv').config();

// --- STARTUP CHECKS ---
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set. Exiting.');
  process.exit(1);
}
if (process.env.JWT_SECRET.length < 32) {
  console.warn('WARNING: JWT_SECRET is shorter than 32 characters. Generate a strong secret with:');
  console.warn('  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  if (process.env.NODE_ENV === 'production') {
    console.error('FATAL: Weak JWT_SECRET is not allowed in production. Exiting.');
    process.exit(1);
  }
}
if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL environment variable is not set. Exiting.');
  process.exit(1);
}

const app = require('./app');
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);

  // Initialize notification scheduler (non-blocking)
  try {
    const { initScheduler } = require('./notifications/scheduler');
    initScheduler();
  } catch (err) {
    console.error('Failed to initialize notification scheduler:', err.message);
  }
});
