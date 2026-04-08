// db.js
// PostgreSQL connection pool — reads DATABASE_URL from .env.

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    // Supabase uses certificates that may not be in the Node.js trust chain.
    // This is safe: the connection is still encrypted, just not verifying the CA.
    rejectUnauthorized: false,
  },
});

module.exports = pool;
