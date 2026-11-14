import type {
  BallEvidenceRecord,
  PlayerPressureResult,
} from '../lib/csvPreviewAndExport';

export type Role = 'batting' | 'bowling';
export type EvidenceLevel = 'strong' | 'moderate' | 'limited' | 'insufficient';

export interface Ranking {
  rank: number;
  player: { id: number; name: string };
  role: Role;
  definition: string;
  pressure_score: number;
  rate: number;
  adjusted_rate: number;
  exposures: number;
  matches: number;
  seasons: number;
  runs: number;
  wickets: number;
  context_coverage: number;
  uncertainty: {
    ci95_low: number;
    ci95_high: number;
    ci_half_width: number;
    match_rate_sd: number;
  };
  shrink_weight: number;
  evidence_level: EvidenceLevel;
  source_record_count: number;
  review_status: string;
}

export interface RankingResponse {
  data: Ranking[];
  meta: {
    role: Role;
    definition: string;
    total: number;
    limit: number;
    offset: number;
    source_run: string;
    review_status: string;
  };
}

export interface MethodologySection {
  id: string;
  title: string;
  body_markdown: string;
  results?: Array<Record<string, unknown>>;
}

export interface MethodologyResponse {
  data: {
    version: string;
    review_status: string;
    sections: MethodologySection[];
  };
}

export interface PlayerEvidenceResponse {
  data: {
    player: { id: number; name: string };
    role: Role;
    primary_evaluation: Omit<Ranking, 'player'>;
    sensitivity: Array<{
      definition: string;
      rank: number;
      evidence_level: EvidenceLevel;
      pressure_score: number;
    }>;
    review_status: string;
    limitations: string[];
  };
}

export interface DashboardResponse {
  data: {
    source_run: string;
    review_status: string;
    evaluation_window: { start: string; training_end: string };
    primary_definition: string;
    candidate_coverage: Array<Record<string, unknown>>;
    publication_notice: string;
  };
}

export interface DatasetValidationData {
  valid: boolean;
  filename: string;
  file_size: number;
  error: string | null;
  missing_columns: string[];
  detected_columns: string[];
  mapped_columns: Record<string, string>;
  row_count: number;
  message?: string;
}

export interface LiveConsoleStage {
  stage: number;
  title: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  detail: string;
}

export interface LiveConsoleJobStatus {
  job_id: string;
  filename: string;
  file_size: number;
  status: 'running' | 'completed' | 'failed';
  current_stage: number;
  current_stage_title: string;
  progress_pct: number;
  records_processed: number;
  total_records: number;
  status_message: string;
  stages: LiveConsoleStage[];
  error: string | null;
  has_results: boolean;
}

export interface LiveConsoleAnalysisResults {
  job_id: string;
  filename: string;
  file_size: number;
  completed_at: string;
  summary: {
    total_records: number;
    pressure_records: number;
    pressure_density_pct: number;
    total_matches: number;
    total_teams: number;
    total_batters_evaluated: number;
    total_bowlers_evaluated: number;
  };
  best_batter: PlayerPressureResult | null;
  best_bowler: PlayerPressureResult | null;
  top_batters: PlayerPressureResult[];
  top_bowlers: PlayerPressureResult[];
  all_batters: PlayerPressureResult[];
  all_bowlers: PlayerPressureResult[];
  ball_evidence: BallEvidenceRecord[];
  available_filters: {
    teams: string[];
    matches: Array<{ id: string; label: string }>;
    innings: number[];
    players: string[];
  };
}

const configuredBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const RENDER_PROD_FRONTEND_ORIGIN = 'https://strata-y6yz.onrender.com';

function buildCandidateUrls(path: string): string[] {
  const isLiveConsoleRoute = path.startsWith('/live-console/');
  if (isLiveConsoleRoute) {
    // Live console routes are served by the local/same-origin application server
    return [`/api/v1${path}`, ...(configuredBase ? [`${configuredBase}/api/v1${path}`] : [])];
  }

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const canCallConfiguredBaseDirectly =
    Boolean(configuredBase) &&
    (currentOrigin === RENDER_PROD_FRONTEND_ORIGIN || currentOrigin === configuredBase);

  if (canCallConfiguredBaseDirectly) {
    return [`${configuredBase}/api/v1${path}`, `/api/v1${path}`];
  }

  // When running inside Google AI Studio preview or localhost, use same-origin /api/v1 first
  // (which proxies directly to https://strataa.onrender.com without triggering browser CORS blocks),
  // then fall back to configuredBase if same-origin proxy is not mounted.
  const urls = [`/api/v1${path}`];
  if (configuredBase) {
    urls.push(`${configuredBase}/api/v1${path}`);
  }
  return urls;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
  };

  const candidateUrls = buildCandidateUrls(path);
  let lastError: unknown = null;

  for (let i = 0; i < candidateUrls.length; i++) {
    const url = candidateUrls[i];
    try {
      const response = await fetch(url, { ...init, headers });
      const contentType = response.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');

      // If same-origin returned HTML fallback (e.g., static host without proxy), try next candidate URL
      if (!isJson && i < candidateUrls.length - 1) {
        continue;
      }

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message =
          body?.error?.message ||
          body?.detail ||
          body?.data?.error ||
          `Service unavailable (${response.status})`;
        throw new Error(message);
      }
      return body as T;
    } catch (err) {
      lastError = err;
      // Only fall through to next URL on network/CORS errors
      if (err instanceof TypeError && i < candidateUrls.length - 1) {
        continue;
      }
      throw err;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Service unavailable');
}

export const clutchIqApi = {
  dashboard: () => request<DashboardResponse>('/dashboard/summary'),
  rankings: (role: Role) =>
    request<RankingResponse>(`/rankings/${role}?definition=rules_pressure&limit=10`),
  player: (id: number, role: Role) =>
    request<PlayerEvidenceResponse>(`/players/${id}?role=${role}&definition=rules_pressure`),
  methodology: () => request<MethodologyResponse>('/methodology'),

  sampleDataset: () =>
    request<{
      data: { filename: string; file_size: number; csv_content: string };
    }>('/live-console/sample-csv'),

  validateDataset: async (payload: {
    filename: string;
    file_size: number;
    csv_content: string;
  }): Promise<DatasetValidationData> => {
    const response = await fetch('/api/v1/live-console/validate', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const body = await response.json().catch(() => ({}));
    if (body?.data && typeof body.data.valid === 'boolean') {
      return body.data as DatasetValidationData;
    }
    if (!response.ok) {
      throw new Error(
        body?.error?.message || body?.detail || `Validation failed (${response.status})`
      );
    }
    return body.data as DatasetValidationData;
  },

  startAnalysis: (payload: {
    filename: string;
    file_size: number;
    csv_content: string;
    synchronous?: boolean;
  }) =>
    request<{ data: LiveConsoleJobStatus }>('/live-console/jobs', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getJobStatus: (jobId: string) =>
    request<{ data: LiveConsoleJobStatus }>(`/live-console/jobs/${encodeURIComponent(jobId)}`),

  getJobResults: (jobId: string) =>
    request<{ data: LiveConsoleAnalysisResults }>(
      `/live-console/jobs/${encodeURIComponent(jobId)}/results`
    ),
};
