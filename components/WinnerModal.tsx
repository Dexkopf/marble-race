"use client";

import { useEffect, useRef } from "react";
import { Player } from "@/store/raceStore";
import { useRouter } from "next/navigation";

interface WinnerModalProps {
  winner: Player;
  onClose: () => void;
  resultsPath?: string;   // default "/results"
  resultsLabel?: string;  // default "RESULTS"
  subtitle?: string;      // e.g. "Race 2 Winner"
  watchLabel?: string;    // default "Watch"
}

export default function WinnerModal({
  winner,
  onClose,
  resultsPath = "/results",
  resultsLabel = "RESULTS",
  subtitle,
  watchLabel = "Watch",
}: WinnerModalProps) {
  const router = useRouter();
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;

    async function boom() {
      const confetti = (await import("canvas-confetti")).default;
      const colors = [winner.color, "#ffffff", "#f59e0b", "#7c3aed"];
      confetti({ particleCount: 120, spread: 80, origin: { x: 0.5, y: 0.4 }, colors, disableForReducedMotion: true });
      setTimeout(() => {
        confetti({ particleCount: 60, angle: 60, spread: 55, origin: { x: 0 }, colors });
        confetti({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1 }, colors });
      }, 300);
    }
    boom();
  }, [winner.color]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="relative mx-4 max-w-sm w-full text-center rounded-3xl p-8 winner-spotlight"
        style={{
          background: "linear-gradient(135deg, #0d0d1a, #111118)",
          border: `2px solid ${winner.color}`,
          boxShadow: `0 0 60px ${winner.color}44, 0 0 120px ${winner.color}22`,
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="text-5xl mb-4 animate-pop-in">
          {subtitle ? "\uD83C\uDFC6" : "\uD83C\uDFC6"}
        </div>
        <div className="font-mono text-xs tracking-widest uppercase mb-2" style={{ color: winner.color }}>
          {subtitle ?? "Winner!"}
        </div>
        <div className="flex justify-center mb-4">
          <div
            className="w-16 h-16 rounded-full"
            style={{
              background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.6), ${winner.color})`,
              boxShadow: `0 0 30px ${winner.color}88`,
            }}
          />
        </div>
        <h2
          className="font-display text-5xl tracking-wide mb-6"
          style={{ color: "#f8fafc", textShadow: `0 0 20px ${winner.color}88` }}
        >
          {winner.name.toUpperCase()}
        </h2>
        <div className="flex gap-3">
          <button
            onClick={() => router.push(resultsPath)}
            className="flex-1 py-3 rounded-xl font-display text-lg tracking-widest transition-all active:scale-95"
            style={{ background: `linear-gradient(135deg, ${winner.color}cc, ${winner.color}88)`, color: "#fff" }}
          >
            {resultsLabel}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-3 rounded-xl font-mono text-sm transition-all active:scale-95"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8" }}
          >
            {watchLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
