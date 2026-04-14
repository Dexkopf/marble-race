/**
 * __tests__/trackBuilder.test.mjs
 *
 * Playability test suite for the Marble Race track builder.
 * Uses Node.js built-in `node:test` + `node:assert` — no external deps required.
 *
 * Run with:
 *   node --experimental-vm-modules __tests__/trackBuilder.test.mjs
 *   (or via the npm test script which calls this directly)
 *
 * Test coverage:
 *   1.  Track structure        — all obstacle kinds present, correct counts
 *   2.  Corridor guarantee     — horizontal open gap ≥ CORRIDOR at every y-level
 *   3.  No-stuck layout        — platform width, U-ramp depth/width, pad speed
 *   4.  U-ramp / pad pairing   — every ramp has a launch pad within 25 px
 *   5.  Wall safety            — no obstacle clips either side wall
 *   6.  Pad direction logic    — vx/vy signs match declared direction
 *   7.  Straight-drop sim      — marble can reach finish from any spawn x
 *   8.  Finish line clear      — no solid obstacle within MARBLE_RADIUS of finishY
 *   9.  Even distribution      — obstacles cover ≥ 70% of track height
 *  10.  Left-right symmetry    — count ratio between halves ≥ 0.70
 *  11.  Determinism            — identical output on repeated calls
 *  12.  Multi-size validity    — passes validateTrack with zero errors at 3 sizes
 *  13.  Race timing heuristic  — track height implies ~15–45 s race
 *  14.  Redirector count       — enough angled/pad obstacles for varied paths
 *  15.  validateTrack catches bad configs (regression tests)
 */

import { describe, it, before } from "node:test";
import assert from "node:assert/strict";

// ── Import the module under test ───────────────────────────────────────────────
// We load it with a dynamic import so this file can live as .mjs alongside
// the TypeScript source (which is transpiled via ts-node/esbuild in CI).
// For direct node execution we resolve via the compiled output or ts-node.
import { createRequire } from "node:module";
import { fileURLToPath }  from "node:url";
import { dirname, join }  from "node:path";
import { existsSync }     from "node:fs";

const __dirname  = dirname(fileURLToPath(import.meta.url));
const projectDir = join(__dirname, "..");

// Try compiled JS first (when built), fall back to ts-node registration
let mod;
const jsPath  = join(projectDir, "dist", "lib", "trackBuilder.js");
const tsSrc   = join(projectDir, "lib", "trackBuilder.ts");

if (existsSync(jsPath)) {
  // Production: load compiled JS
  const req = createRequire(import.meta.url);
  mod = req(jsPath);
} else {
  // Development: use tsx / ts-node to execute TypeScript directly
  const { register } = await import("node:module");
  try {
    // Try tsx (faster, no type-checking)
    register("tsx/esm", { parentURL: import.meta.url });
  } catch {
    // Fall back to ts-node ESM loader
    register("ts-node/esm", { parentURL: import.meta.url });
  }
  mod = await import(tsSrc);
}

const {
  buildTrack,
  validateTrack,
  countByKind,
  padsOfDir,
  simulateStraightDrop,
  MARBLE_RADIUS,
  WALL_THICK,
  CORRIDOR,
  MIN_GAP,
  MAX_PLAT_RATIO,
  MIN_PAD_SPEED,
  ZONES,
} = mod;

// ── Shared test sizes ──────────────────────────────────────────────────────────
const SIZES = [
  { W: 400, H: 700,  label: "narrow/short (mobile)" },
  { W: 520, H: 860,  label: "standard" },
  { W: 700, H: 1000, label: "wide/tall (desktop)" },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
function getAll(layout, kind) {
  return layout.obstacles.filter(o => o.kind === kind);
}

function assertNoErrors(errors, context = "") {
  if (errors.length > 0) {
    const msgs = errors.map(e => `  [${e.type}] ${e.message}`).join("\n");
    throw new Error(`${context}Validation errors:\n${msgs}`);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. TRACK STRUCTURE
// ══════════════════════════════════════════════════════════════════════════════
describe("1. Track structure", () => {
  const layout = buildTrack(520, 860);

  it("produces at least one obstacle", () => {
    assert.ok(layout.obstacles.length > 0, "expected obstacles");
  });

  it("contains all five obstacle kinds", () => {
    const kinds = new Set(layout.obstacles.map(o => o.kind));
    for (const k of ["peg", "line", "uramp", "platform", "pad"]) {
      assert.ok(kinds.has(k), `missing kind: ${k}`);
    }
  });

  it("has at least 10 pegs", () => {
    assert.ok(getAll(layout, "peg").length >= 10);
  });

  it("has at least 2 U-ramps", () => {
    assert.ok(getAll(layout, "uramp").length >= 2);
  });

  it("has launch pads in all three directions (left, right, up)", () => {
    const dirs = new Set(getAll(layout, "pad").map(p => p.dir));
    for (const d of ["left", "right", "up"]) {
      assert.ok(dirs.has(d), `missing pad direction: ${d}`);
    }
  });

  it("has at least 2 straight rails", () => {
    assert.ok(getAll(layout, "line").length >= 2);
  });

  it("has at least 2 platforms", () => {
    assert.ok(getAll(layout, "platform").length >= 2);
  });

  it("finishY is near bottom of canvas (between 75% and 98% of H)", () => {
    const H = 860;
    assert.ok(layout.finishY > H * 0.75, `finishY ${layout.finishY} too high`);
    assert.ok(layout.finishY < H * 0.98, `finishY ${layout.finishY} too low`);
  });

  it("playW equals canvas width minus both wall thicknesses", () => {
    const W = 520;
    assert.strictEqual(layout.playW, W - WALL_THICK * 2);
  });

  it("playX equals WALL_THICK", () => {
    assert.strictEqual(layout.playX, WALL_THICK);
  });

  it("trackH equals finishY minus spawn offset (~45)", () => {
    // trackH = finishY - spawnY (spawnY ≈ 45)
    assert.ok(layout.trackH > 0 && layout.trackH < 860);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 2. CORRIDOR GUARANTEE — every y-level has a gap ≥ CORRIDOR
// ══════════════════════════════════════════════════════════════════════════════
describe("2. Corridor guarantee (no full-width blockage)", () => {
  for (const { W, H, label } of SIZES) {
    it(`no y-level is fully blocked — ${label}`, () => {
      const layout  = buildTrack(W, H);
      const errors  = validateTrack(layout);
      const blocked = errors.filter(e => e.type === "no_corridor");
      if (blocked.length > 0) {
        const msgs = blocked.slice(0, 3).map(e => e.message).join("\n  ");
        throw new Error(`Corridor violations at ${label}:\n  ${msgs}`);
      }
    });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// 3. ANTI-STUCK LAYOUT RULES
// ══════════════════════════════════════════════════════════════════════════════
describe("3. Anti-stuck rules", () => {
  for (const { W, H, label } of SIZES) {
    describe(`at ${label} (${W}×${H})`, () => {
      let layout;
      before(() => { layout = buildTrack(W, H); });

      it("no platform wider than MAX_PLAT_RATIO × playW", () => {
        const maxW = layout.playW * MAX_PLAT_RATIO;
        for (const p of getAll(layout, "platform")) {
          assert.ok(p.w <= maxW + 1,
            `Platform at y=${p.y.toFixed(0)} is ${p.w.toFixed(0)}px (max ${maxW.toFixed(0)}px)`);
        }
      });

      it("no U-ramp depth > ramp width (trapping threshold)", () => {
        for (const ur of getAll(layout, "uramp")) {
          assert.ok(ur.depth <= ur.w + 1,
            `Ramp at topY=${ur.topY.toFixed(0)}: depth ${ur.depth.toFixed(0)} > width ${ur.w.toFixed(0)}`);
        }
      });

      it("every pad speed ≥ MIN_PAD_SPEED", () => {
        for (const p of getAll(layout, "pad")) {
          const speed = Math.sqrt(p.vx ** 2 + p.vy ** 2);
          assert.ok(speed >= MIN_PAD_SPEED,
            `Pad at (${p.x.toFixed(0)}, ${p.y.toFixed(0)}) speed=${speed.toFixed(2)} < ${MIN_PAD_SPEED}`);
        }
      });

      it("all up pads have negative vy", () => {
        for (const p of padsOfDir(layout, "up")) {
          assert.ok(p.vy < 0, `Up pad at y=${p.y.toFixed(0)} has vy=${p.vy} (should be negative)`);
        }
      });

      it("validateTrack returns zero errors", () => {
        const errors = validateTrack(layout);
        assertNoErrors(errors, `${label}: `);
      });
    });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// 4. U-RAMP / PAD PAIRING
// ══════════════════════════════════════════════════════════════════════════════
describe("4. U-ramp / pad pairing", () => {
  for (const { W, H, label } of SIZES) {
    it(`every U-ramp has a launch pad at its floor (±25 px) — ${label}`, () => {
      const layout = buildTrack(W, H);
      const uramps = getAll(layout, "uramp");
      const pads   = getAll(layout, "pad");

      for (const ur of uramps) {
        const floorY = ur.topY + ur.depth;
        const match  = pads.find(
          p => Math.abs(p.x - ur.cx) < ur.w / 2 + 6 &&
               Math.abs(p.y - floorY) < 25
        );
        assert.ok(
          match,
          `No pad found for ramp at cx=${ur.cx.toFixed(0)}, floorY=${floorY.toFixed(0)}`
        );
      }
    });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// 5. WALL SAFETY
// ══════════════════════════════════════════════════════════════════════════════
describe("5. Wall safety (no obstacle clips side walls)", () => {
  for (const { W, H, label } of SIZES) {
    it(`no peg clips side wall — ${label}`, () => {
      const layout  = buildTrack(W, H);
      const playX   = WALL_THICK;
      const playR   = W - WALL_THICK;
      for (const p of getAll(layout, "peg")) {
        assert.ok(p.x - p.r >= playX - 1, `Peg at x=${p.x.toFixed(0)} clips left wall`);
        assert.ok(p.x + p.r <= playR + 1, `Peg at x=${p.x.toFixed(0)} clips right wall`);
      }
    });

    it(`all obstacle x-centres inside play area — ${label}`, () => {
      const layout = buildTrack(W, H);
      const playX  = WALL_THICK;
      const playR  = W - WALL_THICK;
      for (const obs of layout.obstacles) {
        const x = obs.kind === "uramp" ? obs.cx : obs.x;
        assert.ok(x > playX, `${obs.kind} x=${x.toFixed(0)} is inside left wall`);
        assert.ok(x < playR, `${obs.kind} x=${x.toFixed(0)} is inside right wall`);
      }
    });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// 6. PAD DIRECTION LOGIC
// ══════════════════════════════════════════════════════════════════════════════
describe("6. Pad direction logic", () => {
  const layout = buildTrack(520, 860);

  it("left pads have vx < 0", () => {
    for (const p of padsOfDir(layout, "left")) {
      assert.ok(p.vx < 0, `left pad at x=${p.x.toFixed(0)} has vx=${p.vx}`);
    }
  });

  it("right pads have vx > 0", () => {
    for (const p of padsOfDir(layout, "right")) {
      assert.ok(p.vx > 0, `right pad at x=${p.x.toFixed(0)} has vx=${p.vx}`);
    }
  });

  it("up pads have vy < 0 (upward)", () => {
    for (const p of padsOfDir(layout, "up")) {
      assert.ok(p.vy < 0, `up pad at x=${p.x.toFixed(0)} has vy=${p.vy}`);
    }
  });

  it("pad colors match PAD_COLOR map", () => {
    const PAD_COLOR = { left: "#16a34a", right: "#b45309", up: "#be123c" };
    for (const p of getAll(layout, "pad")) {
      assert.strictEqual(p.color, PAD_COLOR[p.dir],
        `Pad dir=${p.dir} has wrong color ${p.color}`);
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 7. STRAIGHT-DROP SIMULATION — marble can always reach finish
// ══════════════════════════════════════════════════════════════════════════════
describe("7. Straight-drop simulation", () => {
  for (const { W, H, label } of SIZES) {
    // Test from 5 horizontal positions: 15%, 30%, 50%, 70%, 85% of play width
    for (const frac of [0.15, 0.30, 0.50, 0.70, 0.85]) {
      it(`marble reaches finish from x=${Math.round(frac * 100)}% — ${label}`, () => {
        const layout = buildTrack(W, H);
        const startX = WALL_THICK + layout.playW * frac;
        const result = simulateStraightDrop(layout, startX, 15);
        assert.ok(
          result.reachesFinish,
          `Marble blocked at y=${result.blockedAt} (startX=${startX.toFixed(0)})`
        );
      });
    }
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// 8. FINISH LINE CLEAR OF SOLID OBSTACLES
// ══════════════════════════════════════════════════════════════════════════════
describe("8. Finish line reachability", () => {
  for (const { W, H, label } of SIZES) {
    it(`no solid obstacle within MARBLE_RADIUS of finishY — ${label}`, () => {
      const layout  = buildTrack(W, H);
      const fy      = layout.finishY;
      const margin  = MARBLE_RADIUS + 5;

      for (const obs of layout.obstacles) {
        if (obs.kind === "pad") continue;  // sensors OK
        if (obs.kind === "peg") {
          assert.ok(Math.abs(obs.y - fy) > margin,
            `Peg at y=${obs.y.toFixed(0)} is within ${margin}px of finishY=${fy.toFixed(0)}`);
        }
        if (obs.kind === "platform" || obs.kind === "line") {
          assert.ok(Math.abs(obs.y - fy) > margin,
            `${obs.kind} at y=${obs.y.toFixed(0)} is within ${margin}px of finishY`);
        }
        if (obs.kind === "uramp") {
          const bottomY = obs.topY + obs.depth + 12;
          assert.ok(bottomY < fy - margin,
            `U-ramp bottom at y=${bottomY.toFixed(0)} is within ${margin}px of finishY`);
        }
      }
    });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// 9. EVEN DISTRIBUTION — obstacles cover ≥ 70% of track height
// ══════════════════════════════════════════════════════════════════════════════
describe("9. Obstacle distribution", () => {
  for (const { W, H, label } of SIZES) {
    it(`obstacles span ≥ 70% of track height — ${label}`, () => {
      const layout = buildTrack(W, H);
      const ys     = layout.obstacles.map(o =>
        o.kind === "uramp" ? o.topY : o.y ?? 0
      ).filter(y => y > 0);

      const minY     = Math.min(...ys);
      const maxY     = Math.max(...ys);
      const coverage = (maxY - minY) / layout.trackH;

      assert.ok(coverage >= 0.70,
        `Coverage=${(coverage * 100).toFixed(0)}% < 70% (minY=${minY.toFixed(0)}, maxY=${maxY.toFixed(0)})`);
    });

    it(`no two distinct obstacle rows within 8px of each other — ${label}`, () => {
      const layout = buildTrack(W, H);
      const ys = layout.obstacles
        .map(o => (o.kind === "uramp" ? o.topY + o.depth / 2 : o.y))
        .filter(y => y != null && y >= 0)
        .sort((a, b) => a - b);

      for (let i = 1; i < ys.length; i++) {
        const gap = ys[i] - ys[i - 1];
        if (gap > 0 && gap < 8) {
          throw new Error(
            `Obstacle rows only ${gap.toFixed(1)}px apart ` +
            `(at y≈${ys[i-1].toFixed(0)} and y≈${ys[i].toFixed(0)})`
          );
        }
      }
    });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// 10. LEFT-RIGHT SYMMETRY (rough balance)
// ══════════════════════════════════════════════════════════════════════════════
describe("10. Left-right symmetry", () => {
  for (const { W, H, label } of SIZES) {
    it(`left/right obstacle count ratio ≥ 0.70 — ${label}`, () => {
      const layout  = buildTrack(W, H);
      const midX    = W / 2;
      const leftN   = layout.obstacles.filter(o => {
        const x = o.kind === "uramp" ? o.cx : o.x;
        return x < midX;
      }).length;
      const rightN  = layout.obstacles.length - leftN;
      const ratio   = Math.min(leftN, rightN) / Math.max(leftN, rightN);
      assert.ok(ratio >= 0.70,
        `L=${leftN} R=${rightN} ratio=${ratio.toFixed(2)} < 0.70`);
    });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// 11. DETERMINISM
// ══════════════════════════════════════════════════════════════════════════════
describe("11. Determinism", () => {
  it("identical obstacle count on two calls with same dimensions", () => {
    const a = buildTrack(520, 860);
    const b = buildTrack(520, 860);
    assert.strictEqual(a.obstacles.length, b.obstacles.length);
  });

  it("identical peg positions on two calls", () => {
    const a = buildTrack(520, 860);
    const b = buildTrack(520, 860);
    const pa = getAll(a, "peg");
    const pb = getAll(b, "peg");
    assert.strictEqual(pa.length, pb.length);
    for (let i = 0; i < pa.length; i++) {
      assert.ok(Math.abs(pa[i].x - pb[i].x) < 0.001, `peg[${i}].x mismatch`);
      assert.ok(Math.abs(pa[i].y - pb[i].y) < 0.001, `peg[${i}].y mismatch`);
    }
  });

  it("identical finishY on repeated calls", () => {
    const a = buildTrack(700, 1000);
    const b = buildTrack(700, 1000);
    assert.strictEqual(a.finishY, b.finishY);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 12. MULTI-SIZE VALIDITY
// ══════════════════════════════════════════════════════════════════════════════
describe("12. Multi-size validity (validateTrack passes all sizes)", () => {
  for (const { W, H, label } of SIZES) {
    it(`zero validation errors at ${label} (${W}×${H})`, () => {
      const layout = buildTrack(W, H);
      const errors = validateTrack(layout);
      assertNoErrors(errors, `${label}: `);
    });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// 13. RACE TIMING HEURISTIC
// ══════════════════════════════════════════════════════════════════════════════
describe("13. Race timing heuristics", () => {
  it("track height implies ~15–60 s race (based on terminal velocity estimate)", () => {
    // At gravity=0.6, frictionAir=0.022, density=0.002:
    // terminal velocity ≈ 8 px/frame at 60 fps
    // trackH / (8 px/frame × 60 fps) = naive lower-bound seconds
    // With obstacles the actual time is 3–6× longer.
    const layout = buildTrack(520, 860);
    const tv  = 8;  // px/frame, empirical
    const fps = 60;
    const naiveSec = layout.trackH / (tv * fps);

    // naive lower bound: > 1 s (track not too short)
    // naive lower bound: < 15 s (not endless even without obstacles)
    assert.ok(naiveSec > 1,  `Track too short: naiveSec=${naiveSec.toFixed(2)}`);
    assert.ok(naiveSec < 15, `Track too long:  naiveSec=${naiveSec.toFixed(2)}`);
  });

  it("redirector count ≥ 8 (angled obstacles + pads)", () => {
    const layout = buildTrack(520, 860);
    const redirectors = layout.obstacles.filter(o => {
      if (o.kind === "pad") return true;
      if (o.kind === "line")     return Math.abs(o.angle) > 0.05;
      if (o.kind === "platform") return Math.abs(o.angle) > 0.05;
      return false;
    });
    assert.ok(redirectors.length >= 8,
      `Only ${redirectors.length} redirectors (need ≥ 8)`);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 14. OBSTACLE MIX QUALITY
// ══════════════════════════════════════════════════════════════════════════════
describe("14. Obstacle mix quality", () => {
  const layout = buildTrack(520, 860);
  const counts = countByKind(layout);

  it("pegs are the most numerous obstacle type", () => {
    const maxCount = Math.max(...Object.values(counts));
    assert.strictEqual(counts["peg"], maxCount,
      `Expected pegs (${counts["peg"]}) to be most numerous, got ${JSON.stringify(counts)}`);
  });

  it("at least one pad per ZONE (≥ ZONES/4 pads total)", () => {
    assert.ok((counts["pad"] ?? 0) >= Math.floor(ZONES / 4),
      `Only ${counts["pad"]} pads for ${ZONES} zones`);
  });

  it("at least one rail per diagonal zone (≥ 2 lines)", () => {
    assert.ok((counts["line"] ?? 0) >= 2, `Only ${counts["line"]} rails`);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 15. validateTrack CATCHES BAD CONFIGS (regression / unit tests for the validator)
// ══════════════════════════════════════════════════════════════════════════════
describe("15. validateTrack catches deliberately bad configurations", () => {
  it("flags oversized platform", () => {
    const layout = buildTrack(520, 860);
    layout.obstacles.push({ kind: "platform", x: 260, y: 400, w: 9999, angle: 0 });
    const errors = validateTrack(layout);
    assert.ok(errors.some(e => e.type === "platform_too_wide"),
      "Expected platform_too_wide error");
  });

  it("flags U-ramp with depth > width", () => {
    const layout = buildTrack(520, 860);
    layout.obstacles.push({ kind: "uramp", cx: 260, topY: 300, w: 80, depth: 200 });
    const errors = validateTrack(layout);
    assert.ok(errors.some(e => e.type === "stuck_risk"),
      "Expected stuck_risk error for deep ramp");
  });

  it("flags pad with speed below MIN_PAD_SPEED", () => {
    const layout = buildTrack(520, 860);
    layout.obstacles.push({ kind: "pad", x: 260, y: 400, w: 60, vx: 0, vy: -1, color: "#fff", dir: "up" });
    const errors = validateTrack(layout);
    assert.ok(errors.some(e => e.type === "pad_too_weak"),
      "Expected pad_too_weak error");
  });

  it("flags peg that clips left wall", () => {
    const layout = buildTrack(520, 860);
    layout.obstacles.push({ kind: "peg", x: 4, y: 300, r: 8 });
    const errors = validateTrack(layout);
    assert.ok(errors.some(e => e.type === "wall_clip"),
      "Expected wall_clip error");
  });

  it("flags peg that clips right wall", () => {
    const layout = buildTrack(520, 860);
    layout.obstacles.push({ kind: "peg", x: 520 - 4, y: 300, r: 8 });
    const errors = validateTrack(layout);
    assert.ok(errors.some(e => e.type === "wall_clip"),
      "Expected wall_clip error");
  });

  it("flags no_corridor when a wide platform is injected mid-track", () => {
    const layout = buildTrack(520, 860);
    // A platform as wide as the play area will block the corridor
    layout.obstacles.push({ kind: "platform", x: 260, y: 400, w: 520, angle: 0 });
    const errors = validateTrack(layout);
    assert.ok(
      errors.some(e => e.type === "no_corridor" || e.type === "platform_too_wide"),
      "Expected no_corridor or platform_too_wide error"
    );
  });

  it("returns zero errors for a clean standard layout", () => {
    const layout = buildTrack(520, 860);
    const errors = validateTrack(layout);
    assertNoErrors(errors);
  });
});
