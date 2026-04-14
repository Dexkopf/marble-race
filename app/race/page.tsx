"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useRaceStore, Player } from "@/store/raceStore";
import { useLanguage } from "@/hooks/useLanguage";
import LangToggle from "@/components/LangToggle";
import { useMapStore } from "@/store/mapStore";
import { getTheme } from "@/lib/themes";
import { useGameEngine } from "@/hooks/useGameEngine";
import { useAudio } from "@/hooks/useAudio";
import { buildTrack, ObstacleDef } from "@/lib/trackBuilder";
import LiveSidebar from "@/components/LiveSidebar";
import WinnerModal from "@/components/WinnerModal";
import { ArrowLeft, Shuffle, Play, Volume2, VolumeX, Medal } from "lucide-react";

export const CANVAS_W = 520;
export const CANVAS_H = 925;


const WALL_THICK = 24;
const MARBLE_R   = 6;
const SPAWN_Y    = 36;

function baseSpawnXs(n: number): number[] {
  const sp = Math.min(48, (CANVAS_W - WALL_THICK * 2 - 20) / Math.max(n, 1));
  const sx = (CANVAS_W - sp * (n - 1)) / 2;
  return Array.from({ length: n }, (_, i) => sx + i * sp);
}

function randomOffsets(n: number): number[] {
  return Array.from({ length: n }, () => (Math.random() - 0.5) * 80);
}

function drawPreviewFrame(
  canvas: HTMLCanvasElement,
  players: Player[],
  offsets: number[],
  theme?: ReturnType<typeof getTheme>,
  obstacles?: ObstacleDef[] | null,
  finishLabel = "FINISH",
) {
  const ctx = canvas.getContext("2d")!;
  const W = CANVAS_W, H = CANVAS_H;

  const eDpr = canvas.width / W;
  ctx.setTransform(eDpr, 0, 0, eDpr, 0, 0);
  ctx.clearRect(0, 0, W, H);

  ctx.fillStyle = theme?.bg ?? "#0a0a0f";
  ctx.fillRect(0, 0, W, H);
  theme?.drawExtra(ctx, W, H);

  // Walls drawn first so obstacles and marbles render on top of them
  ctx.fillStyle = "#0d0d14";
  ctx.fillRect(0, 0, WALL_THICK, H);
  ctx.fillRect(W - WALL_THICK, 0, WALL_THICK, H);
  ctx.strokeStyle = "rgba(124,58,237,0.12)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(WALL_THICK, 0); ctx.lineTo(WALL_THICK, H); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W - WALL_THICK, 0); ctx.lineTo(W - WALL_THICK, H); ctx.stroke();

  ctx.strokeStyle = "rgba(124,58,237,0.2)";
  ctx.setLineDash([5, 4]);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(WALL_THICK + 4, SPAWN_Y + MARBLE_R + 14);
  ctx.lineTo(W - WALL_THICK - 4, SPAWN_Y + MARBLE_R + 14);
  ctx.stroke();
  ctx.setLineDash([]);

  const layout = buildTrack(W, H);
  const obs: ObstacleDef[] = obstacles ?? layout.obstacles;
  const finishY = H - 55;

  for (const def of obs) {
    switch (def.kind) {
      case "peg": {
        ctx.beginPath();
        ctx.arc(def.x, def.y, def.r + 3, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(124,58,237,0.18)";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(def.x, def.y, def.r, 0, Math.PI * 2);
        ctx.fillStyle   = "#7c3aed";
        ctx.shadowBlur  = 8;
        ctx.shadowColor = "#7c3aed";
        ctx.fill();
        ctx.shadowBlur  = 0;
        ctx.beginPath();
        ctx.arc(def.x - 1.2, def.y - 1.2, 1.4, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.fill();
        break;
      }
      case "line": {
        ctx.save();
        ctx.translate(def.x, def.y);
        ctx.rotate(def.angle);
        ctx.beginPath(); ctx.roundRect(-def.len / 2, -4, def.len, 10, 4);
        ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fill();
        ctx.beginPath(); ctx.roundRect(-def.len / 2, -4, def.len, 8, 4);
        const rg = ctx.createLinearGradient(0, -4, 0, 4);
        rg.addColorStop(0, "#2d4a6b"); rg.addColorStop(1, "#1a2d3f");
        ctx.fillStyle = rg; ctx.fill();
        ctx.beginPath(); ctx.roundRect(-def.len / 2 + 4, -3, def.len - 8, 2, 1);
        ctx.fillStyle = "rgba(255,255,255,0.2)"; ctx.fill();
        ctx.restore();
        break;
      }
      case "uramp": {
        const hw    = def.w / 2;
        const wallH = def.depth + 10;
        const ug    = (x: number, y: number, w: number, h: number) => {
          ctx.save();
          ctx.translate(x, y);
          ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 3);
          const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
          g.addColorStop(0, "#0e7490"); g.addColorStop(1, "#0891b2");
          ctx.fillStyle   = g;
          ctx.shadowBlur  = 7;
          ctx.shadowColor = "#06b6d4";
          ctx.fill();
          ctx.shadowBlur  = 0;
          ctx.restore();
        };
        ug(def.cx - hw + 4, def.topY + def.depth / 2, 8, wallH);
        ug(def.cx + hw - 4, def.topY + def.depth / 2, 8, wallH);
        ug(def.cx,          def.topY + def.depth,     def.w - 8, 8);
        break;
      }
      case "platform": {
        ctx.save();
        ctx.translate(def.x, def.y);
        ctx.rotate(def.angle);
        ctx.beginPath(); ctx.roundRect(-def.w / 2, -5, def.w, 10, 4);
        const pg = ctx.createLinearGradient(0, -5, 0, 5);
        pg.addColorStop(0, "#2563eb"); pg.addColorStop(1, "#1d4ed8");
        ctx.fillStyle = pg; ctx.fill();
        ctx.beginPath(); ctx.roundRect(-def.w / 2 + 4, -4, def.w - 8, 2.5, 1);
        ctx.fillStyle = "rgba(255,255,255,0.22)"; ctx.fill();
        ctx.restore();
        break;
      }
      case "pad": {
        ctx.save();
        ctx.translate(def.x, def.y);
        ctx.beginPath(); ctx.roundRect(-def.w / 2, -5, def.w, 10, 4);
        const lg = ctx.createLinearGradient(-def.w / 2, 0, def.w / 2, 0);
        lg.addColorStop(0,   def.color + "88");
        lg.addColorStop(0.5, def.color + "cc");
        lg.addColorStop(1,   def.color + "88");
        ctx.fillStyle = lg; ctx.fill();
        const arrow = def.dir === "left" ? "◄◄ LAUNCH" : def.dir === "right" ? "LAUNCH ►►" : "▲ BOOST ▲";
        ctx.font      = "bold 8px 'DM Sans', sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.65)";
        ctx.textAlign = "center";
        ctx.fillText(arrow, 0, 3.5);
        ctx.restore();
        break;
      }
    }
  }

  ctx.shadowBlur  = 14;
  ctx.shadowColor = "#10b981";
  ctx.fillStyle   = "#10b981cc";
  ctx.fillRect(0, finishY - 2, W, 3);
  ctx.shadowBlur  = 0;
  const tw = 10, th = 6;
  for (let tx = 0; tx < W; tx += tw) {
    for (let ty = 0; ty < 2; ty++) {
      ctx.fillStyle = (Math.floor(tx / tw) + ty) % 2 === 0
        ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.42)";
      ctx.fillRect(tx, finishY + 1 + ty * th, tw, th);
    }
  }
  ctx.font      = "bold 10px 'DM Sans', sans-serif";
  ctx.fillStyle = "#10b981bb";
  ctx.textAlign = "right";
  ctx.fillText(finishLabel, W - 5, finishY - 5);
  ctx.textAlign = "left";


  const bases = baseSpawnXs(players.length);
  players.forEach((player, i) => {
    const raw = bases[i] + (offsets[i] ?? 0);
    const x = Math.max(WALL_THICK + MARBLE_R + 2, Math.min(W - WALL_THICK - MARBLE_R - 2, raw));
    const y = SPAWN_Y;

    const aura = ctx.createRadialGradient(x, y, MARBLE_R, x, y, MARBLE_R + 3.5);
    aura.addColorStop(0, player.color + "55"); aura.addColorStop(1, "transparent");
    ctx.beginPath(); ctx.arc(x, y, MARBLE_R + 3.5, 0, Math.PI * 2);
    ctx.fillStyle = aura; ctx.fill();

    const grd = ctx.createRadialGradient(x - 1.75, y - 1.75, 0.25, x, y, MARBLE_R);
    grd.addColorStop(0, "rgba(255,255,255,0.88)");
    grd.addColorStop(0.28, player.color + "ee");
    grd.addColorStop(0.78, player.color);
    grd.addColorStop(1,   player.color + "88");
    ctx.beginPath(); ctx.arc(x, y, MARBLE_R, 0, Math.PI * 2);
    ctx.fillStyle = grd; ctx.shadowBlur = 10; ctx.shadowColor = player.color;
    ctx.fill(); ctx.shadowBlur = 0;

    ctx.beginPath(); ctx.arc(x - 1.75, y - 2, 1.75, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.46)"; ctx.fill();

    ctx.font = "500 7px 'DM Sans', sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.82)";
    ctx.textAlign = "center";
    ctx.fillText(player.name.split(" ")[0].slice(0, 8), x, y + MARBLE_R + 7);
  });
  ctx.textAlign = "left";
}

export default function RacePage() {
  const router = useRouter();
  const {
    players, raceStatus, rankings, winner, raceStartTime,
    setRaceStatus, updateProgress, finishPlayer, setWinner, initRankings,
  } = useRaceStore();

  const raceCanvasRef   = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef      = useRef<HTMLDivElement>(null);

  const audio = useAudio();
  const { t } = useLanguage();

  const [showModal, setShowModal]        = useState(false);
  const [showSidebar, setShowSidebar]    = useState(false);
  const [countdownDisplay, setCountdown] = useState<number | string>(3);
  const [canvasStyle, setCanvasStyle]    = useState<React.CSSProperties>({});
  const [canvasPhysSize, setCanvasPhysSize] = useState({ w: CANVAS_W, h: CANVAS_H });
  const [offsets, setOffsets]            = useState<number[]>([]);
  const [shuffling, setShuffling]        = useState(false);
  const [isMuted, setIsMuted]            = useState(false);   // safe SSR default
  const [volume, setVolume]              = useState(0.8);      // safe SSR default

  const { getSelectedObstacles, activeThemeId, hydrate } = useMapStore();
  useEffect(() => { hydrate(); }, []);

  // Hydrate audio state from localStorage after mount (avoids SSR/client mismatch)
  useEffect(() => {
    setIsMuted(audio.getMuted());
    setVolume(audio.getVolume());
  }, []);
  const customObstacles = getSelectedObstacles();
  const activeTheme = getTheme(activeThemeId);

  function toggleMute() {
    const next = !isMuted;
    audio.setMuted(next);
    setIsMuted(next);
    if (!next && raceStatus === "racing") audio.startMusic();
  }

  function handleVolumeChange(v: number) {
    setVolume(v);
    audio.setMusicVolume(v);
    if (isMuted && v > 0) { audio.setMuted(false); setIsMuted(false); }
  }

  useEffect(() => {
    if (players.length === 0) router.replace("/");
  }, [players]);

  useEffect(() => {
    if (players.length === 0) return;
    setOffsets(randomOffsets(players.length));
    initRankings();
    setRaceStatus("idle");
  }, []);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    function recalc() {
      const dpr   = window.devicePixelRatio || 1;
      const scale = Math.min(wrapper!.clientWidth / CANVAS_W, wrapper!.clientHeight / CANVAS_H);
      const cssW = Math.round(CANVAS_W * scale);
      const cssH = Math.round(CANVAS_H * scale);
      setCanvasStyle({
        width:    cssW,
        height:   cssH,
        position: "absolute",
        top:      `${Math.round((wrapper!.clientHeight - cssH) / 2)}px`,
        left:     `${Math.round((wrapper!.clientWidth  - cssW) / 2)}px`,
      });
      setCanvasPhysSize({
        w: Math.round(cssW * dpr),
        h: Math.round(cssH * dpr),
      });
    }
    recalc();
    const ro = new ResizeObserver(recalc);
    ro.observe(wrapper);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (raceStatus !== "idle" && raceStatus !== "countdown") return;
    const canvas = previewCanvasRef.current;
    if (!canvas || players.length === 0) return;
    drawPreviewFrame(canvas, players, offsets, activeTheme, customObstacles, t.finishLine);
  }, [offsets, players, raceStatus]);

  function handleShuffle() {
    setShuffling(true);
    setOffsets(randomOffsets(players.length));
    audio.triggerShuffle();
    setTimeout(() => setShuffling(false), 380);
  }

  function handleStart() {
    audio.resumeCtx();
    initRankings();
    setRaceStatus("countdown");
    let count = 3;
    setCountdown(count);
    audio.triggerCountdownBeep(count);

    const interval = setInterval(() => {
      count -= 1;
      if (count === 0) {
        setCountdown("GO!");
        audio.triggerCountdownBeep(0);
        setTimeout(() => {
          setRaceStatus("racing");
          audio.startMusic();
        }, 600);
        clearInterval(interval);
      } else {
        setCountdown(count);
        audio.triggerCountdownBeep(count);
      }
    }, 900);
  }

  const handleProgress = useCallback((id: string, p: number) => updateProgress(id, p), [updateProgress]);

  const endRace = useCallback(() => {
    setRaceStatus("finished");
    audio.stopMusic(400);
    setTimeout(() => setShowModal(true), 600);
  }, [setRaceStatus, audio]);

  const handleFinish = useCallback((id: string, rank: number) => {
    finishPlayer(id);
    audio.triggerFinish(rank);
    const updated = useRaceStore.getState().rankings;
    if (updated.length > 0 && updated.every(r => r.finishedAt)) {
      setTimeout(endRace, 900);
    }
  }, [finishPlayer, audio, endRace]);

  const handleWinner = useCallback((id: string) => {
    const player = players.find(p => p.id === id);
    if (!player) return;
    setWinner(player);
    audio.triggerWinner();
  }, [players, setWinner, audio]);
  const handleBounce   = useCallback(() => { audio.triggerBounce(); }, [audio]);
  const handlePadFire  = useCallback((dir: "left" | "right" | "up") => { audio.triggerPadFire(dir); }, [audio]);

  useGameEngine(
    raceCanvasRef, players,
    {
      onProgress: handleProgress,
      onFinish:   handleFinish,
      onWinner:   handleWinner,
      onBounce:   handleBounce,
      onPadFire:  handlePadFire,
    },
    raceStatus === "racing",
    offsets,
    customObstacles,
    activeTheme,
  );

  useEffect(() => {
    return () => { audio.stopMusic(300); };
  }, []);

  const isIdle      = raceStatus === "idle";
  const isCountdown = raceStatus === "countdown";
  const isPreRace   = isIdle || isCountdown;

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0f] overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ background: "rgba(10,10,15,0.95)", borderBottom: "1px solid rgba(124,58,237,0.15)" }}
      >
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-1.5 text-xs font-mono text-slate-600 hover:text-slate-400 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {t.setupBack}
        </button>
        <h1 className="hidden md:block font-display text-2xl tracking-widest" style={{ color: "#c4b5fd" }}>
          {t.marbleRace}
        </h1>
        <div className="flex items-center gap-3">
          <div className="text-xs font-mono text-slate-600">{t.marblesCount(players.length)}</div>
          <LangToggle />
          <button
            onClick={toggleMute}
            className="p-1.5 rounded-lg transition-all hover:bg-white/5 active:scale-95"
            style={{ color: isMuted ? "#374151" : "#7c3aed" }}
            title={isMuted ? t.unmute : t.mute}
          >
            {isMuted
              ? <VolumeX className="w-4 h-4" />
              : <Volume2 className="w-4 h-4" />
            }
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div ref={wrapperRef} className="flex-1 relative overflow-hidden" style={{ background: "#06060c" }}>

          {isPreRace && (
            <canvas
              ref={previewCanvasRef}
              width={canvasPhysSize.w}
              height={canvasPhysSize.h}
              style={{ ...canvasStyle, background: "#0a0a0f" }}
            />
          )}

          <canvas
            ref={raceCanvasRef}
            width={canvasPhysSize.w}
            height={canvasPhysSize.h}
            style={{
              ...canvasStyle,
              background: "#0a0a0f",
              opacity: isPreRace ? 0 : 1,
              pointerEvents: isPreRace ? "none" : "auto",
            }}
          />

          {isIdle && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-end pb-12 gap-4"
              style={{ zIndex: 10 }}
            >
              <p className="font-mono text-xs text-slate-600 uppercase tracking-widest mb-2">
                {t.startingPositions}
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleShuffle}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl font-mono text-xs tracking-widest uppercase transition-all active:scale-95 hover:scale-105"
                  style={{
                    background: "#5b21b6",
                    border: "1px solid rgba(124,58,237,0.6)",
                    color: "#f5f3ff",
                    boxShadow: "0 0 18px rgba(124,58,237,0.25)",
                  }}
                >
                  <Shuffle
                    className="w-3.5 h-3.5"
                    style={{
                      transition: "transform 0.38s cubic-bezier(0.34,1.56,0.64,1)",
                      transform: shuffling ? "rotate(180deg) scale(1.25)" : "rotate(0deg)",
                    }}
                  />
                  {t.shuffle}
                </button>
                <button
                  onClick={handleStart}
                  className="flex items-center gap-2 px-7 py-3 rounded-xl font-display text-2xl tracking-widest transition-all active:scale-95 hover:scale-[1.03]"
                  style={{
                    background: "linear-gradient(135deg, #7c3aed, #5b21b6)",
                    border: "1px solid rgba(124,58,237,0.5)",
                    color: "#f5f3ff",
                    boxShadow: "0 0 32px rgba(124,58,237,0.35)",
                    letterSpacing: "0.1em",
                  }}
                >
                  <Play className="w-5 h-5 fill-current" />
                  {t.startRace}
                </button>
              </div>
            </div>
          )}

          {isCountdown && (
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              style={{ background: "rgba(0,0,0,0.5)", zIndex: 10 }}
            >
              <div
                key={String(countdownDisplay)}
                className="countdown-number font-display"
                style={{
                  fontSize: "clamp(80px, 18vw, 150px)",
                  lineHeight: 1,
                  color: countdownDisplay === "GO!" ? "#10b981" : "#c4b5fd",
                  textShadow: countdownDisplay === "GO!"
                    ? "0 0 40px rgba(16,185,129,0.8)"
                    : "0 0 40px rgba(124,58,237,0.8)",
                }}
              >
                {countdownDisplay}
              </div>
            </div>
          )}

          {winner && raceStatus === "racing" && (
            <div
              className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-slide-up"
              style={{ zIndex: 10 }}
            >
              <div
                className="px-5 py-2 rounded-full font-mono text-sm flex items-center gap-2"
                style={{
                  background: "rgba(16,185,129,0.12)",
                  border: "1px solid rgba(16,185,129,0.4)",
                  color: "#10b981",
                  boxShadow: "0 0 20px rgba(16,185,129,0.15)",
                }}
              >
                {t.winsExclaim(winner.name)}
              </div>
              <button
                onClick={endRace}
                className="px-5 py-2 rounded-xl font-mono text-xs tracking-widest uppercase transition-all active:scale-95 hover:scale-105"
                style={{
                  background: "rgba(124,58,237,0.18)",
                  border: "1px solid rgba(124,58,237,0.45)",
                  color: "#c4b5fd",
                  boxShadow: "0 0 16px rgba(124,58,237,0.15)",
                }}
              >
                {t.endRace}
              </button>
            </div>
          )}

          {raceStatus === "finished" && !showModal && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none" style={{ zIndex: 5 }}>
              <div
                className="px-6 py-3 rounded-full font-mono text-sm text-emerald-400 animate-slide-up"
                style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)" }}
              >
                🏁 {t.raceComplete}
              </div>
            </div>
          )}
        </div>

        {/* Mobile backdrop */}
        {showSidebar && (
          <div
            className="md:hidden fixed inset-0 z-30 bg-black/60"
            onClick={() => setShowSidebar(false)}
          />
        )}

        {/* Rankings sidebar — fixed overlay on mobile, inline on md+ */}
        <div className={[
          "overflow-hidden flex-shrink-0",
          "fixed right-0 top-0 bottom-0 w-64 z-40 transition-transform duration-300",
          "md:relative md:top-auto md:right-auto md:bottom-auto md:w-52 md:z-auto md:translate-x-0",
          showSidebar ? "translate-x-0" : "translate-x-full md:translate-x-0",
        ].join(" ")}
          style={{ maxWidth: 220 }}
        >
          <LiveSidebar rankings={rankings} status={raceStatus} raceStartTime={raceStartTime} />
        </div>

        {/* Mobile rankings toggle FAB */}
        <button
          className="md:hidden fixed bottom-6 right-4 z-20 w-12 h-12 rounded-full flex items-center justify-center"
          onClick={() => setShowSidebar(v => !v)}
          style={{
            background: raceStatus === "racing" ? "rgba(16,185,129,0.85)" : "rgba(124,58,237,0.85)",
            border: "1px solid rgba(255,255,255,0.15)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
          }}
        >
          <Medal className="w-5 h-5 text-white" />
        </button>
      </div>
      {showModal && winner && (
        <WinnerModal winner={winner} onClose={() => setShowModal(false)} subtitle={t.winnerLabel} resultsLabel={t.results} watchLabel={t.watch} />
      )}
    </div>
  );
}
