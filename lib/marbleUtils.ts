/**
 * Derives a deterministic color from a player name.
 * Used as a fallback if the store color isn't available.
 */
export function colorFromName(name: string): string {
  const palette = [
    "#f43f5e", "#3b82f6", "#10b981", "#f59e0b",
    "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16",
    "#f97316", "#6366f1", "#14b8a6", "#a855f7",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
}

/**
 * Returns a lighter tint of a hex color for glow effects.
 */
export function hexWithAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * Podium display order: center=1st, left=2nd, right=3rd
 */
export const PODIUM_SLOT_ORDER = [1, 0, 2];
export const PODIUM_RANK_LABELS = ["1ST", "2ND", "3RD"];
export const PODIUM_ACCENT_COLORS = ["#f59e0b", "#94a3b8", "#a16207"];
