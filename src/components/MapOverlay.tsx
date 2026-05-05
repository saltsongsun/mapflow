import React from 'react';
import { Point2D, Zone, PathLine, MapDoc } from '../lib/types';
import { polygonCentroid } from '../lib/geometry';

export type DrawingMode = null | 'zone' | 'path' | 'calibrate';

interface MapOverlayProps {
  /** 지도 이미지의 원본 크기 (viewBox용) */
  mapWidth: number;
  mapHeight: number;
  zones: Zone[];
  paths: PathLine[];
  mapDoc: MapDoc;
  /** 그리기 모드일 때 진행 중인 점들 */
  drawingPoints?: Point2D[];
  drawingMode: DrawingMode;
  drawingColor?: string;
  /** 캘리브레이션 점들 (최대 2개) */
  calibrationPoints?: Point2D[];
  /** 보기 모드에서 길/구역 클릭 무시 */
  interactive: boolean;
  onZoneClick?: (zoneId: string) => void;
  onPathClick?: (pathId: string) => void;
}

export function MapOverlay({
  mapWidth,
  mapHeight,
  zones,
  paths,
  mapDoc,
  drawingPoints,
  drawingMode,
  drawingColor = '#7c5cff',
  calibrationPoints,
  interactive,
  onZoneClick,
  onPathClick,
}: MapOverlayProps) {
  // SVG 좌표는 정규화(0~1) → 픽셀(원본)로 변환
  const toX = (n: number) => n * mapWidth;
  const toY = (n: number) => n * mapHeight;

  return (
    <svg
      viewBox={`0 0 ${mapWidth} ${mapHeight}`}
      preserveAspectRatio="none"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        // 보기 모드에선 클릭이 지도로 통과되도록
        pointerEvents: interactive ? 'auto' : 'none',
      }}
    >
      {/* === 구역 (다각형) === */}
      {zones.map((zone) => {
        if (zone.points.length < 2) return null;
        const d =
          zone.points
            .map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(p.x)},${toY(p.y)}`)
            .join(' ') + ' Z';
        const centroid = polygonCentroid(zone.points);
        return (
          <g key={zone.id} className="zone-group">
            <path
              d={d}
              fill={zone.color}
              fillOpacity={0.12}
              stroke={zone.color}
              strokeOpacity={0.7}
              strokeWidth={3}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              style={{
                cursor: interactive ? 'pointer' : 'default',
                pointerEvents: interactive ? 'auto' : 'none',
              }}
              onClick={(e) => {
                e.stopPropagation();
                onZoneClick?.(zone.id);
              }}
            />
            <text
              x={toX(centroid.x)}
              y={toY(centroid.y)}
              fill={zone.color}
              fontSize={Math.min(mapWidth, mapHeight) * 0.018}
              fontWeight={600}
              textAnchor="middle"
              dominantBaseline="middle"
              style={{
                pointerEvents: 'none',
                paintOrder: 'stroke',
                stroke: 'rgba(10,10,15,0.85)',
                strokeWidth: 4,
                strokeLinejoin: 'round',
              }}
            >
              {zone.name}
            </text>
          </g>
        );
      })}

      {/* === 길 (폴리라인) === */}
      {paths.map((path) => {
        if (path.points.length < 2) return null;
        const d = path.points
          .map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(p.x)},${toY(p.y)}`)
          .join(' ');
        return (
          <g key={path.id}>
            {/* 길 외곽 (어두운 글로우) */}
            <path
              d={d}
              fill="none"
              stroke={path.color}
              strokeOpacity={0.25}
              strokeWidth={10}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              style={{ pointerEvents: 'none' }}
            />
            {/* 길 본체 */}
            <path
              d={d}
              fill="none"
              stroke={path.color}
              strokeOpacity={0.85}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="6 4"
              vectorEffect="non-scaling-stroke"
              style={{
                cursor: interactive ? 'pointer' : 'default',
                pointerEvents: interactive ? 'auto' : 'none',
              }}
              onClick={(e) => {
                e.stopPropagation();
                onPathClick?.(path.id);
              }}
            />
          </g>
        );
      })}

      {/* === 그리기 중인 모양 미리보기 === */}
      {drawingMode === 'zone' && drawingPoints && drawingPoints.length > 0 && (
        <g>
          {drawingPoints.length >= 3 && (
            <path
              d={
                drawingPoints
                  .map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(p.x)},${toY(p.y)}`)
                  .join(' ') + ' Z'
              }
              fill={drawingColor}
              fillOpacity={0.15}
              stroke="none"
              style={{ pointerEvents: 'none' }}
            />
          )}
          {drawingPoints.length >= 2 && (
            <polyline
              points={drawingPoints.map((p) => `${toX(p.x)},${toY(p.y)}`).join(' ')}
              fill="none"
              stroke={drawingColor}
              strokeOpacity={0.9}
              strokeWidth={3}
              strokeDasharray="5 3"
              vectorEffect="non-scaling-stroke"
              style={{ pointerEvents: 'none' }}
            />
          )}
          {drawingPoints.map((p, i) => (
            <circle
              key={i}
              cx={toX(p.x)}
              cy={toY(p.y)}
              r={Math.min(mapWidth, mapHeight) * 0.005}
              fill={drawingColor}
              stroke="white"
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
              style={{ pointerEvents: 'none' }}
            />
          ))}
        </g>
      )}

      {drawingMode === 'path' && drawingPoints && drawingPoints.length > 0 && (
        <g>
          {drawingPoints.length >= 2 && (
            <polyline
              points={drawingPoints.map((p) => `${toX(p.x)},${toY(p.y)}`).join(' ')}
              fill="none"
              stroke={drawingColor}
              strokeOpacity={0.9}
              strokeWidth={3}
              strokeLinecap="round"
              strokeDasharray="6 4"
              vectorEffect="non-scaling-stroke"
              style={{ pointerEvents: 'none' }}
            />
          )}
          {drawingPoints.map((p, i) => (
            <circle
              key={i}
              cx={toX(p.x)}
              cy={toY(p.y)}
              r={Math.min(mapWidth, mapHeight) * 0.005}
              fill={drawingColor}
              stroke="white"
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
              style={{ pointerEvents: 'none' }}
            />
          ))}
        </g>
      )}

      {/* === 캘리브레이션 (거리 보정) 점들 표시 === */}
      {calibrationPoints && calibrationPoints.length > 0 && (
        <g>
          {calibrationPoints.length === 2 && (
            <line
              x1={toX(calibrationPoints[0].x)}
              y1={toY(calibrationPoints[0].y)}
              x2={toX(calibrationPoints[1].x)}
              y2={toY(calibrationPoints[1].y)}
              stroke="#ffe55c"
              strokeWidth={2}
              strokeDasharray="4 3"
              vectorEffect="non-scaling-stroke"
              style={{ pointerEvents: 'none' }}
            />
          )}
          {calibrationPoints.map((p, i) => (
            <g key={i}>
              <circle
                cx={toX(p.x)}
                cy={toY(p.y)}
                r={Math.min(mapWidth, mapHeight) * 0.008}
                fill="#ffe55c"
                stroke="black"
                strokeWidth={1.5}
                vectorEffect="non-scaling-stroke"
                style={{ pointerEvents: 'none' }}
              />
              <text
                x={toX(p.x)}
                y={toY(p.y) - Math.min(mapWidth, mapHeight) * 0.015}
                fill="#ffe55c"
                fontSize={Math.min(mapWidth, mapHeight) * 0.015}
                fontWeight={700}
                textAnchor="middle"
                style={{
                  pointerEvents: 'none',
                  paintOrder: 'stroke',
                  stroke: 'black',
                  strokeWidth: 3,
                }}
              >
                {i === 0 ? 'A' : 'B'}
              </text>
            </g>
          ))}
        </g>
      )}

      {/* === 기존 보정 점 표시 (보기 모드에서 항상 작게 표시) === */}
      {!drawingMode && mapDoc.calibration && (
        <g opacity={0.5}>
          <line
            x1={toX(mapDoc.calibration.point_a.x)}
            y1={toY(mapDoc.calibration.point_a.y)}
            x2={toX(mapDoc.calibration.point_b.x)}
            y2={toY(mapDoc.calibration.point_b.y)}
            stroke="#ffe55c"
            strokeWidth={1}
            strokeDasharray="3 3"
            vectorEffect="non-scaling-stroke"
            style={{ pointerEvents: 'none' }}
          />
        </g>
      )}
    </svg>
  );
}
