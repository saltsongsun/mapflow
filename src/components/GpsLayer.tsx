import React from 'react';
import { GpsLocation, GPS_STALE_THRESHOLD_MS } from '../lib/types';

interface GpsLayerProps {
  mapWidth: number;
  mapHeight: number;
  locations: GpsLocation[];
  currentUserId: string;
  /** 레이어 표시 여부 */
  visible: boolean;
}

// 터콰이즈 (cyan/teal 계열) - GPS 사용자 전용 시각적 톤
const GPS_LAYER_COLOR = '#5cffe5';
const GPS_LAYER_GLOW = '#22d3c5';

/**
 * GPS 사용자들의 위치만을 위한 별도 시각 레이어.
 * 수동 마커와 완전히 다른 톤(터콰이즈)으로 한눈에 구분 가능.
 *
 * 표시 요소:
 * - 사용자 위치마다 부드러운 광원 (radial gradient)
 * - 활성 사용자가 2명 이상이면 그들 사이 연결선 (협업 시각화)
 * - 본인 위치는 파동 링 추가
 */
export function GpsLayer({
  mapWidth,
  mapHeight,
  locations,
  currentUserId,
  visible,
}: GpsLayerProps) {
  if (!visible) return null;

  const now = Date.now();
  const validLocations = locations.filter(
    (l) =>
      l.x !== undefined &&
      l.y !== undefined &&
      now - new Date(l.updated_at).getTime() < GPS_STALE_THRESHOLD_MS * 3
  );

  if (validLocations.length === 0) return null;

  const toX = (n: number) => n * mapWidth;
  const toY = (n: number) => n * mapHeight;

  // 모든 사용자 쌍을 연결할지 여부 (3명 이상이면 너무 복잡해 보일 수 있음 - 가까운 쌍만)
  const connections: Array<{ a: GpsLocation; b: GpsLocation; dist: number }> = [];
  for (let i = 0; i < validLocations.length; i++) {
    for (let j = i + 1; j < validLocations.length; j++) {
      const a = validLocations[i];
      const b = validLocations[j];
      const dist = Math.hypot((a.x! - b.x!), (a.y! - b.y!));
      // 너무 멀리 떨어진 쌍은 연결하지 않음 (정규화 단위 0.4 이상)
      if (dist < 0.4) {
        connections.push({ a, b, dist });
      }
    }
  }

  return (
    <svg
      viewBox={`0 0 ${mapWidth} ${mapHeight}`}
      preserveAspectRatio="none"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        // GPS 마커(zIndex 20)와 수동 마커(10) 사이에 배치
        zIndex: 15,
        mixBlendMode: 'screen',
      }}
    >
      <defs>
        {/* 터콰이즈 광원 그라디언트 */}
        <radialGradient id="gps-glow">
          <stop offset="0%" stopColor={GPS_LAYER_COLOR} stopOpacity="0.5" />
          <stop offset="40%" stopColor={GPS_LAYER_COLOR} stopOpacity="0.2" />
          <stop offset="100%" stopColor={GPS_LAYER_COLOR} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="gps-glow-self">
          <stop offset="0%" stopColor={GPS_LAYER_COLOR} stopOpacity="0.7" />
          <stop offset="35%" stopColor={GPS_LAYER_COLOR} stopOpacity="0.3" />
          <stop offset="100%" stopColor={GPS_LAYER_COLOR} stopOpacity="0" />
        </radialGradient>
        {/* 연결선용 그라디언트 - 양쪽 끝에서 페이드 아웃 */}
        <linearGradient id="gps-connection-gradient">
          <stop offset="0%" stopColor={GPS_LAYER_COLOR} stopOpacity="0" />
          <stop offset="20%" stopColor={GPS_LAYER_COLOR} stopOpacity="0.5" />
          <stop offset="80%" stopColor={GPS_LAYER_COLOR} stopOpacity="0.5" />
          <stop offset="100%" stopColor={GPS_LAYER_COLOR} stopOpacity="0" />
        </linearGradient>

        {/* 부드러운 블러 필터 */}
        <filter id="gps-blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={Math.min(mapWidth, mapHeight) * 0.005} />
        </filter>
      </defs>

      {/* === 연결선 (사용자 간) === */}
      {connections.map((conn, idx) => {
        const x1 = toX(conn.a.x!);
        const y1 = toY(conn.a.y!);
        const x2 = toX(conn.b.x!);
        const y2 = toY(conn.b.y!);
        return (
          <line
            key={`conn-${idx}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={GPS_LAYER_COLOR}
            strokeWidth={2}
            strokeDasharray="4 6"
            strokeOpacity={0.4}
            vectorEffect="non-scaling-stroke"
            style={{
              animation: 'gps-line-flow 3s linear infinite',
            }}
          />
        );
      })}

      {/* === 광원 (사용자별) === */}
      {validLocations.map((loc) => {
        const isSelf = loc.user_id === currentUserId;
        const cx = toX(loc.x!);
        const cy = toY(loc.y!);
        const radius = Math.min(mapWidth, mapHeight) * (isSelf ? 0.08 : 0.06);

        return (
          <g key={loc.user_id} className={isSelf ? 'gps-layer-self' : 'gps-layer-other'}>
            {/* 큰 글로우 (블러) */}
            <circle
              cx={cx}
              cy={cy}
              r={radius * 1.5}
              fill={isSelf ? 'url(#gps-glow-self)' : 'url(#gps-glow)'}
            />
            {/* 본인 위치엔 파동 링 추가 */}
            {isSelf && (
              <>
                <circle
                  cx={cx}
                  cy={cy}
                  r={radius * 0.6}
                  fill="none"
                  stroke={GPS_LAYER_COLOR}
                  strokeWidth={1.5}
                  vectorEffect="non-scaling-stroke"
                  opacity={0.6}
                  style={{
                    animation: 'gps-ping 2.5s ease-out infinite',
                    transformOrigin: `${cx}px ${cy}px`,
                  }}
                />
                <circle
                  cx={cx}
                  cy={cy}
                  r={radius * 0.6}
                  fill="none"
                  stroke={GPS_LAYER_COLOR}
                  strokeWidth={1.5}
                  vectorEffect="non-scaling-stroke"
                  opacity={0.4}
                  style={{
                    animation: 'gps-ping 2.5s ease-out infinite',
                    animationDelay: '1.25s',
                    transformOrigin: `${cx}px ${cy}px`,
                  }}
                />
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}
