import React, { useEffect, useRef } from 'react';
import { ScrollProgressSnapshot } from '../hooks/useScrollProgress';
import {
  BackgroundRibbonState,
  computeBackgroundRibbonState,
} from '../lib/intelligenceEngine';

interface InteractiveBackgroundProps {
  scrollStateRef: React.MutableRefObject<ScrollProgressSnapshot>;
}

declare global {
  interface Window {
    __BACKGROUND_STATE__?: BackgroundRibbonState & {
      orientation: 'vertical-3d';
      verticalLineCount: number;
    };
  }
}

interface VerticalFilamentSpec {
  index: number;
  baseNormX: number; // 0.04 .. 0.96 across viewport width
  clusterCenterNormX: number; // Braided column center for Stage 2 entanglement
  resolvedNormX: number; // Resolved harmonic column position for Stage 4
  baseDepthZ: number; // -1.0 (far) .. +1.0 (near)
  freqY1: number;
  freqY2: number;
  phaseSeed: number;
  isRoyalBlue: boolean;
}

interface VerticalNodeSpec {
  filamentIndex: number;
  baseV: number; // 0..1 along vertical axis
  speed: number;
  isAccent: boolean;
}

const VERTICAL_LINE_COUNT = 28;
const NODES_COUNT = 34;

/**
 * Evaluates the 3D-projected horizontal X position and depth Z of vertical filament `spec`
 * at normalized vertical position `v` (0 = top of viewport, 1 = bottom of viewport)
 * as a continuous, bidirectional function of scroll-driven `ribbon` state.
 *
 * Scroll Down Progression:
 * - Beginning (`initialAlignment`): Vertical lines are organised, aligned, and straight.
 * - Stage 1 (`stage1Overlap`): Vertical lines begin moving laterally and overlapping.
 * - Stage 2 (`entanglement`): Vertical lines intertwine and form a complex 3D tangled structure.
 * - Stage 3 (`stage3Opening`): The tangled structure starts opening and separating.
 * - Stage 4 (`reorganisation`): Vertical lines become organised again into a clear resolved structure.
 *
 * Scroll Up Progression:
 * - Reverses the exact same transformation naturally and continuously.
 */
function evaluateVerticalFilament3D(
  spec: VerticalFilamentSpec,
  v: number,
  width: number,
  ribbon: BackgroundRibbonState,
  ambientPhase: number
): { x: number; z: number } {
  const centerX = width * 0.5;
  // Envelope that keeps top/bottom anchors graceful while allowing full 3D braiding through the scene
  const verticalEnvelope = 0.25 + 0.75 * Math.sin(v * Math.PI);

  // 0. Beginning: Organised, aligned, and relatively straight vertical lines
  const xBeginning =
    spec.baseNormX * width +
    Math.sin(v * Math.PI * 1.5 + spec.phaseSeed + ambientPhase * 0.4) * 3.5;
  const zBeginning = spec.baseDepthZ * 0.35;

  // 1. Stage 1: Vertical lines begin moving laterally and overlapping neighbors
  const overlapWave =
    Math.sin(v * Math.PI * spec.freqY1 + spec.phaseSeed + ambientPhase * 0.6) *
    (width * 0.055) *
    verticalEnvelope;
  const xStage1 = spec.baseNormX * width + overlapWave;
  const zStage1 =
    Math.cos(v * Math.PI * spec.freqY1 + spec.phaseSeed) * 0.65;

  // 2. Stage 2: Vertical lines intertwine into a complex 3D tangled braided structure
  const braidCenter = spec.clusterCenterNormX * width;
  const helixA =
    Math.sin(
      v * Math.PI * (spec.freqY1 * 1.65) +
        spec.phaseSeed * 1.7 +
        ambientPhase * 0.75
    ) *
    (width * 0.115) *
    verticalEnvelope;
  const helixB =
    Math.cos(
      v * Math.PI * (spec.freqY2 * 1.45) -
        spec.phaseSeed * 1.3 -
        ambientPhase * 0.5
    ) *
    (width * 0.065) *
    verticalEnvelope;
  const xStage2 =
    braidCenter * 0.68 + spec.baseNormX * width * 0.32 + (helixA + helixB);
  const zStage2 = Math.sin(
    v * Math.PI * (spec.freqY1 * 1.65) + spec.phaseSeed * 1.7
  );

  // 3. Stage 3: Tangled structure starts opening and separating outward
  const openSpread =
    (spec.baseNormX - 0.5) * width * 1.06 +
    Math.sin(v * Math.PI * 2.0 + spec.phaseSeed) *
      (width * 0.042) *
      verticalEnvelope;
  const xStage3 = centerX + openSpread;
  const zStage3 = spec.baseDepthZ * 0.55;

  // 4. Stage 4: Lines become organised again, forming a clear and resolved architectural structure
  const xStage4 =
    spec.resolvedNormX * width +
    Math.sin(v * Math.PI * 1.0 + (spec.index % 4) * 0.4) * 2.5;
  const zStage4 = (spec.index % 2 === 0 ? 0.3 : -0.3);

  // Continuous normalized blending across all 5 phases
  const w0 = Math.max(0, ribbon.initialAlignment);
  const w1 = Math.max(0, ribbon.stage1Overlap);
  const w2 = Math.max(0, ribbon.entanglement);
  const w3 = Math.max(0, ribbon.stage3Opening);
  const w4 = Math.max(0, ribbon.reorganisation);
  const sum = Math.max(0.0001, w0 + w1 + w2 + w3 + w4);

  const rawX =
    (xBeginning * w0 +
      xStage1 * w1 +
      xStage2 * w2 +
      xStage3 * w3 +
      xStage4 * w4) /
    sum;
  const rawZ =
    (zBeginning * w0 +
      zStage1 * w1 +
      zStage2 * w2 +
      zStage3 * w3 +
      zStage4 * w4) /
    sum;

  // Subtle 3D perspective projection around viewport center based on depth Z
  const perspectiveScale = 1 + rawZ * 0.065;
  const projectedX = centerX + (rawX - centerX) * perspectiveScale;

  return { x: projectedX, z: rawZ };
}

export const InteractiveBackground: React.FC<InteractiveBackgroundProps> = ({
  scrollStateRef,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth || 1440;
    let height = window.innerHeight || 900;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    const resize = () => {
      width = window.innerWidth || 1440;
      height = window.innerHeight || 900;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    // Build 28 thin 3D vertical filaments distributed across the visual space
    const filaments: VerticalFilamentSpec[] = [];
    const clusterCenters = [0.22, 0.5, 0.78];
    for (let i = 0; i < VERTICAL_LINE_COUNT; i++) {
      const t = i / (VERTICAL_LINE_COUNT - 1);
      const baseNormX = 0.035 + t * 0.93;
      const clusterCenterNormX = clusterCenters[i % clusterCenters.length];
      // Stage 4 resolved structure: crisp paired harmonic vertical columns
      const groupIdx = Math.floor(i / 4);
      const memberIdx = i % 4;
      const resolvedNormX =
        0.07 + (groupIdx / 6) * 0.86 + (memberIdx - 1.5) * 0.008;

      filaments.push({
        index: i,
        baseNormX,
        clusterCenterNormX,
        resolvedNormX,
        baseDepthZ: Math.sin(i * 1.37),
        freqY1: 1.5 + (i % 4) * 0.55,
        freqY2: 2.3 + ((i + 2) % 3) * 0.65,
        phaseSeed: i * 0.78,
        isRoyalBlue: i % 3 === 0,
      });
    }

    // Interconnected nodes travelling vertically along the thin vertical filaments
    const nodes: VerticalNodeSpec[] = [];
    for (let n = 0; n < NODES_COUNT; n++) {
      nodes.push({
        filamentIndex: n % VERTICAL_LINE_COUNT,
        baseV: (n / NODES_COUNT + (n % 5) * 0.13) % 1,
        speed: 0.022 + (n % 3) * 0.007,
        isAccent: n % 3 === 0,
      });
    }

    window.addEventListener('resize', resize, { passive: true });

    let frameId = 0;
    let isDisposed = false;
    let smoothedProgress = scrollStateRef.current.globalProgress || 0;
    let ambientPhase = 0;

    const render = () => {
      if (isDisposed) return;

      const snap = scrollStateRef.current;
      // Smooth interpolation based on scroll progress (zero sudden resets or jumps)
      smoothedProgress += (snap.globalProgress - smoothedProgress) * 0.12;

      const ribbon = computeBackgroundRibbonState(
        smoothedProgress,
        snap.direction
      );

      window.__BACKGROUND_STATE__ = {
        ...ribbon,
        orientation: 'vertical-3d',
        verticalLineCount: VERTICAL_LINE_COUNT,
      };

      const velocityBoost = Math.min(
        0.01,
        Math.abs(snap.velocity) * 0.00015
      );
      ambientPhase += ribbon.flowSign * (0.004 + velocityBoost);

      ctx.clearRect(0, 0, width, height);

      const vSteps = 42;

      // 1. Draw the 28 thin 3D vertical lines extending from top (y = 0) to bottom (y = height)
      for (let i = 0; i < filaments.length; i++) {
        const spec = filaments[i];
        // Depth-modulated opacity and ultra-thin line weight
        const midSample = evaluateVerticalFilament3D(
          spec,
          0.5,
          width,
          ribbon,
          ambientPhase
        );
        const depthFactor = (midSample.z + 1) * 0.5; // 0 (far) .. 1 (near)

        const alpha = spec.isRoyalBlue
          ? 0.055 + depthFactor * 0.075 + ribbon.entanglement * 0.03
          : 0.038 + depthFactor * 0.055 + ribbon.entanglement * 0.02;

        ctx.strokeStyle = spec.isRoyalBlue
          ? `rgba(29, 78, 216, ${alpha.toFixed(3)})`
          : `rgba(10, 17, 40, ${alpha.toFixed(3)})`;
        ctx.lineWidth = 0.55 + depthFactor * 0.55;

        ctx.beginPath();
        for (let s = 0; s <= vSteps; s++) {
          const v = s / vSteps;
          const y = v * height;
          const pt = evaluateVerticalFilament3D(
            spec,
            v,
            width,
            ribbon,
            ambientPhase + smoothedProgress * Math.PI * 1.5
          );
          if (s === 0) ctx.moveTo(pt.x, y);
          else ctx.lineTo(pt.x, y);
        }
        ctx.stroke();
      }

      // 2. Compute 3D node positions along the vertical filaments
      const nodePositions: {
        x: number;
        y: number;
        z: number;
        isAccent: boolean;
      }[] = [];

      for (let i = 0; i < nodes.length; i++) {
        const nd = nodes[i];
        const spec = filaments[nd.filamentIndex];
        // Reversible vertical travel tied to scroll progress + subtle ambient flow
        const rawV =
          nd.baseV +
          smoothedProgress * 0.55 +
          ambientPhase * (nd.speed * 14);
        const v = ((rawV % 1) + 1) % 1;
        const y = v * height;
        const pt = evaluateVerticalFilament3D(
          spec,
          v,
          width,
          ribbon,
          ambientPhase + smoothedProgress * Math.PI * 1.5
        );

        nodePositions.push({
          x: pt.x,
          y,
          z: pt.z,
          isAccent: nd.isAccent,
        });
      }

      // 3. Draw fine interconnected cross-bridges between proximate vertical filaments
      const maxConnectDist =
        110 +
        ribbon.stage1Overlap * 35 +
        ribbon.entanglement * 65 +
        ribbon.reorganisation * 25;
      const maxDistSq = maxConnectDist * maxConnectDist;

      for (let i = 0; i < nodePositions.length; i++) {
        for (let j = i + 1; j < nodePositions.length; j++) {
          const a = nodePositions[i];
          const b = nodePositions[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < maxDistSq) {
            const dist = Math.sqrt(distSq);
            const linkAlpha = (1 - dist / maxConnectDist) * 0.085;
            ctx.strokeStyle =
              a.isAccent || b.isAccent
                ? `rgba(29, 78, 216, ${linkAlpha.toFixed(3)})`
                : `rgba(30, 41, 59, ${linkAlpha.toFixed(3)})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // 4. Draw subtle depth-scaled nodes on the vertical lines
      for (let i = 0; i < nodePositions.length; i++) {
        const p = nodePositions[i];
        const depthScale = 0.75 + (p.z + 1) * 0.35;
        const r = (p.isAccent ? 2.0 : 1.45) * depthScale;
        ctx.fillStyle = p.isAccent
          ? 'rgba(29, 78, 216, 0.24)'
          : 'rgba(10, 17, 40, 0.16)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      frameId = window.setTimeout(() => {
        if (!isDisposed) requestAnimationFrame(render);
      }, 36);
    };

    render();

    return () => {
      isDisposed = true;
      clearTimeout(frameId);
      window.removeEventListener('resize', resize);
    };
  }, [scrollStateRef]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      data-testid="strata-interactive-background"
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
    />
  );
};
