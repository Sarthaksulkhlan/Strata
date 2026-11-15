import type { Job, LiveSchema, TableRow, Validation } from '../api/liveClient';

export type CanonicalTableKey =
  | 'ball_by_ball'
  | 'matches'
  | 'competitions'
  | 'teams'
  | 'competition_team_player_mapping'
  | 'playing_eleven';

export const REQUIRED_TABLE_SCHEMAS: Record<CanonicalTableKey, string[]> = {
  ball_by_ball: [
    'match_id',
    'innings',
    'overid',
    'over_ball_num',
    'innings_ball_num',
    'batting_team_id',
    'bowling_team_id',
    'striker_id',
    'non_striker_id',
    'bowler_id',
    'runs',
    'extras1_runs',
    'extras_2_runs',
    'extras_type',
    'is_wicket',
    'dismissed_player_id',
    'dismissal_type_id',
    'dismissal_type',
    'is_four',
    'is_six',
    'striker_name',
    'non_striker_name',
    'bowler_name',
  ],
  matches: [
    'match_id',
    'comp_id',
    'match_date',
    'home_team_id',
    'away_team_id',
    'toss_win_team_id',
    'win_team_id',
    'result',
    'first_inn_revised_overs',
    'second_inn_revised_overs',
    'revised_target',
  ],
  competitions: ['comp_id', 'comp_name', 'match_format'],
  teams: ['comp_id', 'team_id', 'team_name'],
  competition_team_player_mapping: [
    'comp_id',
    'comp_name',
    'team_id',
    'team_name',
    'player_id',
    'player_name',
  ],
  playing_eleven: [
    'match_id',
    'team_id',
    'player_id',
    'batting_order',
    'is_played',
    'is_captain',
    'is_wk',
    'is_impact',
    'is_impact_off',
  ],
};

export interface CanonicalTableDescriptor {
  key: CanonicalTableKey;
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

export type FilenameIdentificationResult =
  | {
      ok: true;
      tableKey: CanonicalTableKey;
      canonicalFilename: string;
      requiredColumns: string[];
    }
  | {
      ok: false;
      error: string;
    };

export function isCanonicalTableKey(value: string): value is CanonicalTableKey {
  return Object.prototype.hasOwnProperty.call(REQUIRED_TABLE_SCHEMAS, value);
}

export function getRequiredColumnsForTable(
  tableKey: string,
  schema?: LiveSchema | null
): string[] {
  if (schema?.required_columns?.[tableKey]?.length) {
    return schema.required_columns[tableKey];
  }
  if (isCanonicalTableKey(tableKey)) {
    return REQUIRED_TABLE_SCHEMAS[tableKey];
  }
  return [];
}

/**
 * Identifies a CSV file strictly by its actual filename, never by upload order.
 * Rejects non-CSV files and unknown filenames with a clear message.
 */
export function identifyCsvFilename(
  rawFilename: string,
  schema?: LiveSchema | null
): FilenameIdentificationResult {
  const trimmed = (rawFilename || '').trim();
  const baseName = trimmed.split(/[/\\]/).pop() || '';
  if (!baseName.toLowerCase().endsWith('.csv')) {
    return {
      ok: false,
      error: `Invalid file "${baseName || rawFilename}". Choose CSV files only (.csv).`,
    };
  }

  const candidateKey = baseName.replace(/\.csv$/i, '').toLowerCase();
  if (!isCanonicalTableKey(candidateKey)) {
    const allowedList = CANONICAL_LIVE_TABLES.map((t) => t.filename).join(', ');
    return {
      ok: false,
      error: `Unrecognized CSV filename "${baseName}". Missing required columns check requires one of the 6 canonical table filenames: ${allowedList}.`,
    };
  }

  return {
    ok: true,
    tableKey: candidateKey,
    canonicalFilename: `${candidateKey}.csv`,
    requiredColumns: getRequiredColumnsForTable(candidateKey, schema),
  };
}

/**
 * RFC 4180 compliant CSV parser supporting quoted values, escaped quotes, and CRLF/LF newlines.
 */
export function parseCsvMatrix(rawText: string): string[][] {
  const text = rawText.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          currentCell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        currentCell += ch;
      }
    } else {
      if (ch === '"') {
        if (currentCell.length === 0) {
          inQuotes = true;
        } else {
          throw new Error('Malformed quote in CSV cell.');
        }
      } else if (ch === ',') {
        currentRow.push(currentCell);
        currentCell = '';
      } else if (ch === '\r' || ch === '\n') {
        if (ch === '\r' && i + 1 < text.length && text[i + 1] === '\n') {
          i++;
        }
        currentRow.push(currentCell);
        currentCell = '';
        if (currentRow.length > 1 || currentRow[0] !== '' || rows.length === 0) {
          rows.push(currentRow);
        }
        currentRow = [];
      } else {
        currentCell += ch;
      }
    }
  }

  if (inQuotes) {
    throw new Error('Unterminated quoted field in CSV.');
  }
  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  return rows;
}

function fallbackHexDigest(text: string): string {
  // Deterministic 64-char hex fingerprint used when synchronous hashing is needed
  let h1 = 0xdeadbeef ^ text.length;
  let h2 = 0x41c6ce57 ^ text.length;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const part = ((h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0'));
  return part.repeat(4);
}

export interface TableSchemaValidationFailure {
  ok: false;
  tableKey: CanonicalTableKey;
  filename: string;
  requiredColumns: string[];
  presentColumns: string[];
  missingColumns: string[];
  additionalColumns: string[];
  error: string;
}

export interface TableSchemaValidationSuccess {
  ok: true;
  tableKey: CanonicalTableKey;
  filename: string;
  requiredColumns: string[];
  presentColumns: string[];
  missingColumns: string[];
  additionalColumns: string[];
  validation: Validation;
}

export type TableSchemaValidationResult =
  | TableSchemaValidationSuccess
  | TableSchemaValidationFailure;

const NUMERIC_COLUMNS = new Set([
  'match_id',
  'innings',
  'overid',
  'over_ball_num',
  'innings_ball_num',
  'batting_team_id',
  'bowling_team_id',
  'striker_id',
  'non_striker_id',
  'bowler_id',
  'dismissed_player_id',
  'dismissal_type_id',
  'runs',
  'extras1_runs',
  'extras_2_runs',
]);

/**
 * Validates a CSV file's contents against its own specific table schema.
 * Never applies the ball_by_ball schema to companion tables.
 */
export function validateCsvContentForTable(
  rawText: string,
  tableKey: CanonicalTableKey,
  schema?: LiveSchema | null,
  sha256Override?: string
): TableSchemaValidationResult {
  const filename = `${tableKey}.csv`;
  const requiredColumns = getRequiredColumnsForTable(tableKey, schema);
  const maxRows = schema?.max_rows ?? 10000;

  if (!rawText || rawText.includes('\u0000')) {
    return {
      ok: false,
      tableKey,
      filename,
      requiredColumns,
      presentColumns: [],
      missingColumns: requiredColumns,
      additionalColumns: [],
      error: `${filename}: CSV is empty or contains binary content.`,
    };
  }

  let rows: string[][];
  try {
    rows = parseCsvMatrix(rawText);
  } catch {
    return {
      ok: false,
      tableKey,
      filename,
      requiredColumns,
      presentColumns: [],
      missingColumns: requiredColumns,
      additionalColumns: [],
      error: `${filename}: Upload must be a well-formed UTF-8 CSV.`,
    };
  }

  if (!rows.length || !rows[0].length || (rows[0].length === 1 && rows[0][0].trim() === '')) {
    return {
      ok: false,
      tableKey,
      filename,
      requiredColumns,
      presentColumns: [],
      missingColumns: requiredColumns,
      additionalColumns: [],
      error: `${filename}: CSV has no header row.`,
    };
  }

  const header = rows[0].map((c) => c.trim());
  const presentColumns = requiredColumns.filter((col) => header.includes(col));
  const missingColumns = requiredColumns.filter((col) => !header.includes(col));
  const additionalColumns = header.filter((col) => !requiredColumns.includes(col));

  // Check column name format and uniqueness
  const uniqueHeader = new Set(header);
  if (
    header.length !== uniqueHeader.size ||
    header.length > 100 ||
    header.some((c) => !/^[a-z][a-z0-9_]{0,63}$/.test(c))
  ) {
    return {
      ok: false,
      tableKey,
      filename,
      requiredColumns,
      presentColumns,
      missingColumns,
      additionalColumns,
      error: `${filename}: CSV requires unique, original-format column names (at most 100).`,
    };
  }

  // Check required columns for THIS specific table
  if (missingColumns.length > 0) {
    return {
      ok: false,
      tableKey,
      filename,
      requiredColumns,
      presentColumns,
      missingColumns,
      additionalColumns,
      error: `${filename}: Missing required columns: ${missingColumns.join(', ')}`,
    };
  }

  const dataRows = rows.slice(1);
  if (dataRows.length === 0) {
    return {
      ok: false,
      tableKey,
      filename,
      requiredColumns,
      presentColumns,
      missingColumns: [],
      additionalColumns,
      error: `${filename}: CSV has no data rows.`,
    };
  }

  if (dataRows.length > maxRows) {
    return {
      ok: false,
      tableKey,
      filename,
      requiredColumns,
      presentColumns,
      missingColumns: [],
      additionalColumns,
      error: `${filename}: Upload exceeds ${maxRows} rows. Use a coherent subset of complete matches and training history.`,
    };
  }

  for (let r = 0; r < dataRows.length; r++) {
    const row = dataRows[r];
    if (row.length !== header.length || row.some((cell) => cell.length > 2048)) {
      return {
        ok: false,
        tableKey,
        filename,
        requiredColumns,
        presentColumns,
        missingColumns: [],
        additionalColumns,
        error: `${filename}: CSV has a malformed row or oversized cell at row ${r + 1}.`,
      };
    }
  }

  // Check numeric columns matching backend contract
  for (let cIdx = 0; cIdx < header.length; cIdx++) {
    const colName = header[cIdx];
    if (colName.endsWith('_id') || NUMERIC_COLUMNS.has(colName)) {
      for (let r = 0; r < dataRows.length; r++) {
        const val = dataRows[r][cIdx];
        if (val !== '' && !/^[+-]?\d{1,15}(?:\.\d{1,6})?$/.test(val)) {
          return {
            ok: false,
            tableKey,
            filename,
            requiredColumns,
            presentColumns,
            missingColumns: [],
            additionalColumns,
            error: `${filename}: Invalid or out-of-range numeric tokens in column ${colName}. Scientific notation is unsupported.`,
          };
        }
      }
    }
  }

  // Compute missing value counts per required column and duplicate row counts
  const missingValues: Record<string, number> = {};
  for (const reqCol of requiredColumns) {
    missingValues[reqCol] = 0;
  }
  const colIndexMap = new Map<string, number>();
  header.forEach((col, idx) => colIndexMap.set(col, idx));

  const rowSignatureCounts = new Map<string, number>();
  for (const row of dataRows) {
    for (const reqCol of requiredColumns) {
      const idx = colIndexMap.get(reqCol);
      if (idx !== undefined && row[idx] === '') {
        missingValues[reqCol] += 1;
      }
    }
    const sig = row.join('\u001F');
    rowSignatureCounts.set(sig, (rowSignatureCounts.get(sig) || 0) + 1);
  }

  let duplicateRecords = 0;
  for (const count of rowSignatureCounts.values()) {
    if (count > 1) {
      duplicateRecords += count;
    }
  }

  const sha256 = sha256Override || fallbackHexDigest(rawText);
  const previewSlice = dataRows.slice(0, 10);
  const rawPreview: TableRow[] = previewSlice.map((row) => {
    const obj: TableRow = {};
    header.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });

  const structuredPreview: TableRow[] = previewSlice.map((row, rIdx) => {
    const obj: TableRow = {
      source_sha256: sha256,
      source_member: filename,
      source_record_number: rIdx + 1,
    };
    header.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });

  const validation: Validation = {
    original_rows: dataRows.length,
    processed_rows: dataRows.length,
    rejected_rows: 0,
    duplicate_records: duplicateRecords,
    columns: header,
    additional_columns: additionalColumns,
    normalized_columns: ['source_sha256', 'source_member', 'source_record_number', ...header],
    missing_values: missingValues,
    raw_preview: rawPreview,
    structured_preview: structuredPreview,
    issues: [],
    sha256,
    notice:
      'No source rows were discarded. Event-invalid rows are retained for diagnostics. Relationship and match consistency checks run after all six tables are supplied; empty optional dismissal/revision fields are not errors.',
  };

  return {
    ok: true,
    tableKey,
    filename,
    requiredColumns,
    presentColumns,
    missingColumns: [],
    additionalColumns,
    validation,
  };
}

export interface TableChecklistItem extends CanonicalTableDescriptor {
  status: 'validated' | 'schema_error' | 'missing' | 'awaiting_initial';
  requiredColumnCount: number;
  requiredColumns: string[];
  validation: Validation | null;
  schemaError: TableSchemaValidationFailure | null;
  uploadedSize: number | null;
}

export function computeTableChecklist(
  schema: LiveSchema | null,
  job: Job | null,
  uploadedFiles: Array<{ name: string; size: number }>,
  stagedValidations: Record<string, Validation> = {},
  schemaErrors: Record<string, TableSchemaValidationFailure> = {}
): TableChecklistItem[] {
  const fileSizeByTable = new Map<string, number>();
  for (const f of uploadedFiles) {
    const key = f.name.toLowerCase().replace(/\.csv$/i, '');
    fileSizeByTable.set(key, f.size);
  }

  const mergedValidations: Record<string, Validation> = {
    ...stagedValidations,
    ...(job?.validation || {}),
  };

  const hasAnyUploadActivity =
    Boolean(job) ||
    Object.keys(mergedValidations).length > 0 ||
    Object.keys(schemaErrors).length > 0;

  return CANONICAL_LIVE_TABLES.map((desc) => {
    const reqCols = getRequiredColumnsForTable(desc.key, schema);
    const validation = mergedValidations[desc.key] ?? null;
    const schemaError = schemaErrors[desc.key] ?? null;
    const isValidated = Boolean(validation);

    let status: TableChecklistItem['status'] = 'awaiting_initial';
    if (isValidated) {
      status = 'validated';
    } else if (schemaError) {
      status = 'schema_error';
    } else if (hasAnyUploadActivity) {
      status = 'missing';
    }

    return {
      ...desc,
      status,
      requiredColumnCount: reqCols.length,
      requiredColumns: reqCols,
      validation,
      schemaError,
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

export function buildTimelineStages(
  job: Job | null,
  stagedStages: string[] = []
): TimelineStageDisplay[] {
  const sourceStages = job && Array.isArray(job.stages) && job.stages.length > 0
    ? job.stages
    : stagedStages;
  if (!sourceStages.length) return [];

  const working = job?.status === 'queued' || job?.status === 'running';
  const failed = job?.status === 'failed';

  return sourceStages.map((rawText, idx) => {
    const isLast = idx === sourceStages.length - 1;
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
