// notifications/emailTemplate.js
// Shared email template wrapper. All notification emails use this for consistent branding.

const APP_URL = process.env.APP_URL || 'https://partner.jordandf.com';
const DEFAULT_APP_NAME = 'Career Command Center';

/**
 * Wrap email body HTML in a consistent branded template.
 * @param {string} body - inner HTML content
 * @param {Object} [opts]
 * @param {string} [opts.subtitle] - text under the app name in the header (e.g. "Weekly Digest")
 * @param {string} [opts.ctaLabel] - button text (default: "Open app")
 * @param {string} [opts.ctaUrl] - button URL (default: APP_URL)
 * @param {string} [opts.appName] - override app name
 * @returns {string} complete HTML email
 */
function wrapEmail(body, opts = {}) {
  const appName = opts.appName || DEFAULT_APP_NAME;
  const subtitle = opts.subtitle || '';
  const ctaLabel = opts.ctaLabel || 'Open app';
  const ctaUrl = opts.ctaUrl || APP_URL;

  const subtitleHtml = subtitle
    ? `<div style="font-size:12px;opacity:0.8;margin-top:2px;">${subtitle}</div>`
    : '';

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px;">
    <div style="background:#0040a0;color:#fff;padding:16px 24px;border-radius:8px 8px 0 0;text-align:center;">
      <div style="font-size:18px;font-weight:700;">${appName}</div>
      ${subtitleHtml}
    </div>
    <div style="background:#fff;padding:24px;border-radius:0 0 8px 8px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      ${body}
      <div style="text-align:center;margin-top:24px;">
        <a href="${ctaUrl}" style="display:inline-block;background:#0040a0;color:#fff;padding:10px 24px;border-radius:5px;text-decoration:none;font-size:14px;font-weight:600;">${ctaLabel}</a>
      </div>
    </div>
    <div style="text-align:center;padding:16px;font-size:11px;color:#999;">
      You're receiving this because email notifications are enabled in your account settings.
    </div>
  </div>
</body>
</html>`;
}

module.exports = { wrapEmail, APP_URL };
