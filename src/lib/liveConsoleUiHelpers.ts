import type { Job, LiveSchema, Validation } from '../api/liveClient';

export interface CanonicalTableDescriptor {
  key: string;
  filename: string;
  title: string;
  roleBadge: string;
  purpose: string;
}

export const CANONICAL_LIVE_TABLES: CanonicalTableDescriptor[] = [
  {
    key: 'ball_by_ball',
    filename: 'ball_by_ball.csv',
    title: 'Ball-by-Ball Deliveries',
    roleBadge: 'PRIMARY STREAM',
    purpose: 'Granular delivery events, striker/bowler IDs, runs, extras, and dismissal flags.',
  },
  {
    key: 'matches',
    filename: 'matches.csv',
    title: 'Matches Registry',
    roleBadge: 'COMPANION 01',
    purpose: 'ISO match dates (pre-2024 training vs 2024+ evaluation), teams, toss, and revised targets.',
  },
  {
    key: 'competitions',
    filename: 'competitions.csv',
    title: 'Competitions Registry',
    roleBadge: 'COMPANION 02',
    purpose: 'Competition identifiers, tournament names, and T20 format verification.',
  },
  {
    key: 'teams',
    filename: 'teams.csv',
    title: 'Teams Registry',
    roleBadge: 'COMPANION 03',
    purpose: 'Franchise and team identity mappings per competition.',
  },
  {
    key: 'competition_team_player_mapping',
    filename: 'competition_team_player_mapping.csv',
    title: 'Squad & Player Mapping',
    roleBadge: 'COMPANION 04',
    purpose: 'Canonical player names and squad registrations across competitions.',
  },
  {
    key: 'playing_eleven',
    filename: 'playing_eleven.csv',
    title: 'Official Playing XI',
    roleBadge: 'COMPANION 05',
    purpose: 'Batting order, captain/wicketkeeper roles, and Impact Player participation.',
  },
];

export interface TableChecklistItem extends CanonicalTableDescriptor {
  status: 'validated' | 'missing' | 'awaiting_initial';
  requiredColumnCount: number;
  requiredColumns: string[];
  validation: Validation | null;
  uploadedSize: number | null;
}

export function computeTableChecklist(
  schema: LiveSchema | null,
  job: Job | null,
  uploadedFiles: Array<{ name: string; size: number }>
): TableChecklistItem[] {
  const fileSizeByTable = new Map<string, number>();
  for (const f of uploadedFiles) {
    const key = f.name.toLowerCase().replace(/\.csv$/i, '');
    fileSizeByTable.set(key, f.size);
  }

  return CANONICAL_LIVE_TABLES.map((desc) => {
    const reqCols = schema?.required_columns?.[desc.key] ?? [];
    const validation = job?.validation?.[desc.key] ?? null;
    const isValidated = Boolean(validation);
    const status: TableChecklistItem['status'] = isValidated
      ? 'validated'
      : job
      ? 'missing'
      : 'awaiting_initial';

    return {
      ...desc,
      status,
      requiredColumnCount: reqCols.length,
      requiredColumns: reqCols,
      validation,
      uploadedSize: fileSizeByTable.get(desc.key) ?? null,
    };
  });
}

export interface TimelineStageDisplay {
  index: number;
  stepNumber: string;
  rawText: string;
  category: 'TABLE INGESTION' | 'PHASE 7A PIPELINE';
  tableKey: string | null;
  state: 'completed' | 'active' | 'failed';
}

export function buildTimelineStages(job: Job | null): TimelineStageDisplay[] {
  if (!job || ! Array.isArray(job.stages)) return [];
  const working = job.status === 'queued' || job.status === 'running';
  const failed = job.status === 'failed';

  return job.stages.map((rawText, idx) => {
    const isLast = idx === job.stages.length - 1;
    const tableMatch = rawText.match(/^([a-z_]+):\s+/);
    const tableKey = tableMatch ? tableMatch[1] : null;
    const category = tableKey ? 'TABLE INGESTION' : 'PHASE 7A PIPELINE';

    let state: TimelineStageDisplay['state'] = 'completed';
    if (isLast && working) {
      state = 'active';
    } else if (isLast && failed) {
      state = 'failed';
    }

    return {
      index: idx,
      stepNumber: String(idx + 1).padStart(2, '0'),
      rawText,
      category,
      tableKey,
      state,
    };
  });
}

export function getEvidenceTierStyle(level: string | null | undefined): {
  label: string;
  badgeClass: string;
  dotClass: string;
} {
  const normalized = String(level || '').toLowerCase();
  if (normalized === 'strong') {
    return {
      label: 'strong',
      badgeClass: 'bg-[#1D4ED8]/12 text-[#1D4ED8] border-[#1D4ED8]/40 font-semibold',
      dotClass: 'bg-[#1D4ED8]',
    };
  }
  if (normalized === 'moderate') {
    return {
      label: 'moderate',
      badgeClass: 'bg-[#0A1128]/8 text-[#0A1128] border-[#0A1128]/25 font-medium',
      dotClass: 'bg-[#0A1128]',
    };
  }
  if (normalized === 'limited') {
    return {
      label: 'limited',
      badgeClass: 'bg-amber-500/12 text-amber-900 border-amber-600/35 font-medium',
      dotClass: 'bg-amber-600',
    };
  }
  return {
    label: normalized || 'insufficient',
    badgeClass: 'bg-slate-200/80 text-[#475569] border-slate-400/40',
    dotClass: 'bg-slate-400',
  };
}

export function formatBytesCompact(bytes: number | null | undefined): string {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes <= 0) return '0.0 KiB';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`;
}

export function formatExpiryTimer(seconds: number | null | undefined): string {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) {
    return '0m 00s';
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}m ${String(secs).padStart(2, '0')}s`;
}
