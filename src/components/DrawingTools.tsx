import React from 'react';
import { MousePointer2, Plus, Pentagon, Route, Ruler, Check, X, MapPin } from 'lucide-react';

export type DrawTool = 'select' | 'add' | 'zone' | 'path' | 'calibrate' | 'geocal';

interface DrawingToolsProps {
  mode: DrawTool;
  onModeChange: (mode: DrawTool) => void;
  /** 그리기 진행 중일 때 점 개수 */
  drawingPointCount?: number;
  /** 진행 중인 작업 완료 (구역/길 그리기 끝) */
  onFinishDrawing?: () => void;
  /** 진행 중인 작업 취소 */
  onCancelDrawing?: () => void;
  hasCalibration?: boolean;
  hasGeoCalibration?: boolean;
}

export function DrawingTools({
  mode,
  onModeChange,
  drawingPointCount = 0,
  onFinishDrawing,
  onCancelDrawing,
  hasCalibration,
  hasGeoCalibration,
}: DrawingToolsProps) {
  const isDrawing = (mode === 'zone' || mode === 'path') && drawingPointCount > 0;
  const minPointsToFinish = mode === 'zone' ? 3 : 2;
  const canFinish = drawingPointCount >= minPointsToFinish;

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 glass-panel rounded-xl p-1.5 shadow-xl">
      <ToolButton
        active={mode === 'select'}
        onClick={() => onModeChange('select')}
        icon={<MousePointer2 size={14} />}
        label="선택"
        color="#9a9ab0"
        title="마커 클릭/이동/편집만 (빈 곳 클릭은 무시)"
      />
      <ToolButton
        active={mode === 'add'}
        onClick={() => onModeChange('add')}
        icon={<Plus size={14} />}
        label="추가"
        color="#7c5cff"
        title="빈 곳 클릭 시 새 마커 추가"
      />
      <div className="w-px h-6 bg-border mx-1" />
      <ToolButton
        active={mode === 'zone'}
        onClick={() => onModeChange('zone')}
        icon={<Pentagon size={14} />}
        label="구역"
        color="#5cc8ff"
        title="다각형으로 구역 그리기"
      />
      <ToolButton
        active={mode === 'path'}
        onClick={() => onModeChange('path')}
        icon={<Route size={14} />}
        label="길"
        color="#5cffa8"
        title="이동 경로(길) 그리기"
      />
      <div className="w-px h-6 bg-border mx-1" />
      <ToolButton
        active={mode === 'calibrate'}
        onClick={() => onModeChange('calibrate')}
        icon={<Ruler size={14} />}
        label={hasCalibration ? '거리 ✓' : '거리'}
        color="#ffe55c"
        title="실제 거리 보정 (속도 계산용)"
      />
      <ToolButton
        active={mode === 'geocal'}
        onClick={() => onModeChange('geocal')}
        icon={<MapPin size={14} />}
        label={hasGeoCalibration ? 'GPS ✓' : 'GPS'}
        color="#5cc8ff"
        title="GPS 보정 (지도와 실제 위경도 매칭)"
      />

      {/* 그리기 진행 중일 때 완료/취소 버튼 */}
      {isDrawing && (
        <>
          <div className="w-px h-6 bg-border mx-1" />
          <span className="text-[10px] text-text-muted px-2 hidden sm:inline">
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
  title,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  color: string;
  title?: string;
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
      title={title}
    >
      {icon}
      {label}
    </button>
  );
}
