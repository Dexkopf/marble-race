#!/usr/bin/env node
/**
 * run-tests.ts
 * Self-contained test runner — no jest required.
 * Run with: tsx run-tests.ts
 */

// ── Minimal test harness ──────────────────────────────────────────────────────
let passed = 0, failed = 0, skipped = 0;
const failures: string[] = [];
let currentSuite = "";

function describe(name: string, fn: () => void) {
  currentSuite = name;
  fn();
  currentSuite = "";
}

function test(name: string, fn: () => void) {
  const label = currentSuite ? `${currentSuite} › ${name}` : name;
  try {
    fn();
    passed++;
    process.stdout.write(`  ✓ ${label}\n`);
  } catch (err: any) {
    failed++;
    const msg = err?.message ?? String(err);
    failures.push(`FAIL: ${label}\n     ${msg}`);
    process.stdout.write(`  ✗ ${label}\n    ${msg}\n`);
  }
}

// Minimal expect — covers what the test file needs
function expect(actual: any) {
  return {
    toBe(expected: any) {
      if (actual !== expected)
        throw new Error(`Expected ${JSON.stringify(actual)} to be ${JSON.stringify(expected)}`);
    },
    toEqual(expected: any) {
      if (JSON.stringify(actual) !== JSON.stringify(expected))
        throw new Error(`Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`);
    },
    toBeGreaterThan(n: number) {
      if (!(actual > n))
        throw new Error(`Expected ${actual} to be > ${n}`);
    },
    toBeGreaterThanOrEqual(n: number) {
      if (!(actual >= n))
        throw new Error(`Expected ${actual} to be >= ${n}`);
    },
    toBeLessThan(n: number) {
      if (!(actual < n))
        throw new Error(`Expected ${actual} to be < ${n}`);
    },
    toBeLessThanOrEqual(n: number) {
      if (!(actual <= n))
        throw new Error(`Expected ${actual} to be <= ${n}`);
    },
    toBeCloseTo(expected: number, precision = 2) {
      const factor = Math.pow(10, precision);
      if (Math.round(actual * factor) !== Math.round(expected * factor))
        throw new Error(`Expected ${actual} to be close to ${expected} (precision ${precision})`);
    },
    toHaveLength(n: number) {
      if (actual.length !== n)
        throw new Error(`Expected length ${actual.length} to be ${n}`);
    },
    some(fn: (e: any) => boolean) {
      // chained after toHaveLength — handle as independent check
      throw new Error("Use expect(arr.some(...)).toBe(true) instead");
    },
  };
}

// Extend expect to handle chained .some() correctly
function expectSome(arr: any[], fn: (e: any) => boolean, msg: string) {
  if (!arr.some(fn)) throw new Error(msg);
}

// ── Import the module under test ──────────────────────────────────────────────
import {
  buildTrack,
  validateTrack,
  countByKind,
  padsOfDir,
  simulateStraightDrop,
  MARBLE_RADIUS,
  WALL_THICK,
  MAX_PLATFORM_W_RATIO,
  MIN_GAP,
  ObstacleDef,
  PegDef,
  URampDef,
  PlatDef,
  PadDef,
  LineDef,
} from "./lib/trackBuilder";

function getAll<T extends ObstacleDef>(
  layout: ReturnType<typeof buildTrack>,
  kind: T["kind"]
): T[] {
  return layout.obstacles.filter((o): o is T => o.kind === kind);
}

const SIZES = [
  { W: 400, H: 700,  label: "narrow/short" },
  { W: 520, H: 860,  label: "standard"     },
  { W: 700, H: 1000, label: "wide/tall"    },
];

// ════════════════════════════════════════════════════════════
console.log("\n══ MARBLE RACE — Playability Test Suite ══\n");
// ════════════════════════════════════════════════════════════

// ── 1. Track structure ────────────────────────────────────────────────────────
describe("1. Track structure", () => {
  const layout = buildTrack(520, 860);

  test("produces obstacles", () => { expect(layout.obstacles.length).toBeGreaterThan(0); });
  test("has all five obstacle kinds", () => {
    const kinds = new Set(layout.obstacles.map(o => o.kind));
    if (!kinds.has("peg"))      throw new Error("missing pegs");
    if (!kinds.has("line"))     throw new Error("missing lines");
    if (!kinds.has("uramp"))    throw new Error("missing uramps");
    if (!kinds.has("platform")) throw new Error("missing platforms");
    if (!kinds.has("pad"))      throw new Error("missing pads");
  });
  test("has ≥ 10 pegs", () => { expect(getAll<PegDef>(layout, "peg").length).toBeGreaterThanOrEqual(10); });
  test("has ≥ 2 U-ramps", () => { expect(getAll<URampDef>(layout, "uramp").length).toBeGreaterThanOrEqual(2); });
  test("has pads in all three directions", () => {
    const dirs = new Set(getAll<PadDef>(layout, "pad").map(p => p.dir));
    if (!dirs.has("left"))  throw new Error("no left pad");
    if (!dirs.has("right")) throw new Error("no right pad");
    if (!dirs.has("up"))    throw new Error("no up pad");
  });
  test("has ≥ 2 straight rails", () => { expect(getAll<LineDef>(layout, "line").length).toBeGreaterThanOrEqual(2); });
  test("has ≥ 2 platforms", () => { expect(getAll<PlatDef>(layout, "platform").length).toBeGreaterThanOrEqual(2); });
  test("finishY is in lower portion of canvas (700–860)", () => {
    expect(layout.finishY).toBeLessThan(860);
    expect(layout.finishY).toBeGreaterThan(700);
  });
  test("playW = W - 2×WALL_THICK", () => { expect(layout.playW).toBe(520 - WALL_THICK * 2); });
});

// ── 2. Anti-stuck rules ───────────────────────────────────────────────────────
describe("2. Anti-stuck rules", () => {
  for (const { W, H, label } of SIZES) {
    const layout = buildTrack(W, H);
    const playW  = W - WALL_THICK * 2;

    test(`[${label}] no platform wider than ${(MAX_PLATFORM_W_RATIO * 100).toFixed(0)}% of playW`, () => {
      const maxW = playW * MAX_PLATFORM_W_RATIO;
      for (const p of getAll<PlatDef>(layout, "platform")) {
        if (p.w > maxW + 1) throw new Error(`Platform at y=${p.y}: w=${p.w.toFixed(0)} > max ${maxW.toFixed(0)}`);
      }
    });

    test(`[${label}] no U-ramp depth > width`, () => {
      for (const ur of getAll<URampDef>(layout, "uramp")) {
        if (ur.depth > ur.w * 1.0 + 1)
          throw new Error(`U-ramp at topY=${ur.topY}: depth=${ur.depth.toFixed(0)} > w=${ur.w.toFixed(0)}`);
      }
    });

    test(`[${label}] every U-ramp has a launch pad at its floor (±25 px)`, () => {
      const uramps = getAll<URampDef>(layout, "uramp");
      const pads   = getAll<PadDef>(layout, "pad");
      for (const ur of uramps) {
        const floorY = ur.topY + ur.depth;
        const ok = pads.some(p => Math.abs(p.x - ur.cx) < ur.w / 2 + 5 && Math.abs(p.y - floorY) < 25);
        if (!ok) throw new Error(`No launch pad found for U-ramp at (cx=${ur.cx.toFixed(0)}, topY=${ur.topY.toFixed(0)})`);
      }
    });

    test(`[${label}] all pads have speed ≥ 4`, () => {
      for (const pad of getAll<PadDef>(layout, "pad")) {
        const speed = Math.sqrt(pad.vx ** 2 + pad.vy ** 2);
        if (speed < 4) throw new Error(`Pad at (${pad.x.toFixed(0)},${pad.y.toFixed(0)}) speed=${speed.toFixed(1)}`);
      }
    });

    test(`[${label}] left pads vx < 0, right pads vx > 0`, () => {
      for (const pad of getAll<PadDef>(layout, "pad")) {
        if (pad.dir === "left"  && pad.vx >= 0) throw new Error(`Left pad has vx=${pad.vx}`);
        if (pad.dir === "right" && pad.vx <= 0) throw new Error(`Right pad has vx=${pad.vx}`);
      }
    });

    test(`[${label}] up pads have vy < 0 (upward)`, () => {
      for (const pad of padsOfDir(layout, "up")) {
        if (pad.vy >= 0) throw new Error(`Up pad at y=${pad.y} has vy=${pad.vy} (not upward)`);
      }
    });
  }
});

// ── 3. Wall safety ────────────────────────────────────────────────────────────
describe("3. Wall safety", () => {
  for (const { W, H, label } of SIZES) {
    const layout = buildTrack(W, H);
    const playX  = WALL_THICK, playR = W - WALL_THICK;

    test(`[${label}] no peg clips wall`, () => {
      for (const peg of getAll<PegDef>(layout, "peg")) {
        if (peg.x - peg.r < playX - 1) throw new Error(`Peg x=${peg.x} r=${peg.r} clips left wall`);
        if (peg.x + peg.r > playR + 1) throw new Error(`Peg x=${peg.x} r=${peg.r} clips right wall`);
      }
    });

    test(`[${label}] all obstacle x-centres inside play area`, () => {
      for (const obs of layout.obstacles) {
        const x = obs.kind === "uramp" ? obs.cx : (obs as any).x;
        if (x <= playX) throw new Error(`${obs.kind} x=${x.toFixed(0)} ≤ playX=${playX}`);
        if (x >= playR) throw new Error(`${obs.kind} x=${x.toFixed(0)} ≥ playR=${playR}`);
      }
    });
  }
});

// ── 4. Vertical flow — use max-gap corridor check (same logic as validateTrack) ──
describe("4. Vertical flow", () => {
  for (const { W, H, label } of SIZES) {
    test(`[${label}] every y-level has a clear corridor ≥ CORRIDOR px`, () => {
      const layout    = buildTrack(W, H);
      const playX     = WALL_THICK;
      const playRight = playX + layout.playW;
      const minClear  = MARBLE_RADIUS * 3;  // 36 px — same as CORRIDOR

      for (let y = 60; y < layout.finishY; y += 15) {
        const blocked: [number, number][] = [
          [0, playX],
          [playRight, playRight + WALL_THICK],
        ];
        for (const obs of layout.obstacles) {
          if (obs.kind === "pad") continue;
          if (obs.kind === "peg" && Math.abs(obs.y - y) <= obs.r + MARBLE_RADIUS)
            blocked.push([obs.x - obs.r - MARBLE_RADIUS, obs.x + obs.r + MARBLE_RADIUS]);
          if ((obs.kind === "platform" || obs.kind === "line") && Math.abs(obs.y - y) <= MARBLE_RADIUS + 6)
            blocked.push([obs.x - obs.len / 2, obs.x + obs.len / 2]);
          if (obs.kind === "uramp" && y >= obs.topY && y <= obs.topY + obs.depth + 12) {
            const hw = obs.w / 2;
            blocked.push([obs.cx - hw - 4, obs.cx - hw + 12]);
            blocked.push([obs.cx + hw - 12, obs.cx + hw + 4]);
          }
        }
        const sorted = [...blocked].sort((a: [number,number], b: [number,number]) => a[0] - b[0]);
        let edge = sorted[0][1], maxGap = 0;
        for (const [start, end] of sorted.slice(1)) {
          if (start > edge) maxGap = Math.max(maxGap, start - edge);
          edge = Math.max(edge, end);
        }
        maxGap = Math.max(maxGap, playRight - edge);
        if (maxGap < minClear - 0.5)
          throw new Error(`At y=${y}: max corridor=${maxGap.toFixed(1)}px < ${minClear}px (${label})`);
      }
    });
  }
});

// ── 5. Drop simulation ────────────────────────────────────────────────────────
describe("5. Drop simulation (straight-down path always clear)", () => {
  for (const { W, H, label } of SIZES) {
    for (const xFrac of [0.25, 0.5, 0.75]) {
      test(`[${label}] marble at x=${Math.round(xFrac * 100)}% reaches finish`, () => {
        const layout = buildTrack(W, H);
        const startX = WALL_THICK + layout.playW * xFrac;
        const result = simulateStraightDrop(layout, startX, 15);
        if (!result.reachesFinish)
          throw new Error(`Blocked at y=${result.blockedAt} (${W}×${H}, x=${startX.toFixed(0)})`);
      });
    }
  }
});

// ── 6. Launch pad clearance ───────────────────────────────────────────────────
describe("6. Launch pad clearance", () => {
  const layout = buildTrack(520, 860);
  const g = 0.6; // engine gravity

  test("pad vy gives enough upward travel to clear 2× marble diameter", () => {
    for (const pad of getAll<PadDef>(layout, "pad")) {
      if (pad.vy >= 0) continue;
      const maxHeight = (pad.vy ** 2) / (2 * g);
      if (maxHeight < MARBLE_RADIUS * 2)
        throw new Error(`Pad at y=${pad.y}: max height ${maxHeight.toFixed(0)} < ${MARBLE_RADIUS * 2}`);
    }
  });

  test("left/right pads |vx| ≥ 3", () => {
    for (const pad of getAll<PadDef>(layout, "pad")) {
      if (pad.dir === "left" || pad.dir === "right") {
        if (Math.abs(pad.vx) < 3)
          throw new Error(`${pad.dir} pad at y=${pad.y}: |vx|=${Math.abs(pad.vx)} < 3`);
      }
    }
  });
});

// ── 7. Responsive sizing ──────────────────────────────────────────────────────
describe("7. Responsive sizing", () => {
  for (const { W, H, label } of SIZES) {
    const layout = buildTrack(W, H);

    test(`[${label}] playW = W - 2×WALL_THICK`, () => {
      const expected = W - WALL_THICK * 2;
      if (layout.playW !== expected)
        throw new Error(`playW=${layout.playW} expected ${expected}`);
    });

    test(`[${label}] finishY in bottom 20% of canvas`, () => {
      expect(layout.finishY).toBeGreaterThan(H * 0.80);
      expect(layout.finishY).toBeLessThan(H);
    });

    test(`[${label}] all obstacle y-coords between spawn and finish`, () => {
      for (const obs of layout.obstacles) {
        const y = obs.kind === "peg" ? obs.y : obs.kind === "line" ? obs.y :
                  obs.kind === "platform" ? obs.y : obs.kind === "uramp" ? obs.topY : (obs as any).y;
        if (y < 30) throw new Error(`${obs.kind} at y=${y} above spawn area`);
        if (y > layout.finishY + 5) throw new Error(`${obs.kind} at y=${y} below finish line`);
      }
    });
  }
});

// ── 8. Finish line ────────────────────────────────────────────────────────────
describe("8. Finish line reachability", () => {
  test("no solid obstacle within MARBLE_RADIUS+5 of finishY", () => {
    const layout = buildTrack(520, 860);
    const margin = MARBLE_RADIUS + 5;
    for (const obs of layout.obstacles) {
      if (obs.kind === "pad") continue;
      const y = obs.kind === "peg" ? obs.y : obs.kind === "line" ? obs.y :
                obs.kind === "platform" ? obs.y : obs.kind === "uramp" ? obs.topY + obs.depth + 10 : (obs as any).y;
      const dist = Math.abs(y - layout.finishY);
      if (obs.kind === "uramp") {
        if (y > layout.finishY - margin)
          throw new Error(`U-ramp bottom at y=${y} too close to finish (${layout.finishY})`);
      } else if (dist < margin) {
        throw new Error(`${obs.kind} at y=${y} within ${margin}px of finish line`);
      }
    }
  });
});

// ── 9. Determinism ────────────────────────────────────────────────────────────
describe("9. Determinism", () => {
  test("identical obstacle count on repeated calls", () => {
    const a = buildTrack(520, 860), b = buildTrack(520, 860);
    if (a.obstacles.length !== b.obstacles.length)
      throw new Error(`${a.obstacles.length} vs ${b.obstacles.length}`);
  });

  test("identical peg positions on repeated calls", () => {
    const a = buildTrack(520, 860), b = buildTrack(520, 860);
    const pegsA = getAll<PegDef>(a, "peg"), pegsB = getAll<PegDef>(b, "peg");
    pegsA.forEach((p, i) => {
      if (Math.abs(p.x - pegsB[i].x) > 0.001 || Math.abs(p.y - pegsB[i].y) > 0.001)
        throw new Error(`Peg ${i} position differs`);
    });
  });

  test("finishY and playW identical on repeated calls", () => {
    const a = buildTrack(700, 1000), b = buildTrack(700, 1000);
    if (a.finishY !== b.finishY) throw new Error(`finishY: ${a.finishY} vs ${b.finishY}`);
    if (a.playW   !== b.playW)   throw new Error(`playW: ${a.playW} vs ${b.playW}`);
  });
});

// ── 10. Validation utility ────────────────────────────────────────────────────
describe("10. validateTrack catches bad configs", () => {
  test("returns no errors for valid standard layout", () => {
    const layout = buildTrack(520, 860);
    const errors = validateTrack(layout);
    if (errors.length > 0)
      throw new Error("Unexpected errors:\n" + errors.map(e => `  [${e.type}] ${e.message}`).join("\n"));
  });

  test("catches platform too wide", () => {
    const layout = buildTrack(520, 860);
    layout.obstacles.push({ kind: "platform", x: 260, y: 400, w: 500, angle: 0 });
    const errors = validateTrack(layout);
    if (!errors.some(e => e.type === "platform_too_wide"))
      throw new Error("Expected platform_too_wide error");
  });

  test("catches U-ramp depth > width", () => {
    const layout = buildTrack(520, 860);
    layout.obstacles.push({ kind: "uramp", cx: 260, topY: 300, w: 80, depth: 120 });
    const errors = validateTrack(layout);
    if (!errors.some(e => e.type === "stuck_risk"))
      throw new Error("Expected stuck_risk error");
  });

  test("catches pad speed < 4", () => {
    const layout = buildTrack(520, 860);
    layout.obstacles.push({ kind: "pad", x: 260, y: 400, w: 60, vx: 0, vy: -1, color: "#fff", dir: "up" });
    const errors = validateTrack(layout);
    if (!errors.some(e => e.type === "pad_too_weak"))
      throw new Error("Expected pad_too_weak error");
  });

  test("catches peg clipping the wall", () => {
    const layout = buildTrack(520, 860);
    layout.obstacles.push({ kind: "peg", x: 5, y: 300, r: 8 });
    const errors = validateTrack(layout);
    if (!errors.some(e => e.type === "wall_clip"))
      throw new Error("Expected wall_clip error");
  });

  test("returns no errors for all supported canvas sizes", () => {
    for (const { W, H, label } of SIZES) {
      const errors = validateTrack(buildTrack(W, H));
      if (errors.length > 0)
        throw new Error(`[${label}]\n` + errors.map(e => `  [${e.type}] ${e.message}`).join("\n"));
    }
  });
});

// ── 11. Obstacle distribution ─────────────────────────────────────────────────
describe("11. Obstacle distribution", () => {
  const layout = buildTrack(520, 860);

  test("obstacles span ≥ 70% of track height", () => {
    const ys = layout.obstacles.map(o =>
      o.kind === "peg" ? o.y : o.kind === "line" ? o.y :
      o.kind === "platform" ? o.y : o.kind === "uramp" ? o.topY : (o as any).y
    ).filter((y: number) => y > 0);
    const coverage = (Math.max(...ys) - Math.min(...ys)) / layout.trackH;
    if (coverage < 0.70)
      throw new Error(`Coverage ${(coverage * 100).toFixed(0)}% < 70%`);
  });

  test("no two same-kind solid obstacle rows within 8 px of each other", () => {
    // A peg row 2px from a platform is fine — they don't form a combined barrier.
    // The corridor test (section 4) already catches combined blocking.
    // Here we only flag same-kind rows that could form a continuous barrier.
    const kinds = ["peg", "line", "platform", "uramp"] as const;
    for (const kind of kinds) {
      const ys = layout.obstacles
        .filter(o => o.kind === kind)
        .map(o =>
          o.kind === "peg" ? o.y : o.kind === "line" ? o.y :
          o.kind === "platform" ? o.y : (o as any).topY + (o as any).depth / 2
        ).sort((a: number, b: number) => a - b);
      for (let i = 1; i < ys.length; i++) {
        const gap = ys[i] - ys[i - 1];
        if (gap > 0 && gap < 8)
          throw new Error(`Two "${kind}" rows only ${gap.toFixed(1)}px apart at y≈${ys[i - 1].toFixed(0)}`);
      }
    }
  });

  test("left-right symmetry within 30% count difference", () => {
    const midX = 520 / 2;
    const leftCount  = layout.obstacles.filter(o => {
      const x = o.kind === "uramp" ? o.cx : (o as any).x;
      return x < midX;
    }).length;
    const rightCount = layout.obstacles.length - leftCount;
    const ratio = Math.min(leftCount, rightCount) / Math.max(leftCount, rightCount);
    if (ratio < 0.70)
      throw new Error(`L=${leftCount} R=${rightCount} ratio=${ratio.toFixed(2)} < 0.70`);
  });
});

// ── 12. Race timing heuristics ────────────────────────────────────────────────
describe("12. Race timing heuristics", () => {
  test("track height yields reasonable fall-time bounds", () => {
    const layout = buildTrack(520, 860);
    const termVel = 8; // px/frame at gravity 0.6, frictionAir 0.022
    const fps = 60;
    const naive = layout.trackH / (termVel * fps);
    expect(naive).toBeGreaterThan(1);
    expect(naive).toBeLessThan(15);
  });

  test("has ≥ 8 direction-changing obstacles (ensures travel time)", () => {
    const layout = buildTrack(520, 860);
    const redirectors = layout.obstacles.filter(o =>
      o.kind === "pad" ||
      (o.kind === "line"     && Math.abs(o.angle) > 0.05) ||
      (o.kind === "platform" && Math.abs(o.angle) > 0.05)
    );
    if (redirectors.length < 8)
      throw new Error(`Only ${redirectors.length} redirecting obstacles (min 8)`);
  });
});

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n${"─".repeat(54)}`);
console.log(`  Results: ${passed} passed  ${failed} failed  ${skipped} skipped`);
console.log(`${"─".repeat(54)}\n`);

if (failures.length) {
  console.log("Failures:\n");
  failures.forEach(f => console.log(f + "\n"));
  process.exit(1);
} else {
  console.log("✓ All tests passed — track is playable!\n");
  process.exit(0);
}
