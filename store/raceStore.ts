import { create } from "zustand";

export type RaceStatus = "idle" | "countdown" | "racing" | "finished";

export interface Player {
  id: string;
  name: string;
  color: string;
  emoji: string;
}

export interface RankedPlayer extends Player {
  rank: number;
  finishedAt?: number; // timestamp
  progress: number; // 0-1
}

interface RaceStore {
  players: Player[];
  raceStatus: RaceStatus;
  rankings: RankedPlayer[];
  winner: Player | null;
  countdownValue: number;
  raceStartTime: number | null; // ms timestamp captured when racing begins

  // Actions
  addPlayer: (name: string) => void;
  removePlayer: (id: string) => void;
  reorderPlayers: (players: Player[]) => void;
  setRaceStatus: (status: RaceStatus) => void;
  setCountdown: (value: number) => void;
  updateProgress: (playerId: string, progress: number) => void;
  finishPlayer: (playerId: string) => void;
  setWinner: (player: Player) => void;
  resetRace: () => void;
  initRankings: () => void;
}

const PLAYER_COLORS = [
  "#f43f5e", // rose
  "#3b82f6", // blue
  "#10b981", // emerald
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#84cc16", // lime
  "#f97316", // orange
  "#6366f1", // indigo
  "#14b8a6", // teal
  "#a855f7", // purple
];

const PLAYER_EMOJIS = ["🔴", "🔵", "🟢", "🟡", "🟣", "🩵", "🩷", "🟤", "🟠", "💙", "🩶", "💜"];

let playerCounter = 0;

export const useRaceStore = create<RaceStore>((set, get) => ({
  players: [],
  raceStatus: "idle",
  rankings: [],
  winner: null,
  countdownValue: 3,
  raceStartTime: null,

  addPlayer: (name: string) => {
    const { players } = get();
    if (players.length >= 48) return;
    const idx = players.length % PLAYER_COLORS.length;
    const player: Player = {
      id: `player-${++playerCounter}-${Date.now()}`,
      name: name.trim(),
      color: PLAYER_COLORS[idx],
      emoji: PLAYER_EMOJIS[idx],
    };
    set({ players: [...players, player] });
  },

  removePlayer: (id: string) => {
    set((s) => ({ players: s.players.filter((p) => p.id !== id) }));
  },

  reorderPlayers: (players: Player[]) => set({ players }),

  setRaceStatus: (status: RaceStatus) =>
    set(status === "racing"
      ? { raceStatus: status, raceStartTime: Date.now() }
      : { raceStatus: status }),

  setCountdown: (value: number) => set({ countdownValue: value }),

  initRankings: () => {
    const { players } = get();
    const ranked: RankedPlayer[] = players.map((p, i) => ({
      ...p,
      rank: i + 1,
      progress: 0,
    }));
    set({ rankings: ranked, winner: null });
  },

  updateProgress: (playerId: string, progress: number) => {
    set((s) => {
      const updated = s.rankings.map((r) =>
        r.id === playerId ? { ...r, progress } : r
      );
      // Re-sort by progress descending
      const sorted = [...updated].sort((a, b) => b.progress - a.progress);
      const reranked = sorted.map((p, i) => ({ ...p, rank: i + 1 }));
      return { rankings: reranked };
    });
  },

  finishPlayer: (playerId: string) => {
    set((s) => {
      const finishedCount = s.rankings.filter((r) => r.finishedAt).length;
      const updated = s.rankings.map((r) =>
        r.id === playerId && !r.finishedAt
          ? { ...r, finishedAt: Date.now(), rank: finishedCount + 1, progress: 1 }
          : r
      );
      return { rankings: updated };
    });
  },
  setWinner: (player: Player) => set({ winner: player }),

  resetRace: () =>
    set({
      raceStatus: "idle",
      rankings: [],
      winner: null,
      countdownValue: 3,
      raceStartTime: null,
    }),
}));
