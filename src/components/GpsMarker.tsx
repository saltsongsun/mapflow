import React, { useState } from 'react';
import { GpsLocation, GPS_STALE_THRESHOLD_MS } from '../lib/types';

interface GpsMarkerProps {
  location: GpsLocation;
  scale: number;
  /** 현재 사용자 본인의 마커인지 (강조 표시) */
  isSelf: boolean;
}

export function GpsMarker({ location, scale, isSelf }: GpsMarkerProps) {
  const [hovered, setHovered] = useState(false);
  const inverseScale = 1 / scale;

  if (location.x === undefined || location.y === undefined) return null;

  const updatedAt = new Date(location.updated_at).getTime();
  const age = Date.now() - updatedAt;
  const stale = age > GPS_STALE_THRESHOLD_MS;

  const color = location.user_color;
  const opacity = stale ? 0.5 : 1;

  return (
    <div
      className="gps-marker"
      style={{
        position: 'absolute',
        left: `${location.x * 100}%`,
        top: `${location.y * 100}%`,
        marginLeft: '-14px',
        marginTop: '-14px',
        width: '28px',
        height: '28px',
        transform: `scale(${inverseScale})`,
        // @ts-ignore CSS variable
        '--gps-color': color,
        opacity,
        zIndex: hovered ? 60 : 20,
        pointerEvents: 'auto',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* 정확도 원 (배경) - 정확도가 낮을수록 큰 반경 표시 */}
      {location.accuracy_m && location.accuracy_m > 5 && (
        <div
          className="gps-accuracy-ring"
          style={{
            // @ts-ignore
            '--gps-color': color,
            // 화면에 보이는 정도로 (대충 50m → 50px 정도, 너무 크면 잘림)
            width: `${Math.min(80, Math.max(28, location.accuracy_m))}px`,
            height: `${Math.min(80, Math.max(28, location.accuracy_m))}px`,
          }}
        />
      )}
      <div
        className={`gps-marker-core ${stale ? 'gps-stale' : ''} ${isSelf ? 'gps-self' : ''}`}
        style={{
          // @ts-ignore
          '--gps-color': color,
        }}
      />
      <div
        className="gps-marker-badge"
        style={{
          // @ts-ignore
          '--gps-color': color,
        }}
      >
        GPS
      </div>

      {hovered && (
        <div className="marker-tooltip">
          <div className="marker-tooltip-row">
            <span
              className="marker-tooltip-dot"
              style={{ background: color, boxShadow: `0 0 6px ${color}` }}
            />
            <span className="marker-tooltip-label" style={{ color }}>
              {location.user_name}
              {isSelf && (
                <span className="text-text-dim" style={{ fontWeight: 400, marginLeft: 4 }}>
                  (나)
                </span>
              )}
            </span>
          </div>
          <div className="marker-tooltip-row" style={{ fontSize: 10, color: '#9a9ab0' }}>
            <span>📡 GPS</span>
            {location.accuracy_m && (
              <span style={{ marginLeft: 'auto' }}>±{location.accuracy_m.toFixed(0)}m</span>
            )}
          </div>
          <div className="marker-tooltip-note">
            {formatRelativeTime(age)}
            {stale && <span style={{ color: '#ffb35c', marginLeft: 6 }}>· 갱신 지연</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function formatRelativeTime(ms: number): string {
  if (ms < 5000) return '방금';
  if (ms < 60000) return `${Math.floor(ms / 1000)}초 전`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}분 전`;
  return `${Math.floor(ms / 3600000)}시간 전`;
}
