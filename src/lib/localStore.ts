import { MapDoc, Marker, MarkerType } from './types';

const KEYS = {
  maps: 'pb:maps',
  markers: 'pb:markers',
  markerTypes: 'pb:markerTypes',
  currentMapId: 'pb:currentMapId',
  currentTypeId: 'pb:currentTypeId',
};

function isClient() {
  return typeof window !== 'undefined';
}

export const localStore = {
  getMaps(): MapDoc[] {
    if (!isClient()) return [];
    try {
      return JSON.parse(localStorage.getItem(KEYS.maps) || '[]');
    } catch {
      return [];
    }
  },
  setMaps(maps: MapDoc[]) {
    if (!isClient()) return;
    try {
      localStorage.setItem(KEYS.maps, JSON.stringify(maps));
    } catch (e) {
      console.error('지도 저장 실패 (용량 초과 가능):', e);
    }
  },
  getMarkers(): Marker[] {
    if (!isClient()) return [];
    try {
      return JSON.parse(localStorage.getItem(KEYS.markers) || '[]');
    } catch {
      return [];
    }
  },
  setMarkers(markers: Marker[]) {
    if (!isClient()) return;
    localStorage.setItem(KEYS.markers, JSON.stringify(markers));
  },
  getMarkerTypes(): MarkerType[] | null {
    if (!isClient()) return null;
    const raw = localStorage.getItem(KEYS.markerTypes);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },
  setMarkerTypes(types: MarkerType[]) {
    if (!isClient()) return;
    localStorage.setItem(KEYS.markerTypes, JSON.stringify(types));
  },
  getCurrentMapId(): string | null {
    if (!isClient()) return null;
    return localStorage.getItem(KEYS.currentMapId);
  },
  setCurrentMapId(id: string | null) {
    if (!isClient()) return;
    if (id) localStorage.setItem(KEYS.currentMapId, id);
    else localStorage.removeItem(KEYS.currentMapId);
  },
  getCurrentTypeId(): string | null {
    if (!isClient()) return null;
    return localStorage.getItem(KEYS.currentTypeId);
  },
  setCurrentTypeId(id: string) {
    if (!isClient()) return;
    localStorage.setItem(KEYS.currentTypeId, id);
  },
};
