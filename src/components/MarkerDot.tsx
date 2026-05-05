import React from 'react';
import { Marker, MarkerType } from '../lib/types';

interface MarkerDotProps {
  marker: Marker;
  type: MarkerType | undefined;
  scale: number; // 줌 레벨 (역보정에 사용)
  showLabel: boolean;
  onClick: (e: React.MouseEvent) => void;
}

export function MarkerDot({ marker, type, scale, showLabel, onClick }: MarkerDotProps) {
  const color = type?.color || '#7c5cff';
  // 줌해도 마커 크기는 일정하게 보이도록 역스케일
  const inverseScale = 1 / scale;

  return (
    <div
      className="marker-dot"
      style={{
        left: `${marker.x * 100}%`,
        top: `${marker.y * 100}%`,
        transform: `scale(${inverseScale})`,
        // @ts-ignore CSS variable
        '--marker-color': color,
      }}
      onClick={onClick}
      onTouchEnd={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick(e as unknown as React.MouseEvent);
      }}
    >
      <div className="marker-pulse" />
      <div className="marker-pulse-2" />
      <div className="marker-core" />
      {showLabel && type && (
        <div className="marker-label" style={{ color: color }}>
          {type.label}
          {marker.note ? ` · ${marker.note}` : ''}
        </div>
      )}
    </div>
  );
}
