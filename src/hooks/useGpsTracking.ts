import { useEffect, useState, useRef, useCallback } from 'react';
import {
  GpsLocation,
  User,
  MapDoc,
  GPS_UPDATE_INTERVAL_MS,
  GeoPoint,
} from '../lib/types';
import { geoToMapPoint } from '../lib/geo';

export interface GpsTrackingState {
  enabled: boolean;
  permission: 'unknown' | 'granted' | 'denied' | 'prompt';
  lastPosition: { lat: number; lng: number; accuracy: number; timestamp: number } | null;
  error: string | null;
  /** Wake Lock 활성 여부 (화면 꺼짐 방지) */
  wakeLockActive: boolean;
}

interface UseGpsTrackingParams {
  user: User;
  currentMap: MapDoc | null;
  /** 위치를 서버(또는 로컬)에 저장하는 콜백 */
  onUpdateLocation: (loc: GpsLocation) => void;
  /** 사용자가 추적을 끌 때 위치를 제거할 콜백 */
  onClearLocation: (userId: string) => void;
}

export function useGpsTracking({
  user,
  currentMap,
  onUpdateLocation,
  onClearLocation,
}: UseGpsTrackingParams) {
  const [state, setState] = useState<GpsTrackingState>({
    enabled: false,
    permission: 'unknown',
    lastPosition: null,
    error: null,
    wakeLockActive: false,
  });

  const watchIdRef = useRef<number | null>(null);
  const sendTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wakeLockRef = useRef<any>(null);
  // 마지막으로 받은 GPS 좌표 (전송 시 사용)
  const lastGeoRef = useRef<{
    lat: number;
    lng: number;
    accuracy: number;
    timestamp: number;
  } | null>(null);

  // 권한 상태 확인
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.permissions) return;
    navigator.permissions
      .query({ name: 'geolocation' as PermissionName })
      .then((result) => {
        setState((s) => ({
          ...s,
          permission: result.state as GpsTrackingState['permission'],
        }));
        result.onchange = () => {
          setState((s) => ({
            ...s,
            permission: result.state as GpsTrackingState['permission'],
          }));
        };
      })
      .catch(() => {
        // 일부 브라우저는 geolocation 권한 쿼리를 지원하지 않음
      });
  }, []);

  const sendLocation = useCallback(() => {
    const geo = lastGeoRef.current;
    if (!geo) return;

    let mapped: { x: number; y: number; map_id: string } | undefined;
    if (currentMap?.geo_calibration) {
      const p = geoToMapPoint(
        { lat: geo.lat, lng: geo.lng },
        currentMap.geo_calibration
      );
      if (p && p.x >= -0.1 && p.x <= 1.1 && p.y >= -0.1 && p.y <= 1.1) {
        // 지도 영역 또는 그 근처 (10% 마진)일 때만 매핑된 것으로 간주
        mapped = {
          map_id: currentMap.id,
          x: Math.max(0, Math.min(1, p.x)),
          y: Math.max(0, Math.min(1, p.y)),
        };
      }
    }

    onUpdateLocation({
      user_id: user.id,
      user_name: user.name,
      user_color: user.color,
      lat: geo.lat,
      lng: geo.lng,
      accuracy_m: geo.accuracy,
      map_id: mapped?.map_id,
      x: mapped?.x,
      y: mapped?.y,
      updated_at: new Date().toISOString(),
    });
  }, [user, currentMap, onUpdateLocation]);

  const requestWakeLock = useCallback(async () => {
    try {
      // Wake Lock API (지원하는 브라우저에서만)
      // @ts-ignore
      if (typeof navigator !== 'undefined' && navigator.wakeLock) {
        // @ts-ignore
        const wl = await navigator.wakeLock.request('screen');
        wakeLockRef.current = wl;
        setState((s) => ({ ...s, wakeLockActive: true }));
        wl.addEventListener?.('release', () => {
          setState((s) => ({ ...s, wakeLockActive: false }));
        });
      }
    } catch {
      // 거부되거나 지원 안 함
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    try {
      if (wakeLockRef.current) {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    } catch {
      /* ignore */
    }
    setState((s) => ({ ...s, wakeLockActive: false }));
  }, []);

  // 페이지가 다시 보이면 Wake Lock 재취득 (탭 전환 시 자동 해제됨)
  useEffect(() => {
    const handleVisible = () => {
      if (document.visibilityState === 'visible' && state.enabled) {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisible);
    return () => document.removeEventListener('visibilitychange', handleVisible);
  }, [state.enabled, requestWakeLock]);

  const start = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setState((s) => ({ ...s, error: '이 브라우저는 GPS를 지원하지 않습니다' }));
      return;
    }
    if (watchIdRef.current !== null) return;

    setState((s) => ({ ...s, error: null }));

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        lastGeoRef.current = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        };
        setState((s) => ({
          ...s,
          lastPosition: lastGeoRef.current,
          error: null,
          enabled: true,
        }));
        // 첫 위치 즉시 전송
        sendLocation();
      },
      (err) => {
        setState((s) => ({ ...s, error: err.message, enabled: false }));
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 30000,
      }
    );
    watchIdRef.current = id;

    // 주기적으로 마지막 위치 전송 (네트워크 약할 때 안정성)
    sendTimerRef.current = setInterval(sendLocation, GPS_UPDATE_INTERVAL_MS);

    requestWakeLock();
    setState((s) => ({ ...s, enabled: true }));
  }, [sendLocation, requestWakeLock]);

  const stop = useCallback(() => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (sendTimerRef.current !== null) {
      clearInterval(sendTimerRef.current);
      sendTimerRef.current = null;
    }
    releaseWakeLock();
    onClearLocation(user.id);
    lastGeoRef.current = null;
    setState((s) => ({ ...s, enabled: false, lastPosition: null }));
  }, [user.id, onClearLocation, releaseWakeLock]);

  // 지도 변경 시 즉시 재전송 (지도-좌표 매핑 갱신)
  useEffect(() => {
    if (state.enabled) {
      sendLocation();
    }
  }, [currentMap?.id, state.enabled, sendLocation]);

  // 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (sendTimerRef.current !== null) {
        clearInterval(sendTimerRef.current);
      }
      if (wakeLockRef.current) {
        wakeLockRef.current.release?.().catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { state, start, stop };
}
