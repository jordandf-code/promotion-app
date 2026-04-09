// ImportExport.jsx — Bulk CSV import/export for all data domains

import { useState } from 'react';
import { API_BASE, authHeaders, apiGet } from '../utils/api.js';
import { uid, downloadBlob } from '../utils/csvImport.js';
import { useScorecardData } from '../hooks/useScorecardData.js';
import { useWinsData } from '../hooks/useWinsData.js';
import { usePeopleData } from '../hooks/usePeopleData.js';
import { useAdminData } from '../hooks/useAdminData.js';
import ImportModal from '../components/ImportModal.jsx';

// Direct PUT bypassing debounce (same pattern as WipeSection)
async function directPut(domain, data) {
  const res = await fetch(`${API_BASE}/api/data/${domain}`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ data }),
  });
  if (!res.ok) throw new Error(`PUT ${domain} failed`);
}

// ── Column specs ───────────────────────────────────────────────────────

const OPP_COLUMNS = [
  { key: 'name',               label: 'Name',              required: true },
  { key: 'client',             label: 'Client' },
  { key: 'year',               label: 'Year',              validate: v => v && isNaN(Number(v)) ? 'Year must be a number' : null },
  { key: 'status',             label: 'Status' },
  { key: 'signingsValue',      label: 'Signings value' },
  { key: 'totalValue',         label: 'Total value (TCV)' },
  { key: 'stage',              label: 'Stage' },
  { key: 'probability',        label: 'Probability',       validate: v => v && isNaN(Number(v)) ? 'Must be a number' : null },
  { key: 'expectedClose',      label: 'Expected close',    validate: v => v && isNaN(Date.parse(v)) ? 'Invalid date' : null },
  { key: 'dealType',           label: 'Deal type' },
  { key: 'logoType',           label: 'Logo type' },
  { key: 'relationshipOrigin', label: 'Relationship origin' },
  { key: 'strategicNote',      label: 'Strategic note' },
];

const OPP_TEMPLATE = {
  name: 'Example Opportunity', client: 'Acme Corp', year: '2026',
  status: 'open', signingsValue: '500000', totalValue: '1500000',
  stage: 'Qualified', probability: '60', expectedClose: '2026-09-30',
  dealType: 'New', logoType: 'New', relationshipOrigin: '', strategicNote: '',
};

const WIN_COLUMNS = [
  { key: 'title',              label: 'Title',             required: true },
  { key: 'date',               label: 'Date',              validate: v => v && isNaN(Date.parse(v)) ? 'Invalid date' : null },
  { key: 'description',        label: 'Description' },
  { key: 'impact',             label: 'Impact' },
  { key: 'tags',               label: 'Tags (pipe-separated)' },
  { key: 'logoType',           label: 'Logo type' },
  { key: 'relationshipOrigin', label: 'Relationship origin' },
  { key: 'strategicNote',      label: 'Strategic note' },
];

const WIN_TEMPLATE = {
  title: 'Won major contract', date: '2026-03-15',
  description: 'Closed $1.2M deal with Acme Corp', impact: 'Revenue growth for Q2',
  tags: 'Revenue|Client Win', logoType: 'Existing', relationshipOrigin: '', strategicNote: '',
};

const PEOPLE_COLUMNS = [
  { key: 'name',  label: 'Name',  required: true },
  { key: 'title', label: 'Title' },
  { key: 'org',   label: 'Organization' },
  { key: 'type',  label: 'Type' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'need',  label: 'Need / context' },
  { key: 'influenceTier', label: 'Influence tier' },
  { key: 'strategicImportance', label: 'Strategic importance' },
  { key: 'stakeholderGroup', label: 'Stakeholder group' },
];

const PEOPLE_TEMPLATE = {
  name: 'Jane Smith', title: 'VP Engineering', org: 'Acme Corp',
  type: 'Champion', email: 'jane@acme.com', phone: '', need: 'Executive sponsor for Q3 deal',
  influenceTier: 'decision-maker', strategicImportance: 'critical', stakeholderGroup: 'Client',
};

// ── Component ──────────────────────────────────────────────────────────

export default function ImportExport() {
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [importModal, setImportModal] = useState(null); // 'opportunities' | 'wins' | 'people' | null

  const { opportunities } = useScorecardData();
  const { wins }          = useWinsData();
  const { people }        = usePeopleData();
  const { relationshipTypes, winTags } = useAdminData();

  // ── Export ───────────────────────────────────────────────────────────

  async function handleExportAll() {
    setExporting(true);
    setExportError('');
    try {
      const res = await fetch(`${API_BASE}/api/export`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition') || '';
      const match = disposition.match(/filename="?([^"]+)"?/);
      const filename = match?.[1] || 'career-command-center-export.zip';
      downloadBlob(blob, filename);
    } catch {
      setExportError('Export failed — please try again.');
    }
    setExporting(false);
  }

  // ── Import confirm handlers ──────────────────────────────────────────

  async function confirmOpportunities(rows) {
    const current = await apiGet('scorecard');
    const existing = current?.opportunities || opportunities || [];
    const newOpps = rows.map(r => ({
      id: uid(),
      name: r.name,
      client: r.client || '',
      year: r.year ? Number(r.year) : new Date().getFullYear(),
      status: r.status || 'open',
      winDate: '',
      totalValue: r.totalValue ? Number(r.totalValue) : null,
      signingsValue: r.signingsValue ? Number(r.signingsValue) : null,
      stage: r.stage || '',
      probability: r.probability ? Number(r.probability) : null,
      expectedClose: r.expectedClose || '',
      dealType: r.dealType || '',
      logoType: r.logoType || '',
      relationshipOrigin: r.relationshipOrigin || '',
      strategicNote: r.strategicNote || '',
    }));

    await directPut('scorecard', {
      ...current,
      opportunities: [...existing, ...newOpps],
    });
    setTimeout(() => window.location.reload(), 1500);
  }

  async function confirmWins(rows) {
    const current = await apiGet('wins') || wins || [];
    const newWins = rows.map(r => ({
      id: uid(),
      title: r.title,
      date: r.date || '',
      description: r.description || '',
      impact: r.impact || '',
      tags: r.tags ? r.tags.split('|').map(t => t.trim()).filter(Boolean) : [],
      sourceType: 'manual',
      sourceId: null,
      sourceName: null,
      logoType: r.logoType || '',
      relationshipOrigin: r.relationshipOrigin || '',
      strategicNote: r.strategicNote || '',
    }));

    await directPut('wins', [...current, ...newWins]);
    setTimeout(() => window.location.reload(), 1500);
  }

  async function confirmPeople(rows) {
    const current = await apiGet('people') || people || [];
    const typeLabels = (relationshipTypes || []).map(t => t.label || t);
    const defaultType = typeLabels[0] || 'Contact';

    const newPeople = rows.map(r => {
      // Case-insensitive match for type
      const matchedType = typeLabels.find(t => t.toLowerCase() === (r.type || '').toLowerCase()) || defaultType;
      return {
        id: uid(),
        name: r.name,
        title: r.title || '',
        org: r.org || '',
        type: matchedType,
        relationshipStatus: 'in-progress',
        email: r.email || '',
        phone: r.phone || '',
        need: r.need || '',
        influenceTier: r.influenceTier || '',
        strategicImportance: r.strategicImportance || '',
        stakeholderGroup: r.stakeholderGroup || '',
        touchpoints: [],
        plannedTouchpoints: [],
      };
    });

    await directPut('people', [...current, ...newPeople]);
    setTimeout(() => window.location.reload(), 1500);
  }

  // ── Duplicate detection for people ──────────────────────────────────

  function detectPeopleDuplicate(row) {
    const name = (row.name || '').toLowerCase().trim();
    if (!name) return null;
    const existing = (people || []).find(p => (p.name || '').toLowerCase().trim() === name);
    return existing ? `Likely duplicate of "${existing.name}"` : null;
  }

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Import / Export</h1>
      </div>

      {/* ── Export ───────────────────────────────────────────────── */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Export</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem' }}>
          Download all your data as a ZIP file containing one CSV per domain.
          Currency values are exported in CAD.
        </p>
        <button
          className="btn-primary"
          onClick={handleExportAll}
          disabled={exporting}
        >
          {exporting ? 'Exporting…' : 'Export all data (.zip)'}
        </button>
        {exportError && (
          <p style={{ color: 'var(--color-danger)', marginTop: '0.5rem', fontSize: '0.85rem' }}>{exportError}</p>
        )}
      </div>

      {/* ── Import ──────────────────────────────────────────────── */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Import</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem' }}>
          Upload CSV files to add data in bulk. Imported rows are appended to your
          existing data — nothing is overwritten.
        </p>

        <div className="import-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
          {/* Opportunities */}
          <div className="card" style={{ padding: '1.25rem', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Opportunities</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Pipeline opportunities with value, stage, and deal details.
            </p>
            <button className="btn-secondary" onClick={() => setImportModal('opportunities')}>
              Import CSV
            </button>
          </div>

          {/* Wins */}
          <div className="card" style={{ padding: '1.25rem', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Wins</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Accomplishments with impact and tags. Tags are pipe-separated.
            </p>
            <button className="btn-secondary" onClick={() => setImportModal('wins')}>
              Import CSV
            </button>
          </div>

          {/* People */}
          <div className="card" style={{ padding: '1.25rem', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>People</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Contacts and relationships. Touchpoints cannot be imported via CSV.
            </p>
            <button className="btn-secondary" onClick={() => setImportModal('people')}>
              Import CSV
            </button>
          </div>
        </div>
      </div>

      {/* ── Import Modals ───────────────────────────────────────── */}
      {importModal === 'opportunities' && (
        <ImportModal
          title="Opportunities"
          columnSpec={OPP_COLUMNS}
          templateExample={OPP_TEMPLATE}
          onConfirm={confirmOpportunities}
          onClose={() => setImportModal(null)}
        />
      )}

      {importModal === 'wins' && (
        <ImportModal
          title="Wins"
          columnSpec={WIN_COLUMNS}
          templateExample={WIN_TEMPLATE}
          onConfirm={confirmWins}
          onClose={() => setImportModal(null)}
        />
      )}

      {importModal === 'people' && (
        <ImportModal
          title="People"
          columnSpec={PEOPLE_COLUMNS}
          templateExample={PEOPLE_TEMPLATE}
          onConfirm={confirmPeople}
          onClose={() => setImportModal(null)}
          detectDuplicate={detectPeopleDuplicate}
        />
      )}
    </div>
  );
}
