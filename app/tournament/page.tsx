"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTournamentStore } from "@/store/tournamentStore";
import { useMapStore, DEFAULT_MAP_ID } from "@/store/mapStore";
import { Player } from "@/store/raceStore";
import { X, Plus, Minus, ChevronRight, Trophy, Map, ArrowLeft } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import LangToggle from "@/components/LangToggle";

const COLORS = [
  "#f43f5e","#3b82f6","#10b981","#f59e0b","#8b5cf6","#06b6d4",
  "#ec4899","#84cc16","#f97316","#6366f1","#14b8a6","#a855f7",
];
const EMOJIS = ["red","blue","green","yellow","purple","cyan","pink","lime","orange","indigo","teal","violet"];

let tc = 5000;
function mkPlayer(name: string, idx: number): Player {
  const i = idx % COLORS.length;
  return { id: `tp-${++tc}-${Date.now()}`, name: name.trim(), color: COLORS[i], emoji: EMOJIS[i] };
}

const MAX_MAP_REPEATS = 9;

export default function TournamentSetupPage() {
  const router = useRouter();
  const { startTournament } = useTournamentStore();
  const { t } = useLanguage();
  const { customMaps, hydrate } = useMapStore();

  useEffect(() => { hydrate(); }, []);

  const [input, setInput] = useState("");
  const [shake, setShake] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  // mapCounts: how many times each map appears in the tournament
  const [mapCounts, setMapCounts] = useState<Record<string, number>>({ [DEFAULT_MAP_ID]: 1 });
  const inputRef = useRef<HTMLInputElement>(null);

  const allMaps = [
    { id: DEFAULT_MAP_ID, name: "Classic" },
    ...customMaps.map(m => ({ id: m.id, name: m.name })),
  ];

  const totalRaces = Object.values(mapCounts).reduce((s, n) => s + n, 0);
  const uniqueMapsSelected = Object.values(mapCounts).filter(n => n > 0).length;

  function addPlayer() {
    const name = input.trim();
    if (!name) { setShake(true); setTimeout(() => setShake(false), 400); return; }
    if (players.length >= 48) return;
    setPlayers(p => [...p, mkPlayer(name, p.length)]);
    setInput("");
    inputRef.current?.focus();
  }

  function removePlayer(id: string) {
    setPlayers(p => p.filter(x => x.id !== id));
  }

  function setCount(mapId: string, delta: number) {
    setMapCounts(prev => {
      const cur = prev[mapId] ?? 0;
      const next = Math.max(0, Math.min(MAX_MAP_REPEATS, cur + delta));
      return { ...prev, [mapId]: next };
    });
  }

  const canStart = players.length >= 2 && totalRaces >= 2;

  function handleStart() {
    if (!canStart) return;
    // Build map order round-robin: Classic(1), Mountain(1), Classic(2), Mountain(2), ...
    const maxCount = Math.max(0, ...Object.values(mapCounts));
    const mapIds: string[] = [];
    for (let round = 0; round < maxCount; round++) {
      for (const map of allMaps) {
        const count = mapCounts[map.id] ?? 0;
        if (round < count) mapIds.push(map.id);
      }
    }
    startTournament(players, mapIds);
    useMapStore.getState().selectMap(mapIds[0]);
    router.push("/tournament/race");
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-900/15 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-purple-900/15 rounded-full blur-3xl" />
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)", backgroundSize: "28px 28px" }} />
      </div>

      {/* Back */}
      <button
        onClick={() => router.push("/")}
        className="fixed top-4 left-4 flex items-center gap-1.5 text-xs font-mono text-slate-600 hover:text-slate-400 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> {t.home}
      </button>
      <div className="fixed top-4 right-4 z-50"><LangToggle /></div>

      {/* Header */}
      <div className="text-center mb-8 animate-slide-down">
        <div className="flex items-center justify-center gap-3 mb-2">
          <Trophy className="text-amber-400 w-7 h-7" />
        </div>
        <h1 className="font-display text-6xl md:text-7xl tracking-wider" style={{ color: "#fbbf24", textShadow: "0 0 40px rgba(251,191,36,0.4)" }}>
          {t.tournament}
        </h1>
        <p className="font-body text-slate-400 mt-2 text-sm tracking-widest uppercase">
          {t.tournamentSubtitle}
        </p>
      </div>

      <div className="w-full max-w-xl flex flex-col gap-4">

        {/* Players card */}
        <div className="glass-panel rounded-2xl p-5"
          style={{ boxShadow: "0 0 40px rgba(124,58,237,0.08), inset 0 1px 0 rgba(255,255,255,0.05)" }}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">{t.players}</span>
            <span className="text-xs font-mono px-2 py-1 rounded-md"
              style={{ background: "rgba(124,58,237,0.15)", color: players.length >= 2 ? "#a78bfa" : "#f43f5e", border: "1px solid rgba(124,58,237,0.3)" }}>
              {players.length} / 48
            </span>
          </div>

          <div className={`flex gap-2 mb-4 ${shake ? "animate-bounce" : ""}`}>
            <input
              ref={inputRef} value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") addPlayer(); }}
              placeholder={t.playerPlaceholder}
              maxLength={20}
              className="flex-1 bg-[#0d0d16] border border-[#1e1e2e] rounded-xl px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 font-body transition-all focus:border-purple-500/50"
            />
            <button onClick={addPlayer}
              disabled={players.length >= 48 || !input.trim()}
              className="px-4 py-3 rounded-xl transition-all active:scale-95 disabled:opacity-30"
              style={{ background: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.4)", color: "#c4b5fd" }}>
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {players.length === 0 && (
              <div className="text-center py-6 text-slate-600 text-sm font-body">{t.noPlayers}</div>
            )}
            {players.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 px-3 py-2 rounded-xl group"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                <div className="w-5 h-5 rounded-full flex-shrink-0"
                  style={{ background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.5), ${p.color})`, boxShadow: `0 0 8px ${p.color}66` }} />
                <span className="text-xs font-mono text-slate-600 w-5 flex-shrink-0">{i + 1}</span>
                <span className="flex-1 text-sm font-body text-slate-200">{p.name}</span>
                <button onClick={() => removePlayer(p.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-600 hover:text-rose-400">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Quick fill */}
          <div className="mt-3 flex gap-2 flex-wrap">
            {["Alice","Bob","Charlie","Diana","Eve","Frank"].map(name => (
              <button key={name}
                onClick={() => { if (!players.find(p => p.name === name)) setPlayers(p => [...p, mkPlayer(name, p.length)]); }}
                disabled={!!players.find(p => p.name === name) || players.length >= 48}
                className="text-xs font-mono px-2.5 py-1 rounded-lg transition-all hover:scale-105 disabled:opacity-30"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "#64748b" }}>
                + {name}
              </button>
            ))}
          </div>
        </div>

        {/* Maps card */}
        <div className="glass-panel rounded-2xl p-5"
          style={{ boxShadow: "0 0 40px rgba(251,191,36,0.05), inset 0 1px 0 rgba(255,255,255,0.05)" }}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">{t.mapsToRace}</span>
            <span className="text-xs font-mono px-2 py-1 rounded-md"
              style={{ background: "rgba(251,191,36,0.12)", color: totalRaces >= 2 ? "#fbbf24" : "#f43f5e", border: "1px solid rgba(251,191,36,0.25)" }}>
              {t.totalRacesLabel(totalRaces)}
            </span>
          </div>
          <p className="text-xs font-body text-slate-600 mb-3">{t.mapsRaceHint}</p>

          <div className="space-y-2">
            {allMaps.map(map => {
              const count = mapCounts[map.id] ?? 0;
              const isActive = count > 0;
              return (
                <div key={map.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
                  style={{
                    background: isActive ? "rgba(251,191,36,0.06)" : "rgba(255,255,255,0.02)",
                    border: `1px solid ${isActive ? "rgba(251,191,36,0.3)" : "rgba(255,255,255,0.06)"}`,
                  }}>
                  <Map className="w-4 h-4 flex-shrink-0" style={{ color: isActive ? "#fbbf24" : "#475569" }} />
                  <span className="flex-1 text-sm font-body" style={{ color: isActive ? "#e2e8f0" : "#64748b" }}>
                    {map.name}
                  </span>
                  {map.id === DEFAULT_MAP_ID && (
                    <span className="text-xs font-mono mr-1" style={{ color: "#334155" }}>{t.defaultMap}</span>
                  )}

                  {/* Counter */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCount(map.id, -1)}
                      disabled={count === 0}
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-all active:scale-90 disabled:opacity-20"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                      <Minus className="w-3 h-3" style={{ color: "#94a3b8" }} />
                    </button>
                    <span
                      className="w-6 text-center text-sm font-mono font-medium"
                      style={{ color: isActive ? "#fbbf24" : "#475569" }}>
                      {count}
                    </span>
                    <button
                      onClick={() => setCount(map.id, +1)}
                      disabled={count >= MAX_MAP_REPEATS}
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-all active:scale-90 disabled:opacity-20"
                      style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.25)" }}>
                      <Plus className="w-3 h-3" style={{ color: "#fbbf24" }} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Info row */}
        {canStart && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl"
            style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.2)" }}>
            <Trophy className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#fbbf24" }} />
            <span className="text-xs font-body text-slate-400">
              {t.infoLine(players.length, totalRaces, uniqueMapsSelected)}
            </span>
          </div>
        )}

        {/* Start */}
        <button onClick={handleStart} disabled={!canStart}
          className="w-full py-4 rounded-xl font-display text-2xl tracking-widest transition-all active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed relative overflow-hidden group"
          style={{
            background: canStart ? "linear-gradient(135deg, #b45309, #92400e)" : "rgba(251,191,36,0.08)",
            border: "1px solid rgba(251,191,36,0.4)",
            color: canStart ? "#fef3c7" : "#78716c",
            boxShadow: canStart ? "0 0 30px rgba(251,191,36,0.2)" : "none",
          }}>
          {canStart && <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.08), transparent)" }} />}
          {t.beginTournament}
          <ChevronRight className="inline w-5 h-5 ml-2" />
        </button>

        {!canStart && (
          <p className="text-center text-xs text-slate-700 font-mono">
            {players.length < 2 ? t.needPlayers : t.needRaces}
          </p>
        )}
      </div>
    </main>
  );
}
