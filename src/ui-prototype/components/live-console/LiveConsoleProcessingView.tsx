import React from 'react';
import { CheckCircle2, Loader2, AlertTriangle, Clock } from 'lucide-react';
import type { LiveConsoleJobStatus } from '../../../api/clutchiq';
import { formatFileSize } from '../../../lib/csvPreviewAndExport';

interface LiveConsoleProcessingViewProps {
  jobStatus: LiveConsoleJobStatus;
}

export const LiveConsoleProcessingView: React.FC<LiveConsoleProcessingViewProps> = ({
  jobStatus,
}) => {
  return (
    <div
      data-testid="live-processing-view"
      className="bg-[#EFECE4] border-2 border-[#1D4ED8]/40 p-6 sm:p-8 space-y-8"
    >
      {/* Top Status Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#0A1128]/12 pb-6">
        <div className="space-y-1.5">
          <div className="font-mono-tabular text-xs text-[#1D4ED8] font-semibold">
            LIVE BACKEND TELEMETRY · JOB ID: {jobStatus.job_id.toUpperCase()}
          </div>
          <h2 className="font-editorial text-3xl sm:text-4xl font-semibold text-[#0A1128]">
            {jobStatus.current_stage_title}
          </h2>
          <p
            data-testid="live-processing-status-msg"
            className="text-sm text-[#334155] font-mono-tabular"
          >
            {jobStatus.status_message}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6 bg-[#F7F4EE] border border-[#0A1128]/15 px-5 py-3.5">
          <div>
            <div className="font-mono-tabular text-[10px] text-[#64748B]">ACTIVE DATASET</div>
            <div className="font-mono-tabular text-xs font-semibold text-[#0A1128]">
              {jobStatus.filename} ({formatFileSize(jobStatus.file_size)})
            </div>
          </div>
          <div className="h-7 w-px bg-[#0A1128]/12" />
          <div>
            <div className="font-mono-tabular text-[10px] text-[#64748B]">
              RECORDS PROCESSED
            </div>
            <div
              data-testid="records-processed-counter"
              className="font-mono-tabular text-sm font-bold text-[#1D4ED8] tabular-nums"
            >
              {jobStatus.records_processed.toLocaleString()} /{' '}
              {jobStatus.total_records.toLocaleString()}
            </div>
          </div>
          <div className="h-7 w-px bg-[#0A1128]/12" />
          <div>
            <div className="font-mono-tabular text-[10px] text-[#64748B]">STAGE PROGRESS</div>
            <div className="font-editorial text-2xl font-bold text-[#0A1128] tabular-nums">
              {jobStatus.progress_pct}%
            </div>
          </div>
        </div>
      </div>

      {/* Continuous Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between font-mono-tabular text-xs">
          <span className="text-[#0A1128] font-semibold">
            STAGE {jobStatus.current_stage} OF 8
          </span>
          <span className="text-[#1D4ED8] font-semibold tabular-nums">
            {jobStatus.progress_pct}% COMPLETE
          </span>
        </div>
        <div className="w-full h-3 bg-[#DFDAD0] border border-[#0A1128]/15 overflow-hidden">
          <div
            className="h-full bg-[#1D4ED8] transition-all duration-200"
            style={{ width: `${Math.min(100, Math.max(2, jobStatus.progress_pct))}%` }}
          />
        </div>
      </div>

      {/* 8-Stage Backend Pipeline Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {jobStatus.stages.map((st) => {
          const isCompleted = st.status === 'completed';
          const isActive = st.status === 'active';
          const isFailed = st.status === 'failed';

          return (
            <div
              key={st.stage}
              data-testid={`processing-stage-${st.stage}`}
              data-stage-status={st.status}
              className={`p-4 border transition-colors flex items-start justify-between gap-4 ${
                isActive
                  ? 'bg-[#0A1128] text-[#F7F4EE] border-[#1D4ED8]'
                  : isCompleted
                  ? 'bg-[#F7F4EE] text-[#0A1128] border-[#0A1128]/20'
                  : isFailed
                  ? 'bg-red-50 text-red-900 border-red-300'
                  : 'bg-[#F7F4EE]/55 text-[#64748B] border-[#0A1128]/10'
              }`}
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 font-mono-tabular text-xs">
                  <span
                    className={
                      isActive
                        ? 'text-[#60A5FA] font-bold'
                        : isCompleted
                        ? 'text-[#1D4ED8] font-semibold'
                        : 'text-[#64748B]'
                    }
                  >
                    STAGE 0{st.stage}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="uppercase">
                    {isCompleted
                      ? 'VERIFIED'
                      : isActive
                      ? 'PROCESSING'
                      : isFailed
                      ? 'FAILED'
                      : 'QUEUED'}
                  </span>
                </div>
                <div className="font-editorial text-lg font-semibold leading-snug">
                  {st.title}
                </div>
                <div
                  className={`text-xs font-mono-tabular truncate ${
                    isActive
                      ? 'text-[#CBD5E1]'
                      : isCompleted
                      ? 'text-[#334155]'
                      : 'text-[#94A3B8]'
                  }`}
                >
                  {st.detail}
                </div>
              </div>

              <div className="shrink-0 pt-1">
                {isCompleted && <CheckCircle2 className="w-5 h-5 text-[#16A34A]" />}
                {isActive && <Loader2 className="w-5 h-5 text-[#60A5FA] animate-spin" />}
                {isFailed && <AlertTriangle className="w-5 h-5 text-red-600" />}
                {st.status === 'pending' && <Clock className="w-4 h-4 text-[#94A3B8]" />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
