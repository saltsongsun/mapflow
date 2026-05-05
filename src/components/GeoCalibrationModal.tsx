import React, { useState, useEffect } from 'react';
import { X, MapPin, Trash2, Info, Crosshair } from 'lucide-react';
import { Point2D, GeoCalibration, GeoPoint } from '../lib/types';
import { geoCalibrationValid, geoDistanceMeters } from '../lib/geo';

interface GeoCalibrationModalProps {
  current: GeoCalibration | undefined;
  /** 사용자가 지도에서 찍은 두 점 */
  points: Point2D[];
  onPointsChange: (points: Point2D[]) => void;
  onSave: (calib: GeoCalibration) => void;
  onClear: () => void;
  onClose: () => void;
}

export function GeoCalibrationModal({
  current,
  points,
  onPointsChange,
  onSave,
  onClear,
  onClose,
}: GeoCalibrationModalProps) {
  const [latA, setLatA] = useState<string>(current ? String(current.geo_a.lat) : '');
  const [lngA, setLngA] = useState<string>(current ? String(current.geo_a.lng) : '');
  const [latB, setLatB] = useState<string>(current ? String(current.geo_b.lat) : '');
  const [lngB, setLngB] = useState<string>(current ? String(current.geo_b.lng) : '');
  const [fillingCurrent, setFillingCurrent] = useState<'A' | 'B' | null>(null);

  const allFilled =
    latA && lngA && latB && lngB && !isNaN(+latA) && !isNaN(+lngA) && !isNaN(+latB) && !isNaN(+lngB);
  const isComplete = points.length === 2 && allFilled;

  const validation =
    isComplete
      ? geoCalibrationValid(
          points[0],
          points[1],
          { lat: +latA, lng: +lngA },
          { lat: +latB, lng: +lngB }
        )
      : { valid: false };

  const dist =
    isComplete && validation.valid
      ? geoDistanceMeters({ lat: +latA, lng: +lngA }, { lat: +latB, lng: +lngB })
      : 0;

  const handleSave = () => {
    if (!isComplete || !validation.valid) return;
    onSave({
      point_a: points[0],
      point_b: points[1],
      geo_a: { lat: +latA, lng: +lngA },
      geo_b: { lat: +latB, lng: +lngB },
    });
    onClose();
  };

  const handleUseMyLocation = (which: 'A' | 'B') => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      alert('이 브라우저는 GPS를 지원하지 않습니다');
      return;
    }
    setFillingCurrent(which);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        if (which === 'A') {
          setLatA(lat);
          setLngA(lng);
        } else {
          setLatB(lat);
          setLngB(lng);
        }
        setFillingCurrent(null);
      },
      (err) => {
        alert('현재 위치를 가져올 수 없습니다: ' + err.message);
        setFillingCurrent(null);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <div className="fixed left-1/2 bottom-6 -translate-x-1/2 z-50 w-[92vw] max-w-md glass-panel rounded-2xl shadow-2xl fade-up flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-display text-base font-semibold flex items-center gap-2">
            <MapPin size={16} className="text-accent" />
            GPS 보정
          </h3>
          <button className="btn btn-ghost !p-1.5" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto p-4 space-y-3">
          <div className="bg-accent/10 border border-accent/20 rounded-xl p-3 flex gap-2">
            <Info size={14} className="text-accent flex-shrink-0 mt-0.5" />
            <div className="text-xs text-text leading-relaxed">
              지도의 두 지점에 대한 실제 GPS 좌표를 입력하면, 이후 모든 사용자의 GPS
              위치가 자동으로 지도 위에 표시됩니다.
              <br />
              <span className="text-text-dim">
                💡 지도에서 점을 찍은 후 [현재 위치 사용]을 누르면 자동으로 채워집니다
              </span>
            </div>
          </div>

          {/* A점 */}
          <div className="bg-bg-elevated rounded-xl p-3 border border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold flex items-center gap-1.5">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    points.length >= 1 ? 'bg-amber-400' : 'bg-text-dim/30'
                  }`}
                />
                A 점 {points.length < 1 && <span className="text-text-dim font-normal">(지도에서 클릭)</span>}
              </span>
              {points.length >= 1 && (
                <button
                  className="btn btn-ghost !p-1 !text-[10px] !text-accent"
                  onClick={() => handleUseMyLocation('A')}
                  disabled={fillingCurrent === 'A'}
                >
                  <Crosshair size={11} />
                  {fillingCurrent === 'A' ? '가져오는 중...' : '현재 위치'}
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <input
                className="input !text-xs"
                placeholder="위도 (lat)"
                value={latA}
                onChange={(e) => setLatA(e.target.value)}
                disabled={points.length < 1}
                inputMode="decimal"
              />
              <input
                className="input !text-xs"
                placeholder="경도 (lng)"
                value={lngA}
                onChange={(e) => setLngA(e.target.value)}
                disabled={points.length < 1}
                inputMode="decimal"
              />
            </div>
          </div>

          {/* B점 */}
          <div className="bg-bg-elevated rounded-xl p-3 border border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold flex items-center gap-1.5">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    points.length >= 2 ? 'bg-amber-400' : 'bg-text-dim/30'
                  }`}
                />
                B 점 {points.length < 2 && <span className="text-text-dim font-normal">(지도에서 클릭)</span>}
              </span>
              {points.length >= 2 && (
                <button
                  className="btn btn-ghost !p-1 !text-[10px] !text-accent"
                  onClick={() => handleUseMyLocation('B')}
                  disabled={fillingCurrent === 'B'}
                >
                  <Crosshair size={11} />
                  {fillingCurrent === 'B' ? '가져오는 중...' : '현재 위치'}
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <input
                className="input !text-xs"
                placeholder="위도 (lat)"
                value={latB}
                onChange={(e) => setLatB(e.target.value)}
                disabled={points.length < 2}
                inputMode="decimal"
              />
              <input
                className="input !text-xs"
                placeholder="경도 (lng)"
                value={lngB}
                onChange={(e) => setLngB(e.target.value)}
                disabled={points.length < 2}
                inputMode="decimal"
              />
            </div>
          </div>

          {points.length > 0 && (
            <button
              className="btn btn-ghost w-full justify-center !py-1.5 text-xs"
              onClick={() => onPointsChange([])}
            >
              <Trash2 size={12} />
              점 다시 찍기
            </button>
          )}

          {isComplete && validation.valid && (
            <p className="text-xs text-emerald-300/80 text-center">
              ✓ A↔B 실제 거리: {(dist / 1000).toFixed(2)} km ({dist.toFixed(0)} m)
            </p>
          )}
          {isComplete && !validation.valid && validation.reason && (
            <p className="text-xs text-red-400 text-center">⚠ {validation.reason}</p>
          )}

          <div className="flex items-center gap-2 pt-1">
            {current && (
              <button
                className="btn btn-danger !text-xs"
                onClick={() => {
                  onClear();
                  onClose();
                }}
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
              disabled={!isComplete || !validation.valid}
            >
              저장
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
