import { useEffect, useRef, useState, useCallback } from 'react';
import { Point2D } from '../lib/types';
import { pointAlongPolyline, polylineLength, easeInOutCubic } from '../lib/geometry';

export interface MovementAnimation {
  markerId: string;
  route: Point2D[];
  durationMs: number;
  startedAt: number;
  // 콜백: 끝났을 때 최종 위치를 저장
  onComplete: (finalPos: Point2D) => void;
}

export interface ActiveMovement {
  markerId: string;
  currentPos: Point2D;
  progress: number; // 0~1
  totalDistance: number; // 정규화 거리
  durationMs: number;
}

/**
 * 여러 마커가 동시에 길을 따라 이동하는 애니메이션을 관리.
 * - startMovement(markerId, route, durationMs)로 시작
 * - 매 프레임 currentPositions에서 markerId의 임시 위치를 가져갈 수 있음
 * - 종료되면 자동으로 onComplete 호출 + 목록에서 제거
 */
export function useMarkerAnimation() {
  // 진행 중인 모든 애니메이션 (markerId → 정보)
  const animationsRef = useRef<Map<string, MovementAnimation>>(new Map());
  // 매 프레임 갱신되는 임시 위치 (리렌더 트리거용)
  const [activeMovements, setActiveMovements] = useState<Map<string, ActiveMovement>>(
    new Map()
  );
  const rafRef = useRef<number | null>(null);

  const tick = useCallback(() => {
    const now = performance.now();
    const animations = animationsRef.current;
    if (animations.size === 0) {
      rafRef.current = null;
      return;
    }

    const next = new Map<string, ActiveMovement>();
    const completed: MovementAnimation[] = [];

    animations.forEach((anim, markerId) => {
      const elapsed = now - anim.startedAt;
      const rawT = Math.min(1, elapsed / anim.durationMs);
      const eased = easeInOutCubic(rawT);
      const pos = pointAlongPolyline(anim.route, eased);

      next.set(markerId, {
        markerId,
        currentPos: pos,
        progress: rawT,
        totalDistance: polylineLength(anim.route),
        durationMs: anim.durationMs,
      });

      if (rawT >= 1) {
        completed.push(anim);
      }
    });

    setActiveMovements(next);

    // 완료된 것들 처리
    if (completed.length > 0) {
      for (const anim of completed) {
        animations.delete(anim.markerId);
        // 최종 위치 = 경로의 마지막 점
        const finalPos = anim.route[anim.route.length - 1];
        anim.onComplete(finalPos);
      }
    }

    if (animations.size > 0) {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      rafRef.current = null;
      // 완료 직후 Map을 비우기
      setActiveMovements(new Map());
    }
  }, []);

  const ensureLoop = useCallback(() => {
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [tick]);

  const startMovement = useCallback(
    (
      markerId: string,
      route: Point2D[],
      durationMs: number,
      onComplete: (finalPos: Point2D) => void
    ) => {
      if (route.length < 2) {
        // 경로가 없으면 즉시 완료
        onComplete(route[route.length - 1] || { x: 0.5, y: 0.5 });
        return;
      }
      // 같은 마커가 이미 움직이고 있으면 교체
      animationsRef.current.set(markerId, {
        markerId,
        route,
        durationMs,
        startedAt: performance.now(),
        onComplete,
      });
      ensureLoop();
    },
    [ensureLoop]
  );

  const cancelMovement = useCallback((markerId: string) => {
    animationsRef.current.delete(markerId);
    setActiveMovements((prev) => {
      if (!prev.has(markerId)) return prev;
      const next = new Map(prev);
      next.delete(markerId);
      return next;
    });
  }, []);

  const isAnimating = useCallback((markerId: string) => {
    return animationsRef.current.has(markerId);
  }, []);

  // 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      animationsRef.current.clear();
    };
  }, []);

  return {
    activeMovements,
    startMovement,
    cancelMovement,
    isAnimating,
  };
}
