"use client";

import { useEffect, useRef, useCallback } from "react";
import { Player } from "@/store/raceStore";
import {
  buildTrack,
  MARBLE_RADIUS,
  WALL_THICK,
  PadDef,
  ObstacleDef,
} from "@/lib/trackBuilder";
import { CANVAS_W, CANVAS_H } from "@/lib/constants";
import { BgTheme } from "@/lib/themes";

export interface GameEngineCallbacks {
  onProgress:  (playerId: string, progress: number) => void;
  onFinish:    (playerId: string, rank: number) => void;
  onWinner:    (playerId: string) => void;
  onBounce?:   () => void;
  onPadFire?:  (dir: "left" | "right" | "up") => void;
}

interface MarbleBody {
  playerId: string;
  color:    string;
  name:     string;
  finished: boolean;
}

interface LivePad {
  def:       PadDef;
  body:      any;
  lastFlash: number;
}

// ── Visual palette ────────────────────────────────────────────────────────────
const CLR = {
  wall:   "#0d0d14",
  peg:    "#7c3aed",
  finish: "#10b981",
};

// ── Pad cooldown ms ───────────────────────────────────────────────────────────
const PAD_CD = 600;

// ── Wind settings ─────────────────────────────────────────────────────────────
const WIND_INTERVAL_MS = 5000;  // ms between gusts
const WIND_DURATION_MS = 1800;  // ms each gust lasts
const WIND_FORCE       = 0.00018; // horizontal force per frame (scaled by sin curve)

// ── Anti-stuck: check every N ms, nudge if speed < threshold ─────────────────
const STUCK_CHECK_MS  = 800;   // how often we snapshot position
const STUCK_SPEED_THR = 0.8;    // px/frame — below this the marble is "stalled"
const STUCK_Y_BAND    = 10;     // if also not falling (|dy| < this over interval) → stuck

export function useGameEngine(
  canvasRef:  React.RefObject<HTMLCanvasElement>,
  players:    Player[],
  callbacks:  GameEngineCallbacks,
  active:     boolean,
  spawnOffsets: number[] = [],   // per-player x-offset from shuffling
  customObstacles?: ObstacleDef[] | null,
  theme?: BgTheme,
) {
  const engineRef       = useRef<any>(null);
  const rafRef          = useRef<number>(0);
  const marblesRef      = useRef<Map<number, MarbleBody>>(new Map());
  const finishCountRef  = useRef(0);
  const winnerCalledRef = useRef(false);

  const pegsRef   = useRef<any[]>([]);
  const linesRef  = useRef<{ body: any; len: number }[]>([]);
  const urampsRef = useRef<{ left: any; right: any; floor: any }[]>([]);
  const platsRef  = useRef<{ body: any; len: number }[]>([]);
  const padsRef   = useRef<LivePad[]>([]);
  const finishYRef = useRef(0);

  // ── Theme ref — updated every render so draw loop always sees latest ────────
  const themeRef = useRef<BgTheme | undefined>(theme);
  themeRef.current = theme;

  // ── Wind state ─────────────────────────────────────────────────────────────
  const windRef     = useRef<{ dir: 1 | -1; startTime: number } | null>(null);
  const nextWindRef = useRef<number>(0); // 0 = not yet initialised

  const stopEngine = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (engineRef.current) {
      try {
        const { Runner, Engine } = engineRef.current.modules;
        Runner.stop(engineRef.current.runner);
        Engine.clear(engineRef.current.engine);
      } catch {}
      engineRef.current = null;
    }
    marblesRef.current.clear();
    padsRef.current         = [];
    finishCountRef.current  = 0;
    winnerCalledRef.current = false;
    windRef.current         = null;
    nextWindRef.current     = 0;
  }, []);

  useEffect(() => {
    if (!active || !canvasRef.current || players.length === 0) return;
    let destroyed = false;

    async function init() {
      const Matter = (await import("matter-js")).default;
      if (destroyed || !canvasRef.current) return;

      const canvas = canvasRef.current;
      // The canvas element already has fixed width/height attrs set by the page.
      // We just use those — no clientWidth/clientHeight which would give CSS-scaled size.
      const W = CANVAS_W;
      const H = CANVAS_H;

      const { Engine, Runner, Bodies, Body, World, Events, Composite } = Matter;

      // ── Physics ─────────────────────────────────────────────────────────────
      // gravity 0.55 → comfortable fall speed
      // frictionAir on marbles 0.018 → ~30 s end-to-end
      // friction 0 on ALL static surfaces → marbles never stall on flat tops
      const engine = Engine.create({ gravity: { x: 0, y: 0.55 } });
      const world  = engine.world;

      // ── Boundary walls — restitution 0.5, ZERO friction ────────────────────
      // Zero friction means a marble rolling along the wall always has a
      // downward component and cannot get stuck in a corner grinding forever.
      const wOpt = { isStatic: true, friction: 0, frictionStatic: 0, restitution: 0.5, label: "wall" };
      World.add(world, [
        Bodies.rectangle(W / 2,              -15,    W,          30,    wOpt),
        Bodies.rectangle(-WALL_THICK / 2,    H / 2,  WALL_THICK, H,     wOpt),
        Bodies.rectangle(W + WALL_THICK / 2, H / 2,  WALL_THICK, H,     wOpt),
      ]);

      // ── Finish sensor ────────────────────────────────────────────────────────
      const finishY = H - 55;
      finishYRef.current = finishY;
      World.add(world, Bodies.rectangle(W / 2, finishY, W, 6, {
        isStatic: true, isSensor: true, label: "finish",
      }));

      // ── Build track from pure layout ─────────────────────────────────────────
      const layout = buildTrack(W, H);
      // Override with custom obstacles if provided by the map editor
      const activeObstacles: ObstacleDef[] = customObstacles ?? layout.obstacles;

      // Reset render lists
      pegsRef.current   = [];
      linesRef.current  = [];
      urampsRef.current = [];
      platsRef.current  = [];
      padsRef.current   = [];

      for (const def of activeObstacles) {
        switch (def.kind) {

          case "peg": {
            // Zero friction — pegs should deflect, not grip
            const b = Bodies.circle(def.x, def.y, def.r, {
              isStatic: true, friction: 0, frictionStatic: 0, restitution: 0.6, label: "peg",
            });
            pegsRef.current.push(b);
            World.add(world, b);
            break;
          }

          case "line": {
            const b = Bodies.rectangle(def.x, def.y, def.len, 8, {
              isStatic: true, angle: def.angle,
              friction: 0, frictionStatic: 0, restitution: 0.35, label: "line",
            });
            linesRef.current.push({ body: b, len: def.len });
            World.add(world, b);
            break;
          }

          case "uramp": {
            // U-ramp walls: restitution 0.55, zero friction
            // Shallow (depth ≤ 0.9×width) so marbles always escape
            const hw   = def.w / 2;
            const wallH = def.depth + 10;
            const left  = Bodies.rectangle(def.cx - hw + 4, def.topY + def.depth / 2, 8, wallH, {
              isStatic: true, friction: 0, frictionStatic: 0, restitution: 0.55, label: "uramp",
            });
            const right = Bodies.rectangle(def.cx + hw - 4, def.topY + def.depth / 2, 8, wallH, {
              isStatic: true, friction: 0, frictionStatic: 0, restitution: 0.55, label: "uramp",
            });
            // Floor: higher restitution so marbles bounce out rather than sitting
            const floor = Bodies.rectangle(def.cx, def.topY + def.depth, def.w - 8, 8, {
              isStatic: true, friction: 0, frictionStatic: 0, restitution: 0.75, label: "uramp",
            });
            urampsRef.current.push({ left, right, floor });
            World.add(world, [left, right, floor]);
            break;
          }

          case "platform": {
            const b = Bodies.rectangle(def.x, def.y, def.w, 10, {
              isStatic: true, angle: def.angle,
              friction: 0, frictionStatic: 0, restitution: 0.62, label: "platform",
            });
            platsRef.current.push({ body: b, len: def.w });
            World.add(world, b);
            break;
          }

          case "pad": {
            const b = Bodies.rectangle(def.x, def.y, def.w, 10, {
              isStatic: true, isSensor: true, label: "pad_" + def.dir,
            });
            padsRef.current.push({ def, body: b, lastFlash: 0 });
            World.add(world, b);
            break;
          }
        }
      }

      // ── Spawn marbles ────────────────────────────────────────────────────────
      const sp  = Math.min(48, (W - WALL_THICK * 2 - 20) / Math.max(players.length, 1));
      const sx  = (W - sp * (players.length - 1)) / 2;

      players.forEach((player, i) => {
        const offset = spawnOffsets[i] ?? 0;
        const rawX   = sx + i * sp + offset;
        // Clamp so marbles never spawn inside the walls
        const spawnX = Math.max(
          WALL_THICK + MARBLE_RADIUS + 2,
          Math.min(W - WALL_THICK - MARBLE_RADIUS - 2, rawX)
        );
        const marble = Bodies.circle(
          spawnX,
          26 + Math.random() * 10,
          MARBLE_RADIUS,
          {
            restitution: 0.55,
            friction:    0,          // zero friction on marble surface
            frictionStatic: 0,
            frictionAir: 0.018,      // air drag → controls race duration
            density:     0.002,
            label:       `marble-${player.id}`,
          }
        );
        // Give each marble a tiny sideways nudge to break symmetry
        Body.setVelocity(marble, { x: (Math.random() - 0.5) * 2.5, y: 0.5 });
        marblesRef.current.set(marble.id, {
          playerId: player.id,
          color:    player.color,
          name:     player.name,
          finished: false,
        });
        World.add(world, marble);
      });

      // ── Pad impulse polling ──────────────────────────────────────────────────
      const padCooldowns = new Map<string, number>();

      function applyPads(now: number) {
        const allBodies = Composite.allBodies(world);
        for (const lp of padsRef.current) {
          const pb  = lp.body;
          const px  = pb.position.x;
          const py  = pb.position.y;
          const hw  = (pb.bounds.max.x - pb.bounds.min.x) / 2;

          for (const b of allBodies) {
            if (!marblesRef.current.has(b.id)) continue;
            const bx = b.position.x;
            const by = b.position.y;
            if (Math.abs(bx - px) < hw + MARBLE_RADIUS && by > py - 28 && by < py + 10) {
              const key  = `${b.id}_${pb.id}`;
              const last = padCooldowns.get(key) ?? 0;
              if (now - last > PAD_CD) {
                padCooldowns.set(key, now);
                lp.lastFlash = now;
                Body.setVelocity(b, {
                  x: lp.def.vx + b.velocity.x * 1.0,
                  y: lp.def.vy,
                });
                callbacks.onPadFire?.(lp.def.dir);
              }
            }
          }
        }
      }

      // ── Platform ice-slide: amplify horizontal velocity when skating on a platform ──
      // Each frame, any marble whose centre sits within MARBLE_RADIUS+4 px above
      // a platform surface gets a 1.8 % horizontal velocity boost, simulating an
      // icy/slippery surface.  Capped at 18 px/frame to stay controllable.
      const PLAT_SLIP_MULT  = 1.018;   // multiply vx per frame when on platform
      const PLAT_SLIP_CAP   = 10;      // stay well below wall-thickness to prevent tunneling      // max |vx| allowed from slip acceleration

      function applyPlatformSlip() {
        const allBodies = Composite.allBodies(world);
        for (const b of allBodies) {
          const md = marblesRef.current.get(b.id);
          if (!md || md.finished) continue;

          for (const { body: pb } of platsRef.current) {
            // Check if marble is just above the platform surface (local-space proximity)
            const dx = b.position.x - pb.position.x;
            const dy = b.position.y - pb.position.y;
            // Rotate into platform's local frame
            const cos = Math.cos(-pb.angle);
            const sin = Math.sin(-pb.angle);
            const lx  = dx * cos - dy * sin;
            const ly  = dx * sin + dy * cos;
            const hw  = (pb.bounds.max.x - pb.bounds.min.x) / 2;
            // Marble must be horizontally within the platform and just above it
            if (Math.abs(lx) < hw + MARBLE_RADIUS && ly > -(MARBLE_RADIUS + 6) && ly < 4) {
              // Amplify horizontal velocity in world space
              const vx = b.velocity.x;
              if (Math.abs(vx) > 0.1) {
                const newVx = Math.sign(vx) * Math.min(
                  Math.abs(vx) * PLAT_SLIP_MULT,
                  PLAT_SLIP_CAP,
                );
                Body.setVelocity(b, { x: newVx, y: b.velocity.y });
              }
              break; // only need one platform hit per marble per frame
            }
          }
        }
      }

      // ── Anti-stuck: velocity-based ───────────────────────────────────────────
      // Every STUCK_CHECK_MS milliseconds, any marble whose speed is below
      // STUCK_SPEED_THR AND which hasn't descended at least STUCK_Y_BAND pixels
      // gets a guaranteed downward + sideways kick that cannot be zero.
      // We track snapshots by time, not by body ID persistence.
      const snapshots = new Map<number, { x: number; y: number; ts: number }>();

      function checkStuck(now: number) {
        const allBodies = Composite.allBodies(world);
        for (const b of allBodies) {
          const md = marblesRef.current.get(b.id);
          if (!md || md.finished) continue;

          const speed = Math.sqrt(b.velocity.x ** 2 + b.velocity.y ** 2);
          const snap  = snapshots.get(b.id);

          if (snap && now - snap.ts >= STUCK_CHECK_MS) {
            const dy = b.position.y - snap.y;
            // "Stuck" = barely moving AND not falling (dy < STUCK_Y_BAND over interval)
            if (speed < STUCK_SPEED_THR && dy < STUCK_Y_BAND) {
              // Strong, randomised kick — never pure horizontal so it always escapes
              const dir = Math.random() < 0.5 ? 1 : -1;
              Body.setVelocity(b, {
                x: dir * (3.5 + Math.random() * 3),
                y: -(1.5 + Math.random() * 2),
              });
              // Apply a small downward positional correction in case it's resting on geometry
              Body.setPosition(b, {
                x: b.position.x + dir * 2,
                y: b.position.y + 1,
              });
            }
            // Reset snapshot
            snapshots.set(b.id, { x: b.position.x, y: b.position.y, ts: now });
          } else if (!snap) {
            snapshots.set(b.id, { x: b.position.x, y: b.position.y, ts: now });
          }
        }
      }

      // ── Finish-line collision ────────────────────────────────────────────────
      Events.on(engine, "collisionStart", (ev: any) => {
        for (const { bodyA, bodyB } of ev.pairs) {
          // ── Finish line ──────────────────────────────────────────────────
          let md: MarbleBody | undefined;
          if (bodyA.label === "finish") md = marblesRef.current.get(bodyB.id);
          else if (bodyB.label === "finish") md = marblesRef.current.get(bodyA.id);
          if (md && !md.finished) {
            md.finished = true;
            finishCountRef.current++;
            callbacks.onFinish(md.playerId, finishCountRef.current);
            if (!winnerCalledRef.current) {
              winnerCalledRef.current = true;
              callbacks.onWinner(md.playerId);
            }
          }

          // ── Bounce sound — marble hits peg, wall, uramp, or platform ───
          const labels = [bodyA.label, bodyB.label];
          const isMarbleA = marblesRef.current.has(bodyA.id);
          const isMarbleB = marblesRef.current.has(bodyB.id);
          const hasMarble = isMarbleA || isMarbleB;
          const otherLabel = isMarbleA ? bodyB.label : bodyA.label;

          if (hasMarble && ["peg", "wall", "uramp", "platform", "line"].includes(otherLabel)) {
            callbacks.onBounce?.();
          }
        }
      });

      // ── Runner ───────────────────────────────────────────────────────────────
      const runner = Runner.create();
      Runner.run(runner, engine);

      // ─────────────────────────────────────────────────────────────────────────
      // RENDER LOOP
      // The canvas backing store is set by the page to cssDisplaySize × DPR.
      // Each frame we derive the draw scale as canvas.width / CANVAS_W so that
      // all drawing coords stay in CANVAS_W × CANVAS_H logical space while the
      // backing store exactly matches the physical pixel count — no blur at any
      // resolution or zoom level.
      // ─────────────────────────────────────────────────────────────────────────
      const ctx = canvas.getContext("2d")!;

      function drawLoop(now: number) {
        if (destroyed) return;

        applyPads(now);
        applyPlatformSlip();
        checkStuck(now);

        // ── Wind physics ────────────────────────────────────────────────────
        if (nextWindRef.current === 0) nextWindRef.current = now + WIND_INTERVAL_MS;

        if (now >= nextWindRef.current && !windRef.current) {
          windRef.current   = { dir: Math.random() < 0.5 ? 1 : -1, startTime: now };
          nextWindRef.current = now + WIND_INTERVAL_MS + WIND_DURATION_MS;
        }
        if (windRef.current && now > windRef.current.startTime + WIND_DURATION_MS) {
          windRef.current = null;
        }
        if (windRef.current) {
          const wp        = (now - windRef.current.startTime) / WIND_DURATION_MS;
          const intensity = Math.sin(wp * Math.PI); // 0 → 1 → 0
          const allWind   = Composite.allBodies(engine.world);
          for (const b of allWind) {
            const md = marblesRef.current.get(b.id);
            if (!md || md.finished) continue;
            Body.applyForce(b, b.position, {
              x: windRef.current.dir * WIND_FORCE * intensity * b.mass,
              y: 0,
            });
          }
        }

        const eDpr = canvas.width / W; // backing pixels per logical pixel
        ctx.setTransform(eDpr, 0, 0, eDpr, 0, 0);
        ctx.clearRect(0, 0, W, H);

        // ── Themed background ──────────────────────────────────────────────
        const t = themeRef.current;
        ctx.fillStyle = t?.bg ?? "#0a0a0f";
        ctx.fillRect(0, 0, W, H);
        t?.drawExtra(ctx, W, H);

        // ── Wind background tint ─────────────────────────────────────────────
        if (windRef.current) {
          const wp  = (now - windRef.current.startTime) / WIND_DURATION_MS;
          const sit = Math.sin(wp * Math.PI);
          const dir = windRef.current.dir;
          const wg  = ctx.createLinearGradient(dir > 0 ? 0 : W, 0, dir > 0 ? W : 0, 0);
          wg.addColorStop(0,   `rgba(56,189,248,${0.07 * sit})`);
          wg.addColorStop(0.5, `rgba(56,189,248,${0.03 * sit})`);
          wg.addColorStop(1,   "rgba(56,189,248,0)");
          ctx.fillStyle = wg;
          ctx.fillRect(0, 0, W, H);
        }

        // ── Walls — drawn early so all obstacles render on top ────────────────
        ctx.fillStyle = CLR.wall;
        ctx.fillRect(0, 0, WALL_THICK, H);
        ctx.fillRect(W - WALL_THICK, 0, WALL_THICK, H);
        ctx.strokeStyle = "rgba(124,58,237,0.12)";
        ctx.lineWidth   = 1;
        ctx.beginPath(); ctx.moveTo(WALL_THICK, 0); ctx.lineTo(WALL_THICK, H); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(W - WALL_THICK, 0); ctx.lineTo(W - WALL_THICK, H); ctx.stroke();

        // ── Pegs ────────────────────────────────────────────────────────────
        for (const p of pegsRef.current) {
          const r = (p as any).circleRadius ?? 5;
          // Outer glow ring
          ctx.beginPath();
          ctx.arc(p.position.x, p.position.y, r + 3, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(124,58,237,0.18)";
          ctx.fill();
          // Body
          ctx.beginPath();
          ctx.arc(p.position.x, p.position.y, r, 0, Math.PI * 2);
          ctx.fillStyle   = CLR.peg;
          ctx.shadowBlur  = 8;
          ctx.shadowColor = CLR.peg;
          ctx.fill();
          ctx.shadowBlur  = 0;
          // Specular dot
          ctx.beginPath();
          ctx.arc(p.position.x - 1.2, p.position.y - 1.2, 1.4, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255,255,255,0.55)";
          ctx.fill();
        }

        // ── Rails / diagonal lines ───────────────────────────────────────────
        for (const { body: b, len } of linesRef.current) {
          ctx.save();
          ctx.translate(b.position.x, b.position.y);
          ctx.rotate(b.angle);
          // Drop shadow
          ctx.beginPath(); ctx.roundRect(-len / 2, -4, len, 10, 4);
          ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fill();
          // Rail body
          ctx.beginPath(); ctx.roundRect(-len / 2, -4, len, 8, 4);
          const rg = ctx.createLinearGradient(0, -4, 0, 4);
          rg.addColorStop(0, "#2d4a6b"); rg.addColorStop(1, "#1a2d3f");
          ctx.fillStyle = rg; ctx.fill();
          // Shine strip
          ctx.beginPath(); ctx.roundRect(-len / 2 + 4, -3, len - 8, 2, 1);
          ctx.fillStyle = "rgba(255,255,255,0.2)"; ctx.fill();
          ctx.restore();
        }

        // ── U-Ramps ──────────────────────────────────────────────────────────
        for (const ur of urampsRef.current) {
          for (const part of [ur.left, ur.right, ur.floor] as any[]) {
            const bw = part.bounds.max.x - part.bounds.min.x;
            const bh = part.bounds.max.y - part.bounds.min.y;
            ctx.save();
            ctx.translate(part.position.x, part.position.y);
            ctx.rotate(part.angle);
            ctx.beginPath(); ctx.roundRect(-bw / 2, -bh / 2, bw, bh, 3);
            const ug = ctx.createLinearGradient(-bw / 2, 0, bw / 2, 0);
            ug.addColorStop(0, "#0e7490"); ug.addColorStop(1, "#0891b2");
            ctx.fillStyle   = ug;
            ctx.shadowBlur  = 7;
            ctx.shadowColor = "#06b6d4";
            ctx.fill();
            ctx.shadowBlur  = 0;
            ctx.restore();
          }
        }

        // ── Platforms ────────────────────────────────────────────────────────
        for (const { body: b, len } of platsRef.current) {
          ctx.save();
          ctx.translate(b.position.x, b.position.y);
          ctx.rotate(b.angle);
          ctx.beginPath(); ctx.roundRect(-len / 2, -5, len, 10, 4);
          const pg = ctx.createLinearGradient(0, -5, 0, 5);
          pg.addColorStop(0, "#2563eb"); pg.addColorStop(1, "#1d4ed8");
          ctx.fillStyle = pg; ctx.fill();
          ctx.beginPath(); ctx.roundRect(-len / 2 + 4, -4, len - 8, 2.5, 1);
          ctx.fillStyle = "rgba(255,255,255,0.22)"; ctx.fill();
          ctx.restore();
        }

        // ── Launch pads ───────────────────────────────────────────────────────
        for (const lp of padsRef.current) {
          const pb    = lp.body;
          const bw    = pb.bounds.max.x - pb.bounds.min.x;
          const px    = pb.position.x;
          const py    = pb.position.y;
          const flash = now - lp.lastFlash < 160;

          ctx.save();
          ctx.translate(px, py);
          if (flash) { ctx.shadowBlur = 28; ctx.shadowColor = lp.def.color; }

          ctx.beginPath(); ctx.roundRect(-bw / 2, -5, bw, 10, 4);
          const lg = ctx.createLinearGradient(-bw / 2, 0, bw / 2, 0);
          lg.addColorStop(0,   lp.def.color + "88");
          lg.addColorStop(0.5, flash ? lp.def.color : lp.def.color + "cc");
          lg.addColorStop(1,   lp.def.color + "88");
          ctx.fillStyle = lg; ctx.fill();
          ctx.shadowBlur = 0;

          const arrow = lp.def.dir === "left"  ? "◀◀ LAUNCH"
                      : lp.def.dir === "right" ? "LAUNCH ▶▶"
                      : "▲ BOOST ▲";
          ctx.font      = `bold ${flash ? 9 : 8}px 'DM Sans', sans-serif`;
          ctx.fillStyle = flash ? "#fff" : "rgba(255,255,255,0.65)";
          ctx.textAlign = "center";
          ctx.fillText(arrow, 0, 3.5);

          // Ripple ring on fire
          if (flash) {
            const prog = Math.min((now - lp.lastFlash) / 160, 1);
            ctx.beginPath();
            ctx.ellipse(0, 0, (bw / 2 + 10) * prog, 10 * prog, 0, 0, Math.PI * 2);
            ctx.strokeStyle = lp.def.color + Math.round((1 - prog) * 190).toString(16).padStart(2, "0");
            ctx.lineWidth   = 2;
            ctx.stroke();
          }
          ctx.restore();
        }

        // ── Finish line ───────────────────────────────────────────────────────
        const fy  = finishYRef.current;
        const fx0 = 0;
        const fw  = W;

        ctx.shadowBlur  = 14;
        ctx.shadowColor = CLR.finish;
        ctx.fillStyle   = CLR.finish + "cc";
        ctx.fillRect(fx0, fy - 2, fw, 3);
        ctx.shadowBlur  = 0;

        // Checkered strip
        const tw = 10, th = 6;
        for (let tx = fx0; tx < fx0 + fw; tx += tw) {
          for (let ty = 0; ty < 2; ty++) {
            ctx.fillStyle = (Math.floor((tx - fx0) / tw) + ty) % 2 === 0
              ? "rgba(255,255,255,0.55)"
              : "rgba(0,0,0,0.42)";
            ctx.fillRect(tx, fy + 1 + ty * th, tw, th);
          }
        }
        ctx.font      = "bold 10px 'DM Sans', sans-serif";
        ctx.fillStyle = CLR.finish + "bb";
        ctx.textAlign = "right";
        ctx.fillText("FINISH", W - 5, fy - 5);
        ctx.textAlign = "left";

        // ── Wind streaks & label ─────────────────────────────────────────────
        if (windRef.current) {
          const wp      = (now - windRef.current.startTime) / WIND_DURATION_MS;
          const sit     = Math.sin(wp * Math.PI);
          const dir     = windRef.current.dir;
          const elapsed = now - windRef.current.startTime;

          ctx.save();

          // Streaks — 24 lines distributed evenly in Y, sweeping horizontally
          for (let i = 0; i < 24; i++) {
            const seed  = (i * 0.6180339) % 1;           // golden-ratio spread
            const sy    = seed * H;
            const len   = 22 + (i % 7) * 14;             // 22–114 px
            const spd   = 0.22 + (i % 5) * 0.07;         // px/ms
            const phase = (i / 24) * (W + len * 2);       // stagger start positions
            const rawX  = (elapsed * spd + phase) % (W + len * 2) - len;
            const sx    = dir > 0 ? rawX : W - rawX;
            const alpha = sit * (0.18 + (i % 4) * 0.10);

            ctx.beginPath();
            ctx.moveTo(sx,           sy);
            ctx.lineTo(sx + dir * len, sy);
            ctx.strokeStyle = `rgba(186,230,253,${alpha})`;
            ctx.lineWidth   = 0.6 + (i % 3) * 0.5;
            ctx.stroke();
          }

          // Direction label — fades in sharply then out
          const labelAlpha = Math.min(1, sit * 3) * sit;
          if (labelAlpha > 0.02) {
            const arrow = dir > 0 ? "WIND  →→→" : "←←←  WIND";
            ctx.globalAlpha = labelAlpha;
            ctx.font        = "bold 12px 'DM Sans', sans-serif";
            ctx.textAlign   = "center";
            ctx.shadowBlur  = 14;
            ctx.shadowColor = "#38bdf8";
            ctx.fillStyle   = "#bae6fd";
            ctx.fillText(arrow, W / 2, 28);
            ctx.shadowBlur  = 0;
            ctx.textAlign   = "left";
          }

          ctx.restore();
        }

        // ── Marbles ───────────────────────────────────────────────────────────
        const allBodies = Composite.allBodies(engine.world);
        for (const body of allBodies) {
          const md = marblesRef.current.get(body.id);
          if (!md) continue;

          const x = body.position.x;
          const y = body.position.y;

          // Progress 0 → 1
          const progress = Math.min(1, Math.max(0, (y - 26) / (fy - 26)));
          callbacks.onProgress(md.playerId, progress);

          // Aura
          const aura = ctx.createRadialGradient(x, y, MARBLE_RADIUS, x, y, MARBLE_RADIUS + 3.5);
          aura.addColorStop(0, md.color + "55");
          aura.addColorStop(1, "transparent");
          ctx.beginPath();
          ctx.arc(x, y, MARBLE_RADIUS + 3.5, 0, Math.PI * 2);
          ctx.fillStyle = aura; ctx.fill();

          // Body gradient
          const grd = ctx.createRadialGradient(x - 1.75, y - 1.75, 0.25, x, y, MARBLE_RADIUS);
          grd.addColorStop(0,    "rgba(255,255,255,0.88)");
          grd.addColorStop(0.28, md.color + "ee");
          grd.addColorStop(0.78, md.color);
          grd.addColorStop(1,    md.color + "88");
          ctx.beginPath();
          ctx.arc(x, y, MARBLE_RADIUS, 0, Math.PI * 2);
          ctx.fillStyle   = grd;
          ctx.shadowBlur  = 10;
          ctx.shadowColor = md.color;
          ctx.fill();
          ctx.shadowBlur  = 0;

          // Primary specular
          ctx.beginPath();
          ctx.arc(x - 1.75, y - 2, 1.75, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255,255,255,0.46)"; ctx.fill();

          // Micro specular
          ctx.beginPath();
          ctx.arc(x - 0.5, y - 3.75, 0.65, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255,255,255,0.65)"; ctx.fill();

          // Name label
          if (!md.finished) {
            ctx.font      = "500 7px 'DM Sans', sans-serif";
            ctx.fillStyle = "rgba(255,255,255,0.82)";
            ctx.textAlign = "center";
            ctx.fillText(md.name.split(" ")[0].slice(0, 8), x, y + MARBLE_RADIUS + 7);
          }
        }
        ctx.textAlign = "left";

        rafRef.current = requestAnimationFrame(drawLoop);
      }

      engineRef.current = { engine, runner, modules: { Runner, Engine } };
      rafRef.current    = requestAnimationFrame(drawLoop);
    }

    init();
    return () => { destroyed = true; stopEngine(); };
  }, [active, players, spawnOffsets, customObstacles]);

  return { stopEngine };
}
         