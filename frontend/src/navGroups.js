// navGroups.js — shared nav group definitions used by Layout, Admin, and CommandPalette.
// When adding a new page/tab, add it to the 'testing' group (superuser-only).
// Once validated, move it to the appropriate group.

const NAV_GROUPS = [
  {
    id: 'home',
    label: null,
    items: [
      { to: '/', label: 'Dashboard', end: true },
    ],
  },
  {
    id: 'track',
    label: 'Track',
    items: [
      { to: '/scorecard', label: 'Scorecard' },
      { to: '/opportunities', label: 'Opportunities' },
      { to: '/goals', label: 'Goals' },
      { to: '/actions', label: 'Action items' },
      { to: '/calendar', label: 'Calendar' },
    ],
  },
  {
    id: 'relationships',
    label: 'Relationships',
    items: [
      { to: '/people', label: 'People' },
    ],
  },
  {
    id: 'evidence',
    label: 'Evidence',
    items: [
      { to: '/wins', label: 'Wins' },
      { to: '/competencies', label: 'Competencies' },
      { to: '/eminence', label: 'Eminence' },
      { to: '/learning', label: 'Learning' },
      { to: '/reflections', label: 'Reflections' },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    items: [
      { to: '/admin', label: 'Admin' },
      { to: '/import-export', label: 'Import / Export' },
    ],
  },
  {
    id: 'testing',
    label: 'Testing',
    superuserOnly: true,
    items: [
      { to: '/story', label: 'Narrative + Gaps' },
      { to: '/promotion-package', label: 'Package Generator' },
      { to: '/mock-panel', label: 'Mock Panel' },
      { to: '/vault', label: 'Documents' },
      { to: '/influence-map', label: 'Influence Map' },
      { to: '/sponsees', label: 'Sponsees' },
      { to: '/sharing', label: 'Sharing' },
      { to: '/view-others', label: 'View others' },
      { to: '/benchmark', label: 'Benchmarking' },
      { to: '/brand', label: 'Brand' },
    ],
  },
];

export default NAV_GROUPS;

// Flat list of all items (all groups, including testing)
export const ALL_NAV_ITEMS = NAV_GROUPS.flatMap(g => g.items);

// Default group order
export const DEFAULT_GROUP_ORDER = NAV_GROUPS.map(g => g.id);
