"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useRaceStore, Player } from "@/store/raceStore";
import { useLanguage } from "@/hooks/useLanguage";
import LangToggle from "@/components/LangToggle";
import { useMapStore } from "@/store/mapStore";
import { useTournamentStore, RaceResult } from "@/store/tournamentStore";
import { getTheme } from "@/lib/themes";
import { useGameEngine } from "@/hooks/useGameEngine";
import { useAudio } from "@/hooks/useAudio";
import { buildTrack, ObstacleDef } from "@/lib/trackBuilder";
import LiveSidebar from "@/components/LiveSidebar";
import WinnerModal from "@/components/WinnerModal";
import { ArrowLeft, Shuffle, Play, Volume2, VolumeX, Trophy, Flag } from "lucide-react";

import { CANVAS_W, CANVAS_H } from "@/lib/constants";
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
) {
  const ctx = canvas.getContext("2d")!;
  const W = CANVAS_W, H = CANVAS_H;
  const eDpr = canvas.width / W;
  ctx.setTransform(eDpr, 0, 0, eDpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = theme?.bg ?? "#0a0a0f";
  ctx.fillRect(0, 0, W, H);
  theme?.drawExtra(ctx, W, H);
  ctx.fillStyle = "#0d0d14";
  ctx.fillRect(0, 0, WALL_THICK, H);
  ctx.fillRect(W - WALL_THICK, 0, WALL_THICK, H);
  const layout = buildTrack(W, H);
  const obs: ObstacleDef[] = obstacles ?? layout.obstacles;
  const finishY = H - 55;
  for (const def of obs) {
    switch (def.kind) {
      case "peg": {
        ctx.beginPath(); ctx.arc(def.x, def.y, def.r + 3, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(124,58,237,0.18)"; ctx.fill();
        ctx.beginPath(); ctx.arc(def.x, def.y, def.r, 0, Math.PI * 2);
        ctx.fillStyle = "#7c3aed"; ctx.shadowBlur = 8; ctx.shadowColor = "#7c3aed"; ctx.fill(); ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.arc(def.x - 1.2, def.y - 1.2, 1.4, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.55)"; ctx.fill();
        break;
      }
      case "line": {
        ctx.save(); ctx.translate(def.x, def.y); ctx.rotate(def.angle);
        ctx.beginPath(); ctx.roundRect(-def.len / 2, -4, def.len, 8, 4);
        const rg = ctx.createLinearGradient(0, -4, 0, 4);
        rg.addColorStop(0, "#2d4a6b"); rg.addColorStop(1, "#1a2d3f");
        ctx.fillStyle = rg; ctx.fill(); ctx.restore();
        break;
      }
      case "uramp": {
        const hw = def.w / 2;
        const wallH = def.depth + 10;
        const ug = (x: number, y: number, w: number, h: number) => {
          ctx.save(); ctx.translate(x, y);
          ctx.beginPath(); ctx.roundRect(-w/2, -h/2, w, h, 3);
          const g = ctx.createLinearGradient(-w/2, 0, w/2, 0);
          g.addColorStop(0, "#0e7490"); g.addColorStop(1, "#0891b2");
          ctx.fillStyle = g; ctx.shadowBlur = 7; ctx.shadowColor = "#06b6d4"; ctx.fill(); ctx.shadowBlur = 0; ctx.restore();
        };
        ug(def.cx - hw + 4, def.topY + def.depth / 2, 8, wallH);
        ug(def.cx + hw - 4, def.topY + def.depth / 2, 8, wallH);
        ug(def.cx, def.topY + def.depth, def.w - 8, 8);
        break;
      }
      case "platform": {
        ctx.save(); ctx.translate(def.x, def.y); ctx.rotate(def.angle);
        ctx.beginPath(); ctx.roundRect(-def.w/2, -5, def.w, 10, 4);
        const pg = ctx.createLinearGradient(0, -5, 0, 5);
        pg.addColorStop(0, "#2563eb"); pg.addColorStop(1, "#1d4ed8");
        ctx.fillStyle = pg; ctx.fill(); ctx.restore();
        break;
      }
      case "pad": {
        ctx.save(); ctx.translate(def.x, def.y);
        ctx.beginPath(); ctx.roundRect(-def.w/2, -5, def.w, 10, 4);
        const lg = ctx.createLinearGradient(-def.w/2, 0, def.w/2, 0);
        lg.addColorStop(0, def.color + "88"); lg.addColorStop(0.5, def.color + "cc"); lg.addColorStop(1, def.color + "88");
        ctx.fillStyle = lg; ctx.fill();
        const arrow = def.dir === "left" ? "LAUNCH" : def.dir === "right" ? "LAUNCH" : "BOOST";
        ctx.font = "bold 8px sans-serif"; ctx.fillStyle = "rgba(255,255,255,0.65)"; ctx.textAlign = "center";
        ctx.fillText(arrow, 0, 3.5); ctx.restore();
        break;
      }
    }
  }
  ctx.shadowBlur = 14; ctx.shadowColor = "#10b981"; ctx.fillStyle = "#10b981cc";
  ctx.fillRect(0, finishY - 2, W, 3); ctx.shadowBlur = 0;
  const tw = 10, th = 6;
  for (let tx = 0; tx < W; tx += tw)
    for (let ty = 0; ty < 2; ty++) {
      ctx.fillStyle = (Math.floor(tx/tw)+ty)%2===0 ? "rgba(255,255,255,0.55)":"rgba(0,0,0,0.42)";
      ctx.fillRect(tx, finishY+1+ty*th, tw, th);
    }
  const bases = baseSpawnXs(players.length);
  players.forEach((player, i) => {
    const raw = bases[i] + (offsets[i] ?? 0);
    const x = Math.max(WALL_THICK + MARBLE_R + 2, Math.min(W - WALL_THICK - MARBLE_R - 2, raw));
    const y = SPAWN_Y;
    const grd = ctx.createRadialGradient(x-1.75, y-1.75, 0.25, x, y, MARBLE_R);
    grd.addColorStop(0, "rgba(255,255,255,0.88)"); grd.addColorStop(0.28, player.color+"ee");
    grd.addColorStop(0.78, player.color); grd.addColorStop(1, player.color+"88");
    ctx.beginPath(); ctx.arc(x, y, MARBLE_R, 0, Math.PI * 2);
    ctx.fillStyle = grd; ctx.shadowBlur = 10; ctx.shadowColor = player.color; ctx.fill(); ctx.shadowBlur = 0;
    ctx.font = "500 7px sans-serif"; ctx.fillStyle = "rgba(255,255,255,0.82)"; ctx.textAlign = "center";
    ctx.fillText(player.name.split(" ")[0].slice(0, 8), x, y + MARBLE_R + 7);
  });
  ctx.textAlign = "left";
}

export default function TournamentRacePage() {
  const router = useRouter();
  const {
    players, raceStatus, rankings, winner, raceStartTime,
    setRaceStatus, updateProgress, finishPlayer, setWinner, initRankings, reorderPlayers,
  } = useRaceStore();
  const { tPlayers, mapIds, currentRaceIndex, phase, recordRace } = useTournamentStore();
  const { t } = useLanguage();
  const { getSelectedObstacles, activeThemeId, hydrate, selectMap } = useMapStore();

  useEffect(() => { hydrate(); }, []);

  const raceCanvasRef    = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef       = useRef<HTMLDivElement>(null);
  const audio = useAudio();

  const [showModal, setShowModal]        = useState(false);
  const [countdownDisplay, setCountdown] = useState<number | string>(3);
  const [canvasStyle, setCanvasStyle]    = useState<React.CSSProperties>({});
  const [canvasPhysSize, setCanvasPhysSize] = useState({ w: CANVAS_W, h: CANVAS_H });
  const [offsets, setOffsets]            = useState<number[]>([]);
  const [shuffling, setShuffling]        = useState(false);
  const [isMuted, setIsMuted]            = useState(false);
  const [volume, setVolume]              = useState(0.8);

  // Guard: redirect if tournament not active
  useEffect(() => {
    if (phase === "idle") { router.replace("/tournament"); return; }
    // Sync tournament players into raceStore
    reorderPlayers(tPlayers.map(tp => ({ id: tp.id, name: tp.name, color: tp.color, emoji: tp.emoji })));
    // Sync current map
    const mapId = useTournamentStore.getState().currentMapId();
    if (mapId) selectMap(mapId);
  }, []);

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

  useEffect(() => {
    if (tPlayers.length === 0) return;
    setOffsets(randomOffsets(tPlayers.length));
    initRankings();
    setRaceStatus("idle");
  }, []);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    function recalc() {
      const dpr = window.devicePixelRatio || 1;
      const scale = Math.min(wrapper!.clientWidth / CANVAS_W, wrapper!.clientHeight / CANVAS_H);
      const cssW = Math.round(CANVAS_W * scale), cssH = Math.round(CANVAS_H * scale);
      setCanvasStyle({ width: cssW, height: cssH, position: "absolute",
        top: `${Math.round((wrapper!.clientHeight - cssH) / 2)}px`,
        left: `${Math.round((wrapper!.clientWidth - cssW) / 2)}px` });
      setCanvasPhysSize({ w: Math.round(cssW * dpr), h: Math.round(cssH * dpr) });
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
    drawPreviewFrame(canvas, players, offsets, activeTheme, customObstacles);
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
        setTimeout(() => { setRaceStatus("racing"); audio.startMusic(); }, 600);
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
    // Record results in tournament store
    const { rankings: r, raceStartTime: rst } = useRaceStore.getState();
    const resultsByPlayerId: Record<string, RaceResult> = {};
    r.forEach(rp => {
      resultsByPlayerId[rp.id] = {
        rank: rp.rank,
        time: rp.finishedAt && rst ? rp.finishedAt - rst : null,
      };
    });
    useTournamentStore.getState().recordRace(resultsByPlayerId);
    setTimeout(() => setShowModal(true), 600);
  }, [setRaceStatus, audio]);

  const handleFinish = useCallback((id: string, rank: number) => {
    finishPlayer(id);
    audio.triggerFinish(rank);
    const updated = useRaceStore.getState().rankings;
    if (updated.length > 0 && updated.every(rp => rp.finishedAt)) {
      setTimeout(endRace, 900);
    }
  }, [finishPlayer, audio, endRace]);

  const handleWinner = useCallback((id: string) => {
    const player = players.find(p => p.id === id);
    if (!player) return;
    setWinner(player);
    audio.triggerWinner();
  }, [players, setWinner, audio]);

  const handleBounce  = useCallback(() => audio.triggerBounce(), [audio]);
  const handlePadFire = useCallback((dir: "left"|"right"|"up") => audio.triggerPadFire(dir), [audio]);

  useGameEngine(raceCanvasRef, players,
    { onProgress: handleProgress, onFinish: handleFinish, onWinner: handleWinner, onBounce: handleBounce, onPadFire: handlePadFire },
    raceStatus === "racing", offsets, customObstacles, activeTheme);

  useEffect(() => () => { audio.stopMusic(300); }, []);

  const mapName = mapIds[currentRaceIndex] === "default"
    ? "Classic"
    : (useMapStore.getState().customMaps.find(m => m.id === mapIds[currentRaceIndex])?.name ?? "Map");

  const isIdle      = raceStatus === "idle";
  const isCountdown = raceStatus === "countdown";
  const isPreRace   = isIdle || isCountdown;

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0f] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ background: "rgba(10,10,15,0.95)", borderBottom: "1px solid rgba(251,191,36,0.15)" }}>
        <button onClick={() => router.push("/tournament/standings")}
          className="flex items-center gap-1.5 text-xs font-mono text-slate-600 hover:text-slate-400 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> {t.standingsBack}
        </button>
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2">
            <Trophy className="w-3.5 h-3.5" style={{ color: "#fbbf24" }} />
            <span className="font-display text-lg tracking-widest" style={{ color: "#fbbf24" }}>{t.tournament}</span>
          </div>
          <span className="text-xs font-mono text-slate-500">
            {t.raceOf(currentRaceIndex + 1, mapIds.length, mapName)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-600">{t.marblesCount(players.length).toLowerCase()}</span>
          <button onClick={toggleMute}
            className="p-1.5 rounded-lg transition-all hover:bg-white/5 active:scale-95"
            style={{ color: isMuted ? "#374151" : "#7c3aed" }}>
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Race progress pills */}
      <div className="flex items-center justify-center gap-2 px-4 py-2 flex-shrink-0"
        style={{ background: "rgba(10,10,15,0.8)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        {mapIds.map((_, i) => (
          <div key={i} className="h-1.5 rounded-full transition-all"
            style={{
              width: i === currentRaceIndex ? "32px" : "12px",
              background: i < currentRaceIndex ? "#fbbf24" : i === currentRaceIndex ? "#f59e0b" : "rgba(255,255,255,0.1)",
            }} />
        ))}
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div ref={wrapperRef} className="flex-1 relative overflow-hidden" style={{ background: "#06060c" }}>
          {isPreRace && (
            <canvas ref={previewCanvasRef} width={canvasPhysSize.w} height={canvasPhysSize.h}
              style={{ ...canvasStyle, background: "#0a0a0f" }} />
          )}
          <canvas ref={raceCanvasRef} width={canvasPhysSize.w} height={canvasPhysSize.h}
            style={{ ...canvasStyle, background: "#0a0a0f", opacity: isPreRace ? 0 : 1, pointerEvents: isPreRace ? "none" : "auto" }} />

          {isIdle && (
            <div className="absolute inset-0 flex flex-col items-center justify-end pb-12 gap-4" style={{ zIndex: 10 }}>
              <p className="font-mono text-xs text-slate-600 uppercase tracking-widest mb-2">{t.startingPositions}</p>
              <div className="flex items-center gap-3">
            <LangToggle />
                <button onClick={handleShuffle}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl font-mono text-xs tracking-widest uppercase transition-all active:scale-95 hover:scale-105"
                  style={{ background: "rgba(124,58,237,0.14)", border: "1px solid rgba(124,58,237,0.4)", color: "#c4b5fd" }}>
                  <span style={{ transition: "transform 0.38s", display: "inline-block", transform: shuffling ? "rotate(180deg)" : "none" }}>
                    &#8635;
                  </span>
                  {t.shuffle}
                </button>
                <button onClick={handleStart}
                  className="flex items-center gap-2 px-7 py-3 rounded-xl font-display text-2xl tracking-widest transition-all active:scale-95 hover:scale-[1.03]"
                  style={{ background: "linear-gradient(135deg, #b45309, #92400e)", border: "1px solid rgba(251,191,36,0.5)", color: "#fef3c7", boxShadow: "0 0 32px rgba(251,191,36,0.25)" }}>
                  <Play className="w-5 h-5 fill-current" />
                  {t.startRaceN(currentRaceIndex + 1)}
                </button>
              </div>
            </div>
          )}

          {isCountdown && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none"
              style={{ background: "rgba(0,0,0,0.5)", zIndex: 10 }}>
              <div key={String(countdownDisplay)} className="countdown-number font-display"
                style={{ fontSize: "clamp(80px, 18vw, 150px)", lineHeight: 1,
                  color: countdownDisplay === "GO!" ? "#10b981" : "#fbbf24",
                  textShadow: countdownDisplay === "GO!" ? "0 0 40px rgba(16,185,129,0.8)" : "0 0 40px rgba(251,191,36,0.8)" }}>
                {countdownDisplay}
              </div>
            </div>
          )}

          {winner && raceStatus === "racing" && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-slide-up" style={{ zIndex: 10 }}>
              <div className="px-5 py-2 rounded-full font-mono text-sm flex items-center gap-2"
                style={{ background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.4)", color: "#fbbf24" }}>
                {t.raceNWins(currentRaceIndex + 1, winner.name)}
              </div>
              <button onClick={endRace}
                className="px-5 py-2 rounded-xl font-mono text-xs tracking-widest uppercase transition-all active:scale-95 hover:scale-105"
                style={{ background: "rgba(124,58,237,0.18)", border: "1px solid rgba(124,58,237,0.45)", color: "#c4b5fd" }}>
                {t.endRace}
              </button>
            </div>
          )}

          {raceStatus === "finished" && !showModal && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none" style={{ zIndex: 5 }}>
              <div className="px-6 py-3 rounded-full font-mono text-sm text-amber-400 animate-slide-up"
                style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)" }}>
                {t.raceNComplete(currentRaceIndex + 1)}
              </div>
            </div>
          )}
        </div>

        <div className="w-52 flex-shrink-0 overflow-hidden" style={{ minWidth: "200px", maxWidth: "220px" }}>
          <LiveSidebar rankings={rankings} status={raceStatus} raceStartTime={raceStartTime} />
        </div>
      </div>

      {showModal && winner && (
        <WinnerModal
          winner={winner}
          onClose={() => { setShowModal(false); router.push("/tournament/standings"); }}
          resultsPath="/tournament/standings"
          resultsLabel={t.standingsBack}
          watchLabel={t.watch}
          subtitle={t.raceNWinner(currentRaceIndex + 1)}
        />
      )}
    </div>
  );
}
