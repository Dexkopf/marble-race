#!/usr/bin/env node
/**
 * run-tests.mjs
 *
 * Marble Race — Playability Test Suite
 * Uses: node:test (built into Node 22), tsc (installed globally)
 *
 * Usage (from project root):
 *   node run-tests.mjs
 *   node run-tests.mjs --verbose
 */

import { execSync }      from "node:child_process";
import { mkdirSync }     from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST      = join(__dirname, ".tc-dist");

// ── Step 1: compile trackBuilder.ts → CommonJS JS ─────────────────────────────
mkdirSync(DIST, { recursive: true });
try {
  execSync(
    `tsc --ignoreConfig --module commonjs --target es2020 --skipLibCheck ` +
    `--outDir "${DIST}" lib/trackBuilder.ts`,
    { cwd: __dirname, stdio: "pipe" }
  );
} catch (e) {
  console.error("TypeScript compilation failed:\n", e.stderr?.toString());
  process.exit(1);
}

// ── Step 2: load compiled module ───────────────────────────────────────────────
const require = createRequire(import.meta.url);
const lib = require(join(DIST, "trackBuilder.js"));

const {
  buildTrack, validateTrack, countByKind, padsOfDir, simulateStraightDrop,
  MARBLE_RADIUS, WALL_THICK, CORRIDOR, MIN_GAP, MAX_PLAT_RATIO,
  MIN_PAD_SPEED, ZONES,
} = lib;

// ── Step 3: mini test framework ────────────────────────────────────────────────
const G = "\x1b[32m", R = "\x1b[31m", C = "\x1b[36m",
      B = "\x1b[1m",  D = "\x1b[2m",  X = "\x1b[0m";

let passed = 0, failed = 0;
let suite  = "";
const failures = [];

function describe(name, fn) { suite = name; if (true) console.log(`\n${C}${B}${name}${X}`); fn(); }
function it(name, fn) {
  try   { fn(); passed++; console.log(`  ${G}✓${X} ${D}${name}${X}`); }
  catch (e) {
    failed++;
    failures.push({ full: `${suite} › ${name}`, msg: e.message });
    console.log(`  ${R}✗${X} ${name}\n    ${R}${e.message}${X}`);
  }
}
function ok(v, m)   { if (!v)    throw new Error(m ?? `Expected truthy, got ${v}`); }
function eq(a, b, m){ if (a!==b) throw new Error(m ?? `Expected ${JSON.stringify(a)} === ${JSON.stringify(b)}`); }
function near(a, b, tol = 0.001) {
  if (Math.abs(a - b) > tol) throw new Error(`Expected ${a} ≈ ${b} (tol=${tol})`);
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const getAll = (L, k) => L.obstacles.filter(o => o.kind === k);

function noErrors(errors, ctx = "") {
  if (errors.length === 0) return;
  const msgs = errors.slice(0, 3).map(e => `[${e.type}] ${e.message}`).join("; ");
  throw new Error(`${ctx}${msgs}`);
}

const SIZES = [
  { W: 400, H: 700,  label: "mobile 400×700"   },
  { W: 520, H: 860,  label: "standard 520×860" },
  { W: 700, H: 1000, label: "desktop 700×1000" },
];

// ══════════════════════════════════════════════════════════════════════════════

console.log(`\n${B}${C}🎱  Marble Race — Playability Test Suite${X}`);

// ── 1. Track structure ────────────────────────────────────────────────────────
describe("1. Track structure", () => {
  const L = buildTrack(520, 860);
  it("produces at least one obstacle",    () => ok(L.obstacles.length > 0));
  it("contains all 5 obstacle kinds",     () => {
    const s = new Set(L.obstacles.map(o => o.kind));
    for (const k of ["peg","line","uramp","platform","pad"]) ok(s.has(k), `missing: ${k}`);
  });
  it("≥ 10 pegs",                         () => ok(getAll(L,"peg").length >= 10));
  it("≥ 2 U-ramps",                       () => ok(getAll(L,"uramp").length >= 2));
  it("≥ 2 straight rails",               () => ok(getAll(L,"line").length >= 2));
  it("≥ 2 angled platforms",             () => ok(getAll(L,"platform").length >= 2));
  it("pads in all 3 directions",          () => {
    const d = new Set(getAll(L,"pad").map(p => p.dir));
    for (const k of ["left","right","up"]) ok(d.has(k), `missing dir: ${k}`);
  });
  it("finishY in [75%–98%] of canvas H", () => {
    ok(L.finishY > 860 * 0.75 && L.finishY < 860 * 0.98,
      `finishY=${L.finishY}`);
  });
  it("playW = W − 2×WALL_THICK",         () => eq(L.playW, 520 - WALL_THICK * 2));
  it("playX = WALL_THICK",               () => eq(L.playX, WALL_THICK));
  it("trackH > 0",                        () => ok(L.trackH > 0));
});

// ── 2. Corridor guarantee ─────────────────────────────────────────────────────
describe("2. Corridor guarantee (no full-width blockage at any y)", () => {
  for (const { W, H, label } of SIZES) {
    it(`zero no_corridor errors — ${label}`, () => {
      const errs = validateTrack(buildTrack(W, H)).filter(e => e.type === "no_corridor");
      if (errs.length) throw new Error(`${errs.length} corridor violation(s): ` + errs[0].message);
    });
  }
});

// ── 3. Anti-stuck rules ───────────────────────────────────────────────────────
describe("3. Anti-stuck rules", () => {
  for (const { W, H, label } of SIZES) {
    it(`platform ≤ MAX_PLAT_RATIO×playW — ${label}`, () => {
      const L = buildTrack(W, H);
      const max = L.playW * MAX_PLAT_RATIO;
      for (const p of getAll(L,"platform"))
        ok(p.w <= max + 1, `w=${p.w.toFixed(0)} > max ${max.toFixed(0)}`);
    });
    it(`U-ramp depth ≤ ramp width — ${label}`, () => {
      const L = buildTrack(W, H);
      for (const ur of getAll(L,"uramp"))
        ok(ur.depth <= ur.w + 1, `depth ${ur.depth.toFixed(0)} > w ${ur.w.toFixed(0)}`);
    });
    it(`all pad speeds ≥ ${MIN_PAD_SPEED} — ${label}`, () => {
      const L = buildTrack(W, H);
      for (const p of getAll(L,"pad")) {
        const s = Math.sqrt(p.vx**2 + p.vy**2);
        ok(s >= MIN_PAD_SPEED, `speed ${s.toFixed(2)} < ${MIN_PAD_SPEED}`);
      }
    });
    it(`validateTrack returns 0 errors — ${label}`, () => {
      noErrors(validateTrack(buildTrack(W, H)));
    });
  }
});

// ── 4. U-ramp / pad pairing ───────────────────────────────────────────────────
describe("4. U-ramp / pad pairing", () => {
  for (const { W, H, label } of SIZES) {
    it(`every ramp has a pad at its floor (±25 px) — ${label}`, () => {
      const L = buildTrack(W, H);
      for (const ur of getAll(L,"uramp")) {
        const fy = ur.topY + ur.depth;
        const ok2 = getAll(L,"pad").find(
          p => Math.abs(p.x - ur.cx) < ur.w/2+6 && Math.abs(p.y - fy) < 25
        );
        ok(ok2, `no pad for ramp cx=${ur.cx.toFixed(0)} floorY=${fy.toFixed(0)}`);
      }
    });
  }
});

// ── 5. Wall safety ────────────────────────────────────────────────────────────
describe("5. Wall safety", () => {
  for (const { W, H, label } of SIZES) {
    it(`no peg clips wall — ${label}`, () => {
      const L = buildTrack(W, H);
      for (const p of getAll(L,"peg")) {
        ok(p.x - p.r >= WALL_THICK - 1, `peg at x=${p.x.toFixed(0)} clips left`);
        ok(p.x + p.r <= W - WALL_THICK + 1, `peg at x=${p.x.toFixed(0)} clips right`);
      }
    });
    it(`all obstacle x-centres inside play area — ${label}`, () => {
      const L = buildTrack(W, H);
      for (const obs of L.obstacles) {
        const x = obs.kind === "uramp" ? obs.cx : obs.x;
        ok(x > WALL_THICK, `${obs.kind} at x=${x.toFixed(0)} outside left`);
        ok(x < W - WALL_THICK, `${obs.kind} at x=${x.toFixed(0)} outside right`);
      }
    });
  }
});

// ── 6. Pad direction logic ────────────────────────────────────────────────────
describe("6. Pad direction logic", () => {
  const L = buildTrack(520, 860);
  it("left pads vx < 0",  () => { for (const p of padsOfDir(L,"left"))  ok(p.vx < 0,  `vx=${p.vx}`); });
  it("right pads vx > 0", () => { for (const p of padsOfDir(L,"right")) ok(p.vx > 0,  `vx=${p.vx}`); });
  it("up pads vy < 0",    () => { for (const p of padsOfDir(L,"up"))    ok(p.vy < 0,  `vy=${p.vy}`); });
  it("pad colors match PAD_COLOR", () => {
    const MAP = { left: "#16a34a", right: "#b45309", up: "#be123c" };
    for (const p of getAll(L,"pad")) eq(p.color, MAP[p.dir], `dir=${p.dir} color=${p.color}`);
  });
});

// ── 7. Straight-drop simulation ───────────────────────────────────────────────
describe("7. Straight-drop simulation (marble paths from 5 x-positions)", () => {
  for (const { W, H, label } of SIZES) {
    for (const frac of [0.15, 0.30, 0.50, 0.70, 0.85]) {
      it(`x=${Math.round(frac*100)}% reaches finish — ${label}`, () => {
        const L = buildTrack(W, H);
        const r = simulateStraightDrop(L, WALL_THICK + L.playW * frac, 15);
        ok(r.reachesFinish, `blocked at y=${r.blockedAt}`);
      });
    }
  }
});

// ── 8. Finish line clear of solid obstacles ───────────────────────────────────
describe("8. Finish line clear of solid obstacles", () => {
  for (const { W, H, label } of SIZES) {
    it(`no solid within MARBLE_RADIUS+5 of finishY — ${label}`, () => {
      const L = buildTrack(W, H);
      const margin = MARBLE_RADIUS + 5;
      for (const obs of L.obstacles) {
        if (obs.kind === "pad") continue;
        const y = obs.kind === "uramp" ? obs.topY + obs.depth + 12 : obs.y;
        ok(Math.abs(y - L.finishY) > margin,
          `${obs.kind} at y=${y.toFixed(0)} within ${margin}px of finish`);
      }
    });
  }
});

// ── 9. Obstacle distribution ──────────────────────────────────────────────────
describe("9. Even obstacle distribution", () => {
  for (const { W, H, label } of SIZES) {
    it(`obstacles span ≥ 70% of track height — ${label}`, () => {
      const L  = buildTrack(W, H);
      const ys = L.obstacles.map(o => o.kind==="uramp" ? o.topY : o.y).filter(y => y > 0);
      const cov = (Math.max(...ys) - Math.min(...ys)) / L.trackH;
      ok(cov >= 0.70, `coverage=${(cov*100).toFixed(0)}%`);
    });
    it(`no two distinct rows within 8 px of each other — ${label}`, () => {
      const L  = buildTrack(W, H);
      const ys = L.obstacles
        .map(o => o.kind==="uramp" ? o.topY + o.depth/2 : o.y)
        .filter(y => y >= 0).sort((a,b) => a-b);
      for (let i = 1; i < ys.length; i++) {
        const gap = ys[i] - ys[i-1];
        if (gap > 0 && gap < 8)
          throw new Error(`rows y=${ys[i-1].toFixed(0)} and y=${ys[i].toFixed(0)} only ${gap.toFixed(1)}px apart`);
      }
    });
  }
});

// ── 10. Left-right symmetry ───────────────────────────────────────────────────
describe("10. Left-right symmetry", () => {
  for (const { W, H, label } of SIZES) {
    it(`L/R count ratio ≥ 0.70 — ${label}`, () => {
      const L  = buildTrack(W, H);
      const lN = L.obstacles.filter(o => (o.kind==="uramp"?o.cx:o.x) < W/2).length;
      const rN = L.obstacles.length - lN;
      const r  = Math.min(lN, rN) / Math.max(lN, rN);
      ok(r >= 0.70, `L=${lN} R=${rN} ratio=${r.toFixed(2)}`);
    });
  }
});

// ── 11. Determinism ───────────────────────────────────────────────────────────
describe("11. Determinism", () => {
  it("identical obstacle count on two calls", () => {
    eq(buildTrack(520,860).obstacles.length, buildTrack(520,860).obstacles.length);
  });
  it("identical peg positions on two calls", () => {
    const [a, b] = [buildTrack(520,860), buildTrack(520,860)];
    const pa = getAll(a,"peg"), pb = getAll(b,"peg");
    eq(pa.length, pb.length, "peg count mismatch");
    for (let i = 0; i < pa.length; i++) {
      near(pa[i].x, pb[i].x); near(pa[i].y, pb[i].y);
    }
  });
  it("identical finishY on two calls at 700×1000", () => {
    eq(buildTrack(700,1000).finishY, buildTrack(700,1000).finishY);
  });
});

// ── 12. Multi-size: validateTrack passes all sizes ────────────────────────────
describe("12. validateTrack passes all canvas sizes", () => {
  for (const { W, H, label } of SIZES) {
    it(`0 errors — ${label}`, () => noErrors(validateTrack(buildTrack(W, H))));
  }
});

// ── 13. Race timing heuristics ────────────────────────────────────────────────
describe("13. Race timing heuristics", () => {
  const L = buildTrack(520, 860);
  it("naive fall time is 1–15 s (gravity=0.6, frictionAir=0.022, fps=60)", () => {
    const t = L.trackH / (8 * 60);   // terminal velocity ≈ 8 px/frame empirical
    ok(t > 1 && t < 15, `naive=${t.toFixed(2)} s`);
  });
  it("≥ 8 redirecting obstacles (pads + angled rails/platforms)", () => {
    const n = L.obstacles.filter(o =>
      o.kind === "pad" ||
      ((o.kind === "line" || o.kind === "platform") && Math.abs(o.angle) > 0.05)
    ).length;
    ok(n >= 8, `only ${n} redirectors`);
  });
});

// ── 14. Obstacle mix quality ──────────────────────────────────────────────────
describe("14. Obstacle mix quality", () => {
  const L = buildTrack(520, 860);
  const c = countByKind(L);
  it("pegs are most numerous obstacle kind", () => {
    const max = Math.max(...Object.values(c));
    ok(c["peg"] === max, `pegs=${c["peg"]} not most: ${JSON.stringify(c)}`);
  });
  it(`≥ ${Math.floor(ZONES/4)} pads total`, () => {
    ok((c["pad"]??0) >= Math.floor(ZONES/4), `only ${c["pad"]} pads`);
  });
  it("all 5 kinds present in countByKind output", () => {
    for (const k of ["peg","line","uramp","platform","pad"])
      ok((c[k]??0) > 0, `${k} count=0`);
  });
});

// ── 15. validateTrack catches bad configs (regression) ────────────────────────
describe("15. validateTrack catches bad configurations", () => {
  it("flags oversized platform", () => {
    const L = buildTrack(520, 860);
    L.obstacles.push({ kind:"platform", x:260, y:400, w:9999, angle:0 });
    ok(validateTrack(L).some(e => e.type==="platform_too_wide"), "expected platform_too_wide");
  });
  it("flags U-ramp depth > width", () => {
    const L = buildTrack(520, 860);
    L.obstacles.push({ kind:"uramp", cx:260, topY:300, w:80, depth:200 });
    ok(validateTrack(L).some(e => e.type==="stuck_risk"), "expected stuck_risk");
  });
  it("flags pad with speed below MIN_PAD_SPEED", () => {
    const L = buildTrack(520, 860);
    L.obstacles.push({ kind:"pad", x:260, y:400, w:60, vx:0, vy:-0.5, color:"#fff", dir:"up" });
    ok(validateTrack(L).some(e => e.type==="pad_too_weak"), "expected pad_too_weak");
  });
  it("flags peg clipping left wall", () => {
    const L = buildTrack(520, 860);
    L.obstacles.push({ kind:"peg", x:3, y:300, r:8 });
    ok(validateTrack(L).some(e => e.type==="wall_clip"), "expected wall_clip");
  });
  it("flags peg clipping right wall", () => {
    const L = buildTrack(520, 860);
    L.obstacles.push({ kind:"peg", x:517, y:300, r:8 });
    ok(validateTrack(L).some(e => e.type==="wall_clip"), "expected wall_clip");
  });
  it("flags corridor blocked by full-width platform", () => {
    const L = buildTrack(520, 860);
    L.obstacles.push({ kind:"platform", x:260, y:400, w:600, angle:0 });
    const errs = validateTrack(L);
    ok(errs.some(e => e.type==="no_corridor" || e.type==="platform_too_wide"),
      "expected no_corridor or platform_too_wide");
  });
  it("returns 0 errors for clean standard layout", () => {
    noErrors(validateTrack(buildTrack(520, 860)));
  });
  it("returns 0 errors for clean mobile layout", () => {
    noErrors(validateTrack(buildTrack(400, 700)));
  });
  it("returns 0 errors for clean desktop layout", () => {
    noErrors(validateTrack(buildTrack(700, 1000)));
  });
});

// ── Summary ───────────────────────────────────────────────────────────────────
const total = passed + failed;
console.log(`\n${"─".repeat(60)}`);
console.log(`\n${B}Results: ${G}${passed} passed${X}${B}, ${failed > 0 ? R : ""}${failed} failed${X}${B} / ${total} total${X}\n`);

if (failures.length > 0) {
  console.log(`${R}${B}Failed tests:${X}`);
  for (const f of failures) {
    console.log(`  ${R}✗${X} ${f.full}`);
    console.log(`    ${f.msg}`);
  }
  console.log("");
}

process.exit(failed > 0 ? 1 : 0);
