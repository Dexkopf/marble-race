"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useMapStore } from "@/store/mapStore";
import {
  ObstacleDef, PegDef, LineDef, URampDef, PlatDef, PadDef,
  MARBLE_RADIUS, WALL_THICK, PAD_COLOR,
} from "@/lib/trackBuilder";
import { CANVAS_W, CANVAS_H } from "@/lib/constants";
import { BgTheme, THEMES, getTheme } from "@/lib/themes";
import { ArrowLeft, Save, Trash2, RotateCcw, ChevronRight, Layers, X } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import LangToggle from "@/components/LangToggle";

// ── Legend icons (mirrors app/page.tsx legend) ─────────────────────────────
function PegIcon() {
  return (
    <svg width="28" height="20" viewBox="0 0 28 20" fill="none">
      <circle cx="7" cy="10" r="4.5" fill="#7c3aed" />
      <circle cx="21" cy="10" r="4.5" fill="#7c3aed" />
      <circle cx="5.8" cy="8.8" r="1.3" fill="rgba(255,255,255,0.5)" />
      <circle cx="19.8" cy="8.8" r="1.3" fill="rgba(255,255,255,0.5)" />
    </svg>
  );
}
function RailIcon() {
  return (
    <svg width="28" height="20" viewBox="0 0 28 20" fill="none">
      <rect x="1" y="6" width="12" height="5" rx="2" transform="rotate(-13 1 6)" fill="#a78bfa" fillOpacity="0.85" />
      <rect x="15" y="11" width="12" height="5" rx="2" transform="rotate(13 15 11)" fill="#a78bfa" fillOpacity="0.85" />
    </svg>
  );
}
function PlatformIcon() {
  return (
    <svg width="28" height="20" viewBox="0 0 28 20" fill="none">
      <rect x="2" y="8" width="24" height="5" rx="2.5" fill="#6d28d9" fillOpacity="0.9" />
      <rect x="2" y="8" width="24" height="2" rx="1" fill="rgba(196,181,253,0.2)" />
    </svg>
  );
}
function URampIcon() {
  return (
    <svg width="28" height="20" viewBox="0 0 28 20" fill="none">
      <path d="M5 2 L5 13 Q14 19 23 13 L23 2" stroke="#c4b5fd" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    </svg>
  );
}
function PadIcon({ color, arrowDir }: { color: string; arrowDir: "left" | "right" | "up" }) {
  const arrowMap: Record<string, React.ReactElement> = {
    right: <polyline points="17,5 23,8 17,11" stroke="rgba(255,255,255,0.7)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />,
    left:  <polyline points="11,5 5,8 11,11"  stroke="rgba(255,255,255,0.7)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />,
    up:    <polyline points="9,9 14,3 19,9"   stroke="rgba(255,255,255,0.7)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />,
  };
  return (
    <svg width="28" height="20" viewBox="0 0 28 20" fill="none">
      <rect x="2" y="12" width="24" height="5" rx="2.5" fill={color} fillOpacity="0.9" />
      {arrowMap[arrowDir]}
    </svg>
  );
}

const PALETTE_ICONS = [
  <PegIcon key="peg" />,
  <RailIcon key="rail" />,
  <PlatformIcon key="platform" />,
  <URampIcon key="uramp" />,
  <PadIcon key="pad-left"  color="#b45309" arrowDir="left" />,
  <PadIcon key="pad-right" color="#16a34a" arrowDir="right" />,
  <PadIcon key="pad-up"    color="#be123c" arrowDir="up" />,
];

// ── Palette item templates ──────────────────────────────────────────────────
interface PaletteItem {
  kind: ObstacleDef["kind"];
  label: string;
  color: string;
  description: string;
  defaults: Partial<ObstacleDef>;
}

const PALETTE: PaletteItem[] = [
  {
    kind: "peg", label: "Peg", color: "#7c3aed", description: "Deflects marbles",
    defaults: { kind: "peg", r: 6 } as Partial<PegDef>,
  },
  {
    kind: "line", label: "Rail", color: "#2d4a6b", description: "Angled slide",
    defaults: { kind: "line", len: 100, angle: 0 } as Partial<LineDef>,
  },
  {
    kind: "platform", label: "Platform", color: "#1d4ed8", description: "Flat shelf",
    defaults: { kind: "platform", w: 100, angle: 0 } as Partial<PlatDef>,
  },
  {
    kind: "uramp", label: "U-Ramp", color: "#0891b2", description: "Catch + bounce",
    defaults: { kind: "uramp", w: 90, depth: 60 } as Partial<URampDef>,
  },
  {
    kind: "pad", label: "Launch ◀", color: PAD_COLOR.left, description: "Shoots left",
    defaults: { kind: "pad", w: 80, vx: -5, vy: -6, dir: "left", color: PAD_COLOR.left } as Partial<PadDef>,
  },
  {
    kind: "pad", label: "Launch ▶", color: PAD_COLOR.right, description: "Shoots right",
    defaults: { kind: "pad", w: 80, vx: 5, vy: -6, dir: "right", color: PAD_COLOR.right } as Partial<PadDef>,
  },
  {
    kind: "pad", label: "Boost ▲", color: PAD_COLOR.up, description: "Boosts up",
    defaults: { kind: "pad", w: 80, vx: 0, vy: -7, dir: "up", color: PAD_COLOR.up } as Partial<PadDef>,
  },
];

// ── Rendering helpers ───────────────────────────────────────────────────────
function drawObstacle(ctx: CanvasRenderingContext2D, obs: ObstacleDef, selected = false) {
  ctx.save();
  if (selected) {
    ctx.shadowBlur = 12;
    ctx.shadowColor = "#f59e0b";
  }

  switch (obs.kind) {
    case "peg": {
      ctx.beginPath();
      ctx.arc(obs.x, obs.y, obs.r + 3, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(124,58,237,0.2)"; ctx.fill();
      ctx.beginPath();
      ctx.arc(obs.x, obs.y, obs.r, 0, Math.PI * 2);
      ctx.fillStyle = "#7c3aed"; ctx.fill();
      ctx.beginPath();
      ctx.arc(obs.x - 1.5, obs.y - 1.5, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.fill();
      break;
    }
    case "line": {
      ctx.translate(obs.x, obs.y);
      ctx.rotate(obs.angle);
      ctx.beginPath();
      (ctx as any).roundRect?.(-obs.len / 2, -4, obs.len, 8, 4) ??
        ctx.rect(-obs.len / 2, -4, obs.len, 8);
      const rg = ctx.createLinearGradient(0, -4, 0, 4);
      rg.addColorStop(0, "#2d4a6b"); rg.addColorStop(1, "#1a2d3f");
      ctx.fillStyle = rg; ctx.fill();
      ctx.beginPath();
      ctx.rect(-obs.len / 2 + 4, -3, obs.len - 8, 2);
      ctx.fillStyle = "rgba(255,255,255,0.18)"; ctx.fill();
      break;
    }
    case "platform": {
      ctx.translate(obs.x, obs.y);
      ctx.rotate(obs.angle);
      ctx.beginPath();
      (ctx as any).roundRect?.(-obs.w / 2, -5, obs.w, 10, 4) ??
        ctx.rect(-obs.w / 2, -5, obs.w, 10);
      const pg = ctx.createLinearGradient(0, -5, 0, 5);
      pg.addColorStop(0, "#2563eb"); pg.addColorStop(1, "#1d4ed8");
      ctx.fillStyle = pg; ctx.fill();
      ctx.beginPath();
      ctx.rect(-obs.w / 2 + 4, -4, obs.w - 8, 2.5);
      ctx.fillStyle = "rgba(255,255,255,0.22)"; ctx.fill();
      break;
    }
    case "uramp": {
      const hw = obs.w / 2;
      // Left wall
      ctx.beginPath();
      ctx.rect(obs.cx - hw, obs.topY, 8, obs.depth + 10);
      ctx.fillStyle = "#0891b2"; ctx.fill();
      // Right wall
      ctx.beginPath();
      ctx.rect(obs.cx + hw - 8, obs.topY, 8, obs.depth + 10);
      ctx.fillStyle = "#0891b2"; ctx.fill();
      // Floor
      ctx.beginPath();
      ctx.rect(obs.cx - hw + 8, obs.topY + obs.depth, obs.w - 16, 8);
      ctx.fillStyle = "#0891b2"; ctx.fill();
      break;
    }
    case "pad": {
      ctx.beginPath();
      (ctx as any).roundRect?.(-obs.w / 2 + obs.x, obs.y - 5, obs.w, 10, 4) ??
        ctx.rect(-obs.w / 2 + obs.x, obs.y - 5, obs.w, 10);
      const lg = ctx.createLinearGradient(obs.x - obs.w / 2, 0, obs.x + obs.w / 2, 0);
      lg.addColorStop(0, obs.color + "88");
      lg.addColorStop(0.5, obs.color + "cc");
      lg.addColorStop(1, obs.color + "88");
      ctx.fillStyle = lg; ctx.fill();
      ctx.font = "bold 9px 'DM Sans',sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.textAlign = "center";
      ctx.fillText(
        obs.dir === "left" ? "◀◀ LAUNCH" : obs.dir === "right" ? "LAUNCH ▶▶" : "▲ BOOST",
        obs.x, obs.y + 3.5
      );
      ctx.textAlign = "left";
      break;
    }
  }
  ctx.restore();
}

function drawCanvas(
  canvas: HTMLCanvasElement,
  obstacles: ObstacleDef[],
  selectedIdx: number | null,
  dragging: { obs: ObstacleDef; x: number; y: number } | null,
  theme: BgTheme = THEMES[0]
) {
  const ctx = canvas.getContext("2d")!;
  const W = CANVAS_W, H = CANVAS_H;
  // Scale backing store → logical coords. Works for any DPR or thumbnail size.
  const eDpr = canvas.width / W;
  ctx.setTransform(eDpr, 0, 0, eDpr, 0, 0);
  ctx.clearRect(0, 0, W, H);

  // ── Themed background ─────────────────────────────────────────────────────
  ctx.fillStyle = theme.bg; ctx.fillRect(0, 0, W, H);
  theme.drawExtra(ctx, W, H);

  // ── Marble-sized grid ─────────────────────────────────────────────────────
  const CELL  = MARBLE_RADIUS * 2;
  const playX = WALL_THICK;
  const playW = W - WALL_THICK * 2;

  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.045)";
  ctx.lineWidth = 0.5;
  for (let x = playX; x <= playX + playW; x += CELL) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y <= H; y += CELL) {
    ctx.beginPath(); ctx.moveTo(playX, y); ctx.lineTo(playX + playW, y); ctx.stroke();
  }
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  for (let x = playX; x <= playX + playW; x += CELL * 5) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y <= H; y += CELL * 5) {
    ctx.beginPath(); ctx.moveTo(playX, y); ctx.lineTo(playX + playW, y); ctx.stroke();
  }
  ctx.restore();

  // Walls
  ctx.fillStyle = "#0d0d14";
  ctx.fillRect(0, 0, WALL_THICK, H);
  ctx.fillRect(W - WALL_THICK, 0, WALL_THICK, H);
  ctx.strokeStyle = "rgba(124,58,237,0.12)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(WALL_THICK, 0); ctx.lineTo(WALL_THICK, H); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W - WALL_THICK, 0); ctx.lineTo(W - WALL_THICK, H); ctx.stroke();

  // Finish line
  ctx.fillStyle = "#10b981cc";
  ctx.fillRect(WALL_THICK, H - 57, W - WALL_THICK * 2, 3);
  ctx.font = "bold 10px 'DM Sans',sans-serif";
  ctx.fillStyle = "#10b981bb"; ctx.textAlign = "right";
  ctx.fillText("FINISH", W - WALL_THICK - 5, H - 60);
  ctx.textAlign = "left";

  // Spawn zone indicator
  ctx.strokeStyle = "rgba(124,58,237,0.2)";
  ctx.setLineDash([5, 4]); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(WALL_THICK, 55); ctx.lineTo(W - WALL_THICK, 55); ctx.stroke();
  ctx.setLineDash([]);
  ctx.font = "10px 'DM Sans',sans-serif";
  ctx.fillStyle = "rgba(124,58,237,0.35)";
  ctx.fillText("SPAWN", WALL_THICK + 6, 48);

  // Obstacles
  obstacles.forEach((obs, i) => drawObstacle(ctx, obs, i === selectedIdx));

  // Ghost of dragging item
  if (dragging) drawObstacle(ctx, dragging.obs, false);
}

function hitTest(obs: ObstacleDef, x: number, y: number): boolean {
  switch (obs.kind) {
    case "peg":
      return Math.hypot(x - obs.x, y - obs.y) < obs.r + 10;
    case "line": {
      const dx = x - obs.x, dy = y - obs.y;
      const cos = Math.cos(-obs.angle), sin = Math.sin(-obs.angle);
      const lx = dx * cos - dy * sin, ly = dx * sin + dy * cos;
      return Math.abs(lx) < obs.len / 2 + 8 && Math.abs(ly) < 14;
    }
    case "platform": {
      const dx = x - obs.x, dy = y - obs.y;
      const cos = Math.cos(-obs.angle), sin = Math.sin(-obs.angle);
      const lx = dx * cos - dy * sin, ly = dx * sin + dy * cos;
      return Math.abs(lx) < obs.w / 2 + 8 && Math.abs(ly) < 14;
    }
    case "uramp":
      return x > obs.cx - obs.w / 2 - 8 && x < obs.cx + obs.w / 2 + 8 &&
             y > obs.topY - 8 && y < obs.topY + obs.depth + 18;
    case "pad":
      return Math.abs(x - obs.x) < obs.w / 2 + 8 && Math.abs(y - obs.y) < 14;
  }
}

function makeObstacle(kind: ObstacleDef["kind"], x: number, y: number, defaults: Partial<ObstacleDef>): ObstacleDef {
  switch (kind) {
    case "peg":      return { kind, x, y, r: (defaults as any).r ?? 6 };
    case "line":     return { kind, x, y, len: (defaults as any).len ?? 100, angle: 0 };
    case "platform": return { kind, x, y, w: (defaults as any).w ?? 100, angle: 0 };
    case "uramp":    return { kind, cx: x, topY: y, w: (defaults as any).w ?? 90, depth: (defaults as any).depth ?? 60 };
    case "pad": {
      const d = defaults as any;
      return { kind, x, y, w: d.w ?? 80, vx: d.vx ?? 0, vy: d.vy ?? -6, dir: d.dir ?? "up", color: d.color ?? PAD_COLOR.up };
    }
  }
}

function moveObstacle(obs: ObstacleDef, dx: number, dy: number): ObstacleDef {
  const o = { ...obs };
  if ("x" in o) (o as any).x += dx;
  if ("y" in o) (o as any).y += dy;
  if ("cx" in o) (o as any).cx += dx;
  if ("topY" in o) (o as any).topY += dy;
  return o as ObstacleDef;
}

// Snap to 10px grid
const SNAP = 10;
function snap(v: number) { return Math.round(v / SNAP) * SNAP; }

// ── Main editor component ───────────────────────────────────────────────────
export default function EditorPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const palLabels = [t.palPeg, t.palRail, t.palPlatform, t.palURamp, t.palLaunchLeft, t.palLaunchRight, t.palBoostUp];
  const palDescs  = [t.palPegDesc, t.palRailDesc, t.palPlatformDesc, t.palURampDesc, t.palLaunchLeftDesc, t.palLaunchRightDesc, t.palBoostUpDesc];
  const { saveMap, updateMap, customMaps, deleteMap, setActiveThemeId, activeThemeId } = useMapStore();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [canvasStyle, setCanvasStyle]       = useState<React.CSSProperties>({});
  const [canvasPhysSize, setCanvasPhysSize] = useState({ w: CANVAS_W, h: CANVAS_H });

  const [obstacles, setObstacles] = useState<ObstacleDef[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [mapName, setMapName] = useState("My Map");
  const [saved, setSaved] = useState(false);
  const [editingMapId, setEditingMapId] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<"editor" | "maps">("editor");

  const [stampItem, setStampItem] = useState<PaletteItem | null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const [bgTheme,   setBgTheme]   = useState<BgTheme>(() => getTheme(activeThemeId));

  // Drag state
  const dragRef = useRef<{
    kind: "move" | "palette";
    obsIdx?: number;
    paletteItem?: PaletteItem;
    startX: number; startY: number;
    lastX: number; lastY: number;
    ghost?: ObstacleDef;
  } | null>(null);
  const [ghostObs, setGhostObs] = useState<ObstacleDef | null>(null);

  // Scale canvas to fit wrapper
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    function recalc() {
      const dpr   = window.devicePixelRatio || 1;
      const scale = Math.min(wrapper!.clientWidth / CANVAS_W, wrapper!.clientHeight / CANVAS_H);
      const cssW  = Math.round(CANVAS_W * scale);
      const cssH  = Math.round(CANVAS_H * scale);
      setCanvasStyle({
        width:    cssW,
        height:   cssH,
        position: "absolute",
        top:      `${Math.round((wrapper!.clientHeight - cssH) / 2)}px`,
        left:     `${Math.round((wrapper!.clientWidth  - cssW) / 2)}px`,
      });
      setCanvasPhysSize({ w: Math.round(cssW * dpr), h: Math.round(cssH * dpr) });
    }
    recalc();
    const ro = new ResizeObserver(recalc);
    ro.observe(wrapper);
    return () => ro.disconnect();
  }, []);

  // Redraw whenever anything visual changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawCanvas(canvas, obstacles, selectedIdx, ghostObs ? { obs: ghostObs, x: 0, y: 0 } : null, bgTheme);
  }, [obstacles, selectedIdx, ghostObs, bgTheme, canvasPhysSize]);

  // Keyboard: Escape cancels stamp mode, Delete removes selected obstacle
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { setStampItem(null); setGhostObs(null); }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedIdx !== null) {
        setObstacles(prev => prev.filter((_, i) => i !== selectedIdx));
        setSelectedIdx(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedIdx]);

  // ── Convert screen coords → canvas coords ────────────────────────────────
  function toCanvas(e: { clientX: number; clientY: number }): { x: number; y: number } {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    return { x: e.clientX * scaleX - rect.left * scaleX, y: e.clientY * scaleY - rect.top * scaleY };
  }

  // ── Pointer handlers on the canvas ──────────────────────────────────────
  function onCanvasPointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    const { x, y } = toCanvas(e);

    // Stamp mode: place the active stamp item on every click
    if (stampItem) {
      // Still allow selecting/moving existing obstacles in stamp mode
      for (let i = obstacles.length - 1; i >= 0; i--) {
        if (hitTest(obstacles[i], x, y)) {
          setSelectedIdx(i);
          dragRef.current = { kind: "move", obsIdx: i, startX: x, startY: y, lastX: x, lastY: y };
          return;
        }
      }
      const obs = makeObstacle(stampItem.kind, snap(x), snap(y), stampItem.defaults);
      setObstacles(prev => { const n = [...prev, obs]; setSelectedIdx(n.length - 1); return n; });
      return;
    }

    // Normal mode: hit-test existing obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
      if (hitTest(obstacles[i], x, y)) {
        setSelectedIdx(i);
        dragRef.current = { kind: "move", obsIdx: i, startX: x, startY: y, lastX: x, lastY: y };
        return;
      }
    }
    setSelectedIdx(null);
  }

  function onCanvasPointerMove(e: React.PointerEvent) {
    const drag = dragRef.current;
    const { x, y } = toCanvas(e);

    // Stamp mode hover: show ghost without pressing
    if (!drag && stampItem) {
      setGhostObs(makeObstacle(stampItem.kind, snap(x), snap(y), stampItem.defaults));
      return;
    }

    if (!drag) return;

    if (drag.kind === "move" && drag.obsIdx !== undefined) {
      const dx = snap(x - drag.lastX), dy = snap(y - drag.lastY);
      if (dx !== 0 || dy !== 0) {
        setObstacles(prev => {
          const next = [...prev];
          next[drag.obsIdx!] = moveObstacle(next[drag.obsIdx!], dx, dy);
          return next;
        });
        drag.lastX = x; drag.lastY = y;
      }
    }

    if (drag.kind === "palette" && drag.paletteItem) {
      setGhostObs(makeObstacle(drag.paletteItem.kind, snap(x), snap(y), drag.paletteItem.defaults));
      drag.lastX = x; drag.lastY = y;
    }
  }

  function onCanvasPointerUp(e: React.PointerEvent) {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;
    if (drag.kind === "palette" && drag.paletteItem && ghostObs) {
      setObstacles(prev => { const n = [...prev, ghostObs]; setSelectedIdx(n.length - 1); return n; });
      setGhostObs(null);
    }
  }

  function onCanvasPointerLeave() {
    // Clear stamp ghost when mouse leaves canvas
    if (stampItem) setGhostObs(null);
  }

  // ── Palette item click → toggle stamp mode ──────────────────────────────
  function onPaletteClick(item: PaletteItem) {
    if (stampItem && stampItem.label === item.label) {
      setStampItem(null); setGhostObs(null);
    } else {
      setStampItem(item);
    }
  }

  // ── Drag FROM palette ────────────────────────────────────────────────────
  function onPalettePointerDown(e: React.PointerEvent, item: PaletteItem) {
    e.preventDefault();
    // Set up drag — pointer capture on window so we get events over the canvas
    dragRef.current = {
      kind: "palette",
      paletteItem: item,
      startX: e.clientX, startY: e.clientY,
      lastX: e.clientX, lastY: e.clientY,
    };
    // Forward to canvas move/up via window listeners
    function onMove(ev: PointerEvent) {
      const canvas = canvasRef.current;
      if (!canvas || !dragRef.current?.paletteItem) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_W / rect.width, scaleY = CANVAS_H / rect.height;
      const cx = ev.clientX * scaleX - rect.left * scaleX;
      const cy = ev.clientY * scaleY - rect.top * scaleY;
      const obs = makeObstacle(item.kind, snap(cx), snap(cy), item.defaults);
      setGhostObs(obs);
    }
    function onUp(ev: PointerEvent) {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      const canvas = canvasRef.current;
      if (!canvas || !dragRef.current?.paletteItem) { dragRef.current = null; return; }
      const rect = canvas.getBoundingClientRect();
      // Only place if dropped ON the canvas
      if (ev.clientX >= rect.left && ev.clientX <= rect.right &&
          ev.clientY >= rect.top  && ev.clientY <= rect.bottom) {
        const scaleX = CANVAS_W / rect.width, scaleY = CANVAS_H / rect.height;
        const cx = snap(ev.clientX * scaleX - rect.left * scaleX);
        const cy = snap(ev.clientY * scaleY - rect.top * scaleY);
        const obs = makeObstacle(item.kind, cx, cy, item.defaults);
        setObstacles(prev => {
          const next = [...prev, obs];
          setSelectedIdx(next.length - 1);
          return next;
        });
      }
      setGhostObs(null);
      dragRef.current = null;
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  // ── Selected obstacle controls ───────────────────────────────────────────
  function deleteSelected() {
    if (selectedIdx === null) return;
    setObstacles(prev => prev.filter((_, i) => i !== selectedIdx));
    setSelectedIdx(null);
  }

  function rotateSelected(delta: number) {
    if (selectedIdx === null) return;
    setObstacles(prev => {
      const next = [...prev];
      const obs = next[selectedIdx];
      if (obs.kind === "line" || obs.kind === "platform") {
        next[selectedIdx] = { ...obs, angle: obs.angle + delta } as ObstacleDef;
      }
      return next;
    });
  }

  function clearAll() {
    setObstacles([]);
    setSelectedIdx(null);
  }

  // ── Save map ─────────────────────────────────────────────────────────────
  function handleSave() {
    // Copy from the live canvas so the thumbnail always matches what the user sees,
    // regardless of any theme state timing issues.
    const src = canvasRef.current!;
    const thumb = document.createElement("canvas");
    thumb.width  = Math.round(CANVAS_W / 4);
    thumb.height = Math.round(CANVAS_H / 4);
    const tctx = thumb.getContext("2d")!;
    tctx.drawImage(src, 0, 0, src.width, src.height, 0, 0, thumb.width, thumb.height);
    const thumbnail = thumb.toDataURL("image/png");

    const mapData = { name: mapName.trim() || "My Map", obstacles, thumbnail };
    if (editingMapId) {
      updateMap(editingMapId, mapData);
    } else {
      const newId = saveMap(mapData);
      setEditingMapId(newId);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  // ── Load a saved map into the editor ────────────────────────────────────
  function loadMapForEdit(map: import("@/store/mapStore").CustomMap) {
    setObstacles(map.obstacles);
    setMapName(map.name);
    setSelectedIdx(null);
    setEditingMapId(map.id);
    setStampItem(null);
    setGhostObs(null);
    setActivePanel("editor");
  }

  // ── New map (clear editor) ───────────────────────────────────────────────
  function startNewMap() {
    setObstacles([]);
    setMapName("My Map");
    setSelectedIdx(null);
    setEditingMapId(null);
    setStampItem(null);
    setGhostObs(null);
  }

  // ── Selected obstacle property panel ─────────────────────────────────────
  const selectedObs = selectedIdx !== null ? obstacles[selectedIdx] : null;

  function updateSelected(patch: Partial<ObstacleDef>) {
    if (selectedIdx === null) return;
    setObstacles(prev => {
      const next = [...prev];
      next[selectedIdx] = { ...next[selectedIdx], ...patch } as ObstacleDef;
      return next;
    });
  }

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0f] overflow-hidden" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 flex-shrink-0"
        style={{ background: "rgba(10,10,15,0.97)", borderBottom: "1px solid rgba(124,58,237,0.15)" }}>
        <button onClick={() => router.push("/")}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          <ArrowLeft className="w-3.5 h-3.5" /> {t.back}
        </button>
        <h1 className="hidden md:block" style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 22, letterSpacing: "0.12em", color: "#c4b5fd" }}>
          {t.mapEditor}
        </h1>
        <div className="flex items-center gap-2">
          <LangToggle />
          {editingMapId && (
            <button onClick={startNewMap}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all active:scale-95"
              style={{
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                color: "#64748b", fontFamily: "'JetBrains Mono', monospace",
              }}>
              {t.newMapBtn}
            </button>
          )}
          <div className="flex flex-col items-end gap-0.5">
            <input
              value={mapName}
              onChange={e => setMapName(e.target.value)}
              placeholder={t.mapNamePlaceholder}
              style={{
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8, padding: "5px 10px", fontSize: 12, color: "#e2e8f0",
                width: 140, outline: "none",
              }}
            />
            {editingMapId && (
              <span style={{ fontSize: 9, color: "#7c3aed", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.08em" }}>
                {t.editingSavedMap}
              </span>
            )}
          </div>
          <button onClick={handleSave}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all active:scale-95"
            style={{
              background: saved ? "rgba(16,185,129,0.2)" : "rgba(124,58,237,0.2)",
              border: `1px solid ${saved ? "rgba(16,185,129,0.4)" : "rgba(124,58,237,0.4)"}`,
              color: saved ? "#10b981" : "#c4b5fd",
              fontFamily: "'JetBrains Mono', monospace",
            }}>
            <Save className="w-3.5 h-3.5" />
            {saved ? t.savedBtn : editingMapId ? t.updateBtn : t.saveBtn}
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Canvas area */}
        <div ref={wrapperRef} className="flex-1 relative overflow-hidden" style={{ background: "#06060c" }}>
          <canvas
            ref={canvasRef}
            width={canvasPhysSize.w}
            height={canvasPhysSize.h}
            style={{ ...canvasStyle, cursor: stampItem ? "cell" : "crosshair" }}
            onPointerDown={onCanvasPointerDown}
            onPointerMove={onCanvasPointerMove}
            onPointerUp={onCanvasPointerUp}
            onPointerLeave={onCanvasPointerLeave}
          />
          {/* Obstacle count */}
          <div className="absolute top-3 left-3 text-xs px-2 py-1 rounded"
            style={{ background: "rgba(0,0,0,0.6)", color: "#64748b", fontFamily: "'JetBrains Mono', monospace" }}>
            {t.obstaclesCount(obstacles.length)}
          </div>
          {/* Stamp mode banner */}
          {stampItem && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-1.5 rounded-full text-xs"
              style={{ background: "rgba(124,58,237,0.25)", border: "1px solid rgba(124,58,237,0.5)", color: "#c4b5fd", fontFamily: "'JetBrains Mono', monospace", whiteSpace: "nowrap" }}>
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: stampItem.color }} />
              {t.stampMode(stampItem.label.toUpperCase())}
            </div>
          )}
          {/* Controls hint */}
          <div className="absolute bottom-3 left-3 text-xs px-2 py-1 rounded"
            style={{ background: "rgba(0,0,0,0.6)", color: "#334155", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.6 }}>
            {t.controlsHint.split("\n")[0]}<br />
            {t.controlsHint.split("\n")[1]}
          </div>

          {/* Mobile delete FAB — shown when an obstacle is selected */}
          {selectedIdx !== null && (
            <button
              className="md:hidden absolute bottom-20 right-4 z-20 w-12 h-12 rounded-full flex items-center justify-center"
              onClick={deleteSelected}
              style={{
                background: "rgba(244,63,94,0.85)",
                border: "1px solid rgba(244,63,94,0.6)",
                boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
              }}
            >
              <Trash2 className="w-5 h-5 text-white" />
            </button>
          )}

          {/* Mobile panel toggle FAB */}
          <button
            className="md:hidden absolute bottom-4 right-4 z-20 w-12 h-12 rounded-full flex items-center justify-center"
            onClick={() => setShowPanel(v => !v)}
            style={{
              background: showPanel ? "rgba(124,58,237,0.9)" : "rgba(124,58,237,0.75)",
              border: "1px solid rgba(124,58,237,0.6)",
              boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
            }}
          >
            {showPanel
              ? <X className="w-5 h-5 text-white" />
              : <Layers className="w-5 h-5 text-white" />
            }
          </button>
        </div>

        {/* Mobile backdrop */}
        {showPanel && (
          <div
            className="md:hidden fixed inset-0 z-30 bg-black/60"
            onClick={() => setShowPanel(false)}
          />
        )}

        {/* Right panel — fixed overlay on mobile, inline on md+ */}
        <div className={[
          "flex-shrink-0 flex flex-col overflow-hidden",
          "fixed right-0 top-0 bottom-0 z-40 transition-transform duration-300",
          "md:relative md:top-auto md:right-auto md:bottom-auto md:z-auto md:translate-x-0",
          showPanel ? "translate-x-0" : "translate-x-full md:translate-x-0",
        ].join(" ")}
          style={{ width: 220, background: "rgba(10,10,15,0.98)", borderLeft: "1px solid rgba(124,58,237,0.15)" }}>

          {/* Panel collapse button — mobile only */}
          <div className="md:hidden flex justify-end px-3 pt-2.5 pb-1 flex-shrink-0">
            <button
              onClick={() => setShowPanel(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all active:scale-95"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#64748b",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              <X className="w-3 h-3" /> Collapse
            </button>
          </div>

          {/* Panel tabs */}
          <div className="flex border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            {(["editor", "maps"] as const).map(tab => (
              <button key={tab} onClick={() => setActivePanel(tab)}
                className="flex-1 py-2 text-xs transition-all"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: activePanel === tab ? "#c4b5fd" : "#374151",
                  background: activePanel === tab ? "rgba(124,58,237,0.1)" : "transparent",
                  borderBottom: activePanel === tab ? "1px solid #7c3aed" : "1px solid transparent",
                }}>
                {tab === "editor" ? t.paletteTab : t.mapsTab}
              </button>
            ))}
          </div>

          {activePanel === "editor" ? (
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">

              {/* Background theme picker */}
              <p className="text-xs" style={{ color: "#374151", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em" }}>
                {t.background}
              </p>
              <select
                value={bgTheme.id}
                onChange={e => {
                  const t = THEMES.find(th => th.id === e.target.value) ?? THEMES[0];
                  setBgTheme(t);
                  setActiveThemeId(t.id);
                }}
                className="w-full rounded-lg px-2 py-1.5 text-xs outline-none"
                style={{
                  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                  color: "#cbd5e1", cursor: "pointer",
                }}
              >
                {THEMES.map(t => (
                  <option key={t.id} value={t.id} style={{ background: "#0d0d16" }}>
                    {t.emoji}  {t.label}
                  </option>
                ))}
              </select>

              {/* Obstacle palette */}
              <p className="text-xs mt-1" style={{ color: "#374151", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em" }}>
                {t.obstaclesHeading}
              </p>
              {PALETTE.map((item, i) => {
                const isStamping = stampItem?.label === item.label;
                return (
                <div
                  key={i}
                  onClick={() => onPaletteClick(item)}
                  onPointerDown={e => onPalettePointerDown(e, item)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl select-none transition-all"
                  style={{
                    background: isStamping ? `${item.color}22` : "rgba(255,255,255,0.03)",
                    border: isStamping ? `1px solid ${item.color}88` : "1px solid rgba(255,255,255,0.06)",
                    cursor: "pointer",
                    userSelect: "none",
                    touchAction: "none",
                    boxShadow: isStamping ? `0 0 10px ${item.color}33` : "none",
                  }}
                >
                  <div className="flex-shrink-0 flex items-center justify-center" style={{ opacity: isStamping ? 1 : 0.75, filter: isStamping ? `drop-shadow(0 0 4px ${item.color}aa)` : "none" }}>
                    {PALETTE_ICONS[i]}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm" style={{ color: isStamping ? "#f1f5f9" : "#e2e8f0" }}>{palLabels[i]}</div>
                    <div className="text-xs" style={{ color: "#374151" }}>{palDescs[i]}</div>
                  </div>
                  {isStamping && (
                    <div className="text-xs px-1.5 py-0.5 rounded" style={{ background: `${item.color}33`, color: item.color, fontFamily: "'JetBrains Mono', monospace" }}>
                      {t.stampOn}
                    </div>
                  )}
                </div>
                );
              })}

              {/* Selected obstacle controls */}
              {selectedObs && (
                <div className="mt-3 pt-3 flex flex-col gap-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <p className="text-xs" style={{ color: "#374151", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em" }}>
                    {t.selectedKind(selectedObs.kind.toUpperCase())}
                  </p>

                  {/* Rotation for line / platform */}
                  {(selectedObs.kind === "line" || selectedObs.kind === "platform") && (
                    <div>
                      <div className="text-xs mb-1" style={{ color: "#475569" }}>{t.angle}</div>
                      <div className="flex gap-1">
                        {[-0.2, -0.05, 0, 0.05, 0.2].map(delta => (
                          <button key={delta} onClick={() => rotateSelected(delta)}
                            className="flex-1 py-1 rounded text-xs transition-all active:scale-95"
                            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8" }}>
                            {delta === 0 ? "0" : delta > 0 ? `+${delta}` : delta}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Delete */}
                  <button onClick={deleteSelected}
                    className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs transition-all active:scale-95"
                    style={{ background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.25)", color: "#f43f5e" }}>
                    <Trash2 className="w-3 h-3" /> {t.deleteObstacle}
                  </button>
                </div>
              )}

              {/* Clear all */}
              {obstacles.length > 0 && (
                <button onClick={clearAll}
                  className="mt-auto flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs transition-all active:scale-95"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "#475569" }}>
                  <RotateCcw className="w-3 h-3" /> {t.clearAll}
                </button>
              )}
            </div>
          ) : (
            /* Saved maps list */
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
              <p className="text-xs mb-1" style={{ color: "#374151", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em" }}>
                {t.savedMapsCount(customMaps.length)}
              </p>
              {customMaps.length === 0 && (
                <p className="text-xs text-center py-8" style={{ color: "#1e293b" }}>
                  {t.noSavedMaps.split("\n")[0]}<br />{t.noSavedMaps.split("\n")[1]}
                </p>
              )}
              {customMaps.map(map => {
                const isEditing = editingMapId === map.id;
                return (
                <div key={map.id} className="rounded-xl overflow-hidden"
                  style={{
                    background: isEditing ? "rgba(124,58,237,0.08)" : "rgba(255,255,255,0.03)",
                    border: isEditing ? "1px solid rgba(124,58,237,0.4)" : "1px solid rgba(255,255,255,0.06)",
                  }}>
                  {map.thumbnail && (
                    <img src={map.thumbnail} alt={map.name}
                      style={{ width: "100%", height: 80, objectFit: "cover", opacity: isEditing ? 1 : 0.7 }} />
                  )}
                  <div className="px-3 py-2 flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className="flex-1 text-sm truncate" style={{ color: isEditing ? "#c4b5fd" : "#cbd5e1" }}>
                        {map.name}
                      </span>
                      {isEditing && (
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{
                          background: "rgba(124,58,237,0.2)", color: "#a78bfa",
                          fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
                        }}>
                          {t.editingLabel}
                        </span>
                      )}
                      <button onClick={() => deleteMap(map.id)}
                        className="p-1 rounded transition-all hover:text-rose-400"
                        style={{ color: "#374151" }}>
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    {!isEditing && (
                      <button
                        onClick={() => loadMapForEdit(map)}
                        className="w-full py-1.5 rounded-lg text-xs transition-all active:scale-95"
                        style={{
                          background: "rgba(124,58,237,0.12)",
                          border: "1px solid rgba(124,58,237,0.3)",
                          color: "#a78bfa",
                          fontFamily: "'JetBrains Mono', monospace",
                          letterSpacing: "0.08em",
                        }}
                      >
                        {t.loadEdit}
                      </button>
                    )}
                  </div>
                </div>
                );
              })}
              <button onClick={() => router.push("/")}
                className="mt-2 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs transition-all active:scale-95"
                style={{
                  background: "linear-gradient(135deg,#7c3aed,#5b21b6)",
                  border: "1px solid rgba(124,58,237,0.5)",
                  color: "#f5f3ff",
                  fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: "0.1em",
                }}>
                <ChevronRight className="w-3.5 h-3.5" /> {t.goToSetup}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
