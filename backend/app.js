// backend/app.js
// Express app setup — separated from server start so tests can import without listening.

const express = require('express');
const cors = require('cors');

const app = express();

// --- MIDDLEWARE ---
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
  : ['http://localhost:5173', 'https://promotion-app-lovat.vercel.app', 'https://partner.jordandf.com'];

app.use(cors({
  origin: corsOrigins,
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));

// Trust proxy headers (Render, Vercel, etc.) so express-rate-limit sees real client IPs
app.set('trust proxy', 1);

// --- ROUTES ---
app.use('/api/auth',   require('./routes/auth'));
app.use('/api/ai',     require('./routes/ai'));
app.use('/api/data',   require('./routes/data'));
app.use('/api/share',  require('./routes/share'));
app.use('/api/admin',  require('./routes/admin'));
app.use('/api',        require('./routes/peers'));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

// --- GLOBAL ERROR HANDLER ---
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
