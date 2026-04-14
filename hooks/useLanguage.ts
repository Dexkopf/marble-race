"use client";

import { useState, useEffect } from "react";
import { translations, type Lang } from "@/lib/i18n";

const LANG_EVENT = "marble-lang-change";

export function useLanguage() {
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    const stored = localStorage.getItem("marble-lang");
    if (stored === "cs" || stored === "en") setLang(stored as Lang);

    const handler = (e: Event) => {
      const next = (e as CustomEvent<Lang>).detail;
      setLang(next);
    };
    window.addEventListener(LANG_EVENT, handler);
    return () => window.removeEventListener(LANG_EVENT, handler);
  }, []);

  function toggleLang() {
    const next: Lang = lang === "en" ? "cs" : "en";
    setLang(next);
    localStorage.setItem("marble-lang", next);
    window.dispatchEvent(new CustomEvent<Lang>(LANG_EVENT, { detail: next }));
  }

  return { lang, toggleLang, t: translations[lang] };
}
