"use client";

import { useLanguage } from "@/hooks/useLanguage";

function FlagGB({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.6} viewBox="0 0 60 36" xmlns="http://www.w3.org/2000/svg" style={{ borderRadius: 2, display: "block" }}>
      <rect width="60" height="36" fill="#012169" />
      {/* White diagonals */}
      <line x1="0" y1="0" x2="60" y2="36" stroke="white" strokeWidth="7.2" />
      <line x1="60" y1="0" x2="0" y2="36" stroke="white" strokeWidth="7.2" />
      {/* Red diagonals */}
      <line x1="0" y1="0" x2="60" y2="36" stroke="#C8102E" strokeWidth="4.8" />
      <line x1="60" y1="0" x2="0" y2="36" stroke="#C8102E" strokeWidth="4.8" />
      {/* White cross */}
      <rect x="24" y="0" width="12" height="36" fill="white" />
      <rect x="0" y="12" width="60" height="12" fill="white" />
      {/* Red cross */}
      <rect x="26" y="0" width="8" height="36" fill="#C8102E" />
      <rect x="0" y="14" width="60" height="8" fill="#C8102E" />
    </svg>
  );
}

function FlagCZ({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.6} viewBox="0 0 60 36" xmlns="http://www.w3.org/2000/svg" style={{ borderRadius: 2, display: "block" }}>
      <rect width="60" height="18" fill="white" />
      <rect y="18" width="60" height="18" fill="#D7141A" />
      <polygon points="0,0 30,18 0,36" fill="#11457E" />
    </svg>
  );
}

/** Drop-in language toggle — SVG flags, instant in-page switching */
export default function LangToggle() {
  const { lang, toggleLang } = useLanguage();
  return (
    <button
      onClick={toggleLang}
      className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-all hover:scale-105 active:scale-95"
      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" }}
      title={lang === "en" ? "Switch to Czech" : "Switch to English"}
    >
      <span style={{ opacity: lang === "en" ? 1 : 0.28, transition: "opacity 0.15s" }}>
        <FlagGB />
      </span>
      <span className="font-mono text-[10px]" style={{ color: "#475569" }}>|</span>
      <span style={{ opacity: lang === "cs" ? 1 : 0.28, transition: "opacity 0.15s" }}>
        <FlagCZ />
      </span>
    </button>
  );
}
