import { create } from "zustand";
import { ObstacleDef } from "@/lib/trackBuilder";

export interface CustomMap {
  id: string;
  name: string;
  createdAt: number;
  obstacles: ObstacleDef[];
  /** Thumbnail as a data URL (small canvas snapshot) */
  thumbnail?: string;
}

const STORAGE_KEY = "marble-race-maps";
const SELECTED_KEY = "marble-race-selected-map";
const THEME_KEY    = "marble-race-theme";

// Built-in map sentinel — null means "use buildTrack default"
export const DEFAULT_MAP_ID = "default";

function loadMaps(): CustomMap[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveMaps(maps: CustomMap[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(maps));
  } catch {}
}

interface MapStore {
  customMaps: CustomMap[];
  selectedMapId: string;
  activeThemeId: string;
  _hydrated: boolean;

  hydrate: () => void;
  saveMap: (map: Omit<CustomMap, "id" | "createdAt">) => string;
  updateMap: (id: string, map: Omit<CustomMap, "id" | "createdAt">) => void;
  deleteMap: (id: string) => void;
  selectMap: (id: string) => void;
  setActiveThemeId: (id: string) => void;
  getSelectedObstacles: () => ObstacleDef[] | null;
  updateThumbnail: (id: string, thumbnail: string) => void;
}

export const useMapStore = create<MapStore>((set, get) => ({
  // Always start with safe defaults — same on server and client.
  // Call hydrate() in a useEffect to load persisted localStorage values.
  customMaps:    [],
  selectedMapId: DEFAULT_MAP_ID,
  activeThemeId: "default",
  _hydrated:     false,

  hydrate: () => {
    if (get()._hydrated) return;
    try {
      const maps       = loadMaps();
      const selectedId = localStorage.getItem(SELECTED_KEY) ?? DEFAULT_MAP_ID;
      const themeId    = localStorage.getItem(THEME_KEY)    ?? "default";
      set({ customMaps: maps, selectedMapId: selectedId, activeThemeId: themeId, _hydrated: true });
    } catch {
      set({ _hydrated: true });
    }
  },

  saveMap: (map) => {
    const id = `map-${Date.now()}`;
    const full: CustomMap = { ...map, id, createdAt: Date.now() };
    const maps = [...get().customMaps, full];
    saveMaps(maps);
    set({ customMaps: maps });
    return id;
  },

  updateMap: (id, map) => {
    const maps = get().customMaps.map(m =>
      m.id === id ? { ...m, ...map } : m
    );
    saveMaps(maps);
    set({ customMaps: maps });
  },

  deleteMap: (id) => {
    const maps = get().customMaps.filter(m => m.id !== id);
    saveMaps(maps);
    const wasSelected = get().selectedMapId === id;
    const selectedMapId = wasSelected ? DEFAULT_MAP_ID : get().selectedMapId;
    set({ customMaps: maps, selectedMapId });
    if (wasSelected) {
      try { localStorage.setItem(SELECTED_KEY, DEFAULT_MAP_ID); } catch {}
    }
  },

  selectMap: (id) => {
    localStorage.setItem(SELECTED_KEY, id);
    set({ selectedMapId: id });
  },

  setActiveThemeId: (id) => {
    localStorage.setItem(THEME_KEY, id);
    set({ activeThemeId: id });
  },

  getSelectedObstacles: () => {
    const { selectedMapId, customMaps } = get();
    if (selectedMapId === DEFAULT_MAP_ID) return null;
    return customMaps.find(m => m.id === selectedMapId)?.obstacles ?? null;
  },

  updateThumbnail: (id, thumbnail) => {
    const maps = get().customMaps.map(m => m.id === id ? { ...m, thumbnail } : m);
    saveMaps(maps);
 