// db.js
// PostgreSQL connection pool — reads DATABASE_URL from .env.

const { Pool } = require('pg');

const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    // In production, verify the server's SSL certificate to prevent MITM attacks.
    // Locally, Supabase dev certs may not be in the trust chain, so allow self-signed.
    rejectUnauthorized: isProduction,
  },
});

module.exports = pool;
