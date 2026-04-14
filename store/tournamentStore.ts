import { create } from "zustand";
import { Player } from "./raceStore";

export interface RaceResult {
  rank: number;        // 1-indexed finish place
  time: number | null; // elapsed ms from race start; null = DNF
}

export interface TournamentPlayer {
  id: string;
  name: string;
  color: string;
  emoji: string;
  results: (RaceResult | null)[]; // one slot per map
}

export interface TournamentStanding {
  player: TournamentPlayer;
  results: (RaceResult | null)[];
  avgPlace: number;
  avgTime: number | null; // null if no timed finishes
  finalRank: number;
}

export type TournamentPhase = "idle" | "pre-race" | "between" | "complete";

interface TournamentStore {
  phase: TournamentPhase;
  tPlayers: TournamentPlayer[];
  mapIds: string[];
  currentRaceIndex: number;

  startTournament: (players: Player[], mapIds: string[]) => void;
  recordRace: (resultsByPlayerId: Record<string, RaceResult>) => void;
  advance: () => void;
  reset: () => void;
  getStandings: () => TournamentStanding[];
  currentMapId: () => string | null;
}

export function computeStandings(tPlayers: TournamentPlayer[]): TournamentStanding[] {
  const list: TournamentStanding[] = tPlayers.map(p => {
    const raced = p.results.filter((r): r is RaceResult => r !== null);
    const avgPlace = raced.length === 0
      ? Infinity
      : raced.reduce((s, r) => s + r.rank, 0) / raced.length;
    const times = raced.filter(r => r.time !== null).map(r => r.time as number);
    const avgTime = times.length === 0
      ? null
      : times.reduce((s, t) => s + t, 0) / times.length;
    return { player: p, results: p.results, avgPlace, avgTime, finalRank: 0 };
  });
  list.sort((a, b) => {
    if (a.avgPlace !== b.avgPlace) return a.avgPlace - b.avgPlace;
    if (a.avgTime === null && b.avgTime === null) return 0;
    if (a.avgTime === null) return 1;
    if (b.avgTime === null) return -1;
    return a.avgTime - b.avgTime;
  });
  list.forEach((s, i) => { s.finalRank = i + 1; });
  return list;
}

export const useTournamentStore = create<TournamentStore>((set, get) => ({
  phase: "idle",
  tPlayers: [],
  mapIds: [],
  currentRaceIndex: 0,

  startTournament: (players, mapIds) => {
    const tPlayers: TournamentPlayer[] = players.map(p => ({
      id: p.id, name: p.name, color: p.color, emoji: p.emoji,
      results: Array(mapIds.length).fill(null),
    }));
    set({ phase: "pre-race", tPlayers, mapIds, currentRaceIndex: 0 });
  },

  recordRace: (resultsByPlayerId) => {
    const { tPlayers, currentRaceIndex } = get();
    const updated = tPlayers.map(p => {
      const result = resultsByPlayerId[p.id] ?? { rank: tPlayers.length, time: null };
      const results = [...p.results];
      results[currentRaceIndex] = result;
      return { ...p, results };
    });
    set({ tPlayers: updated, phase: "between" });
  },

  advance: () => {
    const { currentRaceIndex, mapIds } = get();
    const next = currentRaceIndex + 1;
    if (next >= mapIds.length) {
      set({ phase: "complete" });
    } else {
      set({ phase: "pre-race", currentRaceIndex: next });
    }
  },

  reset: () => set({ phase: "idle", tPlayers: [], mapIds: [], currentRaceIndex: 0 }),
  getStandings: () => computeStandings(get().tPlayers),
  currentMapId: () => get().mapIds[get().currentRaceIndex] ?? null,
}));
