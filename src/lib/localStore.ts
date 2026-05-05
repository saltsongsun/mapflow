import { MapDoc, Marker, MarkerType, Zone, PathLine } from './types';

const KEYS = {
  maps: 'pb:maps',
  markers: 'pb:markers',
  markerTypes: 'pb:markerTypes',
  zones: 'pb:zones',
  paths: 'pb:paths',
  currentMapId: 'pb:currentMapId',
  currentTypeId: 'pb:currentTypeId',
};

function isClient() {
  return typeof window !== 'undefined';
}

function safeGet<T>(key: string, fallback: T): T {
  if (!isClient()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeSet(key: string, value: unknown) {
  if (!isClient()) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`로컬 저장 실패 (${key}):`, e);
  }
}

export const localStore = {
  getMaps: (): MapDoc[] => safeGet(KEYS.maps, []),
  setMaps: (m: MapDoc[]) => safeSet(KEYS.maps, m),

  getMarkers: (): Marker[] => safeGet(KEYS.markers, []),
  setMarkers: (m: Marker[]) => safeSet(KEYS.markers, m),

  getMarkerTypes: (): MarkerType[] | null => {
    if (!isClient()) return null;
    const raw = localStorage.getItem(KEYS.markerTypes);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },
  setMarkerTypes: (t: MarkerType[]) => safeSet(KEYS.markerTypes, t),

  getZones: (): Zone[] => safeGet(KEYS.zones, []),
  setZones: (z: Zone[]) => safeSet(KEYS.zones, z),

  getPaths: (): PathLine[] => safeGet(KEYS.paths, []),
  setPaths: (p: PathLine[]) => safeSet(KEYS.paths, p),

  getCurrentMapId: (): string | null => {
    if (!isClient()) return null;
    return localStorage.getItem(KEYS.currentMapId);
  },
  setCurrentMapId: (id: string | null) => {
    if (!isClient()) return;
    if (id) localStorage.setItem(KEYS.currentMapId, id);
    else localStorage.removeItem(KEYS.currentMapId);
  },
  getCurrentTypeId: (): string | null => {
    if (!isClient()) return null;
    return localStorage.getItem(KEYS.currentTypeId);
  },
  setCurrentTypeId: (id: string) => {
    if (!isClient()) return;
    localStorage.setItem(KEYS.currentTypeId, id);
  },
};
