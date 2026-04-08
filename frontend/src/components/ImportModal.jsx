// components/ImportModal.jsx
// Shared CSV import modal: upload → parse → preview → confirm → summary.
// Used by ImportExport page for opportunities, wins, and people imports.

import { useState, useRef } from 'react';
import { parseCSV, validateRows, generateTemplate, downloadBlob } from '../utils/csvImport.js';

export default function ImportModal({
  title,
  columnSpec,
  templateExample,
  onConfirm,
  onClose,
  enrichRow,        // optional: (row) => row — add computed fields before save
  detectDuplicate,  // optional: (row) => string|null — returns warning text if duplicate
}) {
  const [step, setStep]           = useState('upload');
  const [rows, setRows]           = useState([]);
  const [selected, setSelected]   = useState(new Set());
  const [parseError, setParseError] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult]       = useState(null);
  const fileRef = useRef();

  // ── Upload step ──────────────────────────────────────────────────────

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError('');

    try {
      const { data, errors } = await parseCSV(file);
      if (errors.length && !data.length) {
        setParseError('Could not parse CSV — check the file format.');
        return;
      }
      if (!data.length) {
        setParseError('CSV is empty — no rows found.');
        return;
      }

      // Normalize header keys: case-insensitive match to columnSpec keys
      const keyMap = {};
      const specKeys = columnSpec.map(c => c.key);
      if (data.length) {
        for (const rawKey of Object.keys(data[0])) {
          const lower = rawKey.toLowerCase().replace(/[\s_-]/g, '');
          const match = specKeys.find(k => k.toLowerCase().replace(/[\s_-]/g, '') === lower);
          if (match) keyMap[rawKey] = match;
        }
      }

      // Remap columns
      const remapped = data.map(row => {
        const out = {};
        for (const [raw, mapped] of Object.entries(keyMap)) {
          out[mapped] = (row[raw] ?? '').toString().trim();
        }
        // Fill missing columns with empty string
        for (const k of specKeys) {
          if (!(k in out)) out[k] = '';
        }
        return out;
      });

      const validated = validateRows(remapped, columnSpec);

      // Detect duplicates
      if (detectDuplicate) {
        for (const row of validated) {
          const warning = detectDuplicate(row);
          if (warning) {
            row._duplicate = warning;
          }
        }
      }

      setRows(validated);

      // Pre-select: valid + non-duplicate rows
      const sel = new Set();
      validated.forEach((r, i) => {
        if (r._valid && !r._duplicate) sel.add(i);
      });
      setSelected(sel);
      setStep('preview');
    } catch {
      setParseError('Failed to read the file.');
    }
  }

  function handleDownloadTemplate() {
    const csv = generateTemplate(columnSpec, templateExample);
    downloadBlob(csv, `${title.toLowerCase().replace(/\s+/g, '-')}-template.csv`);
  }

  // ── Preview step ─────────────────────────────────────────────────────

  function toggleRow(i) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === rows.filter(r => r._valid).length) {
      setSelected(new Set());
    } else {
      const sel = new Set();
      rows.forEach((r, i) => { if (r._valid) sel.add(i); });
      setSelected(sel);
    }
  }

  async function handleConfirm() {
    setImporting(true);
    try {
      const toImport = rows
        .filter((_, i) => selected.has(i))
        .map(row => {
          // Strip internal fields
          const { _rowIndex, _errors, _valid, _duplicate, ...clean } = row;
          return enrichRow ? enrichRow(clean) : clean;
        });

      const skipped = rows.length - toImport.length;
      await onConfirm(toImport);
      setResult({ imported: toImport.length, skipped });
      setStep('result');
    } catch {
      setResult({ imported: 0, skipped: rows.length, error: 'Import failed — please try again.' });
      setStep('result');
    }
    setImporting(false);
  }

  // ── Render ───────────────────────────────────────────────────────────

  const displayCols = columnSpec.slice(0, 5); // Show first 5 columns in preview table

  return (
    <div className="modal-backdrop modal-backdrop--centered">
      <div className="modal modal--wide" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px' }}>
        <div className="modal-header">
          <h3 className="modal-title">Import {title}</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        {step === 'upload' && (
          <div className="modal-form" style={{ padding: '1.5rem' }}>
            <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
              Upload a CSV file with your {title.toLowerCase()} data. Column headers should match
              the expected format.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              <button
                className="btn-primary"
                onClick={() => fileRef.current?.click()}
              >
                Choose CSV file
              </button>
              <button
                className="btn-secondary"
                onClick={handleDownloadTemplate}
              >
                Download template
              </button>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFile}
              style={{ display: 'none' }}
            />

            {parseError && (
              <p style={{ color: 'var(--color-danger)', marginTop: '0.5rem' }}>{parseError}</p>
            )}

            <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <strong>Expected columns:</strong>{' '}
              {columnSpec.map(c => c.key).join(', ')}
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="modal-form" style={{ padding: '1.5rem' }}>
            <p style={{ marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
              {rows.length} row{rows.length !== 1 ? 's' : ''} found.{' '}
              {selected.size} selected for import.
            </p>

            <div style={{ overflowX: 'auto', maxHeight: '400px', overflowY: 'auto', marginBottom: '1rem' }}>
              <table className="data-table" style={{ fontSize: '0.85rem', minWidth: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>
                      <input type="checkbox" checked={selected.size === rows.filter(r => r._valid).length} onChange={toggleAll} />
                    </th>
                    {displayCols.map(c => (
                      <th key={c.key}>{c.label}</th>
                    ))}
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => {
                    const hasErrors = !row._valid;
                    const isDup = !!row._duplicate;
                    return (
                      <tr
                        key={i}
                        style={{
                          background: hasErrors ? 'var(--color-danger-bg, #fff0f0)' : isDup ? 'var(--color-warning-bg, #fff8e6)' : undefined,
                          opacity: selected.has(i) ? 1 : 0.5,
                        }}
                      >
                        <td>
                          <input
                            type="checkbox"
                            checked={selected.has(i)}
                            onChange={() => toggleRow(i)}
                            disabled={hasErrors}
                          />
                        </td>
                        {displayCols.map(c => (
                          <td key={c.key} style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {row[c.key] || '—'}
                          </td>
                        ))}
                        <td style={{ fontSize: '0.8rem' }}>
                          {hasErrors && (
                            <span style={{ color: 'var(--color-danger)' }}>{row._errors.join('; ')}</span>
                          )}
                          {isDup && !hasErrors && (
                            <span style={{ color: 'var(--color-warning, #b86e00)' }}>{row._duplicate}</span>
                          )}
                          {!hasErrors && !isDup && (
                            <span style={{ color: 'var(--color-success, #1a7f37)' }}>Ready</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => { setStep('upload'); setRows([]); }}>
                Back
              </button>
              <button
                className="btn-primary"
                onClick={handleConfirm}
                disabled={selected.size === 0 || importing}
              >
                {importing ? 'Importing…' : `Import ${selected.size} row${selected.size !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        )}

        {step === 'result' && (
          <div className="modal-form" style={{ padding: '1.5rem', textAlign: 'center' }}>
            {result?.error ? (
              <p style={{ color: 'var(--color-danger)', marginBottom: '1rem' }}>{result.error}</p>
            ) : (
              <>
                <p style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  {result?.imported} {title.toLowerCase()} imported
                </p>
                {result?.skipped > 0 && (
                  <p style={{ color: 'var(--text-muted)' }}>
                    {result.skipped} skipped (validation errors or deselected)
                  </p>
                )}
              </>
            )}

            <div className="modal-actions" style={{ marginTop: '1.5rem', justifyContent: 'center' }}>
              <button className="btn-primary" onClick={onClose}>Done</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
