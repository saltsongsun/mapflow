import React, { useState, useEffect } from 'react';
import { X, Ruler, Trash2, Info } from 'lucide-react';
import { Point2D, MapCalibration } from '../lib/types';
import { distance } from '../lib/geometry';

interface CalibrationModalProps {
  current: MapCalibration | undefined;
  /** 사용자가 지도에서 찍은 두 점 (또는 진행 중인 한 점) */
  points: Point2D[];
  onPointsChange: (points: Point2D[]) => void;
  onSave: (calibration: MapCalibration) => void;
  onClear: () => void;
  onClose: () => void;
}

export function CalibrationModal({
  current,
  points,
  onPointsChange,
  onSave,
  onClear,
  onClose,
}: CalibrationModalProps) {
  const [meters, setMeters] = useState<string>(
    current ? String(current.real_distance_m) : ''
  );

  // 기존 보정이 있으면 그 점들로 시작
  useEffect(() => {
    if (current && points.length === 0) {
      onPointsChange([current.point_a, current.point_b]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isComplete = points.length === 2;
  const metersNum = parseFloat(meters);
  const isValid = isComplete && metersNum > 0 && Number.isFinite(metersNum);

  const handleSave = () => {
    if (!isValid) return;
    onSave({
      point_a: points[0],
      point_b: points[1],
      real_distance_m: metersNum,
    });
    onClose();
  };

  const handleClearPoints = () => {
    onPointsChange([]);
  };

  const handleClearAll = () => {
    onPointsChange([]);
    setMeters('');
    onClear();
    onClose();
  };

  // 정규화 거리 표시 (참고용)
  const normDist = isComplete ? distance(points[0], points[1]) : 0;

  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <div className="fixed left-1/2 bottom-6 -translate-x-1/2 z-50 w-[92vw] max-w-md glass-panel rounded-2xl shadow-2xl fade-up flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-display text-base font-semibold flex items-center gap-2">
            <Ruler size={16} className="text-amber-400" />
            거리 보정
          </h3>
          <button className="btn btn-ghost !p-1.5" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex gap-2">
            <Info size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-200/90 leading-relaxed">
              실제로 알고 있는 두 지점(예: 건물 모서리부터 입구까지)을 클릭한 뒤 그
              사이의 실제 거리(미터)를 입력하세요. 마커 이동 속도가 시속 3km(걷는
              속도)로 자동 계산됩니다.
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <PointStatus label="A 점" set={points.length >= 1} />
            <PointStatus label="B 점" set={points.length >= 2} />
          </div>

          {points.length < 2 && (
            <p className="text-xs text-text-muted text-center py-1">
              {points.length === 0
                ? '지도에서 첫 번째 점을 클릭하세요'
                : '지도에서 두 번째 점을 클릭하세요'}
            </p>
          )}

          {points.length > 0 && (
            <button
              className="btn btn-ghost w-full justify-center !py-1.5 text-xs"
              onClick={handleClearPoints}
            >
              <Trash2 size={12} />
              점 다시 찍기
            </button>
          )}

          <div>
            <label className="text-xs text-text-muted mb-1.5 block">
              실제 거리 (미터)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                min="0.1"
                className="input flex-1"
                placeholder="예: 25"
                value={meters}
                onChange={(e) => setMeters(e.target.value)}
                disabled={!isComplete}
              />
              <span className="text-sm text-text-muted">m</span>
            </div>
            {isComplete && metersNum > 0 && (
              <p className="text-xs text-text-dim mt-1.5">
                지도상 거리: {(normDist * 100).toFixed(1)}% · 1미터 ={' '}
                {((normDist * 100) / metersNum).toFixed(2)}% 화면
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 pt-1">
            {current && (
              <button
                className="btn btn-danger !text-xs"
                onClick={handleClearAll}
                title="보정 제거"
              >
                <Trash2 size={12} />
                제거
              </button>
            )}
            <button className="btn btn-ghost flex-1 justify-center" onClick={onClose}>
              취소
            </button>
            <button
              className="btn btn-primary flex-1 justify-center"
              onClick={handleSave}
              disabled={!isValid}
            >
              저장
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function PointStatus({ label, set }: { label: string; set: boolean }) {
  return (
    <div
      className={`flex items-center gap-2 p-2 rounded-lg border ${
        set
          ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
          : 'bg-bg-elevated border-border text-text-dim'
      }`}
    >
      <div
        className={`w-2.5 h-2.5 rounded-full ${set ? 'bg-amber-400' : 'bg-text-dim/30'}`}
      />
      <span className="text-xs font-medium">{label}</span>
      <span className="text-xs ml-auto">{set ? '설정됨' : '미설정'}</span>
    </div>
  );
}
