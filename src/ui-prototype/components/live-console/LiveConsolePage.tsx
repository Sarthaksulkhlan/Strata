import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Play,
  ShieldCheck,
  History,
  Database,
} from 'lucide-react';
import {
  clutchIqApi,
  DatasetValidationData,
  LiveConsoleAnalysisResults,
  LiveConsoleJobStatus,
} from '../../../api/clutchiq';
import {
  CsvPreviewData,
  formatFileSize,
  parseCsvPreview,
} from '../../../lib/csvPreviewAndExport';
import { BRAND_CONFIG } from '../../data/mockCricketData';
import { LiveConsoleProcessingView } from './LiveConsoleProcessingView';
import { LiveConsoleResultsView } from './LiveConsoleResultsView';

interface SessionHistoryItem {
  jobId: string;
  filename: string;
  fileSize: number;
  completedAt: string;
  totalRecords: number;
  bestBatterName: string;
  bestBowlerName: string;
  results: LiveConsoleAnalysisResults;
}

const SESSION_HISTORY_KEY = 'clutchiq_live_console_session_history_v1';

interface LiveConsolePageProps {
  onBackToLanding: () => void;
}

export const LiveConsolePage: React.FC<LiveConsolePageProps> = ({ onBackToLanding }) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Uploaded file state
  const [filename, setFilename] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number>(0);
  const [csvContent, setCsvContent] = useState<string>('');
  const [uploadStatus, setUploadStatus] = useState<
    'idle' | 'uploaded' | 'validating' | 'validated' | 'invalid'
  >('idle');
  const [preview, setPreview] = useState<CsvPreviewData | null>(null);

  // Backend validation & analysis state
  const [validationResult, setValidationResult] = useState<DatasetValidationData | null>(
    null
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeJob, setActiveJob] = useState<LiveConsoleJobStatus | null>(null);
  const [analysisResults, setAnalysisResults] =
    useState<LiveConsoleAnalysisResults | null>(null);
  const [isStartingJob, setIsStartingJob] = useState(false);

  // Session History
  const [sessionHistory, setSessionHistory] = useState<SessionHistoryItem[]>(() => {
    try {
      const raw = window.sessionStorage.getItem(SESSION_HISTORY_KEY);
      return raw ? (JSON.parse(raw) as SessionHistoryItem[]) : [];
    } catch {
      return [];
    }
  });

  const saveToSessionHistory = (res: LiveConsoleAnalysisResults) => {
    const newItem: SessionHistoryItem = {
      jobId: res.job_id,
      filename: res.filename,
      fileSize: res.file_size,
      completedAt: res.completed_at,
      totalRecords: res.summary.total_records,
      bestBatterName: res.best_batter?.player_name || 'N/A',
      bestBowlerName: res.best_bowler?.player_name || 'N/A',
      results: res,
    };
    setSessionHistory((prev) => {
      const next = [newItem, ...prev.filter((item) => item.jobId !== res.job_id)].slice(
        0,
        10
      );
      try {
        window.sessionStorage.setItem(SESSION_HISTORY_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage quota errors
      }
      return next;
    });
  };

  const activeJobId = activeJob?.job_id ?? null;
  const activeJobStatus = activeJob?.status ?? null;

  // Poll backend job status when a job is running
  useEffect(() => {
    if (!activeJobId || activeJobStatus !== 'running') return;

    let cancelled = false;
    const poll = async () => {
      try {
        const res = await clutchIqApi.getJobStatus(activeJobId);
        if (cancelled) return;

        if (res.data.status === 'completed') {
          window.clearInterval(interval);
          const finalRes = await clutchIqApi.getJobResults(activeJobId);
          setActiveJob(res.data);
          setAnalysisResults(finalRes.data);
          saveToSessionHistory(finalRes.data);
        } else if (res.data.status === 'failed') {
          window.clearInterval(interval);
          setActiveJob(res.data);
          setErrorMessage(res.data.error || 'Analysis job failed on the backend.');
        } else {
          setActiveJob(res.data);
        }
      } catch (err) {
        if (!cancelled) {
          setErrorMessage(
            err instanceof Error ? err.message : 'Lost connection to analysis backend.'
          );
        }
      }
    };

    const interval = window.setInterval(() => {
      void poll();
    }, 240);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activeJobId, activeJobStatus]);

  const loadCsvIntoWorkspace = (name: string, size: number, text: string) => {
    setFilename(name);
    setFileSize(size);
    setCsvContent(text);
    setValidationResult(null);
    setErrorMessage(null);
    setActiveJob(null);
    setAnalysisResults(null);

    if (!name.toLowerCase().endsWith('.csv')) {
      setUploadStatus('invalid');
      setPreview(null);
      setErrorMessage(
        `Invalid file "${name}". Only .csv ball-by-ball cricket datasets are supported.`
      );
      return;
    }

    const parsedPreview = parseCsvPreview(text, 8);
    setPreview(parsedPreview);
    setUploadStatus('uploaded');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      loadCsvIntoWorkspace(file.name, file.size, text);
    };
    reader.onerror = () => {
      setErrorMessage('Failed to read the selected file from disk.');
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      loadCsvIntoWorkspace(file.name, file.size, text);
    };
    reader.readAsText(file);
  };

  const handleLoadSampleDataset = async () => {
    try {
      setErrorMessage(null);
      const res = await clutchIqApi.sampleDataset();
      loadCsvIntoWorkspace(
        res.data.filename,
        res.data.file_size,
        res.data.csv_content
      );
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Unable to load sample dataset from backend.'
      );
    }
  };

  const handleValidateDataset = async () => {
    if (!filename || !csvContent) {
      setErrorMessage('Please upload a CSV dataset first before validating.');
      return;
    }
    setUploadStatus('validating');
    setErrorMessage(null);
    try {
      const result = await clutchIqApi.validateDataset({
        filename,
        file_size: fileSize,
        csv_content: csvContent,
      });
      setValidationResult(result);
      if (result.valid) {
        setUploadStatus('validated');
      } else {
        setUploadStatus('invalid');
        setErrorMessage(result.error || 'Dataset validation failed.');
      }
    } catch (err) {
      setUploadStatus('invalid');
      setErrorMessage(
        err instanceof Error ? err.message : 'Backend dataset validation failed.'
      );
    }
  };

  const handleStartAnalysis = async () => {
    if (!filename || !csvContent) {
      setErrorMessage('Please upload a ball-by-ball CSV dataset before starting analysis.');
      return;
    }
    setIsStartingJob(true);
    setErrorMessage(null);
    setAnalysisResults(null);
    try {
      const res = await clutchIqApi.startAnalysis({
        filename,
        file_size: fileSize,
        csv_content: csvContent,
      });
      setActiveJob(res.data);
      if (res.data.status === 'completed') {
        const finalRes = await clutchIqApi.getJobResults(res.data.job_id);
        setAnalysisResults(finalRes.data);
        saveToSessionHistory(finalRes.data);
      }
    } catch (err) {
      setUploadStatus('invalid');
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to start backend analysis.'
      );
    } finally {
      setIsStartingJob(false);
    }
  };

  const handleResetWorkspace = () => {
    setFilename(null);
    setFileSize(0);
    setCsvContent('');
    setUploadStatus('idle');
    setPreview(null);
    setValidationResult(null);
    setErrorMessage(null);
    setActiveJob(null);
    setAnalysisResults(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div
      data-testid="live-console-page"
      className="min-h-screen bg-[#F7F4EE] text-[#0A1128] flex flex-col"
    >
      {/* Top Bar matching STRATA Top Bar Contract */}
      <header className="sticky top-0 z-40 bg-[#F7F4EE]/95 border-b border-[#0A1128]/12">
        <div className="max-w-[1380px] mx-auto flex items-center justify-between gap-8 px-6 lg:px-12 h-16">
          <button
            type="button"
            onClick={onBackToLanding}
            className="font-editorial text-2xl font-bold tracking-tight cursor-pointer whitespace-nowrap shrink-0 text-left"
          >
            {BRAND_CONFIG.name}
          </button>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#334155]">
            <button
              type="button"
              onClick={handleResetWorkspace}
              className="hover:text-[#0A1128] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Dataset Ingestion
            </button>
            <a
              href="#console-workspace"
              className="hover:text-[#0A1128] transition-colors whitespace-nowrap shrink-0"
            >
              Live Console
            </a>
            <a
              href="#session-history"
              className="hover:text-[#0A1128] transition-colors whitespace-nowrap shrink-0"
            >
              Session History ({sessionHistory.length})
            </a>
          </nav>

          <button
            type="button"
            onClick={onBackToLanding}
            data-testid="back-to-landing-btn"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-mono-tabular font-semibold text-[#0A1128] bg-[#EFECE4] hover:bg-[#DFDAD0] border border-[#0A1128]/20 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#1D4ED8]" />
            <span>Back to Overview</span>
          </button>
        </div>
      </header>

      <main
        id="console-workspace"
        className="flex-1 max-w-[1380px] w-full mx-auto px-6 lg:px-12 py-10 space-y-10"
      >
        {/* Page Header */}
        <div className="border-b border-[#0A1128]/12 pb-6 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="font-mono-tabular text-xs text-[#1D4ED8] font-semibold">
              CLUTCHIQ · LIVE BALL-BY-BALL PRESSURE ANALYSIS CONSOLE
            </div>
            <h1 className="font-editorial text-4xl sm:text-5xl font-bold text-[#0A1128] tracking-tight">
              Live Analysis Console
            </h1>
          </div>
          <p className="text-sm text-[#334155] max-w-md">
            Ingest raw ball-by-ball cricket CSV datasets, validate delivery schemas, and
            execute the 8-stage pressure evaluation pipeline against the live backend.
          </p>
        </div>

        {/* Error Alert Banner */}
        {errorMessage && (
          <div
            role="alert"
            data-testid="live-console-error-banner"
            className="p-5 bg-red-50 border-2 border-red-400 text-red-900 flex items-start gap-3.5"
          >
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-mono-tabular text-xs font-bold uppercase text-red-800">
                Dataset Validation / Processing Error
              </div>
              <div className="text-sm font-medium">{errorMessage}</div>
              {validationResult && validationResult.missing_columns.length > 0 && (
                <div className="text-xs font-mono-tabular text-red-800 pt-1">
                  Required concepts: batter, bowler, runs_off_bat (or batsman_runs / runs),
                  and over (or ball). Detected columns:{' '}
                  {validationResult.detected_columns.join(', ') || 'None'}.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Active Processing View */}
        {activeJob && activeJob.status !== 'failed' && !analysisResults && (
          <LiveConsoleProcessingView jobStatus={activeJob} />
        )}

        {/* Completed Results View */}
        {analysisResults && (
          <LiveConsoleResultsView
            results={analysisResults}
            onUploadAnother={handleResetWorkspace}
          />
        )}

        {/* Upload, Metadata, Preview & Controls View (Shown when not actively running/viewing results) */}
        {(!activeJob || activeJob.status === 'failed') && !analysisResults && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left 8 Cols: Upload Dropzone + Dataset Preview */}
            <div className="lg:col-span-8 space-y-6">
              {/* Drag and Drop Upload Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                data-testid="csv-dropzone"
                className={`p-8 border-2 border-dashed transition-colors flex flex-col items-center justify-center text-center space-y-4 ${
                  isDragging
                    ? 'border-[#1D4ED8] bg-[#1D4ED8]/5'
                    : 'border-[#0A1128]/25 bg-[#EFECE4]/70 hover:border-[#1D4ED8]/60'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileChange}
                  className="hidden"
                  aria-label="Upload CSV file"
                  data-testid="csv-file-input"
                />

                <div className="w-12 h-12 bg-[#0A1128] text-[#F7F4EE] flex items-center justify-center">
                  <Upload className="w-5 h-5 text-[#60A5FA]" />
                </div>

                <div className="space-y-1 max-w-lg">
                  <h2 className="font-editorial text-2xl font-semibold text-[#0A1128]">
                    Upload Ball-by-Ball Cricket Dataset (.CSV)
                  </h2>
                  <p className="text-xs sm:text-sm text-[#334155]">
                    Drag and drop your ball-by-ball CSV file here, or click below to select
                    from your computer. Supports Cricsheet, IPL, and T20 delivery schemas.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="upload-csv-btn"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0A1128] hover:bg-[#1D4ED8] text-[#F7F4EE] text-xs font-mono-tabular font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload CSV</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleLoadSampleDataset}
                    data-testid="load-sample-csv-btn"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#F7F4EE] hover:border-[#1D4ED8] text-[#0A1128] border border-[#0A1128]/25 text-xs font-mono-tabular font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Database className="w-4 h-4 text-[#1D4ED8]" />
                    <span>Load Sample Ball-by-Ball CSV</span>
                  </button>
                </div>
              </div>

              {/* Dataset Preview Table (First few rows) */}
              {preview && preview.headers.length > 0 && (
                <div
                  data-testid="dataset-preview-section"
                  className="bg-[#EFECE4] border border-[#0A1128]/15 p-6 space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#0A1128]/12 pb-3">
                    <div>
                      <span className="font-mono-tabular text-xs text-[#1D4ED8] font-semibold">
                        DATASET PREVIEW · FIRST {preview.rows.length} OF{' '}
                        {preview.totalRowCount.toLocaleString()} ROWS
                      </span>
                      <h3 className="font-editorial text-2xl font-semibold text-[#0A1128]">
                        Ingested Delivery Records Preview
                      </h3>
                    </div>
                    <span className="font-mono-tabular text-xs text-[#334155]">
                      {preview.headers.length} columns detected
                    </span>
                  </div>

                  <div className="overflow-x-auto border border-[#0A1128]/12 bg-[#F7F4EE]">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[#0A1128]/12 bg-[#EFECE4] font-mono-tabular text-[11px] text-[#64748B]">
                          {preview.headers.map((h, i) => (
                            <th key={`${h}-${i}`} className="py-2.5 px-3 whitespace-nowrap">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#0A1128]/8 font-mono-tabular text-xs">
                        {preview.rows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-[#EFECE4]/50">
                            {preview.headers.map((_, cIdx) => (
                              <td
                                key={cIdx}
                                className="py-2 px-3 whitespace-nowrap text-[#0A1128]"
                              >
                                {row[cIdx] ?? ''}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Right 4 Cols: File Status Dossier + Validate & Start Analysis Buttons */}
            <div className="lg:col-span-4 bg-[#EFECE4] border border-[#0A1128]/15 p-6 space-y-6">
              <div className="border-b border-[#0A1128]/12 pb-4">
                <div className="font-mono-tabular text-xs text-[#1D4ED8] font-semibold">
                  INGESTION &amp; EXECUTION CONTROL
                </div>
                <h3 className="font-editorial text-2xl font-semibold text-[#0A1128] mt-1">
                  Dataset Telemetry Status
                </h3>
              </div>

              {/* File Metadata Details */}
              <div className="space-y-3 font-mono-tabular text-xs">
                <div className="p-3.5 bg-[#F7F4EE] border border-[#0A1128]/12 flex items-center justify-between gap-2">
                  <span className="text-[#64748B]">FILENAME</span>
                  <span
                    data-testid="uploaded-filename"
                    className="font-semibold text-[#0A1128] truncate max-w-[200px]"
                  >
                    {filename || 'No file selected'}
                  </span>
                </div>

                <div className="p-3.5 bg-[#F7F4EE] border border-[#0A1128]/12 flex items-center justify-between gap-2">
                  <span className="text-[#64748B]">FILE SIZE</span>
                  <span
                    data-testid="uploaded-filesize"
                    className="font-semibold text-[#0A1128] tabular-nums"
                  >
                    {filename ? formatFileSize(fileSize) : '0 B'}
                  </span>
                </div>

                <div className="p-3.5 bg-[#F7F4EE] border border-[#0A1128]/12 flex items-center justify-between gap-2">
                  <span className="text-[#64748B]">UPLOAD STATUS</span>
                  <span
                    data-testid="upload-status-label"
                    className={`font-bold uppercase ${
                      uploadStatus === 'validated'
                        ? 'text-[#16A34A]'
                        : uploadStatus === 'uploaded'
                        ? 'text-[#1D4ED8]'
                        : uploadStatus === 'invalid'
                        ? 'text-red-600'
                        : 'text-[#64748B]'
                    }`}
                  >
                    {uploadStatus === 'idle' && 'AWAITING CSV'}
                    {uploadStatus === 'uploaded' && 'READY TO VALIDATE'}
                    {uploadStatus === 'validating' && 'VALIDATING…'}
                    {uploadStatus === 'validated' && 'SCHEMA VERIFIED'}
                    {uploadStatus === 'invalid' && 'VALIDATION ERROR'}
                  </span>
                </div>

                {preview && (
                  <div className="p-3.5 bg-[#F7F4EE] border border-[#0A1128]/12 flex items-center justify-between gap-2">
                    <span className="text-[#64748B]">BALL RECORDS</span>
                    <span className="font-semibold text-[#0A1128] tabular-nums">
                      {preview.totalRowCount.toLocaleString()} rows
                    </span>
                  </div>
                )}
              </div>

              {/* Validation Confirmation Box */}
              {validationResult && validationResult.valid && (
                <div
                  data-testid="validation-success-box"
                  className="p-4 bg-[#F7F4EE] border border-[#16A34A]/50 space-y-2"
                >
                  <div className="flex items-center gap-2 font-mono-tabular text-xs font-bold text-[#16A34A]">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>DATASET VALIDATED</span>
                  </div>
                  <p className="text-xs text-[#334155]">{validationResult.message}</p>
                </div>
              )}

              {/* Primary Action Buttons: Validate Dataset & Start Analysis */}
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  disabled={!filename || uploadStatus === 'validating'}
                  onClick={handleValidateDataset}
                  data-testid="validate-dataset-btn"
                  className="w-full py-3 px-4 bg-[#F7F4EE] hover:border-[#1D4ED8] disabled:opacity-50 disabled:cursor-not-allowed border-2 border-[#0A1128] text-[#0A1128] font-mono-tabular text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-[#1D4ED8]" />
                  <span>
                    {uploadStatus === 'validating'
                      ? 'Validating Dataset…'
                      : 'Validate Dataset'}
                  </span>
                </button>

                <button
                  type="button"
                  disabled={!filename || uploadStatus === 'invalid' || isStartingJob}
                  onClick={handleStartAnalysis}
                  data-testid="start-analysis-btn"
                  className="w-full py-3.5 px-4 bg-[#1D4ED8] hover:bg-[#2563EB] disabled:opacity-50 disabled:cursor-not-allowed text-[#F7F4EE] font-mono-tabular text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Play className="w-4 h-4" />
                  <span>{isStartingJob ? 'Starting Analysis…' : 'Start Analysis'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Session Analysis History Section */}
        <section
          id="session-history"
          data-testid="session-history-section"
          className="pt-8 border-t border-[#0A1128]/12 space-y-4"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-[#1D4ED8]" />
              <h3 className="font-editorial text-2xl font-semibold text-[#0A1128]">
                Session Analysis History ({sessionHistory.length})
              </h3>
            </div>
            <span className="font-mono-tabular text-xs text-[#64748B]">
              CURRENT BROWSER SESSION
            </span>
          </div>

          {sessionHistory.length === 0 ? (
            <div className="p-6 bg-[#EFECE4]/60 border border-[#0A1128]/12 text-xs font-mono-tabular text-[#64748B]">
              No datasets analyzed in this session yet. Upload and analyze a ball-by-ball CSV
              to record session history.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sessionHistory.map((item) => {
                const isSelected = analysisResults?.job_id === item.jobId;
                return (
                  <button
                    key={item.jobId}
                    type="button"
                    onClick={() => {
                      setActiveJob(null);
                      setAnalysisResults(item.results);
                    }}
                    className={`text-left p-4 border transition-colors cursor-pointer space-y-2 ${
                      isSelected
                        ? 'bg-[#0A1128] text-[#F7F4EE] border-[#1D4ED8]'
                        : 'bg-[#EFECE4] text-[#0A1128] border-[#0A1128]/15 hover:border-[#1D4ED8]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 font-mono-tabular text-[11px]">
                      <span className="inline-flex items-center gap-1.5 font-semibold truncate">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-[#1D4ED8] shrink-0" />
                        <span className="truncate">{item.filename}</span>
                      </span>
                      <span className="opacity-75 shrink-0">
                        {formatFileSize(item.fileSize)}
                      </span>
                    </div>
                    <div className="font-mono-tabular text-xs">
                      {item.totalRecords.toLocaleString()} deliveries · Best Batter:{' '}
                      <strong>{item.bestBatterName}</strong> · Best Bowler:{' '}
                      <strong>{item.bestBowlerName}</strong>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
