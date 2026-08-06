import type { Attachment, MindNode } from '../types';
import { persona } from './persona';

/**
 * Starting content for a map that has never been used.
 *
 * The two demo personas get **different** sets on purpose. Two maps showing the
 * same entries would undercut the whole point of the demo — the director needs
 * to see at a glance that these are two people's separate working pictures, not
 * one map rendered twice.
 *
 * Demo entries carry **stable ids** (`seed-…`) rather than generated ones, so
 * the seeded pictures below can point at them. Nothing else in the app relies
 * on ids being random.
 */

export type SeedSpec = Omit<MindNode, 'createdAt' | 'updatedAt' | 'x' | 'y' | 'parentId'> & {
  children?: Omit<MindNode, 'createdAt' | 'updatedAt' | 'x' | 'y' | 'parentId'>[];
};

/** A picture shipped in `public/demo/`, attached to a seeded entry. */
interface SeedAttachment {
  id: string;
  nodeId: string;
  name: string;
  assetUrl: string;
  mimeType: string;
  size: number;
}

/** What lands on the assistant's map: things people have raised with her. */
const ASSISTANT_SEEDS: SeedSpec[] = [
  {
    id: 'seed-jizan',
    title: 'Jizan',
    detail: 'Jizan clinic is running three uncovered consultant sessions a week, and waits have gone past the six-week target. Escalated by the clinic manager this morning.',
    kind: 'urgent',
    owner: 'Jizan clinic',
    status: 'open',
    children: [
      { id: 'seed-jizan-child', title: 'Confirm locum cover', detail: 'Directorate said to come back with the shortfall in writing.', kind: 'task', owner: 'Me', status: 'open' },
    ],
  },
  {
    id: 'seed-raghad',
    title: 'Intake triage proposal from Raghad',
    detail: 'Raghad has drafted a triage screen to replace the single referral queue. Referrals are up 93% since March, so this needs a decision rather than a read.',
    kind: 'idea',
    owner: 'Raghad',
    status: 'open',
  },
  {
    id: 'seed-morale',
    title: 'Team morale after restructuring',
    detail: 'Several people seem unsettled. Staffing is now the largest single incident category this quarter — worth a one-on-one round before the all-hands.',
    kind: 'concern',
    owner: 'Team',
    status: 'open',
    children: [
      { id: 'seed-morale-child', title: 'One-on-one round', detail: 'Start with the people closest to the change.', kind: 'task', owner: 'Me', status: 'open' },
    ],
  },
  {
    id: 'seed-roadmap',
    title: 'Q3 capacity return to the Ministry',
    detail: 'Due the 20th, no extensions this cycle. Needs the occupancy figures signed off before it goes.',
    kind: 'task',
    owner: 'Directorate',
    status: 'open',
  },
  {
    id: 'seed-khalid',
    title: 'Khalid unclear on supervision scope',
    detail: 'Outpatient has had no named supervision lead since April. He has raised it twice this month — not urgent yet, but it will be.',
    kind: 'concern',
    owner: 'Khalid',
    status: 'open',
  },
];

/**
 * Ministry and clinic paperwork, drawn for the demo rather than taken from
 * anywhere — so the deployed link carries nothing anyone owns, and nothing that
 * resembles a real record. Every figure is a count or a percentage; there are no
 * patient identifiers in any of them. Vector, so they stay sharp both in the
 * thumbnail strip and at full size.
 *
 * Several entries carry more than one: an item takes any number of attachments,
 * the strip wraps, and the lightbox pages between them with the arrow keys.
 */
const ASSISTANT_ATTACHMENTS: SeedAttachment[] = [
  // Jizan — the staffing escalation, with the evidence behind it.
  { id: 'seed-att-rota', nodeId: 'seed-jizan', name: 'jizan-weekly-rota.svg', assetUrl: 'demo/clinic-rota.svg', mimeType: 'image/svg+xml', size: 9524 },
  { id: 'seed-att-waits', nodeId: 'seed-jizan', name: 'waiting-times-aug.svg', assetUrl: 'demo/waiting-times.svg', mimeType: 'image/svg+xml', size: 6211 },
  { id: 'seed-att-circular', nodeId: 'seed-jizan', name: 'moh-circular-44-217.svg', assetUrl: 'demo/ministry-circular.svg', mimeType: 'image/svg+xml', size: 3994 },

  { id: 'seed-att-jizan-child', nodeId: 'seed-jizan-child', name: 'regional-minutes.svg', assetUrl: 'demo/meeting-minutes.svg', mimeType: 'image/svg+xml', size: 4226 },

  // Raghad — the triage proposal, plus the demand it is answering.
  { id: 'seed-att-triage', nodeId: 'seed-raghad', name: 'intake-triage-draft.svg', assetUrl: 'demo/triage-flow.svg', mimeType: 'image/svg+xml', size: 4543 },
  { id: 'seed-att-referrals', nodeId: 'seed-raghad', name: 'referral-volumes.svg', assetUrl: 'demo/referral-volumes.svg', mimeType: 'image/svg+xml', size: 4332 },

  { id: 'seed-att-supervision', nodeId: 'seed-khalid', name: 'supervision-lines.svg', assetUrl: 'demo/supervision-structure.svg', mimeType: 'image/svg+xml', size: 3409 },

  { id: 'seed-att-incidents', nodeId: 'seed-morale', name: 'incident-summary-q3.svg', assetUrl: 'demo/incident-summary.svg', mimeType: 'image/svg+xml', size: 4094 },
  { id: 'seed-att-morale-child', nodeId: 'seed-morale-child', name: 'regional-minutes.svg', assetUrl: 'demo/meeting-minutes.svg', mimeType: 'image/svg+xml', size: 4226 },

  { id: 'seed-att-roadmap', nodeId: 'seed-roadmap', name: 'moh-circular-44-217.svg', assetUrl: 'demo/ministry-circular.svg', mimeType: 'image/svg+xml', size: 3994 },
  { id: 'seed-att-roadmap-2', nodeId: 'seed-roadmap', name: 'bed-occupancy.svg', assetUrl: 'demo/bed-occupancy.svg', mimeType: 'image/svg+xml', size: 3090 },
];

/** The director's own paperwork — his decisions, not her inbox. */
const DIRECTOR_ATTACHMENTS: SeedAttachment[] = [
  { id: 'seed-att-dir-beds', nodeId: 'seed-dir-headcount', name: 'bed-occupancy.svg', assetUrl: 'demo/bed-occupancy.svg', mimeType: 'image/svg+xml', size: 3090 },
  { id: 'seed-att-dir-rota', nodeId: 'seed-dir-headcount', name: 'clinic-rota.svg', assetUrl: 'demo/clinic-rota.svg', mimeType: 'image/svg+xml', size: 9524 },

  { id: 'seed-att-dir-minutes', nodeId: 'seed-dir-allhands', name: 'regional-minutes.svg', assetUrl: 'demo/meeting-minutes.svg', mimeType: 'image/svg+xml', size: 4226 },

  { id: 'seed-att-dir-circular', nodeId: 'seed-dir-supplier', name: 'moh-circular-44-217.svg', assetUrl: 'demo/ministry-circular.svg', mimeType: 'image/svg+xml', size: 3994 },

  { id: 'seed-att-dir-incidents', nodeId: 'seed-dir-retention', name: 'incident-summary-q3.svg', assetUrl: 'demo/incident-summary.svg', mimeType: 'image/svg+xml', size: 4094 },
  { id: 'seed-att-dir-supervision', nodeId: 'seed-dir-retention', name: 'supervision-lines.svg', assetUrl: 'demo/supervision-structure.svg', mimeType: 'image/svg+xml', size: 3409 },
];

/** What sits on the director's map: his own decisions and standing worries. */
const DIRECTOR_SEEDS: SeedSpec[] = [
  {
    id: 'seed-dir-headcount',
    title: 'Psychiatrist headcount for Q1',
    detail: 'Two consultant posts requested across the region. Acute beds are at capacity, so this needs a decision before the budget closes.',
    kind: 'urgent',
    owner: 'Me',
    status: 'open',
  },
  {
    id: 'seed-dir-allhands',
    title: 'Regional oversight meeting',
    detail: 'Four items carried over. Wants the supervision question settled rather than deferred again.',
    kind: 'task',
    owner: 'Me',
    status: 'open',
  },
  {
    id: 'seed-dir-supplier',
    title: 'Pharmacy supply contract renewal',
    detail: 'Comes up in six weeks. Ministry reporting requirements changed this cycle.',
    kind: 'task',
    owner: 'Procurement',
    status: 'open',
  },
  {
    id: 'seed-dir-retention',
    title: 'Retention in the outpatient team',
    detail: 'Two departures this quarter. Worth understanding before it becomes a pattern.',
    kind: 'concern',
    owner: 'Outpatient',
    status: 'open',
  },
];

/** The original single-map content, unchanged for anyone not in the demo. */
const SOLO_SEEDS: SeedSpec[] = [
  {
    id: 'seed-solo-budget',
    title: 'Budget review delay',
    detail: "Finance said Q3 numbers won't be ready until next week. Need to reschedule the board meeting.",
    kind: 'urgent',
    owner: 'Finance',
    status: 'open',
    children: [
      { id: 'seed-solo-budget-child', title: 'Reschedule board meeting', detail: 'Find a slot after the numbers land.', kind: 'task', owner: 'Me', status: 'open' },
    ],
  },
  {
    id: 'seed-solo-ana',
    title: 'New workflow proposal from Ana',
    detail: 'Ana wants to restructure onboarding. She has a draft doc — promising, needs my sign-off.',
    kind: 'idea',
    owner: 'Ana',
    status: 'open',
  },
  {
    id: 'seed-solo-morale',
    title: 'Team morale after restructuring',
    detail: 'Several people seem unsettled. Worth a one-on-one round before the all-hands.',
    kind: 'concern',
    owner: 'Team',
    status: 'open',
    children: [
      { id: 'seed-solo-morale-child', title: 'One-on-one round', detail: 'Start with the people closest to the change.', kind: 'task', owner: 'Me', status: 'open' },
    ],
  },
  {
    id: 'seed-solo-roadmap',
    title: 'Update Q4 roadmap',
    detail: 'Product asked for priority changes by Friday.',
    kind: 'task',
    owner: 'Product',
    status: 'open',
  },
  {
    id: 'seed-solo-carlos',
    title: 'Carlos needs clearer role definition',
    detail: 'He mentioned feeling uncertain about scope in two meetings. Not critical yet, but worth addressing.',
    kind: 'concern',
    owner: 'Carlos',
    status: 'open',
  },
];

export const ASSISTANT_STORE_ID = 'demo-assistant';
export const DIRECTOR_STORE_ID = 'demo-director';

/** Seed set for a given store, chosen by which persona this window is. */
export function seedsFor(storeId: string): SeedSpec[] {
  if (storeId === ASSISTANT_STORE_ID) return ASSISTANT_SEEDS;
  if (storeId === DIRECTOR_STORE_ID) return DIRECTOR_SEEDS;
  return SOLO_SEEDS;
}

/**
 * Pictures to install alongside the seeded entries. Served from `public/`, so
 * unlike user uploads they need nothing in IndexedDB and survive a fresh
 * browser or a deployed build.
 */
export function seedAttachmentsFor(storeId: string): Attachment[] {
  const specs =
    storeId === ASSISTANT_STORE_ID
      ? ASSISTANT_ATTACHMENTS
      : storeId === DIRECTOR_STORE_ID
        ? DIRECTOR_ATTACHMENTS
        : [];
  const now = new Date().toISOString();
  return specs.map((s) => ({
    id: s.id,
    nodeId: s.nodeId,
    kind: 'image' as const,
    name: s.name,
    mimeType: s.mimeType,
    size: s.size,
    // Resolved against the app's base path so it works under a sub-path deploy.
    assetUrl: `${import.meta.env.BASE_URL}${s.assetUrl}`,
    createdAt: now,
  }));
}

/** Convenience for callers that only care about this window's own persona. */
export function seedsForThisWindow(): SeedSpec[] {
  return seedsFor(persona.id);
}
