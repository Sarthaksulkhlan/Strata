import { PressureExplainer } from './components/PressureExplainer';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Award,
  CheckCircle2,
  Clock,
  Database,
  Download,
  FileSpreadsheet,
  Filter,
  Info,
  Layers,
  Loader2,
  Play,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import {
  createLiveApi,
  LiveApiError,
  type Evidence,
  type Job,
  type LiveRole,
  type LiveSchema,
  type Player,
  type Results,
  type Session,
  type TableRow,
  type Validation,
} from './api/liveClient';
import {
  CANONICAL_LIVE_TABLES,
  REQUIRED_TABLE_SCHEMAS,
  buildTimelineStages,
  computeTableChecklist,
  formatBytesCompact,
  formatExpiryTimer,
  getEvidenceTierStyle,
  getRequiredColumnsForTable,
  identifyCsvFilename,
  validateCsvContentForTable,
  type CanonicalTableKey,
  type TableSchemaValidationFailure,
} from './lib/liveConsoleUiHelpers';

const configuredBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const direct =
  window.location.origin === 'https://strata-y6yz.onrender.com' ||
  window.location.origin === configuredBase;
const api = createLiveApi(direct ? configuredBase : '');

const buttonBase =
  'inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-mono-tabular font-semibold border border-[#0A1128]/25 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#0A1128]/5 transition-colors cursor-pointer';
const cardBase = 'min-w-0 border border-[#0A1128]/15 bg-[#EFECE4]/75 p-5 sm:p-7 shadow-[0_1px_0_rgba(10,17,40,0.04)]';

const format = (value: unknown): string =>
  value === null || value === undefined
    ? 'Unavailable'
    : typeof value === 'number'
    ? Number.isInteger(value)
      ? String(value)
      : value.toFixed(3)
    : String(value);

function DataTable({ rows, label }: { rows: TableRow[]; label: string }) {
  if (!rows.length) {
    return (
      <div
        role="region"
        aria-label={label}
        className="p-4 border border-[#0A1128]/12 bg-[#F7F4EE] text-xs font-mono-tabular text-[#64748B]"
      >
        No records in this view.
      </div>
    );
  }
  const cols = Object.keys(rows[0]);
  return (
    <div
      className="min-w-0 max-w-full max-h-80 overflow-auto border border-[#0A1128]/15 bg-[#F7F4EE]"
      tabIndex={0}
      role="region"
      aria-label={label}
    >
      <table className="w-full text-xs text-left whitespace-nowrap border-collapse">
        <caption className="sr-only">{label}</caption>
        <thead className="sticky top-0 z-10 bg-[#EFECE4] border-b border-[#0A1128]/15">
          <tr>
            {cols.map((c) => (
              <th
                key={c}
                className="py-2.5 px-3 font-mono-tabular text-[11px] font-semibold uppercase tracking-wider text-[#334155]"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#0A1128]/8 font-mono-tabular">
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-[#EFECE4]/60 transition-colors">
              {cols.map((c) => (
                <td
                  key={c}
                  className="py-2 px-3 max-w-xs truncate text-[#0A1128]"
                  title={format(r[c])}
                >
                  {format(r[c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function LiveAnalysisConsole() {
  const [schema, setSchema] = useState<LiveSchema | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [result, setResult] = useState<Results | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [activity, setActivity] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<
    Array<{ name: string; size: number; tableKey: CanonicalTableKey }>
  >([]);
  const [stagedValidations, setStagedValidations] = useState<Record<string, Validation>>({});
  const [stagedStages, setStagedStages] = useState<string[]>([]);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [schemaErrors, setSchemaErrors] = useState<
    Record<string, TableSchemaValidationFailure>
  >({});
  const [role, setRole] = useState<LiveRole>('batting');
  const [playerSearch, setPlayerSearch] = useState('');
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const [selectedTable, setSelectedTable] = useState('ball_by_ball');

  const input = useRef<HTMLInputElement>(null);
  const alive = useRef(true);
  const evidenceSectionRef = useRef<HTMLDivElement>(null);
  const stagedCompanionFiles = useRef<Map<CanonicalTableKey, File>>(new Map());

  const working = job?.status === 'queued' || job?.status === 'running';

  function clearSession() {
    setJob(null);
    setSession(null);
    setResult(null);
    setEvidence(null);
    setFiles([]);
    stagedCompanionFiles.current.clear();
    setStagedValidations({});
    setStagedStages([]);
    setSchemaErrors({});
    setPlayerSearch('');
    setSelectedTable('ball_by_ball');
  }

  function expired(e: unknown) {
    return (
      e instanceof LiveApiError &&
      e.status === 404 &&
      e.message.startsWith('Job unavailable')
    );
  }

  useEffect(() => {
    alive.current = true;
    api
      .schema()
      .then(setSchema)
      .catch((e) => setError(e instanceof Error ? e.message : 'Unable to load schema.'));
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    if (!working || !session) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const next = await api.status(session);
        if (cancelled) return;
        setError('');
        if (next.status === 'complete' || next.status === 'unavailable') {
          const data =
            next.status === 'complete'
              ? await api.results(session)
              : await api.results(session).catch(() => null);
          if (!cancelled) setResult(data);
        }
        if (!cancelled) setJob(next);
        if (next.status === 'queued' || next.status === 'running') {
          timer = setTimeout(poll, 1000);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Unable to check progress.');
          if (expired(e)) clearSession();
          else timer = setTimeout(poll, 5000);
        }
      }
    };
    void poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [working, session]);

  useEffect(() => {
    if (!job) { setRemainingSeconds(0); return; }
    const deadline = Date.now() + job.expires_in_seconds * 1000;
    const tick = () => setRemainingSeconds(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [job]);

  async function action(task: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await task();
    } catch (e) {
      if (alive.current) {
        setError(e instanceof Error ? e.message : 'Request failed. Please retry.');
        if (expired(e)) clearSession();
      }
    } finally {
      if (alive.current) {
        setBusy(false);
        setActivity('');
      }
    }
  }

  async function upload(selected: FileList | File[]) {
    const incoming = Array.from(selected);
    if (input.current) input.current.value = '';
    if (busy || working || !schema || (job && job.status !== 'validated')) return;
    await action(async () => {
      if (!incoming.length) return;

      // 1. Identify each file strictly by its actual filename and check batch duplicates
      const identifiedBatch: Array<{
        file: File;
        tableKey: CanonicalTableKey;
        canonicalFilename: string;
      }> = [];
      const seenInBatch = new Set<CanonicalTableKey>();

      for (const f of incoming) {
        const idResult = identifyCsvFilename(f.name, schema);
        if (!idResult.ok) {
          throw new Error(idResult.error);
        }
        if (f.size > schema.max_bytes || !f.size) {
          throw new Error(
            `${idResult.canonicalFilename}: file must be non-empty and at most ${formatBytesCompact(schema.max_bytes)}.`
          );
        }
        if (seenInBatch.has(idResult.tableKey)) {
          throw new Error(
            `Duplicate file "${f.name}" in selection. Each of the six required CSV tables may only be supplied once.`
          );
        }
        seenInBatch.add(idResult.tableKey);
        identifiedBatch.push({
          file: f,
          tableKey: idResult.tableKey,
          canonicalFilename: idResult.canonicalFilename,
        });
      }

      // 2. Prevent duplicate files from being counted as separate required tables
      const alreadyValidatedTables = new Set<string>([
        ...Object.keys(stagedValidations),
        ...Object.keys(job?.validation || {}),
      ]);

      if (
        identifiedBatch.length === 1 &&
        alreadyValidatedTables.has(identifiedBatch[0].tableKey)
      ) {
        const dup = identifiedBatch[0];
        setSelectedTable(dup.tableKey);
        const remaining = CANONICAL_LIVE_TABLES.map((t) => t.filename).filter(
          (fn) => !alreadyValidatedTables.has(fn.replace(/\.csv$/i, ''))
        );
        throw new Error(
          `${dup.canonicalFilename} is already supplied in this session (${alreadyValidatedTables.size}/6 tables ready). ${
            remaining.length
              ? `Remaining tables needed: ${remaining.join(', ')}.`
              : 'All 6 tables are ready.'
          } Click Delete session to replace an uploaded file.`
        );
      }

      // Filter out any table already locked on the backend job when uploading a multi-file batch
      const batchToValidate = identifiedBatch.filter(
        (item) => !job?.validation?.[item.tableKey]
      );
      if (!batchToValidate.length) {
        throw new Error(
          'All selected CSV tables have already been uploaded and validated in this session. Click Delete session to start over.'
        );
      }

      const sizes = new Map(files.map(file => [file.tableKey, file.size]));
      for (const item of batchToValidate) sizes.set(item.tableKey, item.file.size);
      if (schema.max_job_bytes && [...sizes.values()].reduce((a, b) => a + b, 0) > schema.max_job_bytes) {
        throw new Error(`Combined upload exceeds ${formatBytesCompact(schema.max_job_bytes)}. No partial analysis will run.`);
      }

      // 3. Validate each CSV file independently against its OWN required table schema
      const validatedItems: Array<{
        file: File;
        tableKey: CanonicalTableKey;
        canonicalFilename: string;
        validation: Validation;
      }> = [];

      for (const item of batchToValidate) {
        setActivity(`Validating ${item.canonicalFilename} against ${item.tableKey} schema…`);
        // Read only the bounded header in the browser. The backend checks every row.
        const prefix = await item.file.slice(0, 65536).text();
        const newline = prefix.search(/[\r\n]/);
        if (newline < 0) throw new Error(`${item.canonicalFilename}: missing header newline or oversized header.`);
        const check = validateCsvContentForTable(prefix.slice(0, newline), item.tableKey, schema, true);
        if (!check.ok) {
          setSchemaErrors((prev) => ({ ...prev, [item.tableKey]: check }));
          setSelectedTable(item.tableKey);
          throw new Error(check.error);
        }
        setSchemaErrors((prev) => {
          if (!prev[item.tableKey]) return prev;
          const copy = { ...prev };
          delete copy[item.tableKey];
          return copy;
        });
        validatedItems.push({
          ...item,
          validation: check.validation,
        });
      }

      // 4. Record deduplicated file metadata by canonical table key
      setFiles((previous) => {
        const byTable = new Map<
          CanonicalTableKey,
          { name: string; size: number; tableKey: CanonicalTableKey }
        >();
        for (const p of previous) {
          byTable.set(p.tableKey, p);
        }
        for (const item of validatedItems) {
          byTable.set(item.tableKey, {
            name: item.canonicalFilename,
            size: item.file.size,
            tableKey: item.tableKey,
          });
        }
        return Array.from(byTable.values());
      });

      // 5. Synchronize with backend or stage companion tables until ball_by_ball.csv is supplied
      let currentSession = session;
      let nextJob = job;

      const deliveryItem = validatedItems.find((item) => item.tableKey === 'ball_by_ball');
      const companionItems = validatedItems.filter((item) => item.tableKey !== 'ball_by_ball');

      if (!currentSession && deliveryItem) {
        setActivity('Uploading and validating ball_by_ball.csv…');
        const response = await api.upload(deliveryItem.file);
        currentSession = {
          job_id: response.job_id,
          access_token: response.access_token,
        };
        nextJob = response;
        setSession(currentSession);
        setJob(nextJob);
        setSelectedTable('ball_by_ball');
      }

      if (currentSession) {
        // Combine any previously staged companion files with newly uploaded companion files
        const companionsToSync = new Map<CanonicalTableKey, File>();
        for (const [k, f] of stagedCompanionFiles.current.entries()) {
          if (!nextJob?.validation?.[k]) {
            companionsToSync.set(k, f);
          }
        }
        for (const comp of companionItems) {
          if (!nextJob?.validation?.[comp.tableKey]) {
            companionsToSync.set(comp.tableKey, comp.file);
          }
        }

        for (const [tableKey, compFile] of companionsToSync.entries()) {
          setActivity(`Uploading and validating ${tableKey}.csv…`);
          nextJob = await api.companion(currentSession, tableKey, compFile);
          setJob(nextJob);
          stagedCompanionFiles.current.delete(tableKey);
          setStagedValidations((prev) => {
            if (!prev[tableKey]) return prev;
            const copy = { ...prev };
            delete copy[tableKey];
            return copy;
          });
        }
        setSelectedTable(validatedItems[validatedItems.length - 1].tableKey);
      } else {
        // Companion file(s) uploaded before ball_by_ball.csv: stage locally with preliminary header checks
        for (const comp of companionItems) {
          stagedCompanionFiles.current.set(comp.tableKey, comp.file);
          setStagedValidations((prev) => ({
            ...prev,
            [comp.tableKey]: comp.validation,
          }));
          setStagedStages((prev) => [
            ...prev.filter((s) => !s.startsWith(`${comp.tableKey}:`)),
            `${comp.tableKey}: browser header checked; backend validation pending`,
          ]);
        }
        setSelectedTable(validatedItems[validatedItems.length - 1].tableKey);
      }
    });
  }

  async function download(kind: 'structured' | 'rankings') {
    await action(async () => {
      const blob = await api.download(session!, kind);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `uploaded-${kind}.csv`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  }

  async function inspectPlayerEvidence(playerId: number, targetRole: LiveRole) {
    if (!session) return;
    setRole(targetRole);
    await action(async () => {
      const ev = await api.player(session, playerId, targetRole);
      setEvidence(ev);
      setTimeout(() => {
        evidenceSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 60);
    });
  }

  const effectiveValidation = useMemo<Record<string, Validation>>(
    () => ({
      ...stagedValidations,
      ...(job?.validation || {}),
    }),
    [stagedValidations, job]
  );

  const checklist = useMemo(
    () => computeTableChecklist(schema, job, files, stagedValidations, schemaErrors),
    [schema, job, files, stagedValidations, schemaErrors]
  );
  const validatedCount = useMemo(
    () => checklist.filter((item) => item.status === 'validated').length,
    [checklist]
  );
  const remainingMissingTables = useMemo(
    () =>
      CANONICAL_LIVE_TABLES.map((t) => t.key).filter((key) => !effectiveValidation[key]),
    [effectiveValidation]
  );
  const totalUploadedBytes = useMemo(
    () => files.reduce((acc, f) => acc + f.size, 0),
    [files]
  );
  const timelineStages = useMemo(
    () => buildTimelineStages(job, stagedStages),
    [job, stagedStages]
  );

  const hasUploadSession = Boolean(job || Object.keys(stagedValidations).length > 0);
  const hasValidationOrSchemaActivity = Boolean(
    hasUploadSession || Object.keys(schemaErrors).length > 0
  );

  const validation = effectiveValidation[selectedTable];
  const selectedTableSchemaError = schemaErrors[selectedTable] || null;
  const selectedTableRequiredCols = useMemo(
    () => getRequiredColumnsForTable(selectedTable, schema),
    [selectedTable, schema]
  );

  const top10Batters: Player[] = useMemo(
    () => result?.rankings?.batting?.slice(0, 10) || [],
    [result]
  );
  const top10Bowlers: Player[] = useMemo(
    () => result?.rankings?.bowling?.slice(0, 10) || [],
    [result]
  );

  const activeRoleCandidates: Player[] = useMemo(() => {
    const rawList = result?.rankings?.[role]?.slice(0, 10) || [];
    const q = playerSearch.trim().toLowerCase();
    if (!q) return rawList;
    return rawList.filter(
      (p) =>
        p.player_name.toLowerCase().includes(q) || String(p.player_id).includes(q)
    );
  }, [result, role, playerSearch]);

  const leaders = result?.rankings?.[role]?.slice(0, 10) || [];
  const method = result?.methodology || schema?.methodology;
  const uploadDisabled =
    !schema || busy || working || Boolean(job && job.status !== 'validated');

  function scrollToSection(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="min-h-screen bg-[#F7F4EE] text-[#0A1128] flex flex-col">
      {/* Top Navigation Bar matching STRATA Platform Identity */}
      <header className="border-b border-[#0A1128]/15 sticky top-0 z-30 bg-[#F7F4EE]/95 backdrop-blur-sm">
        <div className="max-w-[1380px] mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-6 min-w-0">
            <a
              href="#hero"
              className="font-editorial text-2xl font-bold tracking-tight shrink-0"
            >
              STRATA
            </a>
            <nav
              aria-label="Console section navigation"
              className="hidden lg:flex items-center gap-5 text-xs font-mono-tabular text-[#334155]"
            >
              <button
                type="button"
                onClick={() => scrollToSection('upload-section')}
                className="hover:text-[#1D4ED8] transition-colors cursor-pointer"
              >
                01 / Ingestion ({validatedCount}/6)
              </button>
              {hasValidationOrSchemaActivity && (
                <button
                  type="button"
                  onClick={() => scrollToSection('validation-section')}
                  className="hover:text-[#1D4ED8] transition-colors cursor-pointer"
                >
                  02 / Validation
                </button>
              )}
              {hasUploadSession && (
                <button
                  type="button"
                  onClick={() => scrollToSection('pipeline-section')}
                  className="hover:text-[#1D4ED8] transition-colors cursor-pointer"
                >
                  03 / Pipeline ({timelineStages.length})
                </button>
              )}
              {result && (
                <button
                  type="button"
                  onClick={() => scrollToSection('results-section')}
                  className="hover:text-[#1D4ED8] transition-colors cursor-pointer"
                >
                  04 / Results
                </button>
              )}
              <button
                type="button"
                onClick={() => scrollToSection('methodology-section')}
                className="hover:text-[#1D4ED8] transition-colors cursor-pointer"
              >
                05 / Methodology
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <a
              href="#top-10-batsmen"
              className="hidden sm:inline-flex items-center px-2.5 py-1.5 text-[11px] font-mono-tabular font-semibold bg-[#EFECE4] hover:bg-[#0A1128] text-[#0A1128] hover:text-[#F7F4EE] border border-[#0A1128]/15 transition-colors"
            >
              Top 10 Batsmen
            </a>
            <a
              href="#top-10-bowlers"
              className="hidden sm:inline-flex items-center px-2.5 py-1.5 text-[11px] font-mono-tabular font-semibold bg-[#EFECE4] hover:bg-[#0A1128] text-[#0A1128] hover:text-[#F7F4EE] border border-[#0A1128]/15 transition-colors"
            >
              Top 10 Bowlers
            </a>
            <a href="#hero" className={buttonBase}>
              <ArrowLeft size={15} className="text-[#1D4ED8]" />
              <span>Back to platform</span>
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1380px] w-full mx-auto px-4 sm:px-8 py-8 sm:py-10 space-y-8">
        {/* Console Masthead & Live Session Telemetry Strip */}
        <div className="border-b border-[#0A1128]/15 pb-7 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="space-y-2.5">
              <div className="inline-flex items-center gap-2 font-mono-tabular text-xs tracking-widest text-[#1D4ED8] font-semibold">
                <span>UPLOAD / INSPECT / VERIFY</span>
                <span aria-hidden="true">·</span>
                <span>PHASE 7A RECOVERED ENGINE</span>
              </div>
              <h1 className="font-editorial text-4xl sm:text-6xl font-semibold tracking-tight text-[#0A1128]">
                Live Analysis Console
              </h1>
              <p className="max-w-3xl text-sm sm:text-base text-[#334155] leading-relaxed">
                Inspect cricket deliveries and run the recovered Phase 7A pressure methodology on
                your own data. Results are separate from STRATA’s approved production rankings.
              </p>
            </div>

            {/* Live Telemetry Status Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-[#0A1128] text-[#F7F4EE] p-3.5 border border-[#1D4ED8]/50 shrink-0">
              <div className="px-2.5 py-1 border-r border-[#F7F4EE]/12">
                <div className="font-mono-tabular text-[9px] uppercase tracking-wider text-[#94A3B8]">
                  ENGINE SCHEMA
                </div>
                <div className="font-mono-tabular text-xs font-bold text-[#60A5FA] mt-0.5 flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      schema ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
                    }`}
                  />
                  <span>{schema ? '6-TABLE READY' : 'CONNECTING…'}</span>
                </div>
              </div>

              <div className="px-2.5 py-1 sm:border-r border-[#F7F4EE]/12">
                <div className="font-mono-tabular text-[9px] uppercase tracking-wider text-[#94A3B8]">
                  TABLES VALIDATED
                </div>
                <div className="font-mono-tabular text-xs font-bold text-[#F7F4EE] mt-0.5">
                  {validatedCount} / 6 CSVs
                </div>
              </div>

              <div className="px-2.5 py-1 border-r border-[#F7F4EE]/12">
                <div className="font-mono-tabular text-[9px] uppercase tracking-wider text-[#94A3B8]">
                  JOB PAYLOAD
                </div>
                <div className="font-mono-tabular text-xs font-bold text-[#F7F4EE] mt-0.5">
                  {formatBytesCompact(totalUploadedBytes)} / {formatBytesCompact(schema?.max_job_bytes)}
                </div>
              </div>

              <div className="px-2.5 py-1">
                <div className="font-mono-tabular text-[9px] uppercase tracking-wider text-[#94A3B8]">
                  SESSION TTL
                </div>
                <div className="font-mono-tabular text-xs font-bold text-[#93C5FD] mt-0.5">
                  {job ? formatExpiryTimer(remainingSeconds) : '15m 00s'}
                </div>
              </div>
            </div>
          </div>

          {/* Ephemeral Privacy & Session Governance Notice */}
          <div className="border-l-4 border-[#1D4ED8] bg-[#EFECE4] p-4 text-xs sm:text-sm text-[#334155] flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-[#1D4ED8] shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="text-[#0A1128]">Temporary private session:</strong> files,
              uploads use private temporary storage; results and access keys are temporary. Sessions expire after 15 minutes and
              disappear on server restarts. Leaving this page loses access; there is no saved
              history. Up to {formatBytesCompact(schema?.max_bytes)} / {schema?.max_rows.toLocaleString()} rows per CSV and {formatBytesCompact(schema?.max_job_bytes)} per job. {schema?.full_dataset_notice} Use complete matches
              with historical pre-2024 training coverage.
            </div>
          </div>
        </div>

        {/* Error & Connection Recovery Banner */}
        {error && (
          <div
            role="alert"
            className="border-2 border-red-700/40 bg-red-50/95 p-4 sm:p-5 text-red-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="flex items-start gap-3 min-w-0">
              <AlertCircle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
              <div className="space-y-1 min-w-0">
                <div className="font-mono-tabular text-[11px] font-bold uppercase tracking-wider text-red-800">
                  Validation or Transport Alert
                </div>
                <div className="text-sm font-medium break-words">{error}</div>
              </div>
            </div>
            <button
              className={`${buttonBase} bg-white text-red-900 border-red-800/30 hover:bg-red-100 shrink-0`}
              onClick={() =>
                void action(async () => {
                  if (session) {
                    const next = await api.status(session);
                    setJob(next);
                    if (next.status === 'complete') setResult(await api.results(session));
                  } else {
                    setSchema(await api.schema());
                  }
                })
              }
              disabled={busy}
            >
              <RefreshCw size={14} />
              <span>Retry connection</span>
            </button>
          </div>
        )}

        {/* SECTION 01: SOURCE DATA UPLOAD & 6-TABLE SCHEMA CHECKLIST */}
        <PressureExplainer methodology={schema?.methodology} />

        <section id="upload-section" className={cardBase} aria-labelledby="upload-title">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-[#0A1128]/12 pb-4 mb-6">
            <div>
              <span className="font-mono-tabular text-xs uppercase tracking-widest text-[#1D4ED8] font-semibold">
                STEP 01 · MULTI-TABLE CSV INGESTION
              </span>
              <h2 id="upload-title" className="font-editorial text-2xl sm:text-3xl font-semibold mt-0.5">
                01 / Your source data
              </h2>
            </div>
            <span className="font-mono-tabular text-xs text-[#475569]">
              {validatedCount === 6
                ? 'All 6 required tables validated · Ready for analysis'
                : `${6 - validatedCount} table${6 - validatedCount === 1 ? '' : 's'} remaining before analysis`}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 5 Cols: Drag & Drop Upload Zone + Live Activity Status */}
            <div className="lg:col-span-5 space-y-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  if (!uploadDisabled) setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  void upload(e.dataTransfer.files);
                }}
                className={`border-2 border-dashed p-6 sm:p-8 text-center transition-colors ${
                  isDragging
                    ? 'border-[#1D4ED8] bg-[#1D4ED8]/8'
                    : uploadDisabled
                    ? 'border-[#0A1128]/15 bg-[#F7F4EE]/60 opacity-75'
                    : 'border-[#0A1128]/30 bg-[#F7F4EE] hover:border-[#1D4ED8]'
                }`}
              >
                <div className="w-12 h-12 mx-auto mb-3 bg-[#0A1128] text-[#F7F4EE] flex items-center justify-center">
                  {busy && activity ? (
                    <Loader2 className="animate-spin text-[#60A5FA]" size={22} />
                  ) : (
                    <Upload className="text-[#60A5FA]" size={22} />
                  )}
                </div>
                <p className="font-editorial text-xl font-semibold text-[#0A1128]">
                  Drop your CSV files here
                </p>
                <p className="text-xs sm:text-sm text-[#475569] my-2 leading-relaxed">
                  Upload any of the six required CSV tables individually in any order, or select
                  all six together. Each file is identified by its filename and validated against
                  its own schema.
                </p>
                <input
                  ref={input}
                  type="file"
                  multiple
                  accept=".csv,text/csv"
                  className="sr-only"
                  aria-label="Upload cricket CSV files"
                  onChange={(e) => e.target.files && void upload(e.target.files)}
                  disabled={uploadDisabled}
                />
                <button
                  type="button"
                  className={`${buttonBase} mt-3 bg-[#0A1128] text-[#F7F4EE] hover:bg-[#1D4ED8] border-[#0A1128]`}
                  onClick={() => input.current?.click()}
                  disabled={uploadDisabled}
                >
                  <Upload size={15} />
                  <span>Browse CSV files</span>
                </button>
              </div>

              {/* Upload Progress & Status Strip */}
              <div className="p-3.5 bg-[#F7F4EE] border border-[#0A1128]/15 space-y-2">
                <div className="flex items-center justify-between gap-2 font-mono-tabular text-xs">
                  <span className="text-[#64748B] uppercase">INGESTION TELEMETRY</span>
                  <span className="font-semibold text-[#1D4ED8]">
                    {Math.round((validatedCount / 6) * 100)}% SCHEMA READY
                  </span>
                </div>
                <div className="w-full h-2 bg-[#DFDAD0] overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      busy ? 'bg-[#1D4ED8] animate-pulse' : 'bg-[#0A1128]'
                    }`}
                    style={{ width: `${Math.max(4, Math.round((validatedCount / 6) * 100))}%` }}
                  />
                </div>
                <p
                  role="status"
                  aria-live="polite"
                  className="text-xs sm:text-sm font-medium text-[#0A1128] pt-0.5"
                >
                  {activity ||
                    (job
                      ? `Upload status: ${job.status} (${validatedCount}/6 tables validated)`
                      : validatedCount > 0
                      ? `Upload status: validated (${validatedCount}/6 tables validated)`
                      : schema
                      ? 'Ready for upload.'
                      : 'Connecting to backend…')}
                </p>
              </div>

              {/* Uploaded File Stream Ledger (Deduplicated by Required Table) */}
              {files.length > 0 && (
                <div className="p-3.5 bg-[#F7F4EE] border border-[#0A1128]/12 space-y-2">
                  <div className="font-mono-tabular text-[11px] uppercase tracking-wider text-[#64748B]">
                    UPLOADED FILE STREAM ({files.length} / 6 TABLES)
                  </div>
                  <ul className="text-xs font-mono-tabular break-all space-y-1.5">
                    {files.map((f) => (
                      <li
                        key={f.tableKey}
                        className="flex items-center justify-between gap-2 py-1 border-b border-[#0A1128]/8 last:border-b-0"
                      >
                        <span className="inline-flex items-center gap-1.5 font-medium text-[#0A1128] truncate">
                          <FileSpreadsheet size={13} className="text-[#1D4ED8] shrink-0" />
                          <span className="truncate">{f.name}</span>
                        </span>
                        <span className="text-[#475569] shrink-0">
                          {(f.size / 1024).toFixed(1)} KiB
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {hasUploadSession && remainingMissingTables.length > 0 ? (
                <div className="p-3.5 bg-amber-50/90 border border-amber-600/35 text-xs sm:text-sm text-amber-950">
                  <strong className="font-mono-tabular uppercase text-[11px] block mb-0.5 text-amber-900">
                    Pending Tables ({remainingMissingTables.length})
                  </strong>
                  Required before analysis:{' '}
                  {remainingMissingTables.map((t) => t + '.csv').join(', ')}.
                </div>
              ) : null}
            </div>

            {/* Right 7 Cols: 6-Table Schema Checklist Grid */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center justify-between gap-2 font-mono-tabular text-xs text-[#475569]">
                <span>SIX-TABLE DATA PACK CHECKLIST ({validatedCount}/6 VALIDATED)</span>
                <span>MAX {formatBytesCompact(schema?.max_bytes)} / {schema?.max_rows.toLocaleString()} ROWS PER CSV</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {checklist.map((item) => {
                  const isValidated = item.status === 'validated';
                  const isSchemaError = item.status === 'schema_error';
                  return (
                    <div
                      key={item.key}
                      data-testid={`checklist-card-${item.key}`}
                      className={`p-3.5 border transition-colors flex flex-col justify-between gap-2.5 ${
                        isValidated
                          ? 'bg-[#F7F4EE] border-[#1D4ED8]/50'
                          : isSchemaError
                          ? 'bg-red-50/90 border-red-600/50'
                          : 'bg-[#F7F4EE]/60 border-[#0A1128]/15'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono-tabular text-[10px] uppercase tracking-wider px-1.5 py-0.5 bg-[#EFECE4] border border-[#0A1128]/15 text-[#334155]">
                            {item.roleBadge}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 font-mono-tabular text-[10px] font-bold uppercase ${
                              isValidated
                                ? 'text-emerald-700'
                                : isSchemaError
                                ? 'text-red-700'
                                : 'text-[#64748B]'
                            }`}
                          >
                            {isValidated ? (
                              <>
                                <CheckCircle2 size={13} className="text-emerald-600" />
                                <span>VALIDATED</span>
                              </>
                            ) : isSchemaError ? (
                              <>
                                <AlertCircle size={13} className="text-red-600" />
                                <span>
                                  SCHEMA ERROR ({item.schemaError?.missingColumns.length || 0}{' '}
                                  MISSING)
                                </span>
                              </>
                            ) : (
                              <>
                                <Clock size={12} />
                                <span>{item.status === 'staged' ? 'BROWSER CHECKED' : item.status === 'missing' ? 'MISSING' : 'REQUIRED'}</span>
                              </>
                            )}
                          </span>
                        </div>
                        <div className="font-mono-tabular text-xs font-bold text-[#0A1128] pt-0.5">
                          {item.filename}
                        </div>
                        <div className="text-xs text-[#475569] leading-snug">{item.purpose}</div>
                        {isSchemaError && item.schemaError && (
                          <div className="mt-1.5 p-2 bg-red-100/80 border border-red-300 text-[11px] font-mono-tabular text-red-900 break-words">
                            <strong>Missing in {item.filename}:</strong>{' '}
                            {item.schemaError.missingColumns.length > 0
                              ? item.schemaError.missingColumns.join(', ')
                              : item.schemaError.error}
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-[#0A1128]/10 flex items-center justify-between gap-2 font-mono-tabular text-[11px]">
                        {item.validation ? (
                          <>
                            <span className="text-[#0A1128] font-semibold">
                              {item.status === 'staged' ? 'Backend validation pending' : `${item.validation.processed_rows.toLocaleString()} / ${item.validation.original_rows.toLocaleString()} valid rows`}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTable(item.key);
                                scrollToSection('validation-section');
                              }}
                              className="text-[#1D4ED8] hover:underline font-semibold cursor-pointer"
                            >
                              Inspect →
                            </button>
                          </>
                        ) : isSchemaError ? (
                          <>
                            <span className="text-red-800 font-semibold">
                              {item.requiredColumnCount} required columns
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTable(item.key);
                                scrollToSection('validation-section');
                              }}
                              className="text-red-700 hover:underline font-semibold cursor-pointer"
                            >
                              View missing →
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="text-[#64748B]">
                              {item.requiredColumnCount || '—'} required columns
                            </span>
                            <span className="text-[#64748B]">UTF-8 CSV</span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Schema Reference Drawer */}
          <details className="mt-6 border-t border-[#0A1128]/12 pt-4 text-sm">
            <summary className="cursor-pointer font-mono-tabular text-xs uppercase tracking-wider font-semibold text-[#0A1128] hover:text-[#1D4ED8]">
              Original CSV schema and prerequisites (6 tables)
            </summary>
            <p className="my-3 text-xs sm:text-sm text-[#475569] leading-relaxed">
              Dates must be YYYY-MM-DD. Literal “None” means no extras; unknown extra conventions
              are quarantined. Match, team and player IDs must agree across all tables. Training
              uses pre-2024 matches; evaluation begins in 2024. No external dataset is silently
              added.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              {Object.entries(schema?.required_columns || REQUIRED_TABLE_SCHEMAS).map(
                ([table, cols]) => (
                  <div
                    className="p-3 bg-[#F7F4EE] border border-[#0A1128]/12"
                    key={table}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <strong className="font-mono-tabular text-xs text-[#0A1128]">
                        {table}.csv
                      </strong>
                      <span className="font-mono-tabular text-[10px] text-[#64748B]">
                        {cols.length} columns
                      </span>
                    </div>
                    <p className="font-mono-tabular text-[11px] text-[#334155] break-words leading-relaxed">
                      {cols.join(', ')}
                    </p>
                  </div>
                )
              )}
            </div>
          </details>
        </section>

        {/* SECTION 02: VALIDATION & STRUCTURED DATA */}
        {hasValidationOrSchemaActivity && (
          <section id="validation-section" className={cardBase}>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#0A1128]/12 pb-4 mb-5">
              <div>
                <span className="font-mono-tabular text-xs uppercase tracking-widest text-[#1D4ED8] font-semibold">
                  STEP 02 · PER-FILE SCHEMA &amp; EVENT CONTRACT AUDIT
                </span>
                <h2 className="font-editorial text-2xl sm:text-3xl font-semibold mt-0.5">
                  02 / Validation &amp; structured data
                </h2>
              </div>

              <label className="flex min-w-0 max-w-full flex-col items-start sm:flex-row sm:items-center gap-2 text-xs sm:text-sm font-mono-tabular">
                <span className="text-[#475569]">Inspect table</span>
                <select
                  className="border border-[#0A1128]/25 px-3 py-1.5 bg-[#F7F4EE] font-mono-tabular text-xs font-semibold text-[#0A1128] min-w-0 max-w-full w-full sm:w-auto"
                  value={selectedTable}
                  onChange={(e) => setSelectedTable(e.target.value)}
                >
                  {CANONICAL_LIVE_TABLES.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.filename} ({job?.validation[t.key] ? 'Validated' : stagedValidations[t.key] ? 'Browser checked' : schemaErrors[t.key] ? 'Schema Error' : 'Pending'})
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {/* Quick Table Switcher Pills */}
            <div className="flex flex-wrap gap-2 mb-5">
              {CANONICAL_LIVE_TABLES.filter(
                (t) => Boolean(effectiveValidation[t.key] || schemaErrors[t.key])
              ).map((t) => {
                const v = effectiveValidation[t.key];
                const err = schemaErrors[t.key];
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setSelectedTable(t.key)}
                    className={`px-3 py-1.5 font-mono-tabular text-xs border transition-colors cursor-pointer ${
                      selectedTable === t.key
                        ? 'bg-[#0A1128] text-[#F7F4EE] border-[#0A1128]'
                        : err
                        ? 'bg-red-50 text-red-900 border-red-400 hover:border-red-700'
                        : 'bg-[#F7F4EE] text-[#334155] border-[#0A1128]/15 hover:border-[#1D4ED8]'
                    }`}
                  >
                    {t.filename}{' '}
                    {v
                      ? `(${v.processed_rows.toLocaleString()})`
                      : err
                      ? `(${err.missingColumns.length} missing)`
                      : ''}
                  </button>
                );
              })}
            </div>

            {/* Per-File Schema Column Audit Box */}
            <div
              data-testid="selected-table-schema-audit"
              className={`p-4 mb-5 border ${
                selectedTableSchemaError
                  ? 'bg-red-50/90 border-red-600/50 text-red-950'
                  : 'bg-[#F7F4EE] border-[#0A1128]/15 text-[#0A1128]'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                <div className="font-mono-tabular text-xs font-bold uppercase tracking-wider">
                  Schema Verification for {selectedTable}.csv ({selectedTableRequiredCols.length}{' '}
                  Required Columns)
                </div>
                {validation ? (
                  <span className="font-mono-tabular text-xs font-semibold text-emerald-700">
                    {selectedTableRequiredCols.length}/{selectedTableRequiredCols.length} Required
                    Columns Present
                  </span>
                ) : selectedTableSchemaError ? (
                  <span className="font-mono-tabular text-xs font-bold text-red-700">
                    {selectedTableSchemaError.missingColumns.length} Missing of{' '}
                    {selectedTableRequiredCols.length} Required Columns
                  </span>
                ) : (
                  <span className="font-mono-tabular text-xs text-[#64748B]">
                    Awaiting {selectedTable}.csv upload
                  </span>
                )}
              </div>

              {selectedTableSchemaError && selectedTableSchemaError.missingColumns.length > 0 && (
                <div className="mb-3 p-3 bg-white border border-red-300 text-xs font-mono-tabular text-red-900">
                  <strong>Missing required columns for {selectedTable}.csv:</strong>{' '}
                  {selectedTableSchemaError.missingColumns.join(', ')}
                </div>
              )}

              <div className="flex flex-wrap gap-1.5">
                {selectedTableRequiredCols.map((col) => {
                  const isPresent = validation
                    ? validation.columns.includes(col)
                    : selectedTableSchemaError
                    ? selectedTableSchemaError.presentColumns.includes(col)
                    : false;
                  const isMissing = selectedTableSchemaError
                    ? selectedTableSchemaError.missingColumns.includes(col)
                    : false;
                  return (
                    <span
                      key={col}
                      className={`px-2 py-0.5 font-mono-tabular text-[11px] border ${
                        isPresent
                          ? 'bg-emerald-500/10 text-emerald-900 border-emerald-600/35'
                          : isMissing
                          ? 'bg-red-500/15 text-red-900 border-red-600/45 font-bold'
                          : 'bg-[#EFECE4] text-[#475569] border-[#0A1128]/15'
                      }`}
                    >
                      {isPresent ? '✓ ' : isMissing ? '✕ ' : ''}
                      {col}
                    </span>
                  );
                })}
              </div>
            </div>

            {validation?.preliminary && <p className="p-4 border-l-2 border-[#1D4ED8] text-sm">{validation.notice} Upload ball_by_ball.csv to send staged companion files to the backend.</p>}
            {validation && !validation.preliminary && (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                  {[
                    ['Received', validation.original_rows, 'Total rows parsed from CSV'],
                    [
                      'Event-valid / parsed',
                      validation.processed_rows,
                      'Passed schema & contract checks',
                    ],
                    [
                      'Event-invalid',
                      validation.rejected_rows,
                      'Retained for diagnostic inspection',
                    ],
                    [
                      'Duplicate records',
                      validation.duplicate_records,
                      'Flagged duplicate records',
                    ],
                  ].map(([label, value, sub]) => (
                    <div
                      className="border border-[#0A1128]/15 bg-[#F7F4EE] p-3.5"
                      key={String(label)}
                    >
                      <p className="font-mono-tabular text-[11px] uppercase tracking-wider text-[#64748B]">
                        {label}
                      </p>
                      <p className="font-mono-tabular text-2xl font-bold text-[#0A1128] mt-1 tabular-nums">
                        {Number(value).toLocaleString()}
                      </p>
                      <p className="text-[11px] text-[#64748B] mt-0.5">{sub}</p>
                    </div>
                  ))}
                </div>

                <div className="p-3.5 bg-[#F7F4EE] border-l-2 border-[#1D4ED8] text-xs sm:text-sm text-[#334155] mb-5">
                  {validation.notice}
                </div>

                <div className="space-y-4">
                  <details open className="border border-[#0A1128]/12 bg-[#F7F4EE]/60 p-4">
                    <summary className="cursor-pointer font-mono-tabular text-xs font-bold uppercase tracking-wider text-[#0A1128] mb-3">
                      Raw preview · first 10 records ({selectedTable}.csv)
                    </summary>
                    <DataTable rows={validation.raw_preview} label="Raw uploaded data" />
                  </details>

                  <details open className="border border-[#0A1128]/12 bg-[#F7F4EE]/60 p-4">
                    <summary className="cursor-pointer font-mono-tabular text-xs font-bold uppercase tracking-wider text-[#0A1128] mb-3">
                      Pandas structured preview · first 10 records ({selectedTable}.csv)
                    </summary>
                    <DataTable
                      rows={validation.structured_preview}
                      label="Structured normalized data"
                    />
                  </details>

                  <details className="border border-[#0A1128]/12 bg-[#F7F4EE]/60 p-4">
                    <summary className="cursor-pointer font-mono-tabular text-xs font-bold uppercase tracking-wider text-[#0A1128]">
                      Missing values, detected columns and validation issues
                    </summary>
                    <div className="space-y-3 mt-3">
                      <p className="text-xs font-mono-tabular break-words text-[#334155] leading-relaxed">
                        <strong>Detected ({validation.columns.length}):</strong>{' '}
                        {validation.columns.join(', ')}
                        <br />
                        <strong>Derived ({validation.normalized_columns.length}):</strong>{' '}
                        {validation.normalized_columns.join(', ')}
                      </p>
                      <DataTable
                        rows={Object.entries(validation.missing_values).map(
                          ([column, count]) => ({
                            column,
                            empty_values: count,
                          })
                        )}
                        label="Missing values"
                      />
                      <DataTable
                        rows={validation.issues}
                        label="Validation issues (first 100)"
                      />
                      <p className="text-xs font-mono-tabular break-all text-[#475569]">
                        File SHA-256: <span className="text-[#0A1128]">{validation.sha256}</span>
                      </p>
                    </div>
                  </details>
                </div>
              </>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 mt-6 pt-4 border-t border-[#0A1128]/12">
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className={`${buttonBase} bg-[#F7F4EE]`}
                  disabled={busy || working || !session}
                  onClick={() => void download('structured')}
                >
                  <Download size={15} className="text-[#1D4ED8]" />
                  <span>Export structured deliveries</span>
                </button>
                <button
                  type="button"
                  className={`${buttonBase} bg-[#F7F4EE] hover:bg-red-50 hover:border-red-400 hover:text-red-800`}
                  disabled={busy || working}
                  onClick={() =>
                    void action(async () => {
                      if (session) {
                        await api.remove(session);
                      }
                      clearSession();
                    })
                  }
                >
                  <X size={15} />
                  <span>Delete session</span>
                </button>
              </div>
              <span className="font-mono-tabular text-xs text-[#64748B]">
                {session
                  ? `Session ID: ${session.job_id.slice(0, 12)}…`
                  : `Browser-checked tables: ${Object.keys(stagedValidations).length}/6 (backend validation pending)`}
              </span>
            </div>
          </section>
        )}

        {/* SECTION 03: PRESSURE ANALYSIS & REAL BACKEND TIMELINE */}
        {hasUploadSession && (
          <section id="pipeline-section" className={cardBase}>
            <div className="flex flex-wrap justify-between items-center gap-4 border-b border-[#0A1128]/12 pb-4 mb-5">
              <div>
                <span className="font-mono-tabular text-xs uppercase tracking-widest text-[#1D4ED8] font-semibold">
                  STEP 03 · PHASE 7A EXECUTION TIMELINE
                </span>
                <h2 className="font-editorial text-2xl sm:text-3xl font-semibold mt-0.5">
                  03 / Pressure analysis
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`px-2.5 py-1 font-mono-tabular text-xs uppercase font-semibold border ${
                    job?.analysis_available
                      ? 'bg-emerald-500/10 text-emerald-800 border-emerald-600/35'
                      : 'bg-amber-500/10 text-amber-900 border-amber-600/35'
                  }`}
                >
                  {job?.analysis_available
                    ? '6/6 Tables Validated · Ready'
                    : remainingMissingTables.length === 0
                    ? 'Syncing 6/6 Tables to Session…'
                    : `Awaiting ${remainingMissingTables.length} Table(s)`}
                </span>

                <button
                  type="button"
                  className={`${buttonBase} bg-[#0A1128] text-[#F7F4EE] hover:bg-[#1D4ED8] border-[#0A1128]`}
                  disabled={
                    busy || !session || !job?.analysis_available || job.status !== 'validated'
                  }
                  onClick={() =>
                    void action(async () => {
                      if (!session || !job) return;
                      await api.start(session);
                      setJob({ ...job, status: 'queued' });
                      setResult(null);
                      setEvidence(null);
                    })
                  }
                >
                  <Play size={15} />
                  <span>Start Analysis</span>
                </button>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-[#475569] mb-5">
              Browser prechecks are labelled separately. Once a backend session exists, the timeline shows
              actual ingestion and analysis stages returned by the backend; no simulated progress is used.
            </p>

            {/* Backend Stages Timeline */}
            <ol
              className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs sm:text-sm"
              aria-live="polite"
            >
              {timelineStages.map((st) => {
                const isCurrent = st.state === 'active';
                return (
                  <li
                    key={st.index}
                    className={`p-3.5 border flex items-start gap-3 transition-colors ${
                      isCurrent
                        ? 'bg-[#0A1128] text-[#F7F4EE] border-[#1D4ED8]'
                        : st.state === 'failed'
                        ? 'bg-red-50 text-red-900 border-red-400'
                        : 'bg-[#F7F4EE] text-[#0A1128] border-[#0A1128]/15'
                    }`}
                  >
                    <div className="pt-0.5 shrink-0">
                      {isCurrent ? (
                        <span
                          className="inline-flex items-center justify-center w-5 h-5 bg-[#1D4ED8] text-[#F7F4EE] font-mono-tabular text-xs font-bold"
                          aria-label="Current stage"
                        >
                          →
                        </span>
                      ) : (
                        <CheckCircle2 size={16} className="text-[#1D4ED8] mt-0.5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2 font-mono-tabular text-[10px]">
                        <span
                          className={
                            isCurrent ? 'text-[#60A5FA] font-bold' : 'text-[#64748B]'
                          }
                        >
                          STAGE {st.stepNumber} · {st.category}
                        </span>
                        {st.tableKey && (
                          <span
                            className={`px-1.5 py-0.5 border ${
                              isCurrent
                                ? 'border-[#60A5FA]/40 text-[#93C5FD]'
                                : 'border-[#0A1128]/15 text-[#475569]'
                            }`}
                          >
                            {st.tableKey}
                          </span>
                        )}
                      </div>
                      <div className="font-medium leading-snug break-words">{st.rawText}</div>
                    </div>
                  </li>
                );
              })}
            </ol>

            {/* Live Job Status Bar */}
            <div className="mt-5 p-4 bg-[#0A1128] text-[#F7F4EE] border border-[#1D4ED8]/50 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {working ? (
                  <Loader2 size={18} className="text-[#60A5FA] animate-spin shrink-0" />
                ) : (
                  <Layers size={18} className="text-[#60A5FA] shrink-0" />
                )}
                <p role="status" className="font-mono-tabular text-xs sm:text-sm font-medium">
                  Status:{' '}
                  <strong className="uppercase text-[#60A5FA]">
                    {job ? job.status : 'browser checked'}
                  </strong>
                  {job?.message
                    ? ` — ${job.message}`
                    : !job
                    ? ` — ${validatedCount}/6 table(s) validated; supply remaining tables to enable analysis.`
                    : ''}
                </p>
              </div>

              {working && (
                <button
                  type="button"
                  className="px-3.5 py-1.5 bg-[#F7F4EE] text-[#0A1128] hover:bg-red-100 font-mono-tabular text-xs font-semibold transition-colors cursor-pointer"
                  disabled={busy}
                  onClick={() =>
                    void action(async () => {
                      const r = await api.cancel(session!);
                      setActivity(r.message);
                    })
                  }
                >
                  Cancel at next safe stage
                </button>
              )}
            </div>
          </section>
        )}

        {/* SECTION 04: UPLOADED-DATASET RESULTS */}
        {result && (
          <section id="results-section" className={cardBase}>
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-[#0A1128]/12 pb-5 mb-6">
              <div>
                <span className="font-mono-tabular text-xs uppercase tracking-widest text-[#1D4ED8] font-semibold">
                  STEP 04 · PHASE 7A PRESSURE EVALUATION OUTPUT
                </span>
                <h2 className="font-editorial text-2xl sm:text-4xl font-semibold mt-0.5">
                  04 / Uploaded-dataset results
                </h2>
                <p className="text-xs sm:text-sm text-[#475569] mt-1">
                  Exploratory results; not independently Phase 7B reviewed. Evidence labels and
                  context coverage are part of every assessment.
                </p>
              </div>

              {result.rankings && (
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => scrollToSection('live-top-10-batters')}
                    className="px-3 py-1.5 bg-[#F7F4EE] hover:bg-[#0A1128] text-[#0A1128] hover:text-[#F7F4EE] border border-[#0A1128]/20 font-mono-tabular text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Top 10 Batters ({top10Batters.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollToSection('live-top-10-bowlers')}
                    className="px-3 py-1.5 bg-[#F7F4EE] hover:bg-[#0A1128] text-[#0A1128] hover:text-[#F7F4EE] border border-[#0A1128]/20 font-mono-tabular text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Top 10 Bowlers ({top10Bowlers.length})
                  </button>
                </div>
              )}
            </div>

            {result.message && (
              <div className="p-4 mb-5 bg-[#F7F4EE] border-l-4 border-[#1D4ED8] text-sm font-medium text-[#0A1128]">
                {result.message}
              </div>
            )}

            {/* Dataset Summary KPI Strip + Structured Table */}
            {result.summary && (
              <div className="space-y-4 mb-8">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {[
                    ['Uploaded Deliveries', result.summary.uploaded_events],
                    ['Context-Valid Balls', result.summary.context_valid_events],
                    ['Pressure Events', result.summary.pressure_events],
                    ['Reconciled Matches', result.summary.matches],
                    ['Pre-2024 Training', result.summary.training_matches],
                    ['2024+ Evaluation', result.summary.evaluation_matches],
                  ].map(([label, val]) => (
                    <div
                      key={String(label)}
                      className="p-3.5 bg-[#F7F4EE] border border-[#0A1128]/15"
                    >
                      <div className="font-mono-tabular text-[10px] uppercase tracking-wider text-[#64748B]">
                        {label}
                      </div>
                      <div className="font-mono-tabular text-xl font-bold text-[#0A1128] mt-1 tabular-nums">
                        {typeof val === 'number' ? val.toLocaleString() : format(val)}
                      </div>
                    </div>
                  ))}
                </div>
                <DataTable rows={[result.summary]} label="Dataset summary" />
              </div>
            )}

            {result.rankings && (
              <>
                {/* Dual-Role Top 10 Overview Grid (Batters & Bowlers Side-by-Side) */}
                {(top10Batters.length > 0 || top10Bowlers.length > 0) && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Top 10 Batters Under Pressure Card */}
                    <div
                      id="live-top-10-batters"
                      className="min-w-0 border border-[#0A1128]/15 bg-[#F7F4EE] p-4 sm:p-5 scroll-mt-24 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-[#0A1128]/12 pb-3">
                        <div>
                          <span className="font-mono-tabular text-[10px] uppercase tracking-widest text-[#1D4ED8] font-bold">
                            BATTING LEADERBOARD
                          </span>
                          <h3 className="font-editorial text-2xl font-semibold text-[#0A1128]">
                            Top 10 Batters Under Pressure
                          </h3>
                        </div>
                        <span className="font-mono-tabular text-xs text-[#64748B]">
                          {top10Batters.length} ranked
                        </span>
                      </div>

                      {top10Batters.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs text-left whitespace-nowrap border-collapse">
                            <thead className="bg-[#EFECE4] font-mono-tabular text-[10px] uppercase text-[#475569]">
                              <tr>
                                <th className="py-2 px-2.5">Rank</th>
                                <th className="py-2 px-2.5">Batter</th>
                                <th className="py-2 px-2.5 text-right">Score</th>
                                <th className="py-2 px-2.5 text-right">Exp / M</th>
                                <th className="py-2 px-2.5">Evidence</th>
                                <th className="py-2 px-2.5 text-right">Inspect</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#0A1128]/8 font-mono-tabular">
                              {top10Batters.map((p) => {
                                const tier = getEvidenceTierStyle(p.evidence_level);
                                return (
                                  <tr
                                    key={p.player_id}
                                    className="hover:bg-[#EFECE4]/60 transition-colors"
                                  >
                                    <td className="py-2 px-2.5 font-semibold text-[#64748B]">
                                      #{String(p.rank).padStart(2, '0')}
                                    </td>
                                    <td className="py-2 px-2.5 font-sans font-semibold text-[#0A1128]">
                                      {p.player_name}
                                      <span className="block font-mono-tabular text-[10px] font-normal text-[#64748B]">
                                        ID {p.player_id}
                                      </span>
                                    </td>
                                    <td className="py-2 px-2.5 text-right font-bold text-[#1D4ED8] tabular-nums">
                                      {format(p.pressure_score)}
                                    </td>
                                    <td className="py-2 px-2.5 text-right tabular-nums">
                                      {p.exposures}b · {p.matches}m
                                    </td>
                                    <td className="py-2 px-2.5">
                                      <span
                                        className={`inline-block px-1.5 py-0.5 text-[10px] border ${tier.badgeClass}`}
                                      >
                                        {p.evidence_level}
                                      </span>
                                    </td>
                                    <td className="py-2 px-2.5 text-right">
                                      <button
                                        type="button"
                                        disabled={busy}
                                        onClick={() =>
                                          void inspectPlayerEvidence(p.player_id, 'batting')
                                        }
                                        className="px-2 py-1 text-[10px] font-mono-tabular font-semibold bg-[#EFECE4] hover:bg-[#0A1128] text-[#0A1128] hover:text-[#F7F4EE] border border-[#0A1128]/20 transition-colors cursor-pointer"
                                      >
                                        Inspect batter
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-xs font-mono-tabular text-[#64748B] py-4">
                          No supported batting candidates in this dataset.
                        </p>
                      )}
                    </div>

                    {/* Top 10 Bowlers Under Pressure Card */}
                    <div
                      id="live-top-10-bowlers"
                      className="min-w-0 border border-[#0A1128]/15 bg-[#F7F4EE] p-4 sm:p-5 scroll-mt-24 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-[#0A1128]/12 pb-3">
                        <div>
                          <span className="font-mono-tabular text-[10px] uppercase tracking-widest text-[#1D4ED8] font-bold">
                            BOWLING LEADERBOARD
                          </span>
                          <h3 className="font-editorial text-2xl font-semibold text-[#0A1128]">
                            Top 10 Bowlers Under Pressure
                          </h3>
                        </div>
                        <span className="font-mono-tabular text-xs text-[#64748B]">
                          {top10Bowlers.length} ranked
                        </span>
                      </div>

                      {top10Bowlers.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs text-left whitespace-nowrap border-collapse">
                            <thead className="bg-[#EFECE4] font-mono-tabular text-[10px] uppercase text-[#475569]">
                              <tr>
                                <th className="py-2 px-2.5">Rank</th>
                                <th className="py-2 px-2.5">Bowler</th>
                                <th className="py-2 px-2.5 text-right">Score</th>
                                <th className="py-2 px-2.5 text-right">Exp / M</th>
                                <th className="py-2 px-2.5">Evidence</th>
                                <th className="py-2 px-2.5 text-right">Inspect</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#0A1128]/8 font-mono-tabular">
                              {top10Bowlers.map((p) => {
                                const tier = getEvidenceTierStyle(p.evidence_level);
                                return (
                                  <tr
                                    key={p.player_id}
                                    className="hover:bg-[#EFECE4]/60 transition-colors"
                                  >
                                    <td className="py-2 px-2.5 font-semibold text-[#64748B]">
                                      #{String(p.rank).padStart(2, '0')}
                                    </td>
                                    <td className="py-2 px-2.5 font-sans font-semibold text-[#0A1128]">
                                      {p.player_name}
                                      <span className="block font-mono-tabular text-[10px] font-normal text-[#64748B]">
                                        ID {p.player_id}
                                      </span>
                                    </td>
                                    <td className="py-2 px-2.5 text-right font-bold text-[#1D4ED8] tabular-nums">
                                      {format(p.pressure_score)}
                                    </td>
                                    <td className="py-2 px-2.5 text-right tabular-nums">
                                      {p.exposures}b · {p.matches}m
                                    </td>
                                    <td className="py-2 px-2.5">
                                      <span
                                        className={`inline-block px-1.5 py-0.5 text-[10px] border ${tier.badgeClass}`}
                                      >
                                        {p.evidence_level}
                                      </span>
                                    </td>
                                    <td className="py-2 px-2.5 text-right">
                                      <button
                                        type="button"
                                        disabled={busy}
                                        onClick={() =>
                                          void inspectPlayerEvidence(p.player_id, 'bowling')
                                        }
                                        className="px-2 py-1 text-[10px] font-mono-tabular font-semibold bg-[#EFECE4] hover:bg-[#0A1128] text-[#0A1128] hover:text-[#F7F4EE] border border-[#0A1128]/20 transition-colors cursor-pointer"
                                      >
                                        Inspect bowler
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-xs font-mono-tabular text-[#64748B] py-4">
                          No supported bowling candidates in this dataset.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Role Switcher, Player Filter & Rankings Export Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 mt-6 mb-4 pb-4 border-b border-[#0A1128]/12">
                  <div className="flex flex-wrap items-center gap-2.5">
                    {(['batting', 'bowling'] as const).map((r) => (
                      <button
                        type="button"
                        className={`${buttonBase} ${
                          r === role
                            ? 'bg-[#0A1128] text-[#F7F4EE] border-[#0A1128]'
                            : 'bg-[#F7F4EE] text-[#0A1128]'
                        }`}
                        key={r}
                        disabled={busy}
                        onClick={() => {
                          setRole(r);
                          setEvidence(null);
                        }}
                        aria-pressed={r === role}
                      >
                        {r === 'batting' ? 'Top batters' : 'Top bowlers'}
                      </button>
                    ))}

                    <button
                      type="button"
                      className={`${buttonBase} bg-[#F7F4EE]`}
                      disabled={busy}
                      onClick={() => void download('rankings')}
                    >
                      <Download size={15} className="text-[#1D4ED8]" />
                      <span>Export all rankings</span>
                    </button>
                  </div>

                  {/* Quick Player Filter */}
                  <div className="relative min-w-[220px]">
                    <Search
                      size={14}
                      className="text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2"
                    />
                    <input
                      type="text"
                      value={playerSearch}
                      onChange={(e) => setPlayerSearch(e.target.value)}
                      placeholder={`Filter ${role} candidates…`}
                      aria-label="Filter ranked candidates"
                      className="w-full pl-8 pr-3 py-2 bg-[#F7F4EE] border border-[#0A1128]/20 text-xs font-mono-tabular"
                    />
                  </div>
                </div>

                {/* Active Role Leaderboard & Detailed Player Statistics */}
                {leaders.length ? (
                  <>
                    <div className="p-4 mb-4 bg-[#0A1128] text-[#F7F4EE] border border-[#1D4ED8]/50 flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs sm:text-sm flex items-center gap-2">
                        <Award size={16} className="text-[#60A5FA] shrink-0" />
                        <span>
                          Leading observed {role === 'batting' ? 'batter' : 'bowler'}:{' '}
                          <strong className="text-[#60A5FA]">{leaders[0].player_name}</strong> ·{' '}
                          {leaders[0].evidence_level} evidence. Showing {activeRoleCandidates.length}{' '}
                          of {result.rankings[role].length} candidates.
                        </span>
                      </p>
                      <span className="font-mono-tabular text-[11px] text-[#93C5FD]">
                        Score {format(leaders[0].pressure_score)} · {leaders[0].exposures}{' '}
                        exposures
                      </span>
                    </div>

                    <div className="overflow-x-auto border border-[#0A1128]/15 bg-[#F7F4EE]">
                      <table className="w-full text-xs sm:text-sm text-left whitespace-nowrap border-collapse">
                        <thead className="bg-[#EFECE4] border-b border-[#0A1128]/15 font-mono-tabular text-[11px] uppercase text-[#334155]">
                          <tr>
                            {[
                              'Rank / player',
                              'Pressure score',
                              'Raw / Adj rate',
                              'Exposures',
                              'Matches',
                              'Evidence',
                              'Context',
                              '95% interval',
                              'Details',
                            ].map((h) => (
                              <th className="p-3" key={h}>
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#0A1128]/10">
                          {activeRoleCandidates.map((p) => {
                            const tier = getEvidenceTierStyle(p.evidence_level);
                            const isInspected = evidence?.metrics.player_id === p.player_id;
                            return (
                              <tr
                                className={`transition-colors ${
                                  isInspected ? 'bg-[#EFECE4]' : 'hover:bg-[#EFECE4]/60'
                                }`}
                                key={p.player_id}
                              >
                                <td className="p-3 font-medium text-[#0A1128]">
                                  {p.rank}. {p.player_name}
                                  <span className="block font-mono-tabular text-[11px] text-[#64748B]">
                                    ID {p.player_id} · {p.source_record_count} records
                                  </span>
                                </td>
                                <td className="p-3 font-mono-tabular font-bold text-[#1D4ED8] tabular-nums">
                                  {format(p.pressure_score)}
                                </td>
                                <td className="p-3 font-mono-tabular text-xs tabular-nums">
                                  {format(p.rate)} / <strong>{format(p.adjusted_rate)}</strong>
                                </td>
                                <td className="p-3 font-mono-tabular tabular-nums">
                                  {p.exposures}
                                </td>
                                <td className="p-3 font-mono-tabular tabular-nums">
                                  {p.matches}
                                </td>
                                <td className="p-3">
                                  <span
                                    className={`inline-block px-2 py-0.5 font-mono-tabular text-xs border ${tier.badgeClass}`}
                                  >
                                    {p.evidence_level}
                                  </span>
                                </td>
                                <td className="p-3 font-mono-tabular tabular-nums">
                                  {format(p.context_coverage)}%
                                </td>
                                <td className="p-3 font-mono-tabular text-xs tabular-nums">
                                  {format(p.ci95_low)} to {format(p.ci95_high)}
                                </td>
                                <td className="p-3">
                                  <button
                                    type="button"
                                    className={`inline-flex items-center justify-center gap-2 py-1.5 px-3 text-xs font-medium border transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                                      isInspected
                                        ? 'bg-[#1D4ED8] hover:bg-[#1E40AF] text-[#F7F4EE] border-[#1D4ED8]'
                                        : 'bg-[#F7F4EE] hover:bg-[#0A1128] text-[#0A1128] hover:text-[#F7F4EE] border-[#0A1128]/20'
                                    }`}
                                    disabled={busy}
                                    onClick={() =>
                                      void action(async () =>
                                        setEvidence(await api.player(session!, p.player_id, role))
                                      )
                                    }
                                  >
                                    View evidence
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <div className="p-6 bg-[#F7F4EE] border border-[#0A1128]/15 text-sm text-[#334155]">
                    No supported {role} candidates. Thresholds have not been lowered.
                  </div>
                )}

                {/* Player Ball-Level & Match-Level Evidence Dossier */}
                {evidence && (
                  <div
                    ref={evidenceSectionRef}
                    className="mt-8 space-y-5 border-2 border-[#0A1128] bg-[#F7F4EE] p-5 sm:p-6"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#0A1128]/15 pb-4">
                      <div>
                        <span className="font-mono-tabular text-xs uppercase tracking-widest text-[#1D4ED8] font-bold">
                          GRANULAR PLAYER EVIDENCE DOSSIER · {role.toUpperCase()}
                        </span>
                        <h3 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#0A1128] mt-0.5">
                          {evidence.metrics.player_name} · {evidence.metrics.source_record_count}{' '}
                          supporting records / {evidence.metrics.exposures} exposures
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEvidence(null)}
                        className="self-start sm:self-auto px-3 py-1.5 bg-[#EFECE4] hover:bg-[#0A1128] text-[#0A1128] hover:text-[#F7F4EE] font-mono-tabular text-xs font-semibold border border-[#0A1128]/20 transition-colors cursor-pointer"
                      >
                        Close evidence
                      </button>
                    </div>

                    <p className="text-xs sm:text-sm text-[#334155] leading-relaxed">
                      Raw scaled rate: <strong>{format(evidence.metrics.rate)}</strong> ·
                      Context-adjusted rate:{' '}
                      <strong>{format(evidence.metrics.adjusted_rate)}</strong> · Shrunk score:{' '}
                      <strong className="text-[#1D4ED8]">
                        {format(evidence.metrics.pressure_score)}
                      </strong>
                      . Interval shown is the original match-bootstrap interval for the adjusted
                      rate.
                    </p>

                    <div className="space-y-4">
                      <div>
                        <h4 className="font-mono-tabular text-xs uppercase tracking-wider text-[#475569] mb-2">
                          01 · Player Metrics &amp; Score Breakdown
                        </h4>
                        <DataTable
                          rows={[evidence.metrics]}
                          label="Player metrics and score breakdown"
                        />
                      </div>

                      <div>
                        <h4 className="font-mono-tabular text-xs uppercase tracking-wider text-[#475569] mb-2">
                          02 · Match-Level Pressure Aggregation ({evidence.matches.length} matches)
                        </h4>
                        <DataTable rows={evidence.matches} label="Match-level evidence" />
                      </div>

                      <div>
                        <h4 className="font-mono-tabular text-xs uppercase tracking-wider text-[#475569] mb-2">
                          03 · Ball-by-Ball Pressure Deliveries ({evidence.total} total records)
                        </h4>
                        <DataTable rows={evidence.balls} label="Ball-level evidence" />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#0A1128]/12">
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          className={buttonBase}
                          disabled={busy || !evidence.offset}
                          onClick={() =>
                            void action(async () =>
                              setEvidence(
                                await api.player(
                                  session!,
                                  evidence.metrics.player_id,
                                  role,
                                  Math.max(0, evidence.offset - evidence.limit)
                                )
                              )
                            )
                          }
                        >
                          Previous records
                        </button>
                        <button
                          type="button"
                          className={buttonBase}
                          disabled={busy || evidence.offset + evidence.limit >= evidence.total}
                          onClick={() =>
                            void action(async () =>
                              setEvidence(
                                await api.player(
                                  session!,
                                  evidence.metrics.player_id,
                                  role,
                                  evidence.offset + evidence.limit
                                )
                              )
                            )
                          }
                        >
                          Next records
                        </button>
                      </div>
                      <p className="font-mono-tabular text-xs text-[#475569]">
                        Records {evidence.offset + 1}–
                        {Math.min(evidence.offset + evidence.limit, evidence.total)} of{' '}
                        {evidence.total}. Source record numbers refer to your uploaded delivery CSV,
                        excluding its header.
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Source Traceability and Match Reconciliation */}
            <details className="mt-6 border-t border-[#0A1128]/12 pt-4">
              <summary className="cursor-pointer font-mono-tabular text-xs font-bold uppercase tracking-wider text-[#0A1128] hover:text-[#1D4ED8]">
                Source traceability and match checks
              </summary>
              <div className="space-y-4 mt-4">
                {result.source_files && (
                  <DataTable
                    rows={Object.entries(result.source_files).map(([table, v]) => ({
                      table,
                      ...v,
                    }))}
                    label="Source hashes"
                  />
                )}
                <DataTable
                  rows={result.issues || []}
                  label="Relationship issues (first 100)"
                />
                <DataTable rows={result.match_checks || []} label="Match reconciliation" />
              </div>
            </details>
          </section>
        )}

        {/* SECTION 05: METHODOLOGY & CONFIDENCE INDICATORS */}
        {method && (
          <section id="methodology-section" className={cardBase}>
            <div className="border-b border-[#0A1128]/12 pb-4 mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
              <div>
                <span className="font-mono-tabular text-xs uppercase tracking-widest text-[#1D4ED8] font-semibold">
                  STEP 05 · PHASE 7A METHODOLOGY &amp; CONFIDENCE GATES
                </span>
                <h2 className="font-editorial text-2xl sm:text-3xl font-semibold mt-0.5">
                  How this analysis works
                </h2>
              </div>
              <span className="font-mono-tabular text-xs text-[#475569]">
                Version: {method.version}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 text-xs sm:text-sm leading-relaxed text-[#334155]">
              <div className="p-4 bg-[#F7F4EE] border border-[#0A1128]/12 space-y-1.5">
                <div className="font-mono-tabular text-[11px] font-bold uppercase text-[#1D4ED8]">
                  01 · Empirical-Bayes &amp; Bootstrap Architecture
                </div>
                <p>{method.description}</p>
              </div>
              <div className="p-4 bg-[#F7F4EE] border border-[#0A1128]/12 space-y-1.5">
                <div className="font-mono-tabular text-[11px] font-bold uppercase text-[#1D4ED8]">
                  02 · Pre-Declared Pressure Situations
                </div>
                <p>{method.pressure}</p>
              </div>
              <div className="p-4 bg-[#F7F4EE] border border-[#0A1128]/12 space-y-1.5">
                <div className="font-mono-tabular text-[11px] font-bold uppercase text-[#1D4ED8]">
                  03 · Residual Scoring Formulation
                </div>
                <p>{method.scores}</p>
              </div>
              <div className="p-4 bg-[#F7F4EE] border border-[#0A1128]/12 space-y-1.5">
                <div className="font-mono-tabular text-[11px] font-bold uppercase text-[#1D4ED8]">
                  04 · Evidence Tiers &amp; Confidence Gates
                </div>
                <p>{method.evidence}</p>
              </div>
            </div>

            <div className="p-4 bg-[#F7F4EE] border border-[#0A1128]/12">
              <div className="font-mono-tabular text-xs font-bold uppercase text-[#0A1128] mb-2.5 flex items-center gap-2">
                <Info size={14} className="text-[#1D4ED8]" />
                <span>Retained Methodological Limitations &amp; Scope Boundaries</span>
              </div>
              <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-[#475569]">
                {method.limitations.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
