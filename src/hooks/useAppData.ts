import { useEffect, useState, useCallback, useRef } from 'react';
import { v4 as uuid } from 'uuid';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import { localStore } from '../lib/localStore';
import {
  MapDoc,
  Marker,
  MarkerType,
  MarkerStatus,
  Zone,
  PathLine,
  MapCalibration,
  DEFAULT_MARKER_TYPES,
  DEFAULT_MARKER_STATUSES,
} from '../lib/types';

export function useAppData() {
  const [maps, setMaps] = useState<MapDoc[]>([]);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [markerTypes, setMarkerTypes] = useState<MarkerType[]>(DEFAULT_MARKER_TYPES);
  const [markerStatuses, setMarkerStatuses] =
    useState<MarkerStatus[]>(DEFAULT_MARKER_STATUSES);
  const [zones, setZones] = useState<Zone[]>([]);
  const [paths, setPaths] = useState<PathLine[]>([]);
  const [currentMapId, setCurrentMapId] = useState<string | null>(null);
  const [currentTypeId, setCurrentTypeId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'local' | 'synced' | 'syncing' | 'error'>(
    'local'
  );
  const initialized = useRef(false);

  // 초기 로딩
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    (async () => {
      // 1단계: 로컬에서 즉시 복원
      const localMaps = localStore.getMaps();
      const localMarkers = localStore.getMarkers();
      const localTypes = localStore.getMarkerTypes() || DEFAULT_MARKER_TYPES;
      const localStatuses = localStore.getMarkerStatuses() || DEFAULT_MARKER_STATUSES;
      const localZones = localStore.getZones();
      const localPaths = localStore.getPaths();
      const localMapId = localStore.getCurrentMapId();
      const savedTypeId = localStore.getCurrentTypeId();
      const localTypeId =
        savedTypeId && localTypes.some((t) => t.id === savedTypeId)
          ? savedTypeId
          : localTypes[0]?.id || '';

      setMaps(localMaps);
      setMarkers(localMarkers);
      setMarkerTypes(localTypes);
      setMarkerStatuses(localStatuses);
      setZones(localZones);
      setPaths(localPaths);
      setCurrentMapId(localMapId);
      setCurrentTypeId(localTypeId);
      setLoading(false);

      // 2단계: Supabase에서 동기화
      const sb = getSupabase();
      if (sb) {
        setSyncStatus('syncing');
        try {
          const [mapsRes, markersRes, typesRes, statusesRes, zonesRes, pathsRes] =
            await Promise.all([
              sb.from('maps').select('*').order('created_at', { ascending: false }),
              sb.from('markers').select('*'),
              sb.from('marker_types').select('*'),
              sb.from('marker_statuses').select('*'),
              sb.from('zones').select('*'),
              sb.from('paths').select('*'),
            ]);

          if (!mapsRes.error && mapsRes.data) {
            setMaps(mapsRes.data);
            localStore.setMaps(mapsRes.data);
          }
          if (!markersRes.error && markersRes.data) {
            setMarkers(markersRes.data);
            localStore.setMarkers(markersRes.data);
          }
          if (!typesRes.error && typesRes.data && typesRes.data.length > 0) {
            setMarkerTypes(typesRes.data);
            localStore.setMarkerTypes(typesRes.data);
          }
          if (!statusesRes.error && statusesRes.data && statusesRes.data.length > 0) {
            setMarkerStatuses(statusesRes.data);
            localStore.setMarkerStatuses(statusesRes.data);
          }
          if (!zonesRes.error && zonesRes.data) {
            setZones(zonesRes.data);
            localStore.setZones(zonesRes.data);
          }
          if (!pathsRes.error && pathsRes.data) {
            setPaths(pathsRes.data);
            localStore.setPaths(pathsRes.data);
          }
          setSyncStatus('synced');
        } catch (e) {
          console.error('동기화 실패:', e);
          setSyncStatus('error');
        }
      }
    })();
  }, []);

  // 실시간 구독
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;

    const refresh = (table: string, setter: (data: any[]) => void, storeSet: (data: any[]) => void) => {
      sb.from(table)
        .select('*')
        .then(({ data }) => {
          if (data) {
            setter(data);
            storeSet(data);
          }
        });
    };

    const channel = sb
      .channel('app-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'markers' }, () =>
        refresh('markers', setMarkers, localStore.setMarkers)
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maps' }, () => {
        sb.from('maps')
          .select('*')
          .order('created_at', { ascending: false })
          .then(({ data }) => {
            if (data) {
              setMaps(data);
              localStore.setMaps(data);
            }
          });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'zones' }, () =>
        refresh('zones', setZones, localStore.setZones)
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'paths' }, () =>
        refresh('paths', setPaths, localStore.setPaths)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'marker_statuses' },
        () => refresh('marker_statuses', setMarkerStatuses, localStore.setMarkerStatuses)
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, []);

  // === Map ===
  const addMap = useCallback(
    async (map: Omit<MapDoc, 'id' | 'created_at' | 'updated_at'>) => {
      const now = new Date().toISOString();
      const newMap: MapDoc = { id: uuid(), created_at: now, updated_at: now, ...map };
      setMaps((prev) => {
        const next = [newMap, ...prev];
        localStore.setMaps(next);
        return next;
      });
      setCurrentMapId(newMap.id);
      localStore.setCurrentMapId(newMap.id);
      const sb = getSupabase();
      if (sb) await sb.from('maps').insert(newMap);
      return newMap;
    },
    []
  );

  const removeMap = useCallback(
    async (id: string) => {
      setMaps((prev) => {
        const next = prev.filter((m) => m.id !== id);
        localStore.setMaps(next);
        return next;
      });
      setMarkers((prev) => {
        const next = prev.filter((m) => m.map_id !== id);
        localStore.setMarkers(next);
        return next;
      });
      setZones((prev) => {
        const next = prev.filter((z) => z.map_id !== id);
        localStore.setZones(next);
        return next;
      });
      setPaths((prev) => {
        const next = prev.filter((p) => p.map_id !== id);
        localStore.setPaths(next);
        return next;
      });
      if (currentMapId === id) {
        setCurrentMapId(null);
        localStore.setCurrentMapId(null);
      }
      const sb = getSupabase();
      if (sb) {
        await sb.from('markers').delete().eq('map_id', id);
        await sb.from('zones').delete().eq('map_id', id);
        await sb.from('paths').delete().eq('map_id', id);
        await sb.from('maps').delete().eq('id', id);
      }
    },
    [currentMapId]
  );

  const updateMap = useCallback(async (id: string, patch: Partial<MapDoc>) => {
    const now = new Date().toISOString();
    setMaps((prev) => {
      const next = prev.map((m) =>
        m.id === id ? { ...m, ...patch, updated_at: now } : m
      );
      localStore.setMaps(next);
      return next;
    });
    const sb = getSupabase();
    if (sb) {
      await sb.from('maps').update({ ...patch, updated_at: now }).eq('id', id);
    }
  }, []);

  // === Marker ===
  const addMarker = useCallback(
    async (data: Omit<Marker, 'id' | 'created_at' | 'updated_at'>) => {
      const now = new Date().toISOString();
      const newMarker: Marker = {
        id: uuid(),
        created_at: now,
        updated_at: now,
        ...data,
      };
      setMarkers((prev) => {
        const next = [...prev, newMarker];
        localStore.setMarkers(next);
        return next;
      });
      const sb = getSupabase();
      if (sb) await sb.from('markers').insert(newMarker);
      return newMarker;
    },
    []
  );

  const removeMarker = useCallback(async (id: string) => {
    setMarkers((prev) => {
      const next = prev.filter((m) => m.id !== id);
      localStore.setMarkers(next);
      return next;
    });
    const sb = getSupabase();
    if (sb) await sb.from('markers').delete().eq('id', id);
  }, []);

  const updateMarker = useCallback(async (id: string, patch: Partial<Marker>) => {
    const now = new Date().toISOString();
    setMarkers((prev) => {
      const next = prev.map((m) =>
        m.id === id ? { ...m, ...patch, updated_at: now } : m
      );
      localStore.setMarkers(next);
      return next;
    });
    const sb = getSupabase();
    if (sb) {
      await sb.from('markers').update({ ...patch, updated_at: now }).eq('id', id);
    }
  }, []);

  // === MarkerType ===
  const saveMarkerTypes = useCallback(
    async (types: MarkerType[]) => {
      setMarkerTypes(types);
      localStore.setMarkerTypes(types);
      if (types.length > 0 && !types.some((t) => t.id === currentTypeId)) {
        setCurrentTypeId(types[0].id);
        localStore.setCurrentTypeId(types[0].id);
      } else if (types.length === 0) {
        setCurrentTypeId('');
      }
      const sb = getSupabase();
      if (sb) {
        await sb.from('marker_types').delete().neq('id', '__never__');
        if (types.length > 0) {
          await sb.from('marker_types').insert(types);
        }
      }
    },
    [currentTypeId]
  );

  // === MarkerStatus ===
  const saveMarkerStatuses = useCallback(async (statuses: MarkerStatus[]) => {
    setMarkerStatuses(statuses);
    localStore.setMarkerStatuses(statuses);
    const sb = getSupabase();
    if (sb) {
      await sb.from('marker_statuses').delete().neq('id', '__never__');
      if (statuses.length > 0) {
        await sb.from('marker_statuses').insert(statuses);
      }
    }
  }, []);

  // === Zone ===
  const addZone = useCallback(
    async (data: Omit<Zone, 'id' | 'created_at' | 'updated_at'>) => {
      const now = new Date().toISOString();
      const newZone: Zone = { id: uuid(), created_at: now, updated_at: now, ...data };
      setZones((prev) => {
        const next = [...prev, newZone];
        localStore.setZones(next);
        return next;
      });
      const sb = getSupabase();
      if (sb) await sb.from('zones').insert(newZone);
      return newZone;
    },
    []
  );

  const updateZone = useCallback(async (id: string, patch: Partial<Zone>) => {
    const now = new Date().toISOString();
    setZones((prev) => {
      const next = prev.map((z) =>
        z.id === id ? { ...z, ...patch, updated_at: now } : z
      );
      localStore.setZones(next);
      return next;
    });
    const sb = getSupabase();
    if (sb) {
      await sb.from('zones').update({ ...patch, updated_at: now }).eq('id', id);
    }
  }, []);

  const removeZone = useCallback(async (id: string) => {
    setZones((prev) => {
      const next = prev.filter((z) => z.id !== id);
      localStore.setZones(next);
      return next;
    });
    const sb = getSupabase();
    if (sb) await sb.from('zones').delete().eq('id', id);
  }, []);

  // === Path ===
  const addPath = useCallback(
    async (data: Omit<PathLine, 'id' | 'created_at' | 'updated_at'>) => {
      const now = new Date().toISOString();
      const newPath: PathLine = {
        id: uuid(),
        created_at: now,
        updated_at: now,
        ...data,
      };
      setPaths((prev) => {
        const next = [...prev, newPath];
        localStore.setPaths(next);
        return next;
      });
      const sb = getSupabase();
      if (sb) await sb.from('paths').insert(newPath);
      return newPath;
    },
    []
  );

  const updatePath = useCallback(async (id: string, patch: Partial<PathLine>) => {
    const now = new Date().toISOString();
    setPaths((prev) => {
      const next = prev.map((p) =>
        p.id === id ? { ...p, ...patch, updated_at: now } : p
      );
      localStore.setPaths(next);
      return next;
    });
    const sb = getSupabase();
    if (sb) {
      await sb.from('paths').update({ ...patch, updated_at: now }).eq('id', id);
    }
  }, []);

  const removePath = useCallback(async (id: string) => {
    setPaths((prev) => {
      const next = prev.filter((p) => p.id !== id);
      localStore.setPaths(next);
      return next;
    });
    const sb = getSupabase();
    if (sb) await sb.from('paths').delete().eq('id', id);
  }, []);

  // === Calibration ===
  const setCalibration = useCallback(
    async (mapId: string, calibration: MapCalibration | undefined) => {
      await updateMap(mapId, { calibration });
    },
    [updateMap]
  );

  // === Selection ===
  const selectMap = useCallback((id: string | null) => {
    setCurrentMapId(id);
    localStore.setCurrentMapId(id);
  }, []);

  const selectType = useCallback((id: string) => {
    setCurrentTypeId(id);
    localStore.setCurrentTypeId(id);
  }, []);

  const currentMap = maps.find((m) => m.id === currentMapId) || null;

  return {
    maps,
    markers,
    markerTypes,
    markerStatuses,
    zones,
    paths,
    currentMapId,
    currentTypeId,
    currentMap,
    currentMarkers: markers.filter((m) => m.map_id === currentMapId),
    currentZones: zones.filter((z) => z.map_id === currentMapId),
    currentPaths: paths.filter((p) => p.map_id === currentMapId),
    loading,
    syncStatus,
    isCloudConnected: isSupabaseConfigured,
    addMap,
    removeMap,
    updateMap,
    addMarker,
    removeMarker,
    updateMarker,
    saveMarkerTypes,
    saveMarkerStatuses,
    addZone,
    updateZone,
    removeZone,
    addPath,
    updatePath,
    removePath,
    setCalibration,
    selectMap,
    selectType,
  };
}
