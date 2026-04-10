// routes/issues.js
// Submit issues to GitHub via the GitHub API.
// GitHub token and repo are configured by the superuser in app_settings.

const express        = require('express');
const db             = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

// POST /api/issues — submit an issue to GitHub
router.post('/', async (req, res) => {
  const { title, description, type, page, browser } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }
  if (!description || !description.trim()) {
    return res.status(400).json({ error: 'Description is required' });
  }
  const issueType = ['bug', 'feature', 'question'].includes(type) ? type : 'bug';

  try {
    // Load GitHub config
    const settingsResult = await db.query(
      "SELECT key, value FROM app_settings WHERE key IN ('github_token', 'github_repo')"
    );
    const settings = {};
    for (const row of settingsResult.rows) settings[row.key] = row.value;

    if (!settings.github_token || !settings.github_repo) {
      return res.status(400).json({ error: 'Issue reporting is not configured. Ask your admin to set up GitHub integration in Super Admin → Platform.' });
    }

    // Get reporter info
    const userResult = await db.query(
      'SELECT name, email, role FROM users WHERE id = $1',
      [req.userId]
    );
    const user = userResult.rows[0];

    // Build issue body
    const typeLabel = issueType === 'bug' ? 'Bug report'
      : issueType === 'feature' ? 'Feature request'
      : 'Question';

    const body = [
      `## ${typeLabel}`,
      '',
      description.trim(),
      '',
      '---',
      `**Reporter:** ${user.name} (${user.email})`,
      `**Role:** ${user.role}`,
      `**Date:** ${new Date().toISOString()}`,
      `**Page:** ${page || 'unknown'}`,
      `**Browser:** ${browser || 'unknown'}`,
    ].join('\n');

    // Call GitHub API
    const ghRes = await fetch(
      `https://api.github.com/repos/${settings.github_repo}/issues`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${settings.github_token}`,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({
          title: title.trim(),
          body,
          labels: [issueType],
        }),
      }
    );

    if (!ghRes.ok) {
      const ghErr = await ghRes.json().catch(() => ({}));
      console.error('GitHub API error:', ghRes.status, ghErr.message || ghErr);
      if (ghRes.status === 401) {
        return res.status(400).json({ error: 'GitHub token is invalid or expired. Ask your admin to update it.' });
      }
      if (ghRes.status === 404) {
        return res.status(400).json({ error: 'GitHub repository not found. Check the repo setting in Super Admin.' });
      }
      return res.status(502).json({ error: 'Failed to create issue on GitHub' });
    }

    const ghData = await ghRes.json();
    res.json({ ok: true, issueUrl: ghData.html_url, issueNumber: ghData.number });
  } catch (err) {
    console.error('issues error:', err.message);
    res.status(500).json({ error: 'Failed to submit issue' });
  }
});

// GET /api/issues/status — check if issue reporting is configured (any authenticated user)
router.get('/status', async (req, res) => {
  try {
    const result = await db.query(
      "SELECT key FROM app_settings WHERE key IN ('github_token', 'github_repo')"
    );
    const keys = result.rows.map(r => r.key);
    res.json({ configured: keys.includes('github_token') && keys.includes('github_repo') });
  } catch (err) {
    console.error('issues/status error:', err.message);
    res.status(500).json({ error: 'Failed to check status' });
  }
});

module.exports = router;
