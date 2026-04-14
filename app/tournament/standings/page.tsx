"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTournamentStore, computeStandings } from "@/store/tournamentStore";
import { useMapStore, DEFAULT_MAP_ID } from "@/store/mapStore";
import { Trophy, Map, ChevronRight, Medal, Flag } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import LangToggle from "@/components/LangToggle";

function fmtTime(ms: number): string {
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(2)}s`;
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toFixed(2).padStart(5, "0")}`;
}

const RANK_COLORS = ["#f59e0b", "#94a3b8", "#a16207"];
const RANK_LABELS = ["1ST", "2ND", "3RD"];

export default function TournamentStandingsPage() {
  const router = useRouter();
  const { phase, tPlayers, mapIds, currentRaceIndex, advance } = useTournamentStore();
  const { t } = useLanguage();
  const { customMaps, hydrate } = useMapStore();
  useEffect(() => { hydrate(); }, []);

  useEffect(() => {
    if (phase === "idle") router.replace("/tournament");
  }, [phase]);

  const standings = computeStandings(tPlayers);
  const completedRaces = phase === "between" ? currentRaceIndex + 1
    : phase === "complete" ? mapIds.length
    : currentRaceIndex;
  const allDone = completedRaces >= mapIds.length;

  function getMapName(id: string): string {
    if (id === DEFAULT_MAP_ID) return "Classic";
    return customMaps.find(m => m.id === id)?.name ?? "Map";
  }

  function handleNext() {
    advance();
    const store = useTournamentStore.getState();
    const nextMapId = store.currentMapId();
    if (nextMapId) useMapStore.getState().selectMap(nextMapId);
    router.push("/tournament/race");
  }

  function handleFinalResults() {
    if (phase !== "complete") advance();
    router.push("/tournament/results");
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-10 relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-48 bg-amber-900/10 blur-3xl" />
        <div className="absolute inset-0 opacity-15"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)", backgroundSize: "28px 28px" }} />
      </div>

      {/* Header */}
      <div className="fixed top-4 right-4 z-50"><LangToggle /></div>
      <div className="text-center mb-6 animate-slide-down">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Trophy className="text-amber-400 w-5 h-5" />
          <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">{t.tournamentStandings}</span>
          <Trophy className="text-amber-400 w-5 h-5" />
        </div>
        <h1 className="font-display text-5xl tracking-wider" style={{ color: "#fbbf24", textShadow: "0 0 30px rgba(251,191,36,0.35)" }}>
          {allDone ? t.allDone : t.afterRaceN(completedRaces)}
        </h1>
        <p className="text-xs font-mono text-slate-500 mt-1">
          {t.racesComplete(completedRaces, mapIds.length)}
        </p>
      </div>

      {/* Race progress track */}
      <div className="w-full max-w-lg flex items-center gap-2 mb-6 px-2">
        {mapIds.map((id, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: i < completedRaces ? "100%" : "0%", background: "#fbbf24" }} />
            </div>
            <span className="text-[9px] font-mono truncate max-w-full px-1"
              style={{ color: i < completedRaces ? "#fbbf24" : "#374151" }}>
              {getMapName(id)}
            </span>
          </div>
        ))}
      </div>

      {/* Standings table */}
      <div className="w-full max-w-lg glass-panel rounded-2xl overflow-hidden mb-6"
        style={{ boxShadow: "0 0 40px rgba(251,191,36,0.06)" }}>
        <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
          <Medal className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">{t.overallStandings}</span>
        </div>

        <div className="divide-y divide-white/[0.04]">
          {standings.map((s, idx) => {
            const rankColor = idx < 3 ? RANK_COLORS[idx] : "#334155";
            const isLeader = idx === 0;
            return (
              <div key={s.player.id}
                className="px-4 py-3 transition-all"
                style={{ background: isLeader ? "rgba(251,191,36,0.04)" : "transparent" }}>
                {/* Main row */}
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono w-7 text-right flex-shrink-0" style={{ color: rankColor }}>
                    {idx < 3 ? RANK_LABELS[idx] : `#${idx + 1}`}
                  </span>
                  <div className="w-5 h-5 rounded-full flex-shrink-0"
                    style={{ background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.5), ${s.player.color})`, boxShadow: `0 0 8px ${s.player.color}55` }} />
                  <span className="flex-1 text-sm font-body text-slate-200 truncate">{s.player.name}</span>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <div className="text-xs font-mono" style={{ color: rankColor }}>
                        {t.avgPlaceShort(s.avgPlace === Infinity ? "-" : s.avgPlace.toFixed(1))}
                      </div>
                      {s.avgTime !== null && (
                        <div className="text-[10px] font-mono text-slate-600">{fmtTime(s.avgTime)}</div>
                      )}
                    </div>
                  </div>
                </div>
                {/* Per-race chips */}
                {completedRaces > 0 && (
                  <div className="flex gap-1.5 mt-2 ml-10 flex-wrap">
                    {s.results.slice(0, completedRaces).map((r, ri) => (
                      <div key={ri}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-md"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <span className="text-[9px] font-mono text-slate-500">{getMapName(mapIds[ri]).slice(0, 6)}</span>
                        <span className="text-[9px] font-mono" style={{ color: r ? (r.rank === 1 ? "#fbbf24" : r.rank === 2 ? "#94a3b8" : r.rank === 3 ? "#a16207" : "#475569") : "#1e293b" }}>
                          {r ? `#${r.rank}` : "-"}
                        </span>
                        {r?.time && <span className="text-[9px] font-mono text-slate-700">{fmtTime(r.time)}</span>}
                      </div>
                    ))}
                    {Array.from({ length: mapIds.length - completedRaces }, (_, i) => (
                      <div key={`future-${i}`}
                        className="px-2 py-0.5 rounded-md"
                        style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.06)" }}>
                        <span className="text-[9px] font-mono text-slate-700">{getMapName(mapIds[completedRaces + i]).slice(0, 6)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Action */}
      <div className="w-full max-w-lg flex flex-col gap-3">
        {!allDone ? (
          <button onClick={handleNext}
            className="w-full py-4 rounded-xl font-display text-xl tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-3"
            style={{ background: "linear-gradient(135deg, #b45309, #92400e)", border: "1px solid rgba(251,191,36,0.4)", color: "#fef3c7", boxShadow: "0 0 30px rgba(251,191,36,0.2)" }}>
            <Flag className="w-5 h-5" />
            {t.startRaceNMap(completedRaces + 1, getMapName(mapIds[completedRaces]).toUpperCase())}
            <ChevronRight className="w-5 h-5" />
          </button>
        ) : (
          <button onClick={handleFinalResults}
            className="w-full py-4 rounded-xl font-display text-xl tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-3"
            style={{ background: "linear-gradient(135deg, #7c3aed, #5b21b6)", border: "1px solid rgba(124,58,237,0.4)", color: "#f5f3ff", boxShadow: "0 0 30px rgba(124,58,237,0.3)" }}>
            <Trophy className="w-5 h-5" />
            {t.finalResultsBtn}
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
        <button onClick={() => router.push("/tournament")}
          className="w-full py-3 rounded-xl font-mono text-sm tracking-widest transition-all active:scale-[0.98]"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "#475569" }}>
          {t.abandonTournament}
        </button>
      </div>
    </main>
  );
}
