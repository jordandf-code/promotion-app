// DocumentVault.jsx — File uploads linked to wins and eminence activities

import { useState, useRef } from 'react';
import { useVaultData } from '../hooks/useVaultData.js';
import {
  MAX_FILE_SIZE,
  ACCEPTED_TYPES,
  formatFileSize,
  getMimeLabel,
  getMimeBadgeColor,
  readFileForVault,
  downloadDocument,
} from '../utils/vaultFiles.js';

const LINKED_TYPE_LABELS = {
  win: 'Win',
  eminence: 'Eminence',
  general: 'General',
};

const LINKED_TYPE_COLORS = {
  win: '#16a34a',
  eminence: '#7c3aed',
  general: '#6b7280',
};

export default function DocumentVault() {
  const { data, initialized, addDocument, removeDocument } = useVaultData();

  const fileInputRef = useRef(null);

  const [filterType, setFilterType] = useState('all');
  const [filterTag, setFilterTag]   = useState('');

  const [pendingFile, setPendingFile]   = useState(null); // { name, mimeType, size, data }
  const [uploadError, setUploadError]   = useState('');
  const [showUploadForm, setShowUploadForm] = useState(false);

  const [formDescription, setFormDescription] = useState('');
  const [formLinkedType, setFormLinkedType]    = useState('general');
  const [formLinkedId, setFormLinkedId]        = useState('');
  const [formTags, setFormTags]                = useState('');

  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const documents = data.documents ?? [];

  // Collect all tags for filter dropdown
  const allTags = [...new Set(documents.flatMap(d => d.tags ?? []))].sort();

  const filtered = documents.filter(doc => {
    if (filterType !== 'all' && doc.linkedType !== filterType) return false;
    if (filterTag && !(doc.tags ?? []).includes(filterTag)) return false;
    return true;
  });

  function handleUploadClick() {
    setUploadError('');
    fileInputRef.current?.click();
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploadError('');
    readFileForVault(file)
      .then(payload => {
        setPendingFile(payload);
        setFormDescription('');
        setFormLinkedType('general');
        setFormLinkedId('');
        setFormTags('');
        setShowUploadForm(true);
      })
      .catch(err => setUploadError(err.message));
  }

  function handleUploadSave() {
    if (!pendingFile) return;
    const tags = formTags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);
    addDocument({
      filename:    pendingFile.filename,
      mimeType:    pendingFile.mimeType,
      size:        pendingFile.size,
      data:        pendingFile.data,
      description: formDescription.trim(),
      linkedType:  formLinkedType,
      linkedId:    formLinkedId.trim() || null,
      tags,
    });
    setPendingFile(null);
    setShowUploadForm(false);
  }

  function handleUploadCancel() {
    setPendingFile(null);
    setShowUploadForm(false);
    setUploadError('');
  }

  function handleDownload(doc) {
    downloadDocument(doc);
  }

  function handleDeleteRequest(id) {
    setDeleteConfirmId(id);
  }

  function handleDeleteConfirm() {
    if (deleteConfirmId) {
      removeDocument(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  }

  function handleDeleteCancel() {
    setDeleteConfirmId(null);
  }

  if (!initialized) {
    return (
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">Documents</h1>
        </div>
        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading…
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Documents</h1>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            {documents.length} {documents.length === 1 ? 'document' : 'documents'}
          </div>
        </div>
        <button className="btn btn-primary" onClick={handleUploadClick}>
          Upload
        </button>
      </div>

      {/* Upload error */}
      {uploadError && (
        <div className="card" style={{ padding: '0.75rem 1rem', marginBottom: '1rem', background: 'var(--error-bg, #fef2f2)', color: 'var(--error, #dc2626)', borderColor: 'var(--error, #dc2626)' }}>
          {uploadError}
        </div>
      )}

      {/* Upload form modal */}
      {showUploadForm && pendingFile && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '480px', width: '100%' }}>
            <div className="modal-header">
              <h2 className="modal-title">Upload Document</h2>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '0.75rem', padding: '0.5rem 0.75rem', background: 'var(--bg-subtle, #f9fafb)', borderRadius: '6px', fontSize: '0.875rem' }}>
                <strong>{pendingFile.filename}</strong>
                <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                  {formatFileSize(pendingFile.size)}
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  placeholder="Optional note about this document"
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Type <span className="form-required">*</span>
                </label>
                <select
                  className="form-control"
                  value={formLinkedType}
                  onChange={e => setFormLinkedType(e.target.value)}
                >
                  <option value="general">General</option>
                  <option value="win">Win</option>
                  <option value="eminence">Eminence</option>
                </select>
              </div>

              {formLinkedType !== 'general' && (
                <div className="form-group">
                  <label className="form-label">Linked ID</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formLinkedId}
                    onChange={e => setFormLinkedId(e.target.value)}
                    placeholder={`ID of the linked ${formLinkedType} entry`}
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Tags</label>
                <input
                  type="text"
                  className="form-control"
                  value={formTags}
                  onChange={e => setFormTags(e.target.value)}
                  placeholder="Comma-separated, e.g. contract, proposal, award"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={handleUploadCancel}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleUploadSave}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteConfirmId && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '380px', width: '100%' }}>
            <div className="modal-header">
              <h2 className="modal-title">Delete Document</h2>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete this document? This cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={handleDeleteCancel}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleDeleteConfirm}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <select
          className="form-control"
          style={{ width: 'auto', minWidth: '130px' }}
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
        >
          <option value="all">All types</option>
          <option value="win">Wins</option>
          <option value="eminence">Eminence</option>
          <option value="general">General</option>
        </select>

        {allTags.length > 0 ? (
          <select
            className="form-control"
            style={{ width: 'auto', minWidth: '130px' }}
            value={filterTag}
            onChange={e => setFilterTag(e.target.value)}
          >
            <option value="">All tags</option>
            {allTags.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            className="form-control"
            style={{ width: 'auto', minWidth: '130px' }}
            placeholder="Filter by tag"
            value={filterTag}
            onChange={e => setFilterTag(e.target.value)}
          />
        )}
      </div>

      {/* Document list */}
      {filtered.length === 0 ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          {documents.length === 0
            ? 'No documents uploaded yet. Click Upload to add your first file.'
            : 'No documents match the current filters.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filtered.map(doc => (
            <div key={doc.id} className="card" style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                {/* File type badge */}
                <div style={{
                  flexShrink: 0,
                  background: getMimeBadgeColor(doc.mimeType),
                  color: '#fff',
                  borderRadius: '4px',
                  padding: '0.25rem 0.4rem',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  alignSelf: 'flex-start',
                  marginTop: '2px',
                }}>
                  {getMimeLabel(doc.mimeType)}
                </div>

                {/* Main content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline', flexWrap: 'wrap' }}>
                    <strong style={{ wordBreak: 'break-word' }}>{doc.filename}</strong>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', flexShrink: 0 }}>
                      {formatFileSize(doc.size)}
                    </span>
                  </div>

                  {doc.description && (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.2rem' }}>
                      {doc.description}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    {/* Upload date */}
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {new Date(doc.uploadedAt).toLocaleDateString()}
                    </span>

                    {/* Linked type badge */}
                    <span style={{
                      background: LINKED_TYPE_COLORS[doc.linkedType] ?? '#6b7280',
                      color: '#fff',
                      borderRadius: '12px',
                      padding: '0.1rem 0.5rem',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                    }}>
                      {LINKED_TYPE_LABELS[doc.linkedType] ?? doc.linkedType}
                      {doc.linkedId ? ` · ${doc.linkedId}` : ''}
                    </span>

                    {/* Tags */}
                    {(doc.tags ?? []).map(tag => (
                      <span key={tag} style={{
                        background: 'var(--bg-subtle, #f3f4f6)',
                        color: 'var(--text-muted)',
                        borderRadius: '12px',
                        padding: '0.1rem 0.5rem',
                        fontSize: '0.75rem',
                      }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, alignSelf: 'flex-start' }}>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '0.3rem 0.7rem', fontSize: '0.8rem' }}
                    onClick={() => handleDownload(doc)}
                  >
                    Download
                  </button>
                  <button
                    className="btn btn-danger"
                    style={{ padding: '0.3rem 0.7rem', fontSize: '0.8rem' }}
                    onClick={() => handleDeleteRequest(doc.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
