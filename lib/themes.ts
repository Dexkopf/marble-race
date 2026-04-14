import { WALL_THICK } from "./trackBuilder";

export interface BgTheme {
  id: string;
  label: string;
  emoji: string;
  bg: string;
  drawExtra: (ctx: CanvasRenderingContext2D, W: number, H: number) => void;
}

export const THEMES: BgTheme[] = [
  {
    id: "default", label: "Default", emoji: "🌑", bg: "#0a0a0f",
    drawExtra: (ctx, W, H) => {
      ctx.fillStyle = "rgba(255,255,255,0.013)";
      for (let x = 0; x < W; x += 26) for (let y = 0; y < H; y += 26) {
        ctx.beginPath(); ctx.arc(x, y, 0.7, 0, Math.PI * 2); ctx.fill();
      }
    },
  },
  {
    id: "winter", label: "Winter", emoji: "❄️", bg: "#091522",
    drawExtra: (ctx, W, H) => {
      ctx.fillStyle = "rgba(186,230,253,0.07)";
      for (let x = 0; x < W; x += 26) for (let y = 0; y < H; y += 26) {
        ctx.beginPath(); ctx.arc(x, y, 0.7, 0, Math.PI * 2); ctx.fill();
      }
      for (let i = 0; i < 50; i++) {
        const sx = ((i * 137.508) % 1) * W, sy = ((i * 97.31) % 1) * H;
        const r  = 1 + ((i * 53) % 3);
        ctx.fillStyle = `rgba(186,230,253,${0.10 + (i % 4) * 0.04})`;
        ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.lineWidth = 0.6;
      for (let i = 0; i < 18; i++) {
        const y = ((i * 173.1) % 1) * H, x0 = ((i * 83.7) % 1) * W;
        const len = 20 + ((i * 47) % 80);
        ctx.strokeStyle = `rgba(147,197,253,${0.04 + (i % 3) * 0.02})`;
        ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + len, y); ctx.stroke();
      }
    },
  },
  {
    id: "forest", label: "Forest", emoji: "🌲", bg: "#061006",
    drawExtra: (ctx, W, H) => {
      ctx.fillStyle = "rgba(134,239,172,0.05)";
      for (let x = 0; x < W; x += 26) for (let y = 0; y < H; y += 26) {
        ctx.beginPath(); ctx.arc(x, y, 0.7, 0, Math.PI * 2); ctx.fill();
      }
      for (let i = 0; i < 9; i++) {
        const tx = WALL_THICK + 10 + ((i * 137.5) % (W - WALL_THICK * 2 - 20));
        ctx.strokeStyle = `rgba(34,197,94,${0.04 + (i % 3) * 0.02})`;
        ctx.lineWidth = 3 + (i % 4);
        ctx.beginPath(); ctx.moveTo(tx, H * 0.25); ctx.lineTo(tx, H); ctx.stroke();
      }
      for (let i = 0; i < 55; i++) {
        const lx = ((i * 97.3) % 1) * W, ly = ((i * 53.7) % 1) * H;
        ctx.fillStyle = `rgba(74,222,128,${0.05 + (i % 3) * 0.02})`;
        ctx.beginPath(); ctx.arc(lx, ly, 1.5, 0, Math.PI * 2); ctx.fill();
      }
    },
  },
  {
    id: "scifi", label: "Sci-Fi", emoji: "🚀", bg: "#030812",
    drawExtra: (ctx, W, H) => {
      ctx.lineWidth = 0.5;
      for (let x = WALL_THICK; x <= W - WALL_THICK; x += 40) {
        ctx.strokeStyle = "rgba(34,211,238,0.06)";
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = 0; y <= H; y += 40) {
        ctx.strokeStyle = "rgba(34,211,238,0.06)";
        ctx.beginPath(); ctx.moveTo(WALL_THICK, y); ctx.lineTo(W - WALL_THICK, y); ctx.stroke();
      }
      ctx.fillStyle = "rgba(34,211,238,0.15)";
      for (let x = WALL_THICK; x <= W - WALL_THICK; x += 40)
        for (let y = 0; y <= H; y += 40) {
          ctx.beginPath(); ctx.arc(x, y, 1, 0, Math.PI * 2); ctx.fill();
        }
      ctx.fillStyle = "rgba(0,0,0,0.07)";
      for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1.5);
    },
  },
  {
    id: "volcano", label: "Volcano", emoji: "🌋", bg: "#150400",
    drawExtra: (ctx, W, H) => {
      ctx.fillStyle = "rgba(251,146,60,0.05)";
      for (let x = 0; x < W; x += 26) for (let y = 0; y < H; y += 26) {
        ctx.beginPath(); ctx.arc(x, y, 0.8, 0, Math.PI * 2); ctx.fill();
      }
      for (let i = 0; i < 7; i++) {
        const x0 = WALL_THICK + ((i * 137.5) % (W - WALL_THICK * 2));
        const y0 = H * 0.3 + ((i * 97.3) % 1) * H * 0.4;
        ctx.strokeStyle = `rgba(234,88,12,${0.06 + (i % 2) * 0.04})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x0 + (i % 2 ? 25 : -25), y0 + 70);
        ctx.lineTo(x0 + (i % 2 ? 10 : -10), y0 + 130);
        ctx.stroke();
      }
      const g = ctx.createLinearGradient(0, H * 0.82, 0, H);
      g.addColorStop(0, "rgba(234,88,12,0)"); g.addColorStop(1, "rgba(234,88,12,0.10)");
      ctx.fillStyle = g; ctx.fillRect(0, H * 0.82, W, H * 0.18);
    },
  },
  {
    id: "ocean", label: "Ocean", emoji: "🌊", bg: "#020e18",
    drawExtra: (ctx, W, H) => {
      ctx.fillStyle = "rgba(56,189,248,0.05)";
      for (let x = 0; x < W; x += 26) for (let y = 0; y < H; y += 26) {
        ctx.beginPath(); ctx.arc(x, y, 0.7, 0, Math.PI * 2); ctx.fill();
      }
      for (let wi = 0; wi < 14; wi++) {
        const wy   = (wi / 14) * H;
        const amp  = 3 + (wi % 4) * 2;
        const freq = 0.018 + (wi % 5) * 0.004;
        const ph   = (wi * 137.5) % (Math.PI * 2);
        ctx.strokeStyle = `rgba(56,189,248,${0.035 + (wi % 3) * 0.015})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        for (let wx = WALL_THICK; wx <= W - WALL_THICK; wx += 3) {
          const y = wy + Math.sin(wx * freq + ph) * amp;
          wx === WALL_THICK ? ctx.moveTo(wx, y) : ctx.lineTo(wx, y);
        }
        ctx.stroke();
      }
    },
  },
  {
    id: "neoncity", label: "Neon City", emoji: "🌃", bg: "#070310",
    drawExtra: (ctx, W, H) => {
      const bldgs: number[][] = [
        [0,.60,.07],[.05,.50,.05],[.10,.65,.06],[.15,.44,.08],[.22,.55,.07],
        [.28,.70,.05],[.32,.47,.09],[.40,.58,.06],[.46,.42,.08],[.52,.62,.07],
        [.58,.50,.05],[.62,.68,.06],[.67,.44,.09],[.75,.57,.07],[.80,.47,.06],
        [.85,.64,.08],[.90,.51,.07],[.95,.60,.05],
      ];
      ctx.fillStyle = "rgba(124,58,237,0.07)";
      for (const [xr, yr, wr] of bldgs)
        ctx.fillRect(xr * W, H - (1 - yr) * H, wr * W, (1 - yr) * H);
      const nc = ["rgba(236,72,153,0.13)","rgba(34,211,238,0.11)","rgba(167,139,250,0.11)"];
      for (let i = 0; i < 65; i++) {
        const dx = ((i * 137.5) % 1) * W, dy = ((i * 97.3) % 1) * H;
        ctx.fillStyle = nc[i % nc.length];
        ctx.beginPath(); ctx.arc(dx, dy, 0.9, 0, Math.PI * 2); ctx.fill();
      }
    },
  },
];

export function getTheme(id: string): BgTheme {
  return THEMES.find(t => t.id === id) ?? THEMES[0];
}
