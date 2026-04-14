"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRaceStore } from "@/store/raceStore";
import { RotateCcw, Home, Trophy, Medal } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import LangToggle from "@/components/LangToggle";

const PODIUM_HEIGHTS = ["h-28", "h-40", "h-20"];
const PODIUM_COLORS = ["#94a3b8", "#f59e0b", "#a16207"]; // 2nd, 1st, 3rd
const PODIUM_ORDER = [1, 0, 2]; // center=1st, left=2nd, right=3rd
const RANK_LABELS = ["1ST", "2ND", "3RD"];

/** Format elapsed ms as "ss.xx s" or "m:ss.xx" */
function fmtTime(ms: number): string {
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(2)}s`;
  const m = Math.floor(s / 60);
  const rem = (s % 60).toFixed(2).padStart(5, "0");
  return `${m}:${rem}`;
}

export default function ResultsPage() {
  const router = useRouter();
  const { rankings, winner, players, raceStartTime, resetRace, initRankings } = useRaceStore();
  const { t } = useLanguage();

  useEffect(() => {
    if (players.length === 0) {
      router.replace("/");
    }
  }, []);

  // Sort by finishAt then by progress
  const sorted = [...rankings].sort((a, b) => {
    if (a.finishedAt && b.finishedAt) return a.finishedAt - b.finishedAt;
    if (a.finishedAt) return -1;
    if (b.finishedAt) return 1;
    return b.progress - a.progress;
  });

  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3);

  function playAgain() {
    resetRace();
    router.push("/");
  }

  function raceAgain() {
    resetRace();
    initRankings();
    router.push("/race");
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-12 relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-64 bg-purple-900/15 blur-3xl" />
        <div className="absolute bottom-1/3 left-1/4 w-48 h-48 bg-amber-900/10 blur-3xl" />
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />
      </div>

      {/* Header */}
      <div className="fixed top-4 right-4 z-50"><LangToggle /></div>
      <div className="text-center mb-10 animate-slide-down">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Trophy className="text-amber-400 w-5 h-5" />
          <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">
            {t.finalResults}
          </span>
          <Trophy className="text-amber-400 w-5 h-5" />
        </div>
        <h1
          className="font-display text-6xl md:text-7xl tracking-wider neon-text"
          style={{ color: "#c4b5fd" }}
        >
          {t.raceOver}
        </h1>
        {winner && (
          <p className="font-body text-slate-400 mt-2">
            <span style={{ color: winner.color }}>{winner.name}</span>{t.goldSuffix}
          </p>
        )}
      </div>

      {/* Podium — top 3 */}
      {top3.length >= 2 && (
        <div className="flex items-end justify-center gap-3 mb-10 animate-slide-up">
          {PODIUM_ORDER.map((podiumSlot) => {
            const player = top3[podiumSlot];
            if (!player) return <div key={podiumSlot} className="w-28" />;

            const isFirst = podiumSlot === 0;
            const podiumColor = PODIUM_COLORS[podiumSlot];

            return (
              <div key={player.id} className="flex flex-col items-center gap-2">
                {/* Medal */}
                {isFirst && (
                  <div className="text-2xl animate-pop-in">👑</div>
                )}

                {/* Marble */}
                <div
                  className={`rounded-full ${isFirst ? "w-14 h-14" : "w-10 h-10"} transition-all`}
                  style={{
                    background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.5), ${player.color})`,
                    boxShadow: isFirst
                      ? `0 0 30px ${player.color}88`
                      : `0 0 12px ${player.color}44`,
                  }}
                />

                {/* Name + time */}
                <div className="flex flex-col items-center gap-0.5">
                  <div
                    className={`font-body text-center ${isFirst ? "text-sm font-medium text-slate-200" : "text-xs text-slate-400"}`}
                  >
                    {player.name}
                  </div>
                  {raceStartTime && player.finishedAt && (
                    <div
                      className="text-[10px] font-mono"
                      style={{ color: podiumColor, opacity: 0.85 }}
                    >
                      {fmtTime(player.finishedAt - raceStartTime)}
                    </div>
                  )}
                </div>

                {/* Podium block */}
                <div
                  className={`w-28 ${PODIUM_HEIGHTS[podiumSlot]} rounded-t-xl flex items-start justify-center pt-3`}
                  style={{
                    background: `rgba(${
                      podiumSlot === 0
                        ? "245,158,11"
                        : podiumSlot === 1
                        ? "148,163,184"
                        : "161,98,7"
                    },0.15)`,
                    border: `1px solid rgba(${
                      podiumSlot === 0
                        ? "245,158,11"
                        : podiumSlot === 1
                        ? "148,163,184"
                        : "161,98,7"
                    },0.3)`,
                    borderBottom: "none",
                  }}
                >
                  <span
                    className="font-display text-2xl tracking-widest"
                    style={{ color: podiumColor }}
                  >
                    {RANK_LABELS[podiumSlot]}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full rankings list */}
      {sorted.length > 0 && (
        <div
          className="w-full max-w-sm glass-panel rounded-2xl overflow-hidden mb-8"
          style={{ boxShadow: "0 0 40px rgba(124,58,237,0.08)" }}
        >
          <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
            <Medal className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">
              {t.fullStandings}
            </span>
          </div>

          <div className="divide-y divide-white/[0.04]">
            {sorted.map((player, idx) => {
              const rankColor =
                idx === 0 ? "#f59e0b" : idx === 1 ? "#94a3b8" : idx === 2 ? "#a16207" : "#334155";

              return (
                <div
                  key={player.id}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{
                    background: idx === 0 ? "rgba(245,158,11,0.04)" : "transparent",
                    animationDelay: `${idx * 0.06}s`,
                  }}
                >
                  <span
                    className="text-xs font-mono w-8 text-right flex-shrink-0"
                    style={{ color: rankColor }}
                  >
                    #{idx + 1}
                  </span>

                  <div
                    className="w-5 h-5 rounded-full flex-shrink-0"
                    style={{
                      background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.5), ${player.color})`,
                      boxShadow: idx < 3 ? `0 0 8px ${player.color}66` : "none",
                    }}
                  />

                  <span className="flex-1 text-sm font-body text-slate-300">
                    {player.name}
                  </span>

                  {player.finishedAt && raceStartTime ? (
                    <span className="text-xs font-mono" style={{ color: "#10b981" }}>
                      {fmtTime(player.finishedAt - raceStartTime)}
                    </span>
                  ) : player.finishedAt ? (
                    <span className="text-xs font-mono text-emerald-600">✓</span>
                  ) : (
                    <span className="text-xs font-mono text-slate-700">
                      {Math.round(player.progress * 100)}%
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {/* Action buttons */}
      <div className="flex gap-3 w-full max-w-sm">
        <button
          onClick={raceAgain}
          className="flex-1 py-4 rounded-xl font-display text-xl tracking-widest transition-all active:scale-[0.98]"
          style={{
            background: "linear-gradient(135deg, #7c3aed, #5b21b6)",
            border: "1px solid rgba(124,58,237,0.4)",
            color: "#f5f3ff",
            boxShadow: "0 0 30px rgba(124,58,237,0.25)",
          }}
        >
          <RotateCcw className="inline w-4 h-4 mr-2" />
          {t.raceAgain}
        </button>
        <button
          onClick={playAgain}
          className="px-5 py-4 rounded-xl font-display text-xl tracking-widest transition-all active:scale-[0.98]"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#64748b",
          }}
        >
          <Home className="w-4 h-4" />
        </button>
      </div>
    </main>
  );
}
