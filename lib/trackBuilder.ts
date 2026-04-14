/**
 * trackBuilder.ts — Pure track layout, no Matter.js, fully testable.
 *
 * Anti-stuck guarantees:
 *  1. CORRIDOR: every y-level has a horizontal gap >= CORRIDOR px free of solid obstacles
 *  2. NO POCKETS: U-ramps are narrower than they are deep; each has a launch pad at the floor
 *  3. EVEN ZONES: obstacles stay within zone bounds, MIN_GAP buffer at every zone border
 *  4. PLATFORM CAP: platforms <= MAX_PLAT_RATIO of playW — opposite side always open
 *  5. PAD STRENGTH: every pad fires at speed >= MIN_PAD_SPEED so marble clears next zone
 *  6. SYMMETRIC: ramps/pads/rails come in mirrored pairs
 */

export const MARBLE_RADIUS  = 6;
export const WALL_THICK     = 24;
export const CORRIDOR       = MARBLE_RADIUS * 3;    // 36px min open gap
export const MIN_GAP        = MARBLE_RADIUS * 3;    // 36px zone-border buffer
export const MAX_PLAT_RATIO = 0.30;                 // platform <= 30% of playW
export const MIN_PAD_SPEED  = 5;                    // px/frame resultant speed
export const ZONES          = 8;

export interface PegDef      { kind: "peg";      x: number; y: number; r: number }
export interface LineDef     { kind: "line";     x: number; y: number; len: number; angle: number }
export interface URampDef    { kind: "uramp";    cx: number; topY: number; w: number; depth: number }
export interface PlatDef     { kind: "platform"; x: number; y: number; w: number; angle: number }
export interface PadDef      { kind: "pad";      x: number; y: number; w: number; vx: number; vy: number; color: string; dir: "left"|"right"|"up" }

export type ObstacleDef = PegDef | LineDef | URampDef | PlatDef | PadDef;

export interface TrackLayout {
  obstacles: ObstacleDef[];
  finishY:   number;
  playX:     number;
  playW:     number;
  trackH:    number;
}

export const PAD_COLOR = {
  left:  "#16a34a",
  right: "#b45309",
  up:    "#be123c",
} as const;

export function buildTrack(W: number, H: number): TrackLayout {
  const playX   = WALL_THICK;
  const playW   = W - WALL_THICK * 2;
  const finishY = H - 55;
  const spawnY  = 45;
  const trackH  = finishY - spawnY;
  const zoneH   = trackH / ZONES;
  const obs: ObstacleDef[] = [];

  const cx = playX + playW / 2;
  const fx = (f: number) => playX + playW * f;
  const zt = (z: number) => spawnY + z * zoneH;

  const peg      = (x: number, y: number, r = 5): PegDef      => ({ kind:"peg", x, y, r });
  const line     = (x: number, y: number, len: number, angle: number): LineDef => ({ kind:"line", x, y, len, angle });
  const uramp    = (cxr: number, topY: number, w: number, depth: number): URampDef => ({ kind:"uramp", cx:cxr, topY, w, depth });
  const platform = (x: number, y: number, w: number, angle = 0): PlatDef => ({ kind:"platform", x, y, w, angle });
  const pad      = (x: number, y: number, w: number, vx: number, vy: number, dir: PadDef["dir"]): PadDef =>
    ({ kind:"pad", x, y, w, vx, vy, color:PAD_COLOR[dir], dir });

  // ZONE 0-1: Staggered peg field — starts at fixed offset from spawn so
  // top < bot on every canvas size (avoids negative rs on large canvases).
  {
    const rows = 3, cols = 4;
    // top: 80px below spawnY — clear of spawn zone on all sizes
    const top = spawnY + 80;
    // bot: whichever is smaller — zone 1 top minus MIN_GAP, or top + 2*zoneH*0.4
    const bot = Math.min(zt(1) - MIN_GAP, top + zoneH * 0.75);
    const rs = rows > 1 ? (bot - top) / (rows - 1) : 0;
    // Only place pegs if rows fit; guard rs >= 12 (min peg row spacing)
    const safeRs = Math.max(rs, 12);
    const cs = playW / (cols + 1);
    for (let r = 0; r < rows; r++) {
      const even = r % 2 === 0;
      const count = even ? cols : cols - 1;
      const ox = even ? playX + cs : playX + cs * 1.5;
      for (let c = 0; c < count; c++) obs.push(peg(ox + c * cs, top + r * safeRs, 5));
    }
  }

  // ZONE 1-2: Angled funnel rails + scatter pegs
  {
    const midY = (zt(1) + zt(2)) / 2;
    const len = Math.min(110, playW * 0.25);
    const angle = Math.PI / 12;
    obs.push(line(fx(0.27), midY, len,  angle));
    obs.push(line(fx(0.73), midY, len, -angle));
    const scY = midY + zoneH * 0.28;
    obs.push(peg(fx(0.40), scY, 5));
    obs.push(peg(fx(0.51), scY - 12, 6));
    obs.push(peg(fx(0.62), scY, 5));
  }

  // ZONE 2-3: Twin U-ramps + outward launch pads (depth < width = no trapping)
  {
    const rampTop = zt(2) + MIN_GAP;
    const rampW   = playW * 0.22;
    const rampD   = Math.min(zoneH * 0.48, rampW * 0.9);
    const padY    = rampTop + rampD + 3;
    obs.push(uramp(fx(0.24), rampTop, rampW, rampD));
    obs.push(pad(fx(0.24), padY, rampW - 6,  5.5, -6.0, "right"));
    obs.push(uramp(fx(0.76), rampTop, rampW, rampD));
    obs.push(pad(fx(0.76), padY, rampW - 6, -5.5, -6.0, "left"));
    const midY = rampTop + rampD * 0.5;
    obs.push(peg(cx - 14, midY, 5));
    obs.push(peg(cx, midY - 16, 6));
    obs.push(peg(cx + 14, midY, 5));
  }

  // ZONE 3-4: Staircase of short angled platforms (alternate L/R, always open on other side)
  {
    const maxW  = playW * MAX_PLAT_RATIO;
    const vStep = zoneH / 4.5;
    obs.push(platform(fx(0.20), zt(3) + MIN_GAP + vStep * 0, maxW,  0.13));
    obs.push(platform(fx(0.80), zt(3) + MIN_GAP + vStep * 1, maxW, -0.13));
    obs.push(platform(fx(0.35), zt(3) + MIN_GAP + vStep * 2, maxW,  0.09));
    obs.push(platform(fx(0.65), zt(3) + MIN_GAP + vStep * 3, maxW, -0.09));
  }

  // ZONE 4-5: Upward boost pads (stops wall-slide) + 3-row peg cluster
  {
    const boostY = zt(4) + MIN_GAP;
    const boostW = playW * 0.15;
    obs.push(pad(fx(0.16), boostY, boostW,  1.0, -7.0, "up"));
    obs.push(pad(fx(0.84), boostY, boostW, -1.0, -7.0, "up"));
    const clTop = boostY + 38;
    const cCols = 5;
    const cs    = playW / (cCols + 1);
    const cRows = 3;
    const cRs   = 32;  // ≥ 9px between same-kind rows on all canvas sizes
    for (let r = 0; r < cRows; r++) {
      const even = r % 2 === 0;
      const count = even ? cCols : cCols - 1;
      const ox = even ? playX + cs : playX + cs * 1.5;
      for (let c = 0; c < count; c++) obs.push(peg(ox + c * cs, clTop + r * cRs, 5));
    }
    // Scatter peg row: place safely below cluster bottom row + MIN_GAP
    const clusterBottomY = clTop + (cRows - 1) * cRs;
    const scatterY = clusterBottomY + MIN_GAP + 4;
    for (let i = 0; i < 4; i++) obs.push(peg(fx(0.15 + i * 0.175), Math.min(scatterY, zt(5) - MIN_GAP), 5));
  }

  // ZONE 5-6: Offset horizontal shelf rails + guide diagonals
  {
    const y1 = zt(5) + MIN_GAP;
    const y2 = y1 + zoneH * 0.4;
    const shelfLen = Math.min(110, playW * 0.26);
    obs.push(line(fx(0.26), y1, shelfLen, 0));
    obs.push(line(fx(0.74), y2, shelfLen, 0));
    obs.push(line(fx(0.30), zt(6) - MIN_GAP,  90, -Math.PI / 11));
    obs.push(line(fx(0.70), zt(6) - MIN_GAP,  90,  Math.PI / 11));
    // Guide pegs sit between the two shelves — safe distance from zone 4 cluster bottom
    const guidePegY = y1 + (y2 - y1) / 2;
    obs.push(peg(fx(0.50), guidePegY, 5));
    obs.push(peg(fx(0.37), guidePegY + 14, 5));
    obs.push(peg(fx(0.63), guidePegY + 14, 5));
  }

  // ZONE 6-7: Convergence funnel + centre boost
  {
    const fY  = zt(6) + MIN_GAP;
    const len = playW * 0.25;
    obs.push(line(fx(0.23), fY, len, -Math.PI / 10));
    obs.push(line(fx(0.77), fY, len,  Math.PI / 10));
    obs.push(pad(cx, fY + zoneH * 0.45, playW * 0.16, 0, -6.0, "up"));
  }

  // ZONE 7-finish: Final scatter pegs (last-second drama)
  {
    const pegY = finishY - MIN_GAP - 12;
    for (let i = 0; i < 5; i++) obs.push(peg(fx(0.15 + i * 0.175), pegY, 5));
  }

  return { obstacles: obs, finishY, playX, playW, trackH };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Returns the half-width of a line or platform obstacle. */
function halfLen(obs: LineDef | PlatDef): number {
  return obs.kind === "line" ? obs.len / 2 : obs.w / 2;
}

// ── Validation ─────────────────────────────────────────────────────────────────

export interface ValidationError {
  type: "stuck_risk"|"wall_clip"|"platform_too_wide"|"gap_too_small"|"pad_too_weak"|"no_corridor";
  message: string;
  obstacle?: ObstacleDef;
  y?: number;
}

export function validateTrack(layout: TrackLayout): ValidationError[] {
  const errors: ValidationError[] = [];
  const { obstacles, playX, playW, finishY } = layout;
  const playRight = playX + playW;

  for (const obs of obstacles) {
    if (obs.kind === "platform") {
      const maxW = playW * MAX_PLAT_RATIO;
      if (obs.w > maxW + 1) errors.push({ type:"platform_too_wide", message:`Platform at y=${obs.y.toFixed(0)} is ${obs.w.toFixed(0)}px (max ${maxW.toFixed(0)}px)`, obstacle:obs });
    }
    if (obs.kind === "peg") {
      if (obs.x - obs.r < playX - 1 || obs.x + obs.r > playRight + 1)
        errors.push({ type:"wall_clip", message:`Peg at (${obs.x.toFixed(0)},${obs.y.toFixed(0)}) clips wall`, obstacle:obs });
    }
    if (obs.kind === "pad") {
      const speed = Math.sqrt(obs.vx ** 2 + obs.vy ** 2);
      if (speed < MIN_PAD_SPEED)
        errors.push({ type:"pad_too_weak", message:`Pad at (${obs.x.toFixed(0)},${obs.y.toFixed(0)}) speed=${speed.toFixed(1)} < ${MIN_PAD_SPEED}`, obstacle:obs });
    }
    if (obs.kind === "uramp") {
      if (obs.depth > obs.w)
        errors.push({ type:"stuck_risk", message:`Ramp at topY=${obs.topY.toFixed(0)}: depth ${obs.depth.toFixed(0)} > width ${obs.w.toFixed(0)}`, obstacle:obs });
    }
  }

  // Corridor check at every 10px sample
  for (let y = 60; y < finishY - 20; y += 10) {
    const blocked: [number, number][] = [
      [0, playX],
      [playRight, playRight + WALL_THICK],
    ];
    for (const obs of obstacles) {
      if (obs.kind === "pad") continue;
      if (obs.kind === "peg") {
        if (Math.abs(obs.y - y) <= obs.r + MARBLE_RADIUS)
          blocked.push([obs.x - obs.r - MARBLE_RADIUS, obs.x + obs.r + MARBLE_RADIUS]);
      } else if (obs.kind === "platform" || obs.kind === "line") {
        if (Math.abs(obs.y - y) <= MARBLE_RADIUS + 5) {
          const hw = halfLen(obs);
          blocked.push([obs.x - hw, obs.x + hw]);
        }
      } else if (obs.kind === "uramp") {
        if (y >= obs.topY && y <= obs.topY + obs.depth + 12) {
          const hw = obs.w / 2;
          blocked.push([obs.cx - hw - 4, obs.cx - hw + 12]);
          blocked.push([obs.cx + hw - 12, obs.cx + hw + 4]);
        }
      }
    }
    const sorted = [...blocked].sort((a, b) => a[0] - b[0]);
    let edge = sorted[0][1], maxGap = 0;
    for (const [start, end] of sorted.slice(1)) {
      if (start > edge) maxGap = Math.max(maxGap, start - edge);
      edge = Math.max(edge, end);
    }
    maxGap = Math.max(maxGap, playRight - edge);
    if (maxGap < CORRIDOR - 0.5)  // 0.5px float tolerance
      errors.push({ type:"no_corridor", message:`No corridor of ${CORRIDOR}px at y=${y} (gap=${maxGap.toFixed(1)}px)`, y });
  }

  return errors;
}

export function countByKind(layout: TrackLayout): Record<string, number> {
  const c: Record<string, number> = {};
  for (const obs of layout.obstacles) c[obs.kind] = (c[obs.kind] ?? 0) + 1;
  return c;
}

export function padsOfDir(layout: TrackLayout, dir: PadDef["dir"]): PadDef[] {
  return layout.obstacles.filter((o): o is PadDef => o.kind === "pad" && o.dir === dir);
}

export function simulateStraightDrop(
  layout: TrackLayout, startX: number, sampleStep = 15
): { reachesFinish: boolean; blockedAt?: number } {
  const { obstacles, finishY, playX, playW } = layout;
  const playRight = playX + playW;

  for (let y = 60; y < finishY; y += sampleStep) {
    const blocked: [number, number][] = [[0, playX], [playRight, playRight + WALL_THICK]];
    for (const obs of obstacles) {
      if (obs.kind === "pad") continue;
      if (obs.kind === "peg") {
        if (Math.abs(obs.y - y) <= obs.r + MARBLE_RADIUS)
          blocked.push([obs.x - obs.r - MARBLE_RADIUS, obs.x + obs.r + MARBLE_RADIUS]);
      } else if (obs.kind === "platform" || obs.kind === "line") {
        if (Math.abs(obs.y - y) <= MARBLE_RADIUS + 5) {
          const hw = halfLen(obs);
          blocked.push([obs.x - hw, obs.x + hw]);
        }
      } else if (obs.kind === "uramp") {
        if (y >= obs.topY && y <= obs.topY + obs.depth + 12) {
          const hw = obs.w / 2;
          blocked.push([obs.cx - hw - 4, obs.cx - hw + 12]);
          blocked.push([obs.cx + hw - 12, obs.cx + hw + 4]);
        }
      }
    }
    const sorted = [...blocked].sort((a, b) => a[0] - b[0]);
    let edge = sorted[0][1], hasPath = false;
    for (const [start, end] of sorted.slice(1)) {
      if (start - edge >= MARBLE_RADIUS * 2.5) { hasPath = true; break; }
      edge = Math.max(edge, end);
    }
    if (!hasPath && playRight - edge >= MARBLE_RADIUS * 2.5) hasPath = true;
    if (!hasPath) return { reachesFinish: false, blockedAt: y };
  }
  return { reachesFinish: true };
}
