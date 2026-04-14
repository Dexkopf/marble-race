"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTournamentStore, computeStandings } from "@/store/tournamentStore";
import { useMapStore, DEFAULT_MAP_ID } from "@/store/mapStore";
import { Trophy, RotateCcw, Home, Medal } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import LangToggle from "@/components/LangToggle";

function fmtTime(ms: number): string {
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(2)}s`;
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toFixed(2).padStart(5, "0")}`;
}

const PODIUM_HEIGHTS = ["h-28", "h-40", "h-20"];
const PODIUM_ORDER   = [1, 0, 2];
const PODIUM_COLORS  = ["#94a3b8", "#f59e0b", "#a16207"];
const RANK_LABELS    = ["1ST", "2ND", "3RD"];

export default function TournamentResultsPage() {
  const router = useRouter();
  const { tPlayers, mapIds, phase, reset } = useTournamentStore();
  const { t } = useLanguage();
  const { customMaps, hydrate } = useMapStore();
  const confettiFired = useRef(false);
  useEffect(() => { hydrate(); }, []);

  useEffect(() => {
    if (phase === "idle") router.replace("/tournament");
  }, [phase]);

  useEffect(() => {
    if (confettiFired.current) return;
    confettiFired.current = true;
    async function boom() {
      const confetti = (await import("canvas-confetti")).default;
      const colors = ["#f59e0b", "#fbbf24", "#ffffff", "#7c3aed"];
      confetti({ particleCount: 140, spread: 90, origin: { x: 0.5, y: 0.4 }, colors, disableForReducedMotion: true });
      setTimeout(() => {
        confetti({ particleCount: 70, angle: 60, spread: 55, origin: { x: 0 }, colors });
        confetti({ particleCount: 70, angle: 120, spread: 55, origin: { x: 1 }, colors });
      }, 350);
    }
    boom();
  }, []);

  const standings = computeStandings(tPlayers);
  const top3 = standings.slice(0, 3);
  const champion = standings[0];

  function getMapName(id: string): string {
    if (id === DEFAULT_MAP_ID) return "Classic";
    return customMaps.find(m => m.id === id)?.name ?? "Map";
  }

  function handlePlayAgain() {
    reset();
    router.push("/");
  }

  function handleNewTournament() {
    reset();
    router.push("/tournament");
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-12 relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-64 bg-amber-900/15 blur-3xl" />
        <div className="absolute inset-0 opacity-15"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)", backgroundSize: "28px 28px" }} />
      </div>

      {/* Header */}
      <div className="fixed top-4 right-4 z-50"><LangToggle /></div>
      <div className="text-center mb-8 animate-slide-down">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Trophy className="text-amber-400 w-6 h-6" />
          <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">{t.tournamentChampionLabel}</span>
          <Trophy className="text-amber-400 w-6 h-6" />
        </div>
        <h1 className="font-display text-6xl md:text-7xl tracking-wider"
          style={{ color: "#fbbf24", textShadow: "0 0 50px rgba(251,191,36,0.5)" }}>
          {t.champion}
        </h1>
        {champion && (
          <p className="font-body text-slate-400 mt-2 text-lg">
            <span style={{ color: champion.player.color }}>{champion.player.name}</span>{t.winsTournamentSuffix}
          </p>
        )}
        <p className="text-xs font-mono text-slate-600 mt-1">
          {t.racesAndPlayers(mapIds.length, tPlayers.length)}
        </p>
      </div>

      {/* Podium */}
      {top3.length >= 2 && (
        <div className="flex items-end justify-center gap-3 mb-10 animate-slide-up">
          {PODIUM_ORDER.map(slot => {
            const s = top3[slot];
            if (!s) return <div key={slot} className="w-28" />;
            const isFirst = slot === 0;
            const podiumColor = PODIUM_COLORS[slot];
            const podRgb = slot === 0 ? "245,158,11" : slot === 1 ? "148,163,184" : "161,98,7";
            return (
              <div key={s.player.id} className="flex flex-col items-center gap-2">
                {isFirst && <div className="text-3xl animate-pop-in">&#x1F3C6;</div>}
                <div className={`rounded-full ${isFirst ? "w-14 h-14" : "w-10 h-10"}`}
                  style={{ background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.5), ${s.player.color})`, boxShadow: isFirst ? `0 0 30px ${s.player.color}88` : `0 0 12px ${s.player.color}44` }} />
                <div className="flex flex-col items-center">
                  <div className={`font-body text-center ${isFirst ? "text-sm font-medium text-slate-200" : "text-xs text-slate-400"}`}>
                    {s.player.name}
                  </div>
                  <div className="text-[10px] font-mono mt-0.5" style={{ color: podiumColor, opacity: 0.85 }}>
                    {t.avgPlaceShort(s.avgPlace.toFixed(1))}
                    {s.avgTime !== null && <span className="ml-1 text-slate-600">{fmtTime(s.avgTime)}</span>}
                  </div>
                </div>
                <div className={`w-28 ${PODIUM_HEIGHTS[slot]} rounded-t-xl flex items-start justify-center pt-3`}
                  style={{ background: `rgba(${podRgb},0.15)`, border: `1px solid rgba(${podRgb},0.3)`, borderBottom: "none" }}>
                  <span className="font-display text-2xl tracking-widest" style={{ color: podiumColor }}>
                    {RANK_LABELS[slot]}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full standings */}
      <div className="w-full max-w-lg glass-panel rounded-2xl overflow-hidden mb-8"
        style={{ boxShadow: "0 0 40px rgba(251,191,36,0.06)" }}>
        <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
          <Medal className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">{t.finalStandings}</span>
        </div>
        {/* Map header row */}
        <div className="px-4 py-2 border-b border-white/[0.04] flex items-center gap-2"
          style={{ background: "rgba(255,255,255,0.01)" }}>
          <span className="w-7" />
          <span className="w-5" />
          <span className="flex-1 text-[10px] font-mono text-slate-700 uppercase">{t.playerCol}</span>
          <span className="text-[10px] font-mono text-slate-700 uppercase w-16 text-right">{t.avgPlaceCol}</span>
          <span className="text-[10px] font-mono text-slate-700 uppercase w-20 text-right">{t.avgTimeCol}</span>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {standings.map((s, idx) => {
            const rankColor = idx === 0 ? "#f59e0b" : idx === 1 ? "#94a3b8" : idx === 2 ? "#a16207" : "#334155";
            return (
              <div key={s.player.id}>
                <div className="flex items-center gap-2 px-4 py-3"
                  style={{ background: idx === 0 ? "rgba(251,191,36,0.04)" : "transparent" }}>
                  <span className="text-xs font-mono w-7 text-right flex-shrink-0" style={{ color: rankColor }}>
                    #{idx + 1}
                  </span>
                  <div className="w-5 h-5 rounded-full flex-shrink-0"
                    style={{ background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.5), ${s.player.color})`, boxShadow: idx < 3 ? `0 0 8px ${s.player.color}55` : "none" }} />
                  <span className="flex-1 text-sm font-body text-slate-300 truncate">{s.player.name}</span>
                  <span className="text-xs font-mono w-16 text-right flex-shrink-0" style={{ color: rankColor }}>
                    {t.avgPlaceShort(s.avgPlace === Infinity ? "-" : s.avgPlace.toFixed(2))}
                  </span>
                  <span className="text-xs font-mono w-20 text-right flex-shrink-0 text-slate-500">
                    {s.avgTime !== null ? fmtTime(s.avgTime) : "-"}
                  </span>
                </div>
                {/* Per-race row */}
                <div className="flex gap-1.5 px-4 pb-2 ml-9 flex-wrap">
                  {s.results.map((r, ri) => (
                    <div key={ri} className="flex items-center gap-1 px-2 py-0.5 rounded-md"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <span className="text-[9px] font-mono text-slate-600">{getMapName(mapIds[ri]).slice(0, 7)}</span>
                      <span className="text-[9px] font-mono" style={{ color: r ? (r.rank === 1 ? "#f59e0b" : r.rank <= 3 ? "#94a3b8" : "#475569") : "#1e293b" }}>
                        {r ? `#${r.rank}` : t.dnf}
                      </span>
                      {r?.time && <span className="text-[9px] font-mono text-slate-700">{fmtTime(r.time)}</span>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 w-full max-w-lg">
        <button onClick={handleNewTournament}
          className="flex-1 py-4 rounded-xl font-display text-xl tracking-widest transition-all active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg, #b45309, #92400e)", border: "1px solid rgba(251,191,36,0.4)", color: "#fef3c7", boxShadow: "0 0 30px rgba(251,191,36,0.2)" }}>
          <RotateCcw className="inline w-4 h-4 mr-2" />
          {t.newTournament}
        </button>
        <button onClick={handlePlayAgain}
          className="px-5 py-4 rounded-xl font-display text-xl tracking-widest transition-all active:scale-[0.98]"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#64748b" }}>
          <Home className="w-4 h-4" />
        </button>
      </div>
    </main>
  );
}
