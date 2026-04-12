// ImportExport.jsx — Bulk CSV import/export for all data domains

import { useState } from 'react';
import { API_BASE, authHeaders, apiGet } from '../utils/api.js';
import { uid, downloadBlob, generateTemplate } from '../utils/csvImport.js';
import { useScorecardData } from '../hooks/useScorecardData.js';
import { useWinsData } from '../hooks/useWinsData.js';
import { usePeopleData } from '../hooks/usePeopleData.js';
import { useAdminData } from '../hooks/useAdminData.js';
import { useGoalsData } from '../hooks/useGoalsData.js';
import { useActionsData } from '../hooks/useActionsData.js';
import { useLearningData } from '../hooks/useLearningData.js';
import { useEminenceData } from '../hooks/useEminenceData.js';
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

const GOAL_COLUMNS = [
  { key: 'title',      label: 'Title',          required: true },
  { key: 'notes',      label: 'Notes' },
  { key: 'targetDate', label: 'Target date',    validate: v => v && isNaN(Date.parse(v)) ? 'Invalid date' : null },
  { key: 'isGate',     label: 'Gate goal',      type: 'boolean' },
  { key: 'status',     label: 'Status',         enum: ['not_started', 'in_progress', 'done'] },
];

const GOAL_TEMPLATE = {
  title: 'Hit Q3 revenue target', notes: 'Focus on public sector signings',
  targetDate: '2026-09-30', isGate: 'no', status: 'in_progress',
};

const ACTION_COLUMNS = [
  { key: 'title',         label: 'Title',            required: true },
  { key: 'dueDate',       label: 'Due date',         validate: v => v && isNaN(Date.parse(v)) ? 'Invalid date' : null },
  { key: 'done',          label: 'Done',             type: 'boolean' },
  { key: 'linkedGoalIds', label: 'Linked goal IDs (pipe-separated)' },
];

const ACTION_TEMPLATE = {
  title: 'Follow up with client on proposal', dueDate: '2026-05-01',
  done: 'no', linkedGoalIds: '',
};

const LEARNING_CERT_COLUMNS = [
  { key: 'name',         label: 'Name',            required: true },
  { key: 'issuer',       label: 'Issuer' },
  { key: 'status',       label: 'Status',          enum: ['planned', 'in_progress', 'earned', 'expired'] },
  { key: 'dateEarned',   label: 'Date earned',     validate: v => v && isNaN(Date.parse(v)) ? 'Invalid date' : null },
  { key: 'expiryDate',   label: 'Expiry date',     validate: v => v && isNaN(Date.parse(v)) ? 'Invalid date' : null },
  { key: 'credentialId', label: 'Credential ID' },
  { key: 'notes',        label: 'Notes' },
];

const LEARNING_CERT_TEMPLATE = {
  name: 'AWS Solutions Architect', issuer: 'Amazon Web Services', status: 'earned',
  dateEarned: '2026-01-15', expiryDate: '2029-01-15', credentialId: 'AWS-12345', notes: '',
};

const LEARNING_COURSE_COLUMNS = [
  { key: 'title',         label: 'Title',           required: true },
  { key: 'provider',      label: 'Provider' },
  { key: 'status',        label: 'Status',          enum: ['planned', 'in_progress', 'completed'] },
  { key: 'dateCompleted', label: 'Date completed',  validate: v => v && isNaN(Date.parse(v)) ? 'Invalid date' : null },
  { key: 'hours',         label: 'Hours',           validate: v => v && isNaN(Number(v)) ? 'Must be a number' : null },
  { key: 'notes',         label: 'Notes' },
];

const LEARNING_COURSE_TEMPLATE = {
  title: 'Leadership Academy', provider: 'IBM', status: 'completed',
  dateCompleted: '2026-02-01', hours: '40', notes: 'Required for promotion',
};

const EMINENCE_COLUMNS = [
  { key: 'title',       label: 'Title',       required: true },
  { key: 'type',        label: 'Type' },
  { key: 'date',        label: 'Date',        validate: v => v && isNaN(Date.parse(v)) ? 'Invalid date' : null },
  { key: 'venue',       label: 'Venue' },
  { key: 'audience',    label: 'Audience' },
  { key: 'reach',       label: 'Reach' },
  { key: 'url',         label: 'URL' },
  { key: 'description', label: 'Description' },
  { key: 'tags',        label: 'Tags (pipe-separated)' },
];

const EMINENCE_TEMPLATE = {
  title: 'Keynote at Industry Conference', type: 'speaking', date: '2026-06-15',
  venue: 'Tech Summit Ottawa', audience: 'IT executives', reach: '200',
  url: '', description: 'Presented on cloud modernization strategies', tags: 'Cloud|Public Sector',
};

// ── Component ──────────────────────────────────────────────────────────

export default function ImportExport() {
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [importModal, setImportModal] = useState(null);

  const { opportunities } = useScorecardData();
  const { wins }          = useWinsData();
  const { people }        = usePeopleData();
  const { relationshipTypes, winTags } = useAdminData();
  const { goals }         = useGoalsData();
  const { actions }       = useActionsData();
  const { certifications, courses } = useLearningData();
  const { activities: eminenceActivities } = useEminenceData();

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

  async function confirmGoals(rows) {
    const current = await apiGet('goals') || goals || [];
    const newGoals = rows.map(r => ({
      id: uid(),
      title: r.title,
      notes: r.notes || '',
      targetDate: r.targetDate || '',
      isGate: r.isGate === true,
      status: r.status || 'not_started',
    }));

    await directPut('goals', [...current, ...newGoals]);
    setTimeout(() => window.location.reload(), 1500);
  }

  async function confirmActions(rows) {
    const current = await apiGet('actions') || actions || [];
    const newActions = rows.map(r => ({
      id: uid(),
      title: r.title,
      dueDate: r.dueDate || '',
      done: r.done === true,
      linkedGoalIds: r.linkedGoalIds
        ? r.linkedGoalIds.split('|').map(s => s.trim()).filter(Boolean)
        : [],
    }));

    await directPut('actions', [...current, ...newActions]);
    setTimeout(() => window.location.reload(), 1500);
  }

  async function confirmLearningCerts(rows) {
    const current = await apiGet('learning') || { certifications: [], courses: [] };
    const existingCerts = current.certifications || [];
    const newCerts = rows.map(r => ({
      id: uid(),
      name: r.name,
      issuer: r.issuer || '',
      status: r.status || 'planned',
      dateEarned: r.dateEarned || '',
      expiryDate: r.expiryDate || '',
      credentialId: r.credentialId || '',
      notes: r.notes || '',
    }));

    await directPut('learning', {
      ...current,
      certifications: [...existingCerts, ...newCerts],
    });
    setTimeout(() => window.location.reload(), 1500);
  }

  async function confirmLearningCourses(rows) {
    const current = await apiGet('learning') || { certifications: [], courses: [] };
    const existingCourses = current.courses || [];
    const newCourses = rows.map(r => ({
      id: uid(),
      title: r.title,
      provider: r.provider || '',
      status: r.status || 'planned',
      dateCompleted: r.dateCompleted || '',
      hours: r.hours ? Number(r.hours) : null,
      notes: r.notes || '',
    }));

    await directPut('learning', {
      ...current,
      courses: [...existingCourses, ...newCourses],
    });
    setTimeout(() => window.location.reload(), 1500);
  }

  async function confirmEminence(rows) {
    const current = await apiGet('eminence') || { activities: [] };
    const existingActivities = current.activities || [];
    const newActivities = rows.map(r => ({
      id: uid(),
      title: r.title,
      type: r.type || '',
      date: r.date || '',
      venue: r.venue || '',
      audience: r.audience || '',
      reach: r.reach || '',
      url: r.url || '',
      description: r.description || '',
      tags: r.tags ? r.tags.split('|').map(t => t.trim()).filter(Boolean) : [],
      year: r.date ? new Date(r.date).getFullYear() : null,
    }));

    await directPut('eminence', {
      ...current,
      activities: [...existingActivities, ...newActivities],
    });
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
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              Pipeline opportunities with value, stage, and deal details.
              {(opportunities || []).length > 0 && <><br />{(opportunities || []).length} existing</>}
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button className="btn-secondary" onClick={() => setImportModal('opportunities')}>
                Import CSV
              </button>
              <button className="btn-ghost" onClick={() => {
                const csv = generateTemplate(OPP_COLUMNS, OPP_TEMPLATE);
                downloadBlob(csv, 'opportunities-template.csv');
              }}>
                Template
              </button>
            </div>
          </div>

          {/* Wins */}
          <div className="card" style={{ padding: '1.25rem', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Wins</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              Accomplishments with impact and tags. Tags are pipe-separated.
              {(wins || []).length > 0 && <><br />{(wins || []).length} existing</>}
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button className="btn-secondary" onClick={() => setImportModal('wins')}>
                Import CSV
              </button>
              <button className="btn-ghost" onClick={() => {
                const csv = generateTemplate(WIN_COLUMNS, WIN_TEMPLATE);
                downloadBlob(csv, 'wins-template.csv');
              }}>
                Template
              </button>
            </div>
          </div>

          {/* People */}
          <div className="card" style={{ padding: '1.25rem', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>People</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              Contacts and relationships. Touchpoints cannot be imported via CSV.
              {(people || []).length > 0 && <><br />{(people || []).length} existing</>}
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button className="btn-secondary" onClick={() => setImportModal('people')}>
                Import CSV
              </button>
              <button className="btn-ghost" onClick={() => {
                const csv = generateTemplate(PEOPLE_COLUMNS, PEOPLE_TEMPLATE);
                downloadBlob(csv, 'people-template.csv');
              }}>
                Template
              </button>
            </div>
          </div>

          {/* Goals */}
          <div className="card" style={{ padding: '1.25rem', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Goals</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              Career goals with status and target dates.
              {(goals || []).length > 0 && <><br />{(goals || []).length} existing</>}
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button className="btn-secondary" onClick={() => setImportModal('goals')}>
                Import CSV
              </button>
              <button className="btn-ghost" onClick={() => {
                const csv = generateTemplate(GOAL_COLUMNS, GOAL_TEMPLATE);
                downloadBlob(csv, 'goals-template.csv');
              }}>
                Template
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="card" style={{ padding: '1.25rem', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Actions</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              Action items linked to goals. Goal IDs are pipe-separated.
              {(actions || []).length > 0 && <><br />{(actions || []).length} existing</>}
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button className="btn-secondary" onClick={() => setImportModal('actions')}>
                Import CSV
              </button>
              <button className="btn-ghost" onClick={() => {
                const csv = generateTemplate(ACTION_COLUMNS, ACTION_TEMPLATE);
                downloadBlob(csv, 'actions-template.csv');
              }}>
                Template
              </button>
            </div>
          </div>

          {/* Learning — Certifications */}
          <div className="card" style={{ padding: '1.25rem', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Certifications</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              Professional certifications with expiry tracking.
              {(certifications || []).length > 0 && <><br />{(certifications || []).length} existing</>}
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button className="btn-secondary" onClick={() => setImportModal('learning_certs')}>
                Import CSV
              </button>
              <button className="btn-ghost" onClick={() => {
                const csv = generateTemplate(LEARNING_CERT_COLUMNS, LEARNING_CERT_TEMPLATE);
                downloadBlob(csv, 'certifications-template.csv');
              }}>
                Template
              </button>
            </div>
          </div>

          {/* Learning — Courses */}
          <div className="card" style={{ padding: '1.25rem', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Courses</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              Training courses with completion tracking.
              {(courses || []).length > 0 && <><br />{(courses || []).length} existing</>}
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button className="btn-secondary" onClick={() => setImportModal('learning_courses')}>
                Import CSV
              </button>
              <button className="btn-ghost" onClick={() => {
                const csv = generateTemplate(LEARNING_COURSE_COLUMNS, LEARNING_COURSE_TEMPLATE);
                downloadBlob(csv, 'courses-template.csv');
              }}>
                Template
              </button>
            </div>
          </div>

          {/* Eminence */}
          <div className="card" style={{ padding: '1.25rem', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Eminence</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              Speaking, publications, awards, and thought leadership. Tags are pipe-separated.
              {(eminenceActivities || []).length > 0 && <><br />{(eminenceActivities || []).length} existing</>}
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button className="btn-secondary" onClick={() => setImportModal('eminence')}>
                Import CSV
              </button>
              <button className="btn-ghost" onClick={() => {
                const csv = generateTemplate(EMINENCE_COLUMNS, EMINENCE_TEMPLATE);
                downloadBlob(csv, 'eminence-template.csv');
              }}>
                Template
              </button>
            </div>
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

      {importModal === 'goals' && (
        <ImportModal
          title="Goals"
          columnSpec={GOAL_COLUMNS}
          templateExample={GOAL_TEMPLATE}
          onConfirm={confirmGoals}
          onClose={() => setImportModal(null)}
        />
      )}

      {importModal === 'actions' && (
        <ImportModal
          title="Actions"
          columnSpec={ACTION_COLUMNS}
          templateExample={ACTION_TEMPLATE}
          onConfirm={confirmActions}
          onClose={() => setImportModal(null)}
        />
      )}

      {importModal === 'learning_certs' && (
        <ImportModal
          title="Certifications"
          columnSpec={LEARNING_CERT_COLUMNS}
          templateExample={LEARNING_CERT_TEMPLATE}
          onConfirm={confirmLearningCerts}
          onClose={() => setImportModal(null)}
        />
      )}

      {importModal === 'learning_courses' && (
        <ImportModal
          title="Courses"
          columnSpec={LEARNING_COURSE_COLUMNS}
          templateExample={LEARNING_COURSE_TEMPLATE}
          onConfirm={confirmLearningCourses}
          onClose={() => setImportModal(null)}
        />
      )}

      {importModal === 'eminence' && (
        <ImportModal
          title="Eminence"
          columnSpec={EMINENCE_COLUMNS}
          templateExample={EMINENCE_TEMPLATE}
          onConfirm={confirmEminence}
          onClose={() => setImportModal(null)}
        />
      )}
    </div>
  );
}
