import React from 'react';
import { MapPin, Pentagon, Route, Ruler, Check, X } from 'lucide-react';
import { DrawingMode } from './MapOverlay';

interface DrawingToolsProps {
  mode: 'marker' | 'zone' | 'path' | 'calibrate';
  onModeChange: (mode: 'marker' | 'zone' | 'path' | 'calibrate') => void;
  /** 그리기 진행 중일 때 점 개수 */
  drawingPointCount?: number;
  /** 진행 중인 작업 완료 (구역/길 그리기 끝) */
  onFinishDrawing?: () => void;
  /** 진행 중인 작업 취소 */
  onCancelDrawing?: () => void;
  hasCalibration?: boolean;
}

export function DrawingTools({
  mode,
  onModeChange,
  drawingPointCount = 0,
  onFinishDrawing,
  onCancelDrawing,
  hasCalibration,
}: DrawingToolsProps) {
  const isDrawing = (mode === 'zone' || mode === 'path') && drawingPointCount > 0;
  const minPointsToFinish = mode === 'zone' ? 3 : 2;
  const canFinish = drawingPointCount >= minPointsToFinish;

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 glass-panel rounded-xl p-1.5 shadow-xl">
      <ToolButton
        active={mode === 'marker'}
        onClick={() => onModeChange('marker')}
        icon={<MapPin size={14} />}
        label="마커"
        color="#7c5cff"
      />
      <ToolButton
        active={mode === 'zone'}
        onClick={() => onModeChange('zone')}
        icon={<Pentagon size={14} />}
        label="구역"
        color="#5cc8ff"
      />
      <ToolButton
        active={mode === 'path'}
        onClick={() => onModeChange('path')}
        icon={<Route size={14} />}
        label="길"
        color="#5cffa8"
      />
      <div className="w-px h-6 bg-border mx-1" />
      <ToolButton
        active={mode === 'calibrate'}
        onClick={() => onModeChange('calibrate')}
        icon={<Ruler size={14} />}
        label={hasCalibration ? '거리 ✓' : '거리'}
        color="#ffe55c"
      />

      {/* 그리기 진행 중일 때 완료/취소 버튼 */}
      {isDrawing && (
        <>
          <div className="w-px h-6 bg-border mx-1" />
          <span className="text-[10px] text-text-muted px-2">
            점 {drawingPointCount}개
            {!canFinish && ` · 최소 ${minPointsToFinish}개 필요`}
          </span>
          <button
            className="btn btn-primary !p-2 !rounded-md"
            onClick={onFinishDrawing}
            disabled={!canFinish}
            title="완료"
          >
            <Check size={14} />
          </button>
          <button
            className="btn btn-ghost !p-2 !rounded-md !text-red-400"
            onClick={onCancelDrawing}
            title="취소"
          >
            <X size={14} />
          </button>
        </>
      )}
    </div>
  );
}

function ToolButton({
  active,
  onClick,
  icon,
  label,
  color,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  color: string;
}) {
  return (
    <button
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
        active
          ? 'text-white shadow-md'
          : 'text-text-muted hover:text-text hover:bg-bg-hover'
      }`}
      style={
        active
          ? {
              background: color,
              boxShadow: `0 0 12px ${color}60`,
            }
          : undefined
      }
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}
