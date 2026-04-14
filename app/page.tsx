"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useRaceStore } from "@/store/raceStore";
import { useMapStore, DEFAULT_MAP_ID } from "@/store/mapStore";
import { useAudio } from "@/hooks/useAudio";
import { X, Plus, ChevronRight, Trophy, Map, Check, Volume2, VolumeX } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import LangToggle from "@/components/LangToggle";

export default function SetupPage() {
  const router = useRouter();
  const { players, addPlayer, removePlayer, resetRace } = useRaceStore();
  const { customMaps, selectedMapId, selectMap, hydrate } = useMapStore();

  const audio = useAudio();
  const [input, setInput] = useState("");
  const [shake, setShake] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const { t } = useLanguage();

  // Hydrate map store and audio prefs from localStorage after mount (avoids SSR/client mismatch)
  useEffect(() => {
    hydrate();
    setIsMuted(audio.getMuted());
    setVolume(audio.getVolume());
  }, []);

  function toggleMute() {
    const next = !isMuted;
    audio.setMuted(next);
    setIsMuted(next);
  }

  function handleVolumeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = parseFloat(e.target.value);
    setVolume(v);
    audio.setMusicVolume(v);
    if (isMuted && v > 0) { audio.setMuted(false); setIsMuted(false); }
  }
  const inputRef = useRef<HTMLInputElement>(null);

  function handleAdd() {
    const name = input.trim();
    if (!name) { setShake(true); setTimeout(() => setShake(false), 400); return; }
    if (players.length >= 48) return;
    addPlayer(name);
    setInput("");
    inputRef.current?.focus();
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleAdd();
  }

  function startRace() {
    if (players.length < 2) { setShake(true); setTimeout(() => setShake(false), 400); return; }
    resetRace();
    router.push("/race");
  }

  const canStart = players.length >= 2;
  const selectedMapName = selectedMapId === DEFAULT_MAP_ID
    ? "Classic"
    : customMaps.find(m => m.id === selectedMapId)?.name ?? "Classic";

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Language toggle */}
      <div className="fixed top-4 right-4 z-50">
        <LangToggle />
      </div>

      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-900/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-cyan-900/20 rounded-full blur-3xl" />
        <div className="absolute inset-0 opacity-30"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)", backgroundSize: "28px 28px" }} />
      </div>

      {/* Header */}
      <div className="text-center mb-10 animate-slide-down">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="w-px h-8 bg-gradient-to-b from-transparent to-purple-500" />
          <Trophy className="text-amber-400 w-6 h-6" />
          <div className="w-px h-8 bg-gradient-to-b from-transparent to-purple-500" />
        </div>
        <h1 className="font-display text-7xl md:text-8xl tracking-wider neon-text" style={{ color: "#c4b5fd" }}>
          MARBLE RACE
        </h1>
        <p className="font-body text-slate-400 mt-2 text-sm tracking-widest uppercase">
          {t.subtitle}
        </p>
      </div>

      {/* Setup card */}
      <div className="w-full max-w-md glass-panel rounded-2xl p-6 relative"
        style={{ boxShadow: "0 0 60px rgba(124,58,237,0.1), inset 0 1px 0 rgba(255,255,255,0.05)" }}>

        {/* Player count */}
        <div className="flex items-center justify-between mb-5">
          <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">{t.players}</span>
          <span className="text-xs font-mono px-2 py-1 rounded-md"
            style={{ background: "rgba(124,58,237,0.15)", color: players.length >= 48 ? "#f43f5e" : "#a78bfa", border: "1px solid rgba(124,58,237,0.3)" }}>
            {players.length} / 48
          </span>
        </div>

        {/* Input */}
        <div className={`flex gap-2 mb-5 ${shake ? "animate-bounce" : ""}`}>
          <input
            ref={inputRef} value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={t.playerPlaceholder}
            maxLength={20}
            disabled={players.length >= 48}
            className="flex-1 bg-[#0d0d16] border border-[#1e1e2e] rounded-xl px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 font-body transition-all focus:border-purple-500/50 disabled:opacity-40"
          />
          <button onClick={handleAdd}
            disabled={players.length >= 48 || !input.trim()}
            className="px-4 py-3 rounded-xl font-body text-sm font-medium transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.4)", color: "#c4b5fd" }}>
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Player list */}
        <div className="space-y-2 min-h-[120px]">
          {players.length === 0 && (
            <div className="flex items-center justify-center h-24 text-slate-600 text-sm font-body">
              {t.noPlayers}
            </div>
          )}
          {players.map((player, i) => (
            <div key={player.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl group transition-all"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
              <div className="w-6 h-6 rounded-full flex-shrink-0"
                style={{ background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.5), ${player.color})`, boxShadow: `0 0 10px ${player.color}66` }} />
              <span className="text-xs font-mono text-slate-600 w-4 text-right flex-shrink-0">{i + 1}</span>
              <span className="flex-1 text-sm font-body text-slate-200">{player.name}</span>
              <button onClick={() => removePlayer(player.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-600 hover:text-rose-400">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Map selector row */}
        <div className="mt-5 flex items-center gap-2">
          <button
            onClick={() => setShowMapPicker(v => !v)}
            className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: `1px solid ${showMapPicker ? "rgba(124,58,237,0.4)" : "rgba(255,255,255,0.07)"}`,
              color: "#94a3b8",
            }}>
            <Map className="w-4 h-4 flex-shrink-0" style={{ color: "#7c3aed" }} />
            <span className="flex-1 text-left truncate">{selectedMapName}</span>
            <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 transition-transform" style={{ transform: showMapPicker ? "rotate(90deg)" : "none" }} />
          </button>
          <button
            onClick={() => router.push("/editor")}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm transition-all hover:scale-105 active:scale-95"
            style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.3)", color: "#a78bfa" }}
            title="Open map editor">
            <Map className="w-4 h-4" />
            <span className="text-xs font-mono" style={{ letterSpacing: "0.08em" }}>{t.editor}</span>
          </button>
        </div>

        {/* Map picker dropdown */}
        {showMapPicker && (
          <div className="mt-2 rounded-xl overflow-hidden"
            style={{ background: "rgba(10,10,15,0.95)", border: "1px solid rgba(124,58,237,0.2)" }}>
            {/* Default map */}
            <button
              onClick={() => { selectMap(DEFAULT_MAP_ID); setShowMapPicker(false); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-all hover:bg-white/5"
              style={{ color: "#e2e8f0" }}>
              {selectedMapId === DEFAULT_MAP_ID && <Check className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />}
              {selectedMapId !== DEFAULT_MAP_ID && <span className="w-3.5 h-3.5 flex-shrink-0" />}
              <span className="flex-1">Classic</span>
              <span className="text-xs font-mono" style={{ color: "#374151" }}>{t.defaultMap}</span>
            </button>
            {/* Custom maps */}
            {customMaps.map(map => (
              <button key={map.id}
                onClick={() => { selectMap(map.id); setShowMapPicker(false); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-all hover:bg-white/5"
                style={{ color: "#e2e8f0", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                {selectedMapId === map.id && <Check className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />}
                {selectedMapId !== map.id && <span className="w-3.5 h-3.5 flex-shrink-0" />}
                <span className="flex-1 truncate">{map.name}</span>
              </button>
            ))}
            {customMaps.length === 0 && (
              <p className="px-4 py-3 text-xs" style={{ color: "#1e293b" }}>
                {t.noCustomMaps}
              </p>
            )}
          </div>
        )}

        {/* Start button */}
        <button onClick={startRace} disabled={!canStart}
          className="mt-5 w-full py-4 rounded-xl font-display text-2xl tracking-widest transition-all active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed relative overflow-hidden group"
          style={{
            background: canStart ? "linear-gradient(135deg, #7c3aed, #5b21b6)" : "rgba(124,58,237,0.1)",
            border: "1px solid rgba(124,58,237,0.4)",
            color: canStart ? "#f5f3ff" : "#7c3aed",
            boxShadow: canStart ? "0 0 30px rgba(124,58,237,0.3)" : "none",
          }}>
          {canStart && <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.1), transparent)" }} />}
          {t.startRace}
          <ChevronRight className="inline w-5 h-5 ml-2" />
        </button>

        {!canStart && players.length < 2 && players.length > 0 && (
          <p className="text-center text-xs text-slate-600 mt-3 font-body">
            {t.addMorePlayers(2 - players.length)}
          </p>
        )}

        {/* Tournament shortcut */}
        <div className="mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <button
            onClick={() => router.push("/tournament")}
            className="w-full py-2.5 rounded-xl font-mono text-xs tracking-widest uppercase transition-all active:scale-[0.98] hover:scale-[1.01] flex items-center justify-center gap-2"
            style={{ background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.25)" }}
          >
            <Trophy className="w-3.5 h-3.5" style={{ color: "#fbbf24" }} />
            <span style={{ color: "#d97706" }}>{t.tournamentMode}</span>
            <ChevronRight className="w-3.5 h-3.5" style={{ color: "#78350f" }} />
          </button>
        </div>
      </div>

      {/* Quick fills */}
      <div className="mt-6 flex gap-2 flex-wrap justify-center">
        {["Alice", "Bob", "Charlie", "Diana"].map(name => (
          <button key={name}
            onClick={() => { if (players.length < 48 && !players.find(p => p.name === name)) addPlayer(name); }}
            disabled={players.length >= 48 || !!players.find(p => p.name === name)}
            className="text-xs font-mono px-3 py-1.5 rounded-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-30"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "#64748b" }}>
            + {name}
          </button>
        ))}
      </div>

      {/* Legend panel — fixed right side */}
      <aside
        className="fixed right-4 top-1/2 -translate-y-1/2 hidden xl:flex flex-col pointer-events-none select-none"
        style={{ width: "196px", zIndex: 10 }}
      >
        <div
          className="rounded-2xl p-4"
          style={{
            background: "rgba(8,8,18,0.85)",
            border: "1px solid rgba(124,58,237,0.18)",
            backdropFilter: "blur(14px)",
            boxShadow: "0 0 40px rgba(124,58,237,0.07), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
          <p className="font-mono text-[9px] uppercase tracking-widest mb-3" style={{ color: "#7c3aed" }}>
            {t.howToPlay}
          </p>

          <LegendRow icon={<WindIcon />} label={t.wind} desc={t.windDesc} />
          <LegendRow icon={<PegIcon />} label={t.pegs} desc={t.pegsDesc} />
          <LegendRow icon={<RailIcon />} label={t.rails} desc={t.railsDesc} />
          <LegendRow icon={<URampIcon />} label={t.uRamps} desc={t.uRampsDesc} />
          <LegendRow icon={<PlatformIcon />} label={t.platforms} desc={t.platformsDesc} />
          <LegendRow icon={<StuckIcon />} label={t.stuckKick} desc={t.stuckKickDesc} />

          <div className="my-3" style={{ height: "1px", background: "rgba(124,58,237,0.14)" }} />

          <p className="font-mono text-[9px] uppercase tracking-widest mb-2" style={{ color: "#7c3aed" }}>
            {t.launchPads}
          </p>
          <LegendRow icon={<PadIcon color="#16a34a" arrowDir="right" />} label={t.greenPad} desc={t.greenPadDesc} />
          <LegendRow icon={<PadIcon color="#b45309" arrowDir="left" />} label={t.orangePad} desc={t.orangePadDesc} />
          <LegendRow icon={<PadIcon color="#be123c" arrowDir="up" />} label={t.redPad} desc={t.redPadDesc} />
        </div>
      </aside>

      {/* Sound controls */}
      <div className="mt-6 flex items-center gap-3 px-2">
        <button
          onClick={toggleMute}
          className="flex-shrink-0 p-2 rounded-xl transition-all hover:scale-105 active:scale-95"
          style={{
            background: isMuted ? "rgba(255,255,255,0.04)" : "rgba(124,58,237,0.12)",
            border: `1px solid ${isMuted ? "rgba(255,255,255,0.08)" : "rgba(124,58,237,0.3)"}`,
            color: isMuted ? "#374151" : "#7c3aed",
          }}
          title={isMuted ? t.unmute : t.mute}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
        <div className="flex-1 flex flex-col gap-1">
          <div className="flex justify-between items-center">
            <span className="text-xs font-mono text-slate-600 uppercase tracking-widest">{t.volume}</span>
            <span className="text-xs font-mono" style={{ color: isMuted ? "#334155" : "#7c3aed" }}>
              {isMuted ? t.off : Math.round(volume * 100) + "%"}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, ${isMuted ? "#374151" : "#7c3aed"} ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.08) ${(isMuted ? 0 : volume) * 100}%)`,
              accentColor: "#7c3aed",
            }}
          />
        </div>
      </div>

      <p className="mt-6 text-xs text-slate-700 font-mono tracking-wider">
        {t.footer}
      </p>
    </main>
  );
}

// Legend helpers

function LegendRow({ icon, label, desc }: { icon: ReactNode; label: string; desc: string }) {
  return (
    <div className="flex items-start gap-2 mb-3">
      <div className="flex-shrink-0 mt-0.5">{icon}</div>
      <div>
        <p className="font-mono text-[10px] leading-tight" style={{ color: "#c4b5fd" }}>{label}</p>
        <p className="font-body text-[10px] leading-snug mt-0.5" style={{ color: "#475569" }}>{desc}</p>
      </div>
    </div>
  );
}

function WindIcon() {
  return (
    <svg width="28" height="20" viewBox="0 0 28 20" fill="none">
      <path d="M2 7 Q8 3 14 7 Q20 11 26 7" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M2 13 Q8 9 14 13 Q20 17 26 13" stroke="#7dd3fc" strokeWidth="1.3" strokeLinecap="round" fill="none" strokeOpacity="0.65" />
      <polyline points="21,4 26,7 21,10" stroke="#38bdf8" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

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

function URampIcon() {
  return (
    <svg width="28" height="20" viewBox="0 0 28 20" fill="none">
      <path d="M5 2 L5 13 Q14 19 23 13 L23 2" stroke="#c4b5fd" strokeWidth="1.8" strokeLinecap="round" fill="none" />
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

function StuckIcon() {
  return (
    <svg width="28" height="20" viewBox="0 0 28 20" fill="none">
      {/* Central marble */}
      <circle cx="14" cy="10" r="4" fill="#f59e0b" fillOpacity="0.85" />
      <circle cx="12.8" cy="8.8" r="1.2" fill="rgba(255,255,255,0.5)" />
      {/* Outward arrows in 4 directions */}
      <line x1="14" y1="4.5" x2="14" y2="2" stroke="#fbbf24" strokeWidth="1.3" strokeLinecap="round" />
      <polyline points="12,3.5 14,1.5 16,3.5" stroke="#fbbf24" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <line x1="14" y1="15.5" x2="14" y2="18" stroke="#fbbf24" strokeWidth="1.3" strokeLinecap="round" />
      <polyline points="12,16.5 14,18.5 16,16.5" stroke="#fbbf24" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <line x1="8.5" y1="10" x2="6" y2="10" stroke="#fbbf24" strokeWidth="1.3" strokeLinecap="round" />
      <polyline points="7,8 5,10 7,12" stroke="#fbbf24" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <line x1="19.5" y1="10" x2="22" y2="10" stroke="#fbbf24" strokeWidth="1.3" strokeLinecap="round" />
      <polyline points="21,8 23,10 21,12" stroke="#fbbf24" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function PadIcon({ color, arrowDir }: { color: string; arrowDir: "left" | "right" | "up" }) {
  const arrowMap: Record<string, JSX.Element> = {
    right: <polyline points="17,5 23,8 17,11" stroke="rgba(255,255,255,0.7)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />,
    left: <polyline points="11,5 5,8 11,11" stroke="rgba(255,255,255,0.7)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />,
    up: <polyline points="9,9 14,3 19,9" stroke="rgba(255,255,255,0.7)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />,
  };
  return (
    <svg width="28" height="20" viewBox="0 0 28 20" fill="none">
      <rect x="2" y="12" width="24" height="5" rx="2.5" fill={color} fillOpacity="0.9" />
      {arrowMap[arrowDir]}
    </svg>
  );
}
