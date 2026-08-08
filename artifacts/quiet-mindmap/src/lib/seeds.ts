import type { Attachment, MindNode } from '../types';
import { persona } from './persona';
import { roleOf } from './people';

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
    detail: 'Jizan clinic is running three uncovered consultant sessions a week, and waits have gone past the six-week target. Acute admissions have been full for nine days on top of it — the escalation policy starts at 95% and we are at 94%. Escalated by the clinic manager this morning.',
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
  {
    id: 'seed-jizan-clinic-hours',
    title: 'Extend Jizan evening clinic',
    detail: 'Abdulrahman suggests a Tuesday evening slot to cut the wait for working patients. Needs a room and one registrar. Nouf points out the two outlying centres still have no transport cover on Thursdays, so families there travel at their own cost either way.',
    kind: 'idea',
    owner: 'Abdulrahman',
    status: 'open',
  },
  {
    id: 'seed-fatimah',
    title: 'Fatimah — records handover',
    detail: 'Taking over the outpatient records from next month. Wants the reporting template agreed before she starts.',
    kind: 'task',
    owner: 'Fatimah',
    status: 'handled',
  },
];

/**
 * Ministry and clinic paperwork, drawn for the demo rather than taken from
 * anywhere — so the deployed link carries nothing anyone owns, and nothing that
 * resembles a real record. Every figure is a count or a percentage; there are no
 * patient identifiers in any of them. Vector, so they stay sharp both in the
 * thumbnail strip and at full size.
 *
 * Every entry carries at least two, including the children: an item with an
 * empty strip reads as an item with nothing behind it, which is the opposite of
 * what these maps are meant to show. The same document appears on more than one
 * entry where it genuinely bears on both — one rota answers both the staffing
 * shortfall and the evening-clinic idea.
 */
const ASSISTANT_ATTACHMENTS: SeedAttachment[] = [
  // Jizan — the staffing escalation, with the beds and the waits behind it.
  { id: 'seed-att-rota', nodeId: 'seed-jizan', name: 'jizan-weekly-rota.svg', assetUrl: 'demo/clinic-rota.svg', mimeType: 'image/svg+xml', size: 9524 },
  { id: 'seed-att-waits', nodeId: 'seed-jizan', name: 'waiting-times-aug.svg', assetUrl: 'demo/waiting-times.svg', mimeType: 'image/svg+xml', size: 6211 },
  { id: 'seed-att-beds', nodeId: 'seed-jizan', name: 'bed-occupancy.svg', assetUrl: 'demo/bed-occupancy.svg', mimeType: 'image/svg+xml', size: 3090 },
  { id: 'seed-att-circular', nodeId: 'seed-jizan', name: 'moh-circular-44-217.svg', assetUrl: 'demo/ministry-circular.svg', mimeType: 'image/svg+xml', size: 3994 },

  // The shortfall the directorate asked for in writing, and where they asked.
  { id: 'seed-att-jizan-child', nodeId: 'seed-jizan-child', name: 'regional-minutes.svg', assetUrl: 'demo/meeting-minutes.svg', mimeType: 'image/svg+xml', size: 4226 },
  { id: 'seed-att-jizan-child-2', nodeId: 'seed-jizan-child', name: 'jizan-weekly-rota.svg', assetUrl: 'demo/clinic-rota.svg', mimeType: 'image/svg+xml', size: 9524 },

  // Raghad — the triage proposal, plus the demand it is answering.
  { id: 'seed-att-triage', nodeId: 'seed-raghad', name: 'intake-triage-draft.svg', assetUrl: 'demo/triage-flow.svg', mimeType: 'image/svg+xml', size: 4543 },
  { id: 'seed-att-referrals', nodeId: 'seed-raghad', name: 'referral-volumes.svg', assetUrl: 'demo/referral-volumes.svg', mimeType: 'image/svg+xml', size: 4332 },

  // Khalid — the empty supervision line, and the meeting he raised it in.
  { id: 'seed-att-supervision', nodeId: 'seed-khalid', name: 'supervision-lines.svg', assetUrl: 'demo/supervision-structure.svg', mimeType: 'image/svg+xml', size: 3409 },
  { id: 'seed-att-khalid-2', nodeId: 'seed-khalid', name: 'regional-minutes.svg', assetUrl: 'demo/meeting-minutes.svg', mimeType: 'image/svg+xml', size: 4226 },

  // Morale — staffing as the largest incident category, and who reports to whom.
  { id: 'seed-att-incidents', nodeId: 'seed-morale', name: 'incident-summary-q3.svg', assetUrl: 'demo/incident-summary.svg', mimeType: 'image/svg+xml', size: 4094 },
  { id: 'seed-att-morale-2', nodeId: 'seed-morale', name: 'supervision-lines.svg', assetUrl: 'demo/supervision-structure.svg', mimeType: 'image/svg+xml', size: 3409 },
  { id: 'seed-att-morale-child', nodeId: 'seed-morale-child', name: 'regional-minutes.svg', assetUrl: 'demo/meeting-minutes.svg', mimeType: 'image/svg+xml', size: 4226 },
  { id: 'seed-att-morale-child-2', nodeId: 'seed-morale-child', name: 'incident-summary-q3.svg', assetUrl: 'demo/incident-summary.svg', mimeType: 'image/svg+xml', size: 4094 },

  // The capacity return — the circular that demands it and the figures it needs.
  { id: 'seed-att-roadmap', nodeId: 'seed-roadmap', name: 'moh-circular-44-217.svg', assetUrl: 'demo/ministry-circular.svg', mimeType: 'image/svg+xml', size: 3994 },
  { id: 'seed-att-roadmap-2', nodeId: 'seed-roadmap', name: 'bed-occupancy.svg', assetUrl: 'demo/bed-occupancy.svg', mimeType: 'image/svg+xml', size: 3090 },
  { id: 'seed-att-roadmap-3', nodeId: 'seed-roadmap', name: 'waiting-times-aug.svg', assetUrl: 'demo/waiting-times.svg', mimeType: 'image/svg+xml', size: 6211 },

  // The evening clinic, and the transport gap it would not close.
  { id: 'seed-att-hours', nodeId: 'seed-jizan-clinic-hours', name: 'waiting-times-aug.svg', assetUrl: 'demo/waiting-times.svg', mimeType: 'image/svg+xml', size: 6211 },
  { id: 'seed-att-hours-2', nodeId: 'seed-jizan-clinic-hours', name: 'referral-volumes.svg', assetUrl: 'demo/referral-volumes.svg', mimeType: 'image/svg+xml', size: 4332 },
  { id: 'seed-att-transport', nodeId: 'seed-jizan-clinic-hours', name: 'jizan-weekly-rota.svg', assetUrl: 'demo/clinic-rota.svg', mimeType: 'image/svg+xml', size: 9524 },

  // Fatimah — the reporting template she wants agreed before she starts.
  { id: 'seed-att-fatimah', nodeId: 'seed-fatimah', name: 'moh-circular-44-217.svg', assetUrl: 'demo/ministry-circular.svg', mimeType: 'image/svg+xml', size: 3994 },
  { id: 'seed-att-fatimah-2', nodeId: 'seed-fatimah', name: 'regional-minutes.svg', assetUrl: 'demo/meeting-minutes.svg', mimeType: 'image/svg+xml', size: 4226 },
];

/**
 * The director's own paperwork — the evidence behind a decision, not an inbox.
 * Three entries, three attachments each: with a map this short, an entry with a
 * thin strip stands out, and every one of these is a decision he is expected to
 * have read something before making.
 */
const DIRECTOR_ATTACHMENTS: SeedAttachment[] = [
  // The posts — what the shortfall costs, in beds, cover and waiting time.
  { id: 'seed-att-dir-beds', nodeId: 'seed-dir-jizan-posts', name: 'bed-occupancy.svg', assetUrl: 'demo/bed-occupancy.svg', mimeType: 'image/svg+xml', size: 3090 },
  { id: 'seed-att-dir-rota', nodeId: 'seed-dir-jizan-posts', name: 'jizan-weekly-rota.svg', assetUrl: 'demo/clinic-rota.svg', mimeType: 'image/svg+xml', size: 9524 },
  { id: 'seed-att-dir-waits', nodeId: 'seed-dir-jizan-posts', name: 'waiting-times-aug.svg', assetUrl: 'demo/waiting-times.svg', mimeType: 'image/svg+xml', size: 6211 },

  // The second site — the demand behind it, and the site that cannot absorb it.
  { id: 'seed-att-dir-referrals', nodeId: 'seed-dir-jizan-expansion', name: 'referral-volumes.svg', assetUrl: 'demo/referral-volumes.svg', mimeType: 'image/svg+xml', size: 4332 },
  { id: 'seed-att-dir-expansion-beds', nodeId: 'seed-dir-jizan-expansion', name: 'bed-occupancy.svg', assetUrl: 'demo/bed-occupancy.svg', mimeType: 'image/svg+xml', size: 3090 },
  { id: 'seed-att-dir-expansion-circular', nodeId: 'seed-dir-jizan-expansion', name: 'moh-circular-44-217.svg', assetUrl: 'demo/ministry-circular.svg', mimeType: 'image/svg+xml', size: 3994 },

  // Triage region-wide — Raghad's draft, the demand for it, and the meeting.
  { id: 'seed-att-dir-triage', nodeId: 'seed-dir-triage-model', name: 'intake-triage-draft.svg', assetUrl: 'demo/triage-flow.svg', mimeType: 'image/svg+xml', size: 4543 },
  { id: 'seed-att-dir-triage-referrals', nodeId: 'seed-dir-triage-model', name: 'referral-volumes.svg', assetUrl: 'demo/referral-volumes.svg', mimeType: 'image/svg+xml', size: 4332 },
  { id: 'seed-att-dir-minutes', nodeId: 'seed-dir-triage-model', name: 'regional-minutes.svg', assetUrl: 'demo/meeting-minutes.svg', mimeType: 'image/svg+xml', size: 4226 },
];

/** What sits on the director's map: his own decisions and standing worries. */
const DIRECTOR_SEEDS: SeedSpec[] = [
  {
    id: 'seed-dir-jizan-posts',
    title: 'Jizan consultant posts — approve or defer',
    detail: 'Two permanent posts for Jizan. Beds have been full for nine days and waits are past target. Deferring means another quarter on locums at higher cost.',
    kind: 'urgent',
    owner: 'Me',
    status: 'open',
  },
  {
    id: 'seed-dir-jizan-expansion',
    title: 'Jizan service expansion — outline case',
    detail: 'A second site in the south of the region. Big commitment, but referrals are up 93% and the current site cannot absorb it.',
    kind: 'idea',
    owner: 'Me',
    status: 'open',
  },
  {
    id: 'seed-dir-triage-model',
    title: 'Adopt triage screening region-wide?',
    detail: 'If the Jizan pilot holds up, this becomes the model everywhere. Worth deciding early rather than letting each site invent its own.',
    kind: 'idea',
    owner: 'Me',
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
    id: 'seed-solo-raghad',
    title: 'New workflow proposal from Raghad',
    detail: 'Raghad wants to restructure onboarding. She has a draft doc — promising, needs my sign-off.',
    kind: 'idea',
    owner: 'Raghad',
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
    id: 'seed-solo-khalid',
    title: 'Khalid needs clearer role definition',
    detail: 'He mentioned feeling uncertain about scope in two meetings. Not critical yet, but worth addressing.',
    kind: 'concern',
    owner: 'Khalid',
    status: 'open',
  },
];

export const ASSISTANT_STORE_ID = 'demo-assistant';
export const DIRECTOR_STORE_ID = 'demo-director';

/**
 * Which demo persona a store belongs to, whether it is a signed-out window
 * running `?as=assistant` or the real Supabase account for the same person.
 * Both routes must land on the same content, or signing in would empty the map
 * the demo was rehearsed on.
 */
function personaOfStore(storeId: string): 'assistant' | 'director' | null {
  if (storeId === ASSISTANT_STORE_ID) return 'assistant';
  if (storeId === DIRECTOR_STORE_ID) return 'director';
  // A signed-in account: the role was resolved from its email at sign-in.
  return roleOf(storeId);
}

/** Seed set for a given store, chosen by which persona this window is. */
export function seedsFor(storeId: string): SeedSpec[] {
  const who = personaOfStore(storeId);
  if (who === 'assistant') return ASSISTANT_SEEDS;
  if (who === 'director') return DIRECTOR_SEEDS;
  return SOLO_SEEDS;
}

/**
 * Pictures to install alongside the seeded entries. Served from `public/`, so
 * unlike user uploads they need nothing in IndexedDB and survive a fresh
 * browser or a deployed build.
 */
export function seedAttachmentsFor(storeId: string): Attachment[] {
  const who = personaOfStore(storeId);
  const specs = who === 'assistant' ? ASSISTANT_ATTACHMENTS : who === 'director' ? DIRECTOR_ATTACHMENTS : [];
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
