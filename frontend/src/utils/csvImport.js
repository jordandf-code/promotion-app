// utils/csvImport.js
// CSV parsing, validation, and download helpers for bulk import.

import Papa from 'papaparse';

// Parse a CSV File object. Returns { data: [{...}], errors: [...] }
export function parseCSV(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: h => h.trim().replace(/\s+/g, ''),
      complete: result => resolve({ data: result.data, errors: result.errors }),
      error: err => reject(err),
    });
  });
}

// Boolean string normalization — accepts true/false, yes/no, 1/0 (case-insensitive)
const BOOL_TRUE  = new Set(['true', 'yes', '1']);
const BOOL_FALSE = new Set(['false', 'no', '0']);

export function parseBoolString(val) {
  const lower = (val ?? '').toString().trim().toLowerCase();
  if (BOOL_TRUE.has(lower))  return true;
  if (BOOL_FALSE.has(lower)) return false;
  return null; // not a recognized boolean
}

// Validate parsed rows against a column spec.
// columnSpec: [{ key, label, required?, validate?, enum?, type? }]
// Returns rows with _errors[] and _valid boolean attached.
// Columns with type: 'boolean' are coerced to actual booleans.
export function validateRows(rows, columnSpec) {
  return rows.map((row, i) => {
    const errors = [];
    const coerced = { ...row };

    for (const col of columnSpec) {
      const val = (row[col.key] ?? '').toString().trim();

      if (col.required && !val) {
        errors.push(`${col.label} is required`);
      }

      // Enum validation
      if (val && col.enum) {
        if (!col.enum.includes(val)) {
          errors.push(`${col.label} must be one of: ${col.enum.join(', ')}`);
        }
      }

      // Boolean coercion
      if (col.type === 'boolean' && val) {
        const parsed = parseBoolString(val);
        if (parsed === null) {
          errors.push(`${col.label} must be true/false, yes/no, or 1/0`);
        } else {
          coerced[col.key] = parsed;
        }
      }

      if (val && col.validate) {
        const err = col.validate(val, row);
        if (err) errors.push(err);
      }
    }

    return { ...coerced, _rowIndex: i, _errors: errors, _valid: errors.length === 0 };
  });
}

// Generate a CSV string from column spec + optional example row
export function generateTemplate(columnSpec, exampleRow) {
  const headers = columnSpec.map(c => c.key).join(',');
  if (!exampleRow) return headers + '\n';
  const values = columnSpec.map(c => {
    const v = exampleRow[c.key] ?? '';
    const s = String(v);
    if (s.includes(',') || s.includes('"')) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }).join(',');
  return headers + '\n' + values + '\n';
}

// Trigger a browser download from a string or Blob
export function downloadBlob(content, filename, type = 'text/csv') {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Simple UID generator matching the app's existing pattern
export function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}
