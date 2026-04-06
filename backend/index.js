// backend/index.js
// Entry point for the Express backend server.

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// --- MIDDLEWARE ---
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://promotion-app-lovat.vercel.app',
  ],
  credentials: true,
}));
app.use(express.json());

// --- ROUTES ---
app.use('/api/auth',  require('./routes/auth'));
app.use('/api/ai',    require('./routes/ai'));
app.use('/api/data',  require('./routes/data'));
app.use('/api/share', require('./routes/share'));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

// --- START SERVER ---
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
