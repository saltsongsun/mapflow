import { useEffect, useState, useRef, useCallback } from 'react';
import { Marker } from '../lib/types';
import { computeMarkerPosition } from '../lib/geometry';

/**
 * 여러 마커의 시간 기반 애니메이션을 매니징.
 *
 * 핵심:
 * - 마커가 moving_started_at + moving_duration_ms를 가지고 있으면 자동으로 애니메이션
 * - 매 프레임 현재 시각과 시작 시각의 차이로 진행률 계산 (RAF 멈췄다 돌아와도 정확)
 * - 페이지가 백그라운드 → 포그라운드 복귀 시 즉시 재계산
 * - 모든 마커가 이동 끝나면 RAF 루프 정지 (배터리 절약)
 */
export function useMarkerAnimations(markers: Marker[]) {
  // 타이머 트리거를 위한 카운터 (실제 위치는 매번 markers + 현재 시각으로 재계산)
  const [tick, setTick] = useState(0);
  const rafRef = useRef<number | null>(null);

  const hasActiveAnimation = useCallback(() => {
    const now = Date.now();
    for (const m of markers) {
      if (!m.moving_started_at || !m.moving_duration_ms) continue;
      const startedAt = new Date(m.moving_started_at).getTime();
      if (Number.isNaN(startedAt)) continue;
      if (now - startedAt < m.moving_duration_ms) return true;
    }
    return false;
  }, [markers]);

  const loop = useCallback(() => {
    if (!hasActiveAnimation()) {
      rafRef.current = null;
      return;
    }
    setTick((t) => t + 1);
    rafRef.current = requestAnimationFrame(loop);
  }, [hasActiveAnimation]);

  // markers가 변경될 때마다 루프 시작 (필요 시)
  useEffect(() => {
    if (hasActiveAnimation() && rafRef.current === null) {
      rafRef.current = requestAnimationFrame(loop);
    }
    return () => {
      // markers 변경으로 인한 cleanup 시에도 루프는 유지 (다음 effect가 다시 시작)
    };
  }, [markers, hasActiveAnimation, loop]);

  // 페이지가 다시 보이면 즉시 갱신 (백그라운드에서 RAF 멈췄다 돌아왔을 때 끊김 방지)
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible') {
        // 즉시 한 번 갱신
        setTick((t) => t + 1);
        // 루프가 멈췄다면 재시작
        if (hasActiveAnimation() && rafRef.current === null) {
          rafRef.current = requestAnimationFrame(loop);
        }
      }
    };
    document.addEventListener('visibilitychange', handler);
    window.addEventListener('focus', handler);
    return () => {
      document.removeEventListener('visibilitychange', handler);
      window.removeEventListener('focus', handler);
    };
  }, [hasActiveAnimation, loop]);

  // 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  /**
   * 특정 마커의 현재 위치를 가져옴 (이동 중이면 보간된 위치, 아니면 원본).
   * tick에 의존성 없어 매 프레임 새 계산이 호출자에서 자연스럽게 일어남.
   */
  const getPosition = useCallback(
    (marker: Marker) => {
      // tick은 의존성 트리거용 (사용 안 함)
      void tick;
      return computeMarkerPosition(marker);
    },
    [tick]
  );

  return { getPosition };
}
