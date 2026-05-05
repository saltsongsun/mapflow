import React, { useRef, useState, useCallback } from 'react';
import { Marker, MarkerType, MarkerStatus } from '../lib/types';

interface MarkerDotProps {
  marker: Marker;
  type: MarkerType | undefined;
  status?: MarkerStatus;
  scale: number; // 현재 줌 레벨 (마커 크기 역보정에 사용)
  showLabel: boolean;
  /**
   * 편집 가능 여부. false면 마커는 단순 표시용으로 동작 (클릭/드래그 비활성).
   * 부모(지도) 영역의 팬/줌은 정상 동작하도록 포인터 이벤트를 통과시킴.
   */
  editable: boolean;
  /**
   * 부모(이미지) 요소의 화면상 bounding rect를 얻기 위한 ref.
   * 드래그 시 마커 위치를 0~1 정규화 좌표로 환산하기 위해 필요.
   */
  containerRef: React.RefObject<HTMLElement | null>;
  /** 드래그 시작 시 호출 (지도 팬 비활성화 신호) */
  onDragStart: () => void;
  /** 드래그 종료 시 호출 (지도 팬 재활성화 신호). 클릭으로 끝나도 호출됨. */
  onDragEnd: () => void;
  /** 마커가 클릭(또는 짧은 탭)으로 끝났을 때 */
  onClick: () => void;
  /** 드래그가 끝나 위치가 확정되었을 때 호출 (정규화된 0~1 좌표) */
  onMove: (x: number, y: number) => void;
}

const DRAG_DISTANCE_THRESHOLD = 8; // 이 거리(px) 이상 움직이면 드래그로 간주
const LONG_PRESS_THRESHOLD = 180; // 또는 이 시간(ms) 이상 누르면 드래그 가능

export function MarkerDot({
  marker,
  type,
  status,
  scale,
  showLabel,
  editable,
  containerRef,
  onDragStart,
  onDragEnd,
  onClick,
  onMove,
}: MarkerDotProps) {
  const color = type?.color || '#7c5cff';
  // 줌해도 마커 크기는 일정하게 보이도록 역스케일
  const inverseScale = 1 / scale;

  // 드래그 중에는 marker.x/y 대신 이 임시 위치를 사용 (실시간 이동 표시)
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // 포인터 추적 상태 (ref로 보관해 리렌더 없이 빠르게 업데이트)
  const pointerRef = useRef<{
    id: number;
    startX: number;
    startY: number;
    startTime: number;
    activated: boolean; // 드래그가 임계치를 넘어 활성화되었는지
    longPressTimer: ReturnType<typeof setTimeout> | null;
  } | null>(null);

  const computeNormalized = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      const el = containerRef.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return null;
      const x = (clientX - rect.left) / rect.width;
      const y = (clientY - rect.top) / rect.height;
      // 이미지 영역 밖으로 나가면 0~1 사이로 클램프
      return {
        x: Math.max(0, Math.min(1, x)),
        y: Math.max(0, Math.min(1, y)),
      };
    },
    [containerRef]
  );

  const activateDrag = useCallback(() => {
    if (!pointerRef.current || pointerRef.current.activated) return;
    pointerRef.current.activated = true;
    setIsDragging(true);
    onDragStart();
  }, [onDragStart]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // 마우스 우클릭은 무시
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    e.stopPropagation();
    // 부모(지도)의 팬 동작 차단을 위해 capture
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);

    const longPressTimer = setTimeout(() => {
      // 길게 누르고 있으면 즉시 드래그 모드로 전환 (제자리에서)
      if (pointerRef.current && !pointerRef.current.activated) {
        activateDrag();
        // 진동 피드백 (지원 기기에서만)
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate(20);
          } catch {
            /* ignore */
          }
        }
      }
    }, LONG_PRESS_THRESHOLD);

    pointerRef.current = {
      id: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startTime: Date.now(),
      activated: false,
      longPressTimer,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = pointerRef.current;
    if (!p || p.id !== e.pointerId) return;

    const dx = e.clientX - p.startX;
    const dy = e.clientY - p.startY;

    // 임계치 넘으면 드래그 활성화
    if (!p.activated) {
      const dist = Math.hypot(dx, dy);
      if (dist > DRAG_DISTANCE_THRESHOLD) {
        if (p.longPressTimer) {
          clearTimeout(p.longPressTimer);
          p.longPressTimer = null;
        }
        activateDrag();
      } else {
        return;
      }
    }

    // 드래그 활성 상태에서는 매 이동마다 임시 위치 업데이트
    e.stopPropagation();
    e.preventDefault();
    const normalized = computeNormalized(e.clientX, e.clientY);
    if (normalized) {
      setDragPos(normalized);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = pointerRef.current;
    if (!p || p.id !== e.pointerId) return;

    if (p.longPressTimer) {
      clearTimeout(p.longPressTimer);
      p.longPressTimer = null;
    }

    try {
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }

    if (p.activated) {
      // 드래그였음 → 위치 확정
      const normalized = computeNormalized(e.clientX, e.clientY);
      if (normalized) {
        onMove(normalized.x, normalized.y);
      }
      setIsDragging(false);
      setDragPos(null);
      onDragEnd();
    } else {
      // 클릭이었음
      const dt = Date.now() - p.startTime;
      const dist = Math.hypot(e.clientX - p.startX, e.clientY - p.startY);
      // 안전장치: 너무 길거나 너무 많이 움직였으면 클릭 무시
      if (dt < 500 && dist <= DRAG_DISTANCE_THRESHOLD) {
        onClick();
      }
      onDragEnd(); // 활성화 안 됐어도 onDragStart는 호출 안 했으므로 무해
    }

    pointerRef.current = null;
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = pointerRef.current;
    if (!p || p.id !== e.pointerId) return;

    if (p.longPressTimer) {
      clearTimeout(p.longPressTimer);
    }
    if (p.activated) {
      setIsDragging(false);
      setDragPos(null);
      onDragEnd();
    }
    pointerRef.current = null;
  };

  // 화면에 표시할 위치: 드래그 중이면 임시 위치, 아니면 실제 위치
  const displayX = dragPos ? dragPos.x : marker.x;
  const displayY = dragPos ? dragPos.y : marker.y;

  return (
    <div
      className={`marker-dot${isDragging ? ' marker-dragging' : ''}${
        !editable ? ' marker-readonly' : ''
      }`}
      style={{
        left: `${displayX * 100}%`,
        top: `${displayY * 100}%`,
        transform: `scale(${inverseScale * (isDragging ? 1.25 : 1)})`,
        // @ts-ignore CSS custom property
        '--marker-color': color,
        // 편집 모드일 때만 포인터 이벤트 받기. 보기 모드에서는 클릭이 지도로 통과되어
        // 마커 위에서도 자유롭게 팬/줌 가능.
        pointerEvents: editable ? 'auto' : 'none',
        touchAction: 'none',
        cursor: editable ? (isDragging ? 'grabbing' : 'grab') : 'default',
        zIndex: isDragging ? 50 : 10,
      }}
      onPointerDown={editable ? handlePointerDown : undefined}
      onPointerMove={editable ? handlePointerMove : undefined}
      onPointerUp={editable ? handlePointerUp : undefined}
      onPointerCancel={editable ? handlePointerCancel : undefined}
    >
      <div className="marker-pulse" />
      <div className="marker-pulse-2" />
      <div className="marker-core" />
      {/* 상태 배지 - 마커 우상단에 작은 점 + 라벨 색상 */}
      {status && (
        <div
          className="marker-status-badge"
          style={{
            // @ts-ignore CSS variable
            '--status-color': status.color,
          }}
          title={status.label}
        />
      )}
      {showLabel && type && (
        <div className="marker-label" style={{ color: color }}>
          {type.label}
          {status ? (
            <span style={{ color: status.color, marginLeft: 4 }}>· {status.label}</span>
          ) : null}
          {marker.note ? ` · ${marker.note}` : ''}
        </div>
      )}
    </div>
  );
}
