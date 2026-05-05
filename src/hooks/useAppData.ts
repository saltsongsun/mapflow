import { useEffect, useState, useCallback, useRef } from 'react';
import { v4 as uuid } from 'uuid';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import { localStore } from '../lib/localStore';
import { MapDoc, Marker, MarkerType, DEFAULT_MARKER_TYPES } from '../lib/types';

export function useAppData() {
  const [maps, setMaps] = useState<MapDoc[]>([]);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [markerTypes, setMarkerTypes] = useState<MarkerType[]>(DEFAULT_MARKER_TYPES);
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
      const localMapId = localStore.getCurrentMapId();
      const savedTypeId = localStore.getCurrentTypeId();
      // 저장된 타입 ID가 현재 타입 목록에 있으면 사용, 없으면 첫 번째 또는 빈 문자열
      const localTypeId =
        savedTypeId && localTypes.some((t) => t.id === savedTypeId)
          ? savedTypeId
          : localTypes[0]?.id || '';

      setMaps(localMaps);
      setMarkers(localMarkers);
      setMarkerTypes(localTypes);
      setCurrentMapId(localMapId);
      setCurrentTypeId(localTypeId);
      setLoading(false);

      // 2단계: Supabase에서 동기화 (있는 경우)
      const sb = getSupabase();
      if (sb) {
        setSyncStatus('syncing');
        try {
          const [mapsRes, markersRes, typesRes] = await Promise.all([
            sb.from('maps').select('*').order('created_at', { ascending: false }),
            sb.from('markers').select('*'),
            sb.from('marker_types').select('*'),
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

    const channel = sb
      .channel('app-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'markers' }, () => {
        sb.from('markers')
          .select('*')
          .then(({ data }) => {
            if (data) {
              setMarkers(data);
              localStore.setMarkers(data);
            }
          });
      })
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
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, []);

  // 지도 추가
  const addMap = useCallback(async (map: Omit<MapDoc, 'id' | 'created_at' | 'updated_at'>) => {
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
    if (sb) {
      await sb.from('maps').insert(newMap);
    }
    return newMap;
  }, []);

  // 지도 삭제
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
      if (currentMapId === id) {
        setCurrentMapId(null);
        localStore.setCurrentMapId(null);
      }
      const sb = getSupabase();
      if (sb) {
        await sb.from('markers').delete().eq('map_id', id);
        await sb.from('maps').delete().eq('id', id);
      }
    },
    [currentMapId]
  );

  // 마커 추가
  const addMarker = useCallback(
    async (data: Omit<Marker, 'id' | 'created_at' | 'updated_at'>) => {
      const now = new Date().toISOString();
      const newMarker: Marker = { id: uuid(), created_at: now, updated_at: now, ...data };
      setMarkers((prev) => {
        const next = [...prev, newMarker];
        localStore.setMarkers(next);
        return next;
      });
      const sb = getSupabase();
      if (sb) {
        await sb.from('markers').insert(newMarker);
      }
      return newMarker;
    },
    []
  );

  // 마커 삭제
  const removeMarker = useCallback(async (id: string) => {
    setMarkers((prev) => {
      const next = prev.filter((m) => m.id !== id);
      localStore.setMarkers(next);
      return next;
    });
    const sb = getSupabase();
    if (sb) {
      await sb.from('markers').delete().eq('id', id);
    }
  }, []);

  // 마커 업데이트
  const updateMarker = useCallback(async (id: string, patch: Partial<Marker>) => {
    const now = new Date().toISOString();
    setMarkers((prev) => {
      const next = prev.map((m) => (m.id === id ? { ...m, ...patch, updated_at: now } : m));
      localStore.setMarkers(next);
      return next;
    });
    const sb = getSupabase();
    if (sb) {
      await sb.from('markers').update({ ...patch, updated_at: now }).eq('id', id);
    }
  }, []);

  // 마커 타입 저장
  const saveMarkerTypes = useCallback(
    async (types: MarkerType[]) => {
      setMarkerTypes(types);
      localStore.setMarkerTypes(types);
      // 현재 선택된 타입이 삭제됐으면 첫 번째로 변경
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

  const selectMap = useCallback((id: string | null) => {
    setCurrentMapId(id);
    localStore.setCurrentMapId(id);
  }, []);

  const selectType = useCallback((id: string) => {
    setCurrentTypeId(id);
    localStore.setCurrentTypeId(id);
  }, []);

  return {
    maps,
    markers,
    markerTypes,
    currentMapId,
    currentTypeId,
    currentMap: maps.find((m) => m.id === currentMapId) || null,
    currentMarkers: markers.filter((m) => m.map_id === currentMapId),
    loading,
    syncStatus,
    isCloudConnected: isSupabaseConfigured,
    addMap,
    removeMap,
    addMarker,
    removeMarker,
    updateMarker,
    saveMarkerTypes,
    selectMap,
    selectType,
  };
}
