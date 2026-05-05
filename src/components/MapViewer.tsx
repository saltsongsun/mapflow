import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  TransformWrapper,
  TransformComponent,
  ReactZoomPanPinchRef,
} from 'react-zoom-pan-pinch';
import { Plus, Minus, Maximize2, Crosshair, Trash2, X } from 'lucide-react';
import { MapDoc, Marker, MarkerType } from '../lib/types';
import { MarkerDot } from './MarkerDot';

interface MapViewerProps {
  map: MapDoc;
  markers: Marker[];
  markerTypes: MarkerType[];
  currentTypeId: string;
  onAddMarker: (x: number, y: number, typeId: string) => void;
  onRemoveMarker: (id: string) => void;
  onUpdateMarker: (id: string, patch: Partial<Marker>) => void;
}

export function MapViewer({
  map,
  markers,
  markerTypes,
  currentTypeId,
  onAddMarker,
  onRemoveMarker,
  onUpdateMarker,
}: MapViewerProps) {
  const transformRef = useRef<ReactZoomPanPinchRef>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [showLabels, setShowLabels] = useState(true);
  const [selectedMarker, setSelectedMarker] = useState<Marker | null>(null);
  const [editNote, setEditNote] = useState('');
  const [editTypeId, setEditTypeId] = useState('');
  // 드래그 vs 클릭 구분용
  const pointerStart = useRef<{ x: number; y: number; t: number } | null>(null);

  const aspectRatio = map.height / map.width;

  const handlePointerDown = (e: React.PointerEvent) => {
    pointerStart.current = { x: e.clientX, y: e.clientY, t: Date.now() };
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (!start) return;
    const dx = Math.abs(e.clientX - start.x);
    const dy = Math.abs(e.clientY - start.y);
    const dt = Date.now() - start.t;
    // 5px 이상 움직였거나 너무 길게 누르면 클릭이 아님 (팬으로 간주)
    if (dx > 5 || dy > 5 || dt > 500) return;

    if (!imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return;
    onAddMarker(x, y, currentTypeId);
  };

  const handleMarkerClick = (e: React.MouseEvent, marker: Marker) => {
    e.stopPropagation();
    pointerStart.current = null; // 마커 클릭은 새 마커 추가 방지
    setSelectedMarker(marker);
    setEditNote(marker.note || '');
    setEditTypeId(marker.type_id);
  };

  const closeEditor = () => {
    setSelectedMarker(null);
    setEditNote('');
    setEditTypeId('');
  };

  const saveEditor = () => {
    if (!selectedMarker) return;
    onUpdateMarker(selectedMarker.id, {
      note: editNote || undefined,
      type_id: editTypeId,
    });
    closeEditor();
  };

  const deleteMarker = () => {
    if (!selectedMarker) return;
    onRemoveMarker(selectedMarker.id);
    closeEditor();
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-bg">
      <TransformWrapper
        ref={transformRef}
        initialScale={1}
        minScale={0.5}
        maxScale={8}
        wheel={{ step: 0.1 }}
        pinch={{ step: 5 }}
        doubleClick={{ disabled: true }}
        onTransformed={(ref) => setScale(ref.state.scale)}
        limitToBounds={false}
        centerOnInit
      >
        <TransformComponent
          wrapperStyle={{ width: '100%', height: '100%' }}
          contentStyle={{ width: '100%', height: '100%' }}
        >
          <div
            ref={wrapperRef}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '100%',
              aspectRatio: `${map.width} / ${map.height}`,
            }}
          >
            <img
              ref={imageRef}
              src={map.image_data}
              alt={map.name}
              draggable={false}
              style={{
                width: '100%',
                height: '100%',
                display: 'block',
                userSelect: 'none',
                pointerEvents: 'none',
              }}
            />
            {markers.map((marker) => {
              const type = markerTypes.find((t) => t.id === marker.type_id);
              return (
                <MarkerDot
                  key={marker.id}
                  marker={marker}
                  type={type}
                  scale={scale}
                  showLabel={showLabels}
                  onClick={(e) => handleMarkerClick(e, marker)}
                />
              );
            })}
          </div>
        </TransformComponent>
      </TransformWrapper>

      {/* === 줌 컨트롤 === */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1 glass-panel rounded-xl p-1 shadow-xl">
        <button
          className="btn btn-ghost !p-2"
          onClick={() => transformRef.current?.zoomIn(0.4)}
          title="확대"
        >
          <Plus size={18} />
        </button>
        <button
          className="btn btn-ghost !p-2"
          onClick={() => transformRef.current?.zoomOut(0.4)}
          title="축소"
        >
          <Minus size={18} />
        </button>
        <button
          className="btn btn-ghost !p-2"
          onClick={() => transformRef.current?.resetTransform()}
          title="원래 크기"
        >
          <Maximize2 size={18} />
        </button>
        <button
          className="btn btn-ghost !p-2"
          onClick={() => transformRef.current?.centerView()}
          title="중앙으로"
        >
          <Crosshair size={18} />
        </button>
      </div>

      {/* === 줌 레벨 표시 === */}
      <div className="absolute bottom-4 left-4 glass-panel rounded-lg px-3 py-1.5 text-xs text-text-muted font-mono">
        {(scale * 100).toFixed(0)}%
      </div>

      {/* === 라벨 토글 === */}
      <div className="absolute top-4 right-4 glass-panel rounded-lg overflow-hidden">
        <button
          className="btn btn-ghost !rounded-none !border-0"
          onClick={() => setShowLabels((s) => !s)}
        >
          {showLabels ? '라벨 숨김' : '라벨 표시'}
        </button>
      </div>

      {/* === 마커 편집 모달 === */}
      {selectedMarker && (
        <>
          <div className="backdrop" onClick={closeEditor} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90vw] max-w-md glass-panel rounded-2xl p-5 shadow-2xl fade-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-semibold">마커 편집</h3>
              <button className="btn btn-ghost !p-1.5" onClick={closeEditor}>
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-text-muted mb-1.5 block">종류</label>
                <select
                  className="input"
                  value={editTypeId}
                  onChange={(e) => setEditTypeId(e.target.value)}
                >
                  {markerTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-text-muted mb-1.5 block">메모 (선택)</label>
                <input
                  className="input"
                  type="text"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="예: 김OO, 점검 중..."
                  autoFocus
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button className="btn btn-primary flex-1 justify-center" onClick={saveEditor}>
                  저장
                </button>
                <button className="btn btn-danger" onClick={deleteMarker}>
                  <Trash2 size={14} />
                  삭제
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
