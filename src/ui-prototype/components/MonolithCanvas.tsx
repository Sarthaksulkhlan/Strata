import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { HERO_PLAYER_PHOTO_CONFIG } from '../data/mockCricketData';

export interface MonolithVisualTarget {
  activeFaceIndex: 0 | 1 | 2 | 3 | null; // null = continuous fluid rotation
  targetAngleRadians?: number;
  customPlayerImageUrl?: string | null;
}

interface MonolithCanvasProps {
  targetState: MonolithVisualTarget;
  variant?: 'hero';
}

declare global {
  interface Window {
    __MONOLITH_STATE__?: {
      rotationY: number;
      activeFaceIndex: number | null;
      loadedPhotosCount: number;
      faceTypes: ('photo' | 'telemetry')[];
      photoUrls: string[];
    };
  }
}

function detectSoftwareGl(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

interface FacePhotoPlateSpec {
  faceHeader: string;
  faceSubheader: string;
  dossierTitle: string;
  leftMetric: string;
  rightMetric: string;
  footerStatus: string;
  cropFocusX?: number;
  cropFocusY?: number;
}

/**
 * Renders an official Rajasthan Royals Photograph Plate onto a 1024x1024 face texture
 * of the 4-sided 3D Hero Prism (used on Face 01 and Face 03).
 */
function drawRRPhotoFacePlate(
  canvas: HTMLCanvasElement,
  loadedImg: HTMLImageElement | null,
  spec: FacePhotoPlateSpec
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;

  // Deep Navy & Brushed Silver Architectural Plate
  ctx.fillStyle = '#0A1128';
  ctx.fillRect(0, 0, w, h);

  // Outer brushed silver frame
  ctx.strokeStyle = '#94A3B8';
  ctx.lineWidth = 5;
  ctx.strokeRect(20, 20, w - 40, h - 40);

  // Inner royal blue precision hairline
  ctx.strokeStyle = '#1D4ED8';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(34, 34, w - 68, h - 68);

  // Top Header Strip
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(38, 38, w - 76, 86);
  ctx.fillStyle = '#CBD5E1';
  ctx.font = '600 22px "JetBrains Mono", monospace';
  ctx.fillText(spec.faceHeader, 60, 74);
  ctx.fillStyle = '#3B82F6';
  ctx.font = '500 18px "JetBrains Mono", monospace';
  ctx.fillText(spec.faceSubheader, 60, 106);

  // Wide Architectural Photograph Stage (948 x 684 -> ~1.39:1 matching 3:2 match photography)
  const px = 38;
  const py = 136;
  const pw = w - 76;
  const ph = 684;

  ctx.save();
  ctx.beginPath();
  ctx.rect(px, py, pw, ph);
  ctx.clip();

  ctx.fillStyle = '#070C1C';
  ctx.fillRect(px, py, pw, ph);

  if (loadedImg && loadedImg.complete && loadedImg.naturalWidth > 0) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const imgAspect = loadedImg.naturalWidth / loadedImg.naturalHeight;
    const boxAspect = pw / ph;
    let drawW = pw;
    let drawH = ph;
    let offsetX = px;
    let offsetY = py;

    const focusX = spec.cropFocusX ?? 0.5;
    const focusY = spec.cropFocusY ?? 0.5;

    if (imgAspect > boxAspect) {
      drawH = ph;
      drawW = ph * imgAspect;
      offsetX = px - (drawW - pw) * focusX;
    } else {
      drawW = pw;
      drawH = pw / imgAspect;
      offsetY = py - (drawH - ph) * focusY;
    }

    ctx.drawImage(loadedImg, offsetX, offsetY, drawW, drawH);
  } else {
    const bgGrad = ctx.createLinearGradient(px, py, px + pw, py + ph);
    bgGrad.addColorStop(0, '#0F172A');
    bgGrad.addColorStop(1, '#0A1128');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(px, py, pw, ph);
  }
  ctx.restore();

  // Crisp Brushed Silver Aperture Border around Photograph
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(px, py, pw, ph);

  // Bottom Telemetry Specification Plate
  const by = 836;
  const bh = 144;
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(38, by, w - 76, bh);
  ctx.strokeStyle = '#1D4ED8';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(38, by, w - 76, bh);

  ctx.fillStyle = '#F8FAFC';
  ctx.font = '600 25px "Plus Jakarta Sans", "DM Sans", sans-serif';
  ctx.fillText(spec.dossierTitle, 60, by + 48);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '500 19px "JetBrains Mono", monospace';
  ctx.fillText(spec.leftMetric, 60, by + 90);

  ctx.fillStyle = '#3B82F6';
  ctx.fillText(spec.rightMetric, w - 415, by + 90);

  ctx.fillStyle = '#CBD5E1';
  ctx.font = '400 16px "JetBrains Mono", monospace';
  ctx.fillText(spec.footerStatus, 60, by + 124);
}

/**
 * Face 02 (+X Right, 90°): Animated Batting Performance & Pressure Telemetry Plate.
 * Clearly labeled as illustrative sample values (never presented as actual player stats).
 */
function drawBattingTelemetryFacePlate(
  canvas: HTMLCanvasElement,
  animPhase: number
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  const pulse = 0.5 + 0.5 * Math.sin(animPhase * 2.2);

  ctx.fillStyle = '#0A1128';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#94A3B8';
  ctx.lineWidth = 5;
  ctx.strokeRect(20, 20, w - 40, h - 40);

  ctx.strokeStyle = '#1D4ED8';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(34, 34, w - 68, h - 68);

  // Header + Explicit Illustrative Data Label
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(38, 38, w - 76, 96);
  ctx.fillStyle = '#F8FAFC';
  ctx.font = '600 22px "JetBrains Mono", monospace';
  ctx.fillText('STRATA · FACE 02 · BATTING PRESSURE ANALYTICS', 60, 76);

  ctx.fillStyle = '#60A5FA';
  ctx.font = '600 17px "JetBrains Mono", monospace';
  ctx.fillText(
    'ILLUSTRATIVE SAMPLE VALUES — NOT ACTUAL PLAYER STATS',
    60,
    112
  );

  // 4 Key Analytical KPI Cards (2x2 Grid)
  const kpis = [
    {
      label: 'PRESSURE STRIKE RATE',
      value: '184.2',
      unit: 'SR',
      delta: '+22.2 VS BASELINE (162.0)',
      barPct: 0.88 + pulse * 0.04,
    },
    {
      label: 'CONTROL UNDER STRESS',
      value: '81.4%',
      unit: 'CTRL',
      delta: '+23.2% VS LEAGUE AVG',
      barPct: 0.81 + pulse * 0.03,
    },
    {
      label: 'DEATH OVERS (16–20) RUNS',
      value: '642',
      unit: 'RUNS',
      delta: 'RRR > 11.5 · 2.4X WEIGHTED',
      barPct: 0.85 + (1 - pulse) * 0.04,
    },
    {
      label: 'PRESSURE RELIABILITY',
      value: '94.6',
      unit: 'PRI',
      delta: 'ARCHETYPE BAT-01 · FINISHER',
      barPct: 0.946,
    },
  ];

  kpis.forEach((kpi, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const cardW = (w - 136) / 2;
    const cardH = 196;
    const cx = 56 + col * (cardW + 24);
    const cy = 154 + row * (cardH + 20);

    ctx.fillStyle = '#0F172A';
    ctx.fillRect(cx, cy, cardW, cardH);
    ctx.strokeStyle = idx === 0 || idx === 3 ? '#2563EB' : '#334155';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(cx, cy, cardW, cardH);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '600 16px "JetBrains Mono", monospace';
    ctx.fillText(kpi.label, cx + 22, cy + 36);

    ctx.fillStyle = '#F8FAFC';
    ctx.font = '600 46px "Playfair Display", Georgia, serif';
    ctx.fillText(kpi.value, cx + 22, cy + 96);

    ctx.fillStyle = '#60A5FA';
    ctx.font = '600 17px "JetBrains Mono", monospace';
    ctx.fillText(kpi.unit, cx + 210, cy + 94);

    ctx.fillStyle = '#CBD5E1';
    ctx.font = '500 15px "JetBrains Mono", monospace';
    ctx.fillText(kpi.delta, cx + 22, cy + 134);

    // Animated Progress Bar inside KPI Card
    const bx = cx + 22;
    const by = cy + 156;
    const bw = cardW - 44;
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(bx, by, bw, 12);
    ctx.fillStyle = '#2563EB';
    ctx.fillRect(bx, by, bw * Math.min(1, kpi.barPct), 12);
  });

  // Animated Phase Elasticity & Strike Trajectory Telemetry Panel
  const panelX = 56;
  const panelY = 592;
  const panelW = w - 112;
  const panelH = 264;

  ctx.fillStyle = '#0F172A';
  ctx.fillRect(panelX, panelY, panelW, panelH);
  ctx.strokeStyle = '#1D4ED8';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(panelX, panelY, panelW, panelH);

  ctx.fillStyle = '#F8FAFC';
  ctx.font = '600 19px "JetBrains Mono", monospace';
  ctx.fillText(
    'PHASE PRESSURE ELASTICITY & LIVE CONTROL WAVEFORM',
    panelX + 24,
    panelY + 38
  );

  // Animated Sine/Telemetry Waveform on Left Half
  ctx.save();
  ctx.beginPath();
  const waveX = panelX + 24;
  const waveY = panelY + 135;
  const waveW = 410;
  for (let i = 0; i <= 48; i++) {
    const t = i / 48;
    const x = waveX + t * waveW;
    const y =
      waveY +
      Math.sin(t * Math.PI * 4 + animPhase * 3.0) * 32 * Math.sin(t * Math.PI) +
      Math.cos(t * Math.PI * 2 - animPhase * 1.8) * 14;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = '#60A5FA';
  ctx.lineWidth = 3.5;
  ctx.stroke();

  // Traveling Telemetry Marker Node
  const markerT = ((animPhase * 0.28) % 1 + 1) % 1;
  const mx = waveX + markerT * waveW;
  const my =
    waveY +
    Math.sin(markerT * Math.PI * 4 + animPhase * 3.0) *
      32 *
      Math.sin(markerT * Math.PI) +
    Math.cos(markerT * Math.PI * 2 - animPhase * 1.8) * 14;
  ctx.fillStyle = '#F8FAFC';
  ctx.beginPath();
  ctx.arc(mx, my, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = '#94A3B8';
  ctx.font = '500 15px "JetBrains Mono", monospace';
  ctx.fillText('360° CREASE LAUNCH VECTOR · RRR > 12.0', waveX, panelY + 232);

  // Phase Bars on Right Half
  const phases = [
    { name: 'POWERPLAY (1–6)', score: '79.0', ratio: 0.79 },
    { name: 'MIDDLE (7–15)', score: '88.4', ratio: 0.884 },
    { name: 'DEATH (16–20)', score: '96.8', ratio: 0.968 },
  ];
  phases.forEach((ph, idx) => {
    const py = panelY + 74 + idx * 62;
    const px = panelX + 470;
    const pw = 415;
    ctx.fillStyle = '#CBD5E1';
    ctx.font = '600 16px "JetBrains Mono", monospace';
    ctx.fillText(ph.name, px, py);
    ctx.fillStyle = '#60A5FA';
    ctx.fillText(`${ph.score} / 100`, px + pw - 108, py);

    ctx.fillStyle = '#1E293B';
    ctx.fillRect(px, py + 12, pw, 14);
    ctx.fillStyle = idx === 2 ? '#3B82F6' : '#1D4ED8';
    const animatedW = pw * Math.min(1, ph.ratio + Math.sin(animPhase * 2 + idx) * 0.02);
    ctx.fillRect(px, py + 12, animatedW, 14);
  });

  // Footer Bar
  ctx.fillStyle = '#94A3B8';
  ctx.font = '600 18px "JetBrains Mono", monospace';
  ctx.fillText(
    'STRATA · ILLUSTRATIVE BATTING TELEMETRY · SUPERR SELECTOR S2',
    56,
    h - 62
  );
}

/**
 * Face 04 (-X Left, 270°): Animated Bowling Containment & Auction Intelligence Plate.
 * Clearly labeled as illustrative sample values (never presented as actual player stats).
 */
function drawBowlingTelemetryFacePlate(
  canvas: HTMLCanvasElement,
  animPhase: number
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  const pulse = 0.5 + 0.5 * Math.cos(animPhase * 2.2);

  ctx.fillStyle = '#0A1128';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#94A3B8';
  ctx.lineWidth = 5;
  ctx.strokeRect(20, 20, w - 40, h - 40);

  ctx.strokeStyle = '#1D4ED8';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(34, 34, w - 68, h - 68);

  // Header + Explicit Illustrative Data Label
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(38, 38, w - 76, 96);
  ctx.fillStyle = '#F8FAFC';
  ctx.font = '600 22px "JetBrains Mono", monospace';
  ctx.fillText('STRATA · FACE 04 · BOWLING & PRI INTELLIGENCE', 60, 76);

  ctx.fillStyle = '#60A5FA';
  ctx.font = '600 17px "JetBrains Mono", monospace';
  ctx.fillText(
    'ILLUSTRATIVE SAMPLE VALUES — NOT ACTUAL PLAYER STATS',
    60,
    112
  );

  // 4 Key Analytical Bowling KPI Cards (2x2 Grid)
  const kpis = [
    {
      label: 'PRESSURE ECONOMY',
      value: '7.12',
      unit: 'RPO',
      delta: '-0.33 RPO SAVINGS IN DEATH',
      barPct: 0.91 + pulse * 0.03,
    },
    {
      label: 'DOT BALL PRESSURE',
      value: '49.2%',
      unit: 'DOT%',
      delta: '+11.4% VS LEAGUE DEATH AVG',
      barPct: 0.84 + pulse * 0.04,
    },
    {
      label: 'CRUNCH WICKETS & FALSE SHOT',
      value: '38.6%',
      unit: 'ERR%',
      delta: '28 HIGH-LEVERAGE WICKETS',
      barPct: 0.86 + (1 - pulse) * 0.04,
    },
    {
      label: 'BOWLING RELIABILITY',
      value: '95.4',
      unit: 'PRI',
      delta: 'ARCHETYPE BWL-01 · YORKER ACE',
      barPct: 0.954,
    },
  ];

  kpis.forEach((kpi, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const cardW = (w - 136) / 2;
    const cardH = 196;
    const cx = 56 + col * (cardW + 24);
    const cy = 154 + row * (cardH + 20);

    ctx.fillStyle = '#0F172A';
    ctx.fillRect(cx, cy, cardW, cardH);
    ctx.strokeStyle = idx === 0 || idx === 3 ? '#2563EB' : '#334155';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(cx, cy, cardW, cardH);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '600 16px "JetBrains Mono", monospace';
    ctx.fillText(kpi.label, cx + 22, cy + 36);

    ctx.fillStyle = '#F8FAFC';
    ctx.font = '600 46px "Playfair Display", Georgia, serif';
    ctx.fillText(kpi.value, cx + 22, cy + 96);

    ctx.fillStyle = '#60A5FA';
    ctx.font = '600 17px "JetBrains Mono", monospace';
    ctx.fillText(kpi.unit, cx + 215, cy + 94);

    ctx.fillStyle = '#CBD5E1';
    ctx.font = '500 15px "JetBrains Mono", monospace';
    ctx.fillText(kpi.delta, cx + 22, cy + 134);

    // Animated Progress Bar inside KPI Card
    const bx = cx + 22;
    const by = cy + 156;
    const bw = cardW - 44;
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(bx, by, bw, 12);
    ctx.fillStyle = '#2563EB';
    ctx.fillRect(bx, by, bw * Math.min(1, kpi.barPct), 12);
  });

  // Animated Yorker/Length Dispersion Radar & Archetype Conviction Panel
  const panelX = 56;
  const panelY = 592;
  const panelW = w - 112;
  const panelH = 264;

  ctx.fillStyle = '#0F172A';
  ctx.fillRect(panelX, panelY, panelW, panelH);
  ctx.strokeStyle = '#1D4ED8';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(panelX, panelY, panelW, panelH);

  ctx.fillStyle = '#F8FAFC';
  ctx.font = '600 19px "JetBrains Mono", monospace';
  ctx.fillText(
    'RELEASE PRECISION RADAR & PHASE CONTAINMENT INDEX',
    panelX + 24,
    panelY + 38
  );

  // Animated Target Rings on Left Half
  const rCx = panelX + 210;
  const rCy = panelY + 148;
  [74, 50, 26].forEach((r, i) => {
    ctx.strokeStyle = i === 2 ? '#60A5FA' : '#334155';
    ctx.lineWidth = i === 2 ? 2.5 : 1.5;
    ctx.beginPath();
    ctx.arc(rCx, rCy, r, 0, Math.PI * 2);
    ctx.stroke();
  });

  // Animated Sweep Line inside Target Ring
  const sweepAngle = animPhase * 1.8;
  ctx.strokeStyle = '#3B82F6';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(rCx, rCy);
  ctx.lineTo(
    rCx + Math.cos(sweepAngle) * 74,
    rCy + Math.sin(sweepAngle) * 74
  );
  ctx.stroke();

  // Clustered Yorker Impact Dots
  for (let d = 0; d < 6; d++) {
    const a = d * 1.05 + animPhase * 0.4;
    const dist = 10 + (d % 3) * 8;
    ctx.fillStyle = d % 2 === 0 ? '#F8FAFC' : '#60A5FA';
    ctx.beginPath();
    ctx.arc(
      rCx + Math.cos(a) * dist,
      rCy + Math.sin(a) * dist,
      4,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  // Phase Containment Bars on Right Half
  const phases = [
    { name: 'POWERPLAY CONTAINMENT', score: '92.4', ratio: 0.924 },
    { name: 'MIDDLE SQUEEZE (7–15)', score: '94.0', ratio: 0.94 },
    { name: 'DEATH YORKER LOCK (16–20)', score: '97.8', ratio: 0.978 },
  ];
  phases.forEach((ph, idx) => {
    const py = panelY + 74 + idx * 62;
    const px = panelX + 430;
    const pw = 455;
    ctx.fillStyle = '#CBD5E1';
    ctx.font = '600 16px "JetBrains Mono", monospace';
    ctx.fillText(ph.name, px, py);
    ctx.fillStyle = '#60A5FA';
    ctx.fillText(`${ph.score} / 100`, px + pw - 108, py);

    ctx.fillStyle = '#1E293B';
    ctx.fillRect(px, py + 12, pw, 14);
    ctx.fillStyle = idx === 2 ? '#3B82F6' : '#1D4ED8';
    const animatedW =
      pw * Math.min(1, ph.ratio + Math.cos(animPhase * 2 + idx) * 0.018);
    ctx.fillRect(px, py + 12, animatedW, 14);
  });

  // Footer Bar
  ctx.fillStyle = '#94A3B8';
  ctx.font = '600 18px "JetBrains Mono", monospace';
  ctx.fillText(
    'STRATA · ILLUSTRATIVE BOWLING TELEMETRY · SUPERR SELECTOR S2',
    56,
    h - 62
  );
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(128, 128, 16, 128, 128, 120);
    grad.addColorStop(0, 'rgba(10, 17, 40, 0.38)');
    grad.addColorStop(0.55, 'rgba(10, 17, 40, 0.14)');
    grad.addColorStop(1, 'rgba(10, 17, 40, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const FACE_01_PHOTO_SPEC: FacePhotoPlateSpec = {
  faceHeader: 'STRATA · FACE 01 · RAJASTHAN ROYALS PHOTO I',
  faceSubheader: 'OFFICIAL MATCH ACTION · CREASE STRIKE GEOMETRY',
  dossierTitle: 'RAJASTHAN ROYALS · CLUTCH STRIKE EVIDENCE',
  leftMetric: 'STAGE: 25% RAW -> 100% INT',
  rightMetric: 'PHOTO PLATE 01 / 02',
  footerStatus: 'HIGH-QUALITY OFFICIAL RR MATCH PHOTOGRAPH · FACE 01 (0°)',
  cropFocusX: 0.45,
  cropFocusY: 0.5,
};

const FACE_03_PHOTO_SPEC: FacePhotoPlateSpec = {
  faceHeader: 'STRATA · FACE 03 · RAJASTHAN ROYALS PHOTO II',
  faceSubheader: 'OFFICIAL MATCH ACTION · PARTNERSHIP & XI CONTEXT',
  dossierTitle: 'RAJASTHAN ROYALS · PARTNERSHIP SYNERGY',
  leftMetric: 'STAGE: 50% CONTEXT LINKED',
  rightMetric: 'PHOTO PLATE 02 / 02',
  footerStatus: 'HIGH-QUALITY OFFICIAL RR MATCH PHOTOGRAPH · FACE 03 (180°)',
  cropFocusX: 0.5,
  cropFocusY: 0.38,
};

export const MonolithCanvas: React.FC<MonolithCanvasProps> = ({
  targetState,
  variant = 'hero',
}) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const targetRef = useRef<MonolithVisualTarget>(targetState);

  const faceCanvasesRef = useRef<(HTMLCanvasElement | null)[]>([
    null,
    null,
    null,
    null,
  ]);
  const faceTexturesRef = useRef<(THREE.CanvasTexture | null)[]>([
    null,
    null,
    null,
    null,
  ]);
  const loadedPhotosRef = useRef<(HTMLImageElement | null)[]>([null, null]);
  const [webglReady, setWebglReady] = useState(true);
  const renderNowRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    targetRef.current = targetState;
  }, [targetState]);

  const redrawPhotoFaces = () => {
    const [c1, , c3] = faceCanvasesRef.current;
    const [t1, , t3] = faceTexturesRef.current;
    const [img1, img2] = loadedPhotosRef.current;

    if (c1 && t1) {
      drawRRPhotoFacePlate(c1, img1, FACE_01_PHOTO_SPEC);
      t1.needsUpdate = true;
    }
    if (c3 && t3) {
      drawRRPhotoFacePlate(c3, img2, FACE_03_PHOTO_SPEC);
      t3.needsUpdate = true;
    }
  };

  const redrawTelemetryFaces = (animPhase: number) => {
    const [, c2, , c4] = faceCanvasesRef.current;
    const [, t2, , t4] = faceTexturesRef.current;

    if (c2 && t2) {
      drawBattingTelemetryFacePlate(c2, animPhase);
      t2.needsUpdate = true;
    }
    if (c4 && t4) {
      drawBowlingTelemetryFacePlate(c4, animPhase);
      t4.needsUpdate = true;
    }
  };

  const redrawAllFaces = (animPhase = 0) => {
    redrawPhotoFaces();
    redrawTelemetryFaces(animPhase);
    renderNowRef.current?.();
  };

  // Load the TWO Rajasthan Royals photographs for Face 01 and Face 03
  useEffect(() => {
    const sources: { primary: string; fallback?: string }[] = [
      {
        primary:
          targetState.customPlayerImageUrl ||
          HERO_PLAYER_PHOTO_CONFIG.publicUrlPath,
      },
      {
        primary: HERO_PLAYER_PHOTO_CONFIG.secondaryUrlPath,
        fallback: HERO_PLAYER_PHOTO_CONFIG.secondaryFallbackUrl,
      },
    ];

    sources.forEach((srcSpec, idx) => {
      const loadFromUrl = (url: string, fallbackUrl?: string) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          loadedPhotosRef.current[idx] = img;
          redrawPhotoFaces();
          renderNowRef.current?.();
        };
        img.onerror = () => {
          if (fallbackUrl && fallbackUrl !== url) {
            loadFromUrl(fallbackUrl, undefined);
          } else {
            redrawPhotoFaces();
            renderNowRef.current?.();
          }
        };
        img.src = url;
      };

      loadFromUrl(srcSpec.primary, srcSpec.fallback);
    });
  }, [targetState.customPlayerImageUrl]);

  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareGl();
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: true,
        preserveDrawingBuffer: true,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglReady(false);
      return;
    }

    const width = container.clientWidth || 500;
    const height = container.clientHeight || 320;

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    renderer.setSize(width, height);

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTexture = pmremGenerator.fromScene(
      new RoomEnvironment(),
      0.04
    ).texture;
    scene.environment = envTexture;
    pmremGenerator.dispose();

    // Fixed horizontal telephoto camera calibrated so the 4-sided prism is prominent and well-proportioned
    const camera = new THREE.PerspectiveCamera(18, width / height, 0.1, 60);
    camera.position.set(0, 0.0, 9.15);
    camera.lookAt(0, 0, 0);

    // Balanced Studio Lighting so all 4 rotating faces are clearly illuminated and highlighted
    const hemiLight = new THREE.HemisphereLight(0xf8fafc, 0xd6cebe, 1.18);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfffbeb, 2.45);
    keyLight.position.set(5.0, 4.2, 6.8);
    scene.add(keyLight);

    const cobaltRimLight = new THREE.DirectionalLight(0x2563eb, 2.15);
    cobaltRimLight.position.set(-5.2, 2.0, -4.5);
    scene.add(cobaltRimLight);

    // Contact Shadow Disc
    const shadowTexture = createContactShadowTexture();
    const shadowGeo = new THREE.CircleGeometry(1.95, 32);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      depthWrite: false,
      opacity: 0.68,
    });
    const shadowDisc = new THREE.Mesh(shadowGeo, shadowMat);
    shadowDisc.rotation.x = -Math.PI / 2;
    shadowDisc.position.y = -1.2;
    scene.add(shadowDisc);

    // Central 4-Sided Rotating Prism (Preserved Standard Object Size)
    const prismGroup = new THREE.Group();
    scene.add(prismGroup);

    const maxAniso = renderer.capabilities.getMaxAnisotropy();

    const createFaceCanvasAndTex = (idx: 0 | 1 | 2 | 3) => {
      const c = document.createElement('canvas');
      c.width = 1024;
      c.height = 1024;
      faceCanvasesRef.current[idx] = c;
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = maxAniso;
      faceTexturesRef.current[idx] = tex;
      return tex;
    };

    const texFace1 = createFaceCanvasAndTex(0);
    const texFace2 = createFaceCanvasAndTex(1);
    const texFace3 = createFaceCanvasAndTex(2);
    const texFace4 = createFaceCanvasAndTex(3);
    redrawAllFaces(0);

    // 1. Core Deep-Navy 4-Sided Structural Column
    const coreW = 1.8;
    const coreH = 1.96;
    const coreGeo = new THREE.BoxGeometry(coreW, coreH, coreW);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x0a1128,
      roughness: 0.28,
      metalness: 0.78,
    });
    const coreColumn = new THREE.Mesh(coreGeo, coreMat);
    prismGroup.add(coreColumn);

    // 2. Four Distinct Framed Face Plates:
    // Face 01 (+Z Front): RR Photograph I
    // Face 02 (+X Right): Animated Batting Telemetry Data
    // Face 03 (-Z Back):  RR Photograph II
    // Face 04 (-X Left):  Animated Bowling & PRI Telemetry Data
    const faceGeo = new THREE.PlaneGeometry(1.72, 1.88);
    const makeFaceMat = (tex: THREE.CanvasTexture) =>
      new THREE.MeshPhysicalMaterial({
        map: tex,
        color: 0xffffff,
        roughness: 0.2,
        metalness: 0.12,
        clearcoat: 0.45,
        clearcoatRoughness: 0.16,
      });

    const matF1 = makeFaceMat(texFace1);
    const matF2 = makeFaceMat(texFace2);
    const matF3 = makeFaceMat(texFace3);
    const matF4 = makeFaceMat(texFace4);

    const offset = coreW / 2 + 0.012;

    const meshF1 = new THREE.Mesh(faceGeo, matF1);
    meshF1.position.set(0, 0, offset);
    prismGroup.add(meshF1);

    const meshF2 = new THREE.Mesh(faceGeo, matF2);
    meshF2.position.set(offset, 0, 0);
    meshF2.rotation.y = Math.PI / 2;
    prismGroup.add(meshF2);

    const meshF3 = new THREE.Mesh(faceGeo, matF3);
    meshF3.position.set(0, 0, -offset);
    meshF3.rotation.y = Math.PI;
    prismGroup.add(meshF3);

    const meshF4 = new THREE.Mesh(faceGeo, matF4);
    meshF4.position.set(-offset, 0, 0);
    meshF4.rotation.y = -Math.PI / 2;
    prismGroup.add(meshF4);

    // 3. Four Straight Brushed-Silver Corner Chamfer Columns
    const pilasterGeo = new THREE.BoxGeometry(0.07, coreH + 0.05, 0.07);
    const silverMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      roughness: 0.22,
      metalness: 0.9,
    });
    const cornerCoords: [number, number][] = [
      [coreW / 2, coreW / 2],
      [-coreW / 2, coreW / 2],
      [coreW / 2, -coreW / 2],
      [-coreW / 2, -coreW / 2],
    ];
    cornerCoords.forEach(([cx, cz]) => {
      const p = new THREE.Mesh(pilasterGeo, silverMat);
      p.position.set(cx, 0, cz);
      prismGroup.add(p);
    });

    // 4. Straight Horizontal Top & Bottom Architectural Crown & Base Plinths
    const capGeo = new THREE.BoxGeometry(coreW + 0.12, 0.06, coreW + 0.12);
    const cobaltTrimGeo = new THREE.BoxGeometry(
      coreW + 0.15,
      0.02,
      coreW + 0.15
    );
    const cobaltMat = new THREE.MeshStandardMaterial({
      color: 0x1d4ed8,
      roughness: 0.25,
      metalness: 0.85,
    });

    const topCap = new THREE.Mesh(capGeo, silverMat);
    topCap.position.y = coreH / 2 + 0.03;
    prismGroup.add(topCap);

    const topCobaltTrim = new THREE.Mesh(cobaltTrimGeo, cobaltMat);
    topCobaltTrim.position.y = coreH / 2 + 0.072;
    prismGroup.add(topCobaltTrim);

    const bottomCap = new THREE.Mesh(capGeo, silverMat);
    bottomCap.position.y = -coreH / 2 - 0.03;
    prismGroup.add(bottomCap);

    const bottomCobaltTrim = new THREE.Mesh(cobaltTrimGeo, cobaltMat);
    bottomCobaltTrim.position.y = -coreH / 2 - 0.072;
    prismGroup.add(bottomCobaltTrim);

    // Interactive pointer drag support
    let isDragging = false;
    let prevPointerX = 0;

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      prevPointerX = e.clientX;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevPointerX;
      prevPointerX = e.clientX;
      currentRotY += dx * 0.0065;
    };
    const onPointerUp = () => {
      isDragging = false;
    };

    const domElem = renderer.domElement;
    domElem.style.cursor = 'grab';
    domElem.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });

    let isHeroVisible = true;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]) {
          isHeroVisible = entries[0].isIntersecting;
        }
      },
      { threshold: 0.02 }
    );
    io.observe(container);

    // Start at -0.52 rad so both Face 01 (RR Photo 1) and Face 02 (Animated Batting Telemetry) are immediately visible
    let currentRotY = -0.52;
    let animPhase = 0;
    let lastTelemetryDraw = 0;
    let lastTime = performance.now();
    let frameId = 0;
    let isDisposed = false;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (gl && typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (isDisposed) return;
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 50);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } else {
        frameId = window.setTimeout(cb, 50);
      }
    }

    function tick() {
      if (isDisposed) return;
      const now = performance.now();
      const dt = Math.min(0.06, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;
      animPhase += dt;

      if (isHeroVisible) {
        const tgt = targetRef.current;

        // Refresh the 2 animated performance-data faces (Face 02 & Face 04) smoothly (~10fps)
        if (now - lastTelemetryDraw > 95) {
          lastTelemetryDraw = now;
          redrawTelemetryFaces(animPhase);
        }

        if (!isDragging) {
          if (
            typeof tgt.targetAngleRadians === 'number' &&
            tgt.activeFaceIndex !== null
          ) {
            const twoPi = Math.PI * 2;
            const delta =
              THREE.MathUtils.euclideanModulo(
                tgt.targetAngleRadians - currentRotY + Math.PI,
                twoPi
              ) - Math.PI;
            currentRotY += delta * Math.min(1, dt * 16.0);
          } else {
            // Smooth continuous 360-degree orbit
            currentRotY -= dt * 0.24;
          }
        }

        prismGroup.rotation.x = 0;
        prismGroup.rotation.z = 0;
        prismGroup.rotation.y = currentRotY;
        prismGroup.position.y = 0;

        window.__MONOLITH_STATE__ = {
          rotationY: Number(currentRotY.toFixed(3)),
          activeFaceIndex: tgt.activeFaceIndex,
          loadedPhotosCount: loadedPhotosRef.current.filter(Boolean).length,
          faceTypes: ['photo', 'telemetry', 'photo', 'telemetry'],
          photoUrls: [
            HERO_PLAYER_PHOTO_CONFIG.publicUrlPath,
            HERO_PLAYER_PHOTO_CONFIG.secondaryUrlPath,
          ],
        };

        renderer.render(scene, camera);
      }

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    renderNowRef.current = () => {
      if (!isDisposed) {
        renderer.render(scene, camera);
      }
    };

    tick();

    const handleResize = () => {
      if (!container || isDisposed) return;
      const w = container.clientWidth || 500;
      const h = container.clientHeight || 320;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderer.render(scene, camera);
    };

    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      isDisposed = true;
      renderNowRef.current = null;
      io.disconnect();
      domElem.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      texFace1.dispose();
      texFace2.dispose();
      texFace3.dispose();
      texFace4.dispose();
      envTexture.dispose();
      shadowTexture.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      faceGeo.dispose();
      matF1.dispose();
      matF2.dispose();
      matF3.dispose();
      matF4.dispose();
      pilasterGeo.dispose();
      silverMat.dispose();
      capGeo.dispose();
      cobaltTrimGeo.dispose();
      cobaltMat.dispose();
      shadowGeo.dispose();
      shadowMat.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      className="relative w-full h-full flex items-center justify-center select-none"
      data-testid={`monolith-viewport-${variant}`}
    >
      {/* Compact & Proportionate Architectural Reticle around Central Prism */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-2 flex items-center justify-center"
      >
        <div className="w-[62%] aspect-square rounded-full border border-[#0A1128]/10" />
        <div className="absolute w-[48%] aspect-square rounded-full border border-dashed border-[#1D4ED8]/20" />
        <div className="absolute w-[84%] h-px bg-[#0A1128]/8" />
        <div className="absolute h-[84%] w-px bg-[#0A1128]/8" />
      </div>

      {/* Isolated Compact WebGL Mount Container */}
      <div
        ref={canvasMountRef}
        className="relative z-10 w-full h-full min-h-[240px]"
      />

      {!webglReady && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-60 h-68 border-2 border-[#1D4ED8] bg-[#0A1128] text-[#F7F4EE] p-4 flex flex-col justify-between">
            <span className="font-mono-tabular text-[11px] text-[#94A3B8]">
              STRATA · RR MATCH PHOTOGRAPHS
            </span>
            <img
              src={HERO_PLAYER_PHOTO_CONFIG.publicUrlPath}
              alt="Rajasthan Royals Player Match Photograph"
              referrerPolicy="no-referrer"
              className="w-full h-36 object-cover border border-[#94A3B8]/40"
            />
            <span className="font-mono-tabular text-[10px] text-[#60A5FA]">
              PRI 94.6 · CTRL 81.4%
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
