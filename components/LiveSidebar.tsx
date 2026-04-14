"use client";

import { RankedPlayer } from "@/store/raceStore";
import { Medal } from "lucide-react";

interface LiveSidebarProps {
  rankings: RankedPlayer[];
  status: string;
  raceStartTime: number | null;
}

const rankColors = ["#f59e0b", "#94a3b8", "#a16207"];
const rankLabels = ["1ST", "2ND", "3RD"];

/** Format elapsed milliseconds as "ss.x s" (e.g. "12.3 s") */
function fmtTime(ms: number): string {
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  const rem = (s % 60).toFixed(1).padStart(4, "0");
  return `${m}:${rem}`;
}

export default function LiveSidebar({ rankings, status, raceStartTime }: LiveSidebarProps) {
  return (
    <div
      className="flex flex-col h-full p-4 gap-3"
      style={{
        background: "rgba(10,10,15,0.95)",
        borderLeft: "1px solid rgba(124,58,237,0.2)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 pb-3 border-b border-white/5">
        <Medal className="w-4 h-4 text-amber-400" />
        <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">
          Live Rankings
        </span>
      </div>

      {/* Status pill */}
      <div className="flex justify-center">
        <span
          className="text-xs font-mono px-3 py-1 rounded-full uppercase tracking-wider"
          style={{
            background:
              status === "racing"
                ? "rgba(16,185,129,0.15)"
                : status === "finished"
                ? "rgba(245,158,11,0.15)"
                : "rgba(124,58,237,0.15)",
            color:
              status === "racing"
                ? "#10b981"
                : status === "finished"
                ? "#f59e0b"
                : "#a78bfa",
            border: `1px solid ${
              status === "racing"
                ? "rgba(16,185,129,0.3)"
                : status === "finished"
                ? "rgba(245,158,11,0.3)"
                : "rgba(124,58,237,0.3)"
            }`,
          }}
        >
          {status === "racing" ? "● LIVE" : status === "finished" ? "✓ DONE" : "READY"}
        </span>
      </div>

      {/* Rankings list */}
      <div className="flex-1 space-y-2 overflow-y-auto">
        {rankings.map((player, idx) => {
          const isFinished = !!player.finishedAt;
          const isTop3 = idx < 3;

          return (
            <div
              key={player.id}
              className="rounded-xl p-3 transition-all"
              style={{
                background: isTop3
                  ? `rgba(${isTop3 ? "255,255,255" : "255,255,255"},0.03)`
                  : "rgba(255,255,255,0.02)",
                border: `1px solid ${
                  isFinished
                    ? player.color + "40"
                    : "rgba(255,255,255,0.04)"
                }`,
                opacity: isFinished ? 1 : 0.85,
              }}
            >
              <div className="flex items-center gap-2.5">
                {/* Rank */}
                <div
                  className="text-xs font-mono font-medium w-8 text-center flex-shrink-0"
                  style={{
                    color: idx < 3 ? rankColors[idx] : "#475569",
                  }}
                >
                  {isFinished && idx < 3 ? rankLabels[idx] : `#${idx + 1}`}
                </div>

                {/* Marble dot */}
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{
                    background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.5), ${player.color})`,
                    boxShadow: isFinished ? `0 0 8px ${player.color}66` : "none",
                  }}
                />

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-body text-slate-300 truncate">
                    {player.name}
                  </div>
                  {/* Progress bar */}
                  {!isFinished && (
                    <div
                      className="mt-1 h-0.5 rounded-full overflow-hidden"
                      style={{ background: "rgba(255,255,255,0.06)" }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${player.progress * 100}%`,
                          background: player.color,
                        }}
                      />
                    </div>
                  )}
                </div>
                {/* Finish time */}
                {isFinished && (
                  <div className="flex flex-col items-end flex-shrink-0">
                    <span className="text-[10px] font-mono leading-none" style={{ color: player.color }}>
                      ✓
                    </span>
                    {raceStartTime && player.finishedAt && (
                      <span className="text-[10px] font-mono leading-none mt-0.5" style={{ color: "#475569" }}>
                        {fmtTime(player.finishedAt - raceStartTime)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
