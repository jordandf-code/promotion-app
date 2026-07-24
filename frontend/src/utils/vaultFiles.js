// utils/vaultFiles.js
// Shared file helpers for the Document Vault and any surface that attaches
// files to a vault record (e.g. Wins). Files are stored as base64 data-URLs
// inline in the `vault` domain, capped at 5 MB to match express.json limit.

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const ACCEPTED_TYPES = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.gif';

export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getMimeLabel(mimeType) {
  if (!mimeType) return 'FILE';
  if (mimeType === 'application/pdf') return 'PDF';
  if (mimeType.includes('word')) return 'DOC';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'XLS';
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'PPT';
  if (mimeType.startsWith('image/')) return 'IMG';
  return 'FILE';
}

export function getMimeBadgeColor(mimeType) {
  if (!mimeType) return '#6b7280';
  if (mimeType === 'application/pdf') return '#dc2626';
  if (mimeType.includes('word')) return '#2563eb';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '#16a34a';
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '#ea580c';
  if (mimeType.startsWith('image/')) return '#7c3aed';
  return '#6b7280';
}

// Reads a File, enforces the 5 MB cap, and resolves to a vault-ready payload.
// Rejects with an Error whose message is user-facing (size or read failure).
export function readFileForVault(file) {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_FILE_SIZE) {
      reject(new Error(`File is too large (${formatFileSize(file.size)}). Maximum size is 5 MB.`));
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => resolve({
      filename: file.name,
      mimeType: file.type,
      size:     file.size,
      data:     ev.target.result, // Base64 data URL
    });
    reader.onerror = () => reject(new Error('Could not read the file. Please try again.'));
    reader.readAsDataURL(file);
  });
}

// Triggers a browser download for a vault document record.
export function downloadDocument(doc) {
  try {
    const base64Data = doc.data.split(',')[1];
    const bytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: doc.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch {
    // fallback: open data URL directly
    const a = document.createElement('a');
    a.href = doc.data;
    a.download = doc.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}
