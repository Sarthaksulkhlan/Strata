import React, { useEffect, useRef } from 'react';
import { ScrollProgressSnapshot } from '../hooks/useScrollProgress';
import { computeChapterFromProgress } from '../lib/intelligenceEngine';

interface DataLandscapeCanvasProps {
  scrollStateRef: React.MutableRefObject<ScrollProgressSnapshot>;
}

interface LandscapeNode {
  id: string;
  code: string;
  contextHub: string;
  streamIndex: number; // 0..5
  streamT: number; // 0..1 position along stream
  // Stage 2 (50% THE CONTEXT) relational graph coordinates (normalized -1..1)
  ctxX: number;
  ctxY: number;
  // Stage 3 (75% THE PRESSURE) dense pressure cluster coordinates (normalized -1..1)
  prsX: number;
  prsY: number;
  isHighLeverage: boolean;
  // Stage 4 (100% THE INTELLIGENCE) resolved player intelligence coordinates (0.15..0.85)
  matX: number;
  matY: number;
  priValue: string;
}

const STREAM_LABELS = [
  'SRC-01 · BALL-BY-BALL TELEMETRY',
  'SRC-02 · VENUE PAR & PITCH',
  'SRC-03 · OFFICIAL PLAYING XI',
  'SRC-04 · COMPETITION TIER',
  'SRC-05 · TEAM TACTICAL ROLE',
  'SRC-06 · PUBLIC ARCHIVES',
];

const CONTEXT_HUBS = [
  { label: 'PLAYER BIO & ROLE', x: -0.45, y: -0.36 },
  { label: 'MATCH & VENUE PAR', x: 0.45, y: -0.36 },
  { label: 'TEAM PLAYING XI', x: -0.45, y: 0.36 },
  { label: 'COMPETITION TIER', x: 0.45, y: 0.36 },
];

const LANDSCAPE_NODES: LandscapeNode[] = Array.from({ length: 28 }, (_, i) => {
  const streamIndex = i % 6;
  const ring = i < 8 ? 0.34 : i < 18 ? 0.62 : 0.86;
  const angle = (i / 28) * Math.PI * 2 + (i % 3) * 0.22;
  const isHighLeverage = i < 10;

  // High-leverage archetypes compress into dense pressure zones at 75% (THE PRESSURE)
  const prsRadius = isHighLeverage
    ? 0.12 + (i % 5) * 0.06
    : 0.74 + (i % 4) * 0.06;
  const prsAngle = angle + 0.55;

  const col = i % 6;
  const row = Math.floor(i / 6);

  const codes = [
    'BAT-01',
    'BWL-01',
    'BAT-02',
    'BWL-02',
    'BAT-03',
    'BWL-03',
    'BAT-04',
    'BWL-04',
    'BAT-05',
    'BWL-05',
  ];
  const priScores = [
    '94.6',
    '95.4',
    '92.8',
    '93.1',
    '91.4',
    '91.7',
    '90.1',
    '90.3',
    '88.9',
    '89.0',
  ];
  const hubNames = ['PLAYER', 'MATCH', 'TEAM XI', 'COMP'];

  return {
    id: `node-${i}`,
    code: i < 10 ? codes[i] : `REC-${i + 1}`,
    contextHub: hubNames[i % 4],
    streamIndex,
    streamT: ((i * 0.16) % 0.82) + 0.09,
    ctxX: Math.cos(angle) * ring,
    ctxY: Math.sin(angle) * ring * 0.78,
    prsX: Math.cos(prsAngle) * prsRadius,
    prsY: Math.sin(prsAngle) * prsRadius * 0.78,
    isHighLeverage,
    matX: isHighLeverage
      ? (i % 2 === 0 ? 0.46 : 0.69) + (Math.floor(i / 2) % 2) * 0.015
      : 0.16 + (col / 5) * 0.22,
    matY: isHighLeverage
      ? 0.24 + Math.floor(i / 2) * 0.115
      : 0.66 + (row / 4) * 0.18,
    priValue: i < 10 ? priScores[i] : '',
  };
});

export const DataLandscapeCanvas: React.FC<DataLandscapeCanvasProps> = ({
  scrollStateRef,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointerRef = useRef<{ x: number; y: number; active: boolean }>({
    x: -999,
    y: -999,
    active: false,
  });

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = container.clientWidth || 720;
    let height = container.clientHeight || 410;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      if (!container || !canvas) return;
      width = container.clientWidth || 720;
      height = container.clientHeight || 410;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const onPointerMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointerRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        active: true,
      };
    };

    const onPointerLeave = () => {
      pointerRef.current.active = false;
    };

    canvas.addEventListener('mousemove', onPointerMove, { passive: true });
    canvas.addEventListener('mouseleave', onPointerLeave, { passive: true });
    window.addEventListener('resize', resize, { passive: true });

    let frameId = 0;
    let isDisposed = false;
    let smoothedProgress = scrollStateRef.current.sectionProgress || 0;
    let time = 0;

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const PIPELINE_STEPS = [
      { code: '01', name: 'DATA', pct: '25%' },
      { code: '02', name: 'CONTEXT', pct: '50%' },
      { code: '03', name: 'PRESSURE', pct: '75%' },
      { code: '04', name: 'INTELLIGENCE', pct: '100%' },
    ];

    const renderFrame = () => {
      if (isDisposed) return;

      const snap = scrollStateRef.current;
      const targetProgress = snap.sectionProgress;
      smoothedProgress += (targetProgress - smoothedProgress) * 0.24;
      const flowDir = snap.direction === 'up' ? -1 : 1;
      time += 0.016 * flowDir;

      const state = computeChapterFromProgress(smoothedProgress);
      const activeIdx = state.activeChapterIndex ?? 0; // 0..3
      const wData = Math.max(0, 1 - state.contextDensity * 1.15);
      const wCtx = state.contextDensity; // 0 -> 1 in Stage 2 (50% THE CONTEXT)
      const wPrs = state.pressureIntensity; // Peaks in Stage 3 (75% THE PRESSURE)
      const wMat = state.intelligenceAlignment; // 0 -> 1 in Stage 4 (100% THE INTELLIGENCE)

      (window as unknown as Record<string, unknown>).__TOPOLOGY_STATE__ = {
        activeChapterIndex: activeIdx,
        activeStageName: PIPELINE_STEPS[activeIdx].name,
        milestonePct: state.milestonePct,
        wData: Number(wData.toFixed(2)),
        wCtx: Number(wCtx.toFixed(2)),
        wPrs: Number(wPrs.toFixed(2)),
        wMat: Number(wMat.toFixed(2)),
      };

      // 1. Deep Midnight Navy & Charcoal Architectural Telemetry Backing
      ctx.fillStyle = '#0A1128';
      ctx.fillRect(0, 0, width, height);

      // Subtle topographic coordinate grid
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.075)';
      ctx.lineWidth = 1;
      const gridStep = 46;
      for (let x = gridStep; x < width; x += gridStep) {
        ctx.beginPath();
        ctx.moveTo(x, 46);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 46; y < height; y += gridStep) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Top In-Canvas Pipeline Flow Bar: DATA -> CONTEXT -> PRESSURE -> INTELLIGENCE
      const barY = 23;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.fillRect(0, 0, width, 46);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.18)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 46);
      ctx.lineTo(width, 46);
      ctx.stroke();

      const stepSpan = (width - 32) / 4;
      for (let s = 0; s < 4; s++) {
        const sx = 16 + s * stepSpan;
        const boxW = Math.min(138, stepSpan - 20);
        const isStepActive = s === activeIdx;
        const isStepReached = s <= activeIdx;

        // Draw stage node box
        ctx.fillStyle = isStepActive
          ? 'rgba(29, 78, 216, 0.35)'
          : isStepReached
          ? 'rgba(30, 41, 59, 0.85)'
          : 'rgba(15, 23, 42, 0.65)';
        ctx.strokeStyle = isStepActive
          ? '#3B82F6'
          : isStepReached
          ? 'rgba(148, 163, 184, 0.45)'
          : 'rgba(148, 163, 184, 0.18)';
        ctx.lineWidth = isStepActive ? 1.5 : 1;
        ctx.fillRect(sx, barY - 13, boxW, 26);
        ctx.strokeRect(sx, barY - 13, boxW, 26);

        // Active status indicator dot
        ctx.fillStyle = isStepActive
          ? '#60A5FA'
          : isStepReached
          ? '#2563EB'
          : '#475569';
        ctx.beginPath();
        ctx.arc(sx + 10, barY, isStepActive ? 3.5 : 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Stage text
        ctx.fillStyle = isStepActive
          ? '#F8FAFC'
          : isStepReached
          ? '#CBD5E1'
          : '#64748B';
        ctx.font = `${isStepActive ? '700' : '600'} 10px "JetBrains Mono", monospace`;
        ctx.fillText(
          `${PIPELINE_STEPS[s].code} ${PIPELINE_STEPS[s].name}`,
          sx + 19,
          barY + 3.5
        );

        // Animated connector & traveling signal pulse to next stage
        if (s < 3) {
          const lineStart = sx + boxW + 3;
          const lineEnd = sx + stepSpan - 3;
          if (lineEnd > lineStart + 4) {
            ctx.strokeStyle =
              s < activeIdx
                ? 'rgba(59, 130, 246, 0.75)'
                : 'rgba(148, 163, 184, 0.25)';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(lineStart, barY);
            ctx.lineTo(lineEnd, barY);
            ctx.stroke();

            // Animated pulse packet moving along the connector
            const pulseU = (((time * 0.9 + s * 0.35) % 1) + 1) % 1;
            const px = lerp(lineStart, lineEnd, pulseU);
            ctx.fillStyle =
              s <= activeIdx ? '#60A5FA' : 'rgba(148, 163, 184, 0.45)';
            ctx.beginPath();
            ctx.arc(px, barY, 2.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      const cx = width * 0.5;
      const cy = 46 + (height - 46) * 0.52;
      const scaleR = Math.min(width, height - 46) * 0.38;

      // 2. Stage 3 (75% — THE PRESSURE): Dense High-Leverage Isobaric Pressure Zones & Radar Sweep
      const prsVisualAlpha = Math.max(0, wPrs * (1 - wMat * 0.92));
      if (prsVisualAlpha > 0.02) {
        const glowRadius = scaleR * 1.02;
        const radialGrad = ctx.createRadialGradient(
          cx,
          cy,
          8,
          cx,
          cy,
          glowRadius
        );
        radialGrad.addColorStop(
          0,
          `rgba(29, 78, 216, ${(0.48 * prsVisualAlpha).toFixed(3)})`
        );
        radialGrad.addColorStop(
          0.55,
          `rgba(37, 99, 235, ${(0.2 * prsVisualAlpha).toFixed(3)})`
        );
        radialGrad.addColorStop(1, 'rgba(10, 17, 40, 0)');
        ctx.fillStyle = radialGrad;
        ctx.fillRect(0, 46, width, height - 46);

        // Concentric pressure zone contours + match situation labels
        const contourLabels = [
          'ZONE A · RRR > 11.5 RPO (2.4x WEIGHT)',
          'ZONE B · DEATH OVERS 16–20',
          'ZONE C · 3+ CLUSTER WICKETS',
          'PERIPHERAL LOW-LEVERAGE BOUNDARY',
        ];
        [0.25, 0.46, 0.68, 0.9].forEach((ratio, idx) => {
          ctx.strokeStyle =
            idx < 2
              ? `rgba(96, 165, 250, ${(0.55 * prsVisualAlpha).toFixed(3)})`
              : `rgba(148, 163, 184, ${(0.24 * prsVisualAlpha).toFixed(3)})`;
          ctx.lineWidth = idx === 0 ? 1.8 : 1.1;
          ctx.beginPath();
          ctx.ellipse(
            cx,
            cy,
            scaleR * ratio * 1.18,
            scaleR * ratio * 0.86,
            0,
            0,
            Math.PI * 2
          );
          ctx.stroke();

          if (activeIdx === 2 && prsVisualAlpha > 0.25 && idx < 3) {
            ctx.fillStyle = `rgba(191, 219, 254, ${prsVisualAlpha.toFixed(3)})`;
            ctx.font = '600 9.5px "JetBrains Mono", monospace';
            ctx.fillText(
              contourLabels[idx],
              cx - 96,
              cy - scaleR * ratio * 0.86 - 5
            );
          }
        });

        // Animated radar sweep and inward compression vectors during Stage 3
        if (activeIdx === 2 && prsVisualAlpha > 0.25) {
          const sweepAngle = time * 1.4;
          ctx.strokeStyle = `rgba(96, 165, 250, ${(prsVisualAlpha * 0.65).toFixed(3)})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(
            cx + Math.cos(sweepAngle) * scaleR * 0.98,
            cy + Math.sin(sweepAngle) * scaleR * 0.72
          );
          ctx.stroke();

          // Central high-leverage core badge
          ctx.fillStyle = `rgba(15, 23, 42, ${(prsVisualAlpha * 0.92).toFixed(3)})`;
          ctx.strokeStyle = `rgba(59, 130, 246, ${(prsVisualAlpha * 0.85).toFixed(3)})`;
          ctx.lineWidth = 1.2;
          ctx.fillRect(cx - 88, cy + scaleR * 0.36, 176, 22);
          ctx.strokeRect(cx - 88, cy + scaleR * 0.36, 176, 22);
          ctx.fillStyle = `rgba(248, 250, 252, ${prsVisualAlpha.toFixed(3)})`;
          ctx.font = '700 9.5px "JetBrains Mono", monospace';
          ctx.fillText(
            '10 ARCHETYPES ISOLATED IN CORE',
            cx - 80,
            cy + scaleR * 0.36 + 14
          );
        }
      }

      // 3. Stage 2 (50% — THE CONTEXT): Relational Hub Graph & Animated Signal Pulses
      if (wCtx > 0.02 && wMat < 0.85) {
        const ringAlpha = wCtx * (1 - wMat * 0.85) * 0.28;
        ctx.strokeStyle = `rgba(148, 163, 184, ${ringAlpha.toFixed(3)})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 6]);
        [0.34, 0.62, 0.86].forEach((r) => {
          ctx.beginPath();
          ctx.ellipse(
            cx,
            cy,
            scaleR * r * 1.15,
            scaleR * r * 0.84,
            0,
            0,
            Math.PI * 2
          );
          ctx.stroke();
        });
        ctx.setLineDash([]);

        // Draw the 4 Context Pillar Hubs + Animated Pulse Vectors into Central Synthesis Core only in Stage 2
        const ctxHubAlpha = Math.max(0, Math.min(1, wCtx) * (1 - wPrs * 1.35));
        if (ctxHubAlpha > 0.12) {
          // Central Synthesis Core Node
          ctx.fillStyle = `rgba(29, 78, 216, ${(ctxHubAlpha * 0.28).toFixed(3)})`;
          ctx.strokeStyle = `rgba(96, 165, 250, ${(ctxHubAlpha * 0.85).toFixed(3)})`;
          ctx.lineWidth = 1.4;
          ctx.fillRect(cx - 88, cy - 16, 176, 32);
          ctx.strokeRect(cx - 88, cy - 16, 176, 32);
          ctx.fillStyle = `rgba(248, 250, 252, ${ctxHubAlpha.toFixed(3)})`;
          ctx.font = '700 9.5px "JetBrains Mono", monospace';
          ctx.fillText('RELATIONAL CONTEXT CORE', cx - 68, cy - 2);
          ctx.fillStyle = `rgba(147, 197, 253, ${ctxHubAlpha.toFixed(3)})`;
          ctx.font = '600 8.5px "JetBrains Mono", monospace';
          ctx.fillText('±28.4% TRUE-VALUE ADJUSTMENT', cx - 74, cy + 10);

          CONTEXT_HUBS.forEach((hub, hIdx) => {
            const hx = cx + hub.x * scaleR * 1.24;
            const hy = cy + hub.y * scaleR * 0.94;

            // Connecting vector from hub to central core
            ctx.strokeStyle = `rgba(59, 130, 246, ${(ctxHubAlpha * 0.45).toFixed(3)})`;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(hx, hy);
            ctx.lineTo(cx, cy);
            ctx.stroke();

            // Animated pulse traveling from hub to center
            const pU = (((time * 0.75 + hIdx * 0.25) % 1) + 1) % 1;
            const px = lerp(hx, cx, pU);
            const py = lerp(hy, cy, pU);
            ctx.fillStyle = `rgba(96, 165, 250, ${ctxHubAlpha.toFixed(3)})`;
            ctx.beginPath();
            ctx.arc(px, py, 3, 0, Math.PI * 2);
            ctx.fill();

            // Hub plate
            ctx.fillStyle = `rgba(15, 23, 42, ${(ctxHubAlpha * 0.94).toFixed(3)})`;
            ctx.strokeStyle = `rgba(37, 99, 235, ${(ctxHubAlpha * 0.78).toFixed(3)})`;
            ctx.lineWidth = 1.2;
            ctx.fillRect(hx - 68, hy - 13, 136, 26);
            ctx.strokeRect(hx - 68, hy - 13, 136, 26);
            ctx.fillStyle = `rgba(226, 232, 240, ${ctxHubAlpha.toFixed(3)})`;
            ctx.font = '600 9.5px "JetBrains Mono", monospace';
            ctx.fillText(hub.label, hx - 58, hy + 3);
          });
        }
      }

      // 4. Stage 1 (25% — THE DATA): Six Multi-Source Cricket Streams & Right Ingestion Gateway
      const dataStageVisibility = Math.max(0, 1 - wCtx * 1.15);
      if (dataStageVisibility > 0.08) {
        // Right-hand Multi-Source Ingestion Gateway Box during Stage 1
        const gwX = width - 196;
        const gwY = cy - 72;
        ctx.fillStyle = `rgba(15, 23, 42, ${(dataStageVisibility * 0.92).toFixed(3)})`;
        ctx.strokeStyle = `rgba(59, 130, 246, ${(dataStageVisibility * 0.75).toFixed(3)})`;
        ctx.lineWidth = 1.3;
        ctx.fillRect(gwX, gwY, 174, 144);
        ctx.strokeRect(gwX, gwY, 174, 144);

        ctx.fillStyle = `rgba(147, 197, 253, ${dataStageVisibility.toFixed(3)})`;
        ctx.font = '700 9.5px "JetBrains Mono", monospace';
        ctx.fillText('STRATA INGESTION GATEWAY', gwX + 12, gwY + 22);

        ctx.fillStyle = `rgba(248, 250, 252, ${dataStageVisibility.toFixed(3)})`;
        ctx.font = '700 16px "JetBrains Mono", monospace';
        ctx.fillText('1.42M RECORDS', gwX + 12, gwY + 48);

        ctx.fillStyle = `rgba(148, 163, 184, ${dataStageVisibility.toFixed(3)})`;
        ctx.font = '500 9px "JetBrains Mono", monospace';
        ctx.fillText('6 LINKED SCHEMA TABLES', gwX + 12, gwY + 68);
        ctx.fillText('ENTITY RESOLUTION: 99.4%', gwX + 12, gwY + 86);
        ctx.fillText('NEXT: 02 CONTEXT GRAPH →', gwX + 12, gwY + 124);
      }

      for (let s = 0; s < 6; s++) {
        const sNorm = s / 5;
        const yStart = 64 + sNorm * (height - 96);
        const yMid = lerp(yStart, cy + (sNorm - 0.5) * 44, wCtx);
        const yEnd = lerp(
          cy + (sNorm - 0.5) * 88,
          cy + (sNorm - 0.5) * (wPrs > 0.4 ? 22 : 110),
          wCtx
        );

        const streamAlpha = Math.max(0.14, 0.68 - wMat * 0.46);
        ctx.strokeStyle =
          s % 2 === 0
            ? `rgba(37, 99, 235, ${streamAlpha.toFixed(3)})`
            : `rgba(148, 163, 184, ${(streamAlpha * 0.78).toFixed(3)})`;
        ctx.lineWidth = s % 2 === 0 ? 1.7 : 1.15;

        const streamEndX =
          dataStageVisibility > 0.2
            ? lerp(width - 24, width - 196, dataStageVisibility)
            : width - 24;

        ctx.beginPath();
        for (let step = 0; step <= 32; step++) {
          const u = step / 32;
          const px = 24 + u * (streamEndX - 24);
          const wave =
            Math.sin(u * Math.PI * 3 + time * 1.5 + s * 1.1) *
            (12 * (1 - wMat * 0.7));
          const baseCurve =
            u < 0.5
              ? lerp(yStart, yMid, u * 2)
              : lerp(yMid, yEnd, (u - 0.5) * 2);
          const py = baseCurve + wave;
          if (step === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();

        // Label each stream on the left during 25% — THE DATA
        if (wCtx < 0.68) {
          const badgeAlpha = Math.max(0, 1 - wCtx * 1.3);
          ctx.fillStyle = `rgba(15, 23, 42, ${(badgeAlpha * 0.86).toFixed(3)})`;
          ctx.fillRect(26, yStart - 19, 210, 15);
          ctx.fillStyle = `rgba(226, 232, 240, ${badgeAlpha.toFixed(3)})`;
          ctx.font = '600 9.5px "JetBrains Mono", monospace';
          ctx.fillText(STREAM_LABELS[s], 30, yStart - 8);
        }
      }

      // 5. Stage 4 (100% — THE INTELLIGENCE): Connected Player Intelligence Coordinate System
      if (wMat > 0.05) {
        const mLeft = width * 0.11;
        const mRight = width * 0.92;
        const mTop = 68;
        const mBottom = height * 0.87;

        ctx.strokeStyle = `rgba(148, 163, 184, ${(wMat * 0.6).toFixed(3)})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(mLeft, mTop);
        ctx.lineTo(mLeft, mBottom);
        ctx.lineTo(mRight, mBottom);
        ctx.stroke();

        // Y-Axis label
        ctx.save();
        ctx.translate(mLeft - 16, (mTop + mBottom) * 0.5 + 65);
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = `rgba(148, 163, 184, ${(wMat * 0.85).toFixed(3)})`;
        ctx.font = '600 9.5px "JetBrains Mono", monospace';
        ctx.fillText('PRESSURE RELIABILITY INDEX (PRI) →', 0, 0);
        ctx.restore();

        // Elite Conviction Quadrant Box
        const qX = width * 0.42;
        const qY = 68;
        const qW = width * 0.49;
        const qH = (height - 68) * 0.52;

        ctx.fillStyle = `rgba(29, 78, 216, ${(wMat * 0.16).toFixed(3)})`;
        ctx.fillRect(qX, qY, qW, qH);
        ctx.strokeStyle = `rgba(59, 130, 246, ${(wMat * 0.82).toFixed(3)})`;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(qX, qY, qW, qH);

        ctx.fillStyle = `rgba(191, 219, 254, ${wMat.toFixed(3)})`;
        ctx.font = '700 10px "JetBrains Mono", monospace';
        ctx.fillText(
          'SUPERR SELECTOR INTELLIGENCE QUADRANT · TOP 10 ARCHETYPES',
          qX + 12,
          qY + 18
        );
        ctx.fillStyle = `rgba(148, 163, 184, ${(wMat * 0.88).toFixed(3)})`;
        ctx.font = '600 9.5px "JetBrains Mono", monospace';
        ctx.fillText(
          'CONTROL RETENTION % & SITUATIONAL EXECUTION →',
          mRight - 275,
          mBottom + 18
        );
      }

      // 6. Compute & Draw the 28 Evolving Nodes + Relational Connections
      const computedPts: {
        x: number;
        y: number;
        node: LandscapeNode;
      }[] = [];

      for (let i = 0; i < LANDSCAPE_NODES.length; i++) {
        const n = LANDSCAPE_NODES[i];
        const sYStart = 64 + (n.streamIndex / 5) * (height - 96);
        const animT =
          (((n.streamT + time * 0.08 * (n.streamIndex % 2 === 0 ? 1 : 0.75)) %
            1) +
            1) %
          1;
        const s1MaxX =
          dataStageVisibility > 0.2 ? width - 200 : width - 56;
        const s1X = 28 + animT * (s1MaxX - 28);
        const s1Y =
          sYStart +
          Math.sin(animT * Math.PI * 3 + time * 1.5 + n.streamIndex) * 12;

        const s2X = cx + n.ctxX * scaleR * 1.12;
        const s2Y = cy + n.ctxY * scaleR * 0.85;

        const s3X = cx + n.prsX * scaleR * 1.05;
        const s3Y = cy + n.prsY * scaleR * 0.85;

        const s4X = width * n.matX;
        const s4Y = 46 + (height - 46) * n.matY;

        let x = lerp(s1X, s2X, wCtx);
        let y = lerp(s1Y, s2Y, wCtx);

        x = lerp(x, s3X, wPrs);
        y = lerp(y, s3Y, wPrs);

        x = lerp(x, s4X, wMat);
        y = lerp(y, s4Y, wMat);

        computedPts.push({ x, y, node: n });
      }

      // Draw relational connections (starting in Stage 1 and intensifying across 50%, 75%, 100%)
      const edgeThreshold = 115 + wCtx * 28;
      for (let i = 0; i < computedPts.length; i++) {
        for (let j = i + 1; j < computedPts.length; j++) {
          const p1 = computedPts[i];
          const p2 = computedPts[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < edgeThreshold) {
            const baseConnectivity = Math.max(0.24, wCtx);
            const edgeAlpha =
              (1 - dist / edgeThreshold) * 0.4 * baseConnectivity;
            ctx.strokeStyle =
              p1.node.isHighLeverage && p2.node.isHighLeverage
                ? `rgba(59, 130, 246, ${edgeAlpha.toFixed(3)})`
                : `rgba(148, 163, 184, ${(edgeAlpha * 0.5).toFixed(3)})`;
            ctx.lineWidth =
              p1.node.isHighLeverage && p2.node.isHighLeverage ? 1.3 : 0.85;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      // Check pointer hover for interactive node inspection
      let hoveredNode: { x: number; y: number; node: LandscapeNode } | null =
        null;
      if (pointerRef.current.active) {
        let bestDist = 24;
        for (const pt of computedPts) {
          const d = Math.hypot(
            pt.x - pointerRef.current.x,
            pt.y - pointerRef.current.y
          );
          if (d < bestDist) {
            bestDist = d;
            hoveredNode = pt;
          }
        }
      }

      // Draw nodes & Stage 4 archetype callout labels
      for (let i = 0; i < computedPts.length; i++) {
        const { x, y, node } = computedPts[i];
        const isHeroNode = node.isHighLeverage;
        const isHovered = hoveredNode?.node.id === node.id;

        const radius = isHeroNode
          ? 4.6 + wPrs * 1.6 + wMat * 1.3 + (isHovered ? 2 : 0)
          : Math.max(2.3, 3.2 - wPrs * 0.85) + (isHovered ? 1.5 : 0);

        ctx.fillStyle = isHovered
          ? '#60A5FA'
          : isHeroNode
          ? '#2563EB'
          : '#94A3B8';
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();

        if ((isHeroNode && (wPrs > 0.2 || wMat > 0.2)) || isHovered) {
          ctx.strokeStyle = isHovered
            ? '#F8FAFC'
            : 'rgba(147, 197, 253, 0.78)';
          ctx.lineWidth = isHovered ? 2 : 1.5;
          ctx.beginPath();
          ctx.arc(x, y, radius + 4.5, 0, Math.PI * 2);
          ctx.stroke();
        }

        if (isHeroNode && wMat > 0.42 && i < 8) {
          ctx.fillStyle = 'rgba(15, 23, 42, 0.86)';
          ctx.fillRect(x + 8, y - 9, 92, 16);
          ctx.strokeStyle = 'rgba(59, 130, 246, 0.55)';
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 8, y - 9, 92, 16);
          ctx.fillStyle = `rgba(248, 250, 252, ${wMat.toFixed(3)})`;
          ctx.font = '600 9.5px "JetBrains Mono", monospace';
          ctx.fillText(`${node.code} · ${node.priValue}`, x + 12, y + 2);
        }
      }

      // Interactive Hover Tooltip
      if (hoveredNode) {
        const tx = Math.min(width - 190, Math.max(12, hoveredNode.x + 14));
        const ty = Math.max(58, hoveredNode.y - 36);
        ctx.fillStyle = 'rgba(10, 17, 40, 0.96)';
        ctx.strokeStyle = '#3B82F6';
        ctx.lineWidth = 1.2;
        ctx.fillRect(tx, ty, 176, 42);
        ctx.strokeRect(tx, ty, 176, 42);
        ctx.fillStyle = '#F8FAFC';
        ctx.font = '700 10px "JetBrains Mono", monospace';
        ctx.fillText(
          `${hoveredNode.node.code} · HUB: ${hoveredNode.node.contextHub}`,
          tx + 8,
          ty + 16
        );
        ctx.fillStyle = '#93C5FD';
        ctx.font = '600 9px "JetBrains Mono", monospace';
        ctx.fillText(
          hoveredNode.node.priValue
            ? `PRI CONVICTION: ${hoveredNode.node.priValue}`
            : 'BACKGROUND TELEMETRY RECORD',
          tx + 8,
          ty + 32
        );
      }

      frameId = requestAnimationFrame(renderFrame);
    };

    frameId = requestAnimationFrame(renderFrame);

    return () => {
      isDisposed = true;
      cancelAnimationFrame(frameId);
      canvas.removeEventListener('mousemove', onPointerMove);
      canvas.removeEventListener('mouseleave', onPointerLeave);
      window.removeEventListener('resize', resize);
    };
  }, [scrollStateRef]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[390px] sm:h-[410px] bg-[#0A1128] border border-[#0A1128]/20 overflow-hidden"
      data-testid="data-landscape-viewport"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block cursor-crosshair"
      />
    </div>
  );
};
