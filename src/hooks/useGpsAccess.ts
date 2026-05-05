import { useEffect, useState, useCallback } from 'react';

const GPS_KEY_STORAGE = 'pb:gps-access-key';

/**
 * 사용자가 가진 GPS 액세스 키 관리.
 * - URL 파라미터(?gps=KEY)로 접속 시 자동 저장
 * - localStorage에 보관 (재방문 시 유지)
 * - 검증은 부모(serverKey와 비교)에서 수행
 */
export function useGpsAccess(serverKey: string | undefined) {
  const [userKey, setUserKey] = useState<string>('');

  // 초기 로드: URL 파라미터 → localStorage 순으로 시도
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // URL에서 ?gps=KEY 추출
    const urlParams = new URLSearchParams(window.location.search);
    const fromUrl = urlParams.get('gps');
    if (fromUrl) {
      setUserKey(fromUrl);
      try {
        localStorage.setItem(GPS_KEY_STORAGE, fromUrl);
      } catch {
        /* ignore */
      }
      // URL에서 파라미터 제거 (북마크/공유 시 키 노출 방지)
      const cleanUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, '', cleanUrl);
      return;
    }

    // localStorage에서 복원
    try {
      const stored = localStorage.getItem(GPS_KEY_STORAGE);
      if (stored) setUserKey(stored);
    } catch {
      /* ignore */
    }
  }, []);

  const saveKey = useCallback((key: string) => {
    setUserKey(key);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(GPS_KEY_STORAGE, key);
      } catch {
        /* ignore */
      }
    }
  }, []);

  const clearKey = useCallback(() => {
    setUserKey('');
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(GPS_KEY_STORAGE);
      } catch {
        /* ignore */
      }
    }
  }, []);

  // serverKey가 비어있으면 모두 허용 (보호 비활성)
  // serverKey가 있으면 일치해야 함
  const requiresKey = !!serverKey && serverKey.length > 0;
  const hasAccess = !requiresKey || userKey === serverKey;

  return {
    userKey,
    requiresKey,
    hasAccess,
    saveKey,
    clearKey,
  };
}
