import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  TransformWrapper,
  TransformComponent,
  ReactZoomPanPinchRef,
} from 'react-zoom-pan-pinch';
import {
  Plus,
  Minus,
  Maximize2,
  Crosshair,
  Trash2,
  X,
  Maximize,
  Minimize,
  Eye,
  EyeOff,
  Pencil,
} from 'lucide-react';
import {
  MapDoc,
  Marker,
  MarkerType,
  Zone,
  PathLine,
  Point2D,
  MapCalibration,
} from '../lib/types';
import {
  buildMovementPath,
  computeMoveDurationMs,
  distance,
  findZoneContaining,
  polygonCentroid,
} from '../lib/geometry';
import { MarkerDot } from './MarkerDot';
import { MapOverlay, DrawingMode } from './MapOverlay';
import { DrawingTools } from './DrawingTools';
import { CalibrationModal } from './CalibrationModal';
import { ZoneArrivalPicker, ZoneArrivalMode } from './ZoneArrivalPicker';
import { useMarkerAnimation } from '../hooks/useMarkerAnimation';

const ZONE_ARRIVAL_MODE_KEY = 'pb:zone-arrival-mode';

interface MapViewerProps {
  map: MapDoc;
  markers: Marker[];
  markerTypes: MarkerType[];
  zones: Zone[];
  paths: PathLine[];
  currentTypeId: string;
  editMode: boolean;
  onAddMarker: (x: number, y: number, typeId: string) => void;
  onRemoveMarker: (id: string) => void;
  onUpdateMarker: (id: string, patch: Partial<Marker>) => void;
  onAddZone: (data: Omit<Zone, 'id' | 'created_at' | 'updated_at'>) => void;
  onRemoveZone: (id: string) => void;
  onAddPath: (data: Omit<PathLine, 'id' | 'created_at' | 'updated_at'>) => void;
  onRemovePath: (id: string) => void;
  onSetCalibration: (calibration: MapCalibration | undefined) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

type DrawTool = 'marker' | 'zone' | 'path' | 'calibrate';

export function MapViewer({
  map,
  markers,
  markerTypes,
  zones,
  paths,
  currentTypeId,
  editMode,
  onAddMarker,
  onRemoveMarker,
  onUpdateMarker,
  onAddZone,
  onRemoveZone,
  onAddPath,
  onRemovePath,
  onSetCalibration,
  isFullscreen,
  onToggleFullscreen,
}: MapViewerProps) {
  const transformRef = useRef<ReactZoomPanPinchRef>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [showLabels, setShowLabels] = useState(true);
  const [showOverlay, setShowOverlay] = useState(true);
  const [selectedMarker, setSelectedMarker] = useState<Marker | null>(null);
  const [editNote, setEditNote] = useState('');
  const [editTypeId, setEditTypeId] = useState('');
  const [panDisabled, setPanDisabled] = useState(false);

  // 그리기 도구 상태
  const [drawTool, setDrawTool] = useState<DrawTool>('marker');
  const [drawingPoints, setDrawingPoints] = useState<Point2D[]>([]);
  const [calibrationPoints, setCalibrationPoints] = useState<Point2D[]>([]);
  const [calibModalOpen, setCalibModalOpen] = useState(false);

  // 구역 도착 모드 (사용자 선호 - localStorage)
  const [zoneArrivalMode, setZoneArrivalMode] = useState<ZoneArrivalMode>('exact');
  // 마지막으로 도착한 구역 정보 (잠시 picker 표시용)
  const [lastArrival, setLastArrival] = useState<{
    markerId: string;
    zoneId: string;
    zoneName: string;
    exactPos: Point2D;
  } | null>(null);

  // 사용자 선호 복원
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem(ZONE_ARRIVAL_MODE_KEY);
    if (saved === 'center' || saved === 'exact') {
      setZoneArrivalMode(saved);
    }
  }, []);

  const updateZoneArrivalMode = (mode: ZoneArrivalMode) => {
    setZoneArrivalMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem(ZONE_ARRIVAL_MODE_KEY, mode);
    }
  };

  // 마커 이동 애니메이션
  const animation = useMarkerAnimation();

  // 빈 공간 클릭 vs 팬 구분용
  const pointerStart = useRef<{ x: number; y: number; t: number } | null>(null);

  // 편집 모드가 꺼지면 그리기 진행 중인 작업 정리
  useEffect(() => {
    if (!editMode) {
      setDrawTool('marker');
      setDrawingPoints([]);
      setCalibrationPoints([]);
      setCalibModalOpen(false);
    }
  }, [editMode]);

  // 도구 바뀌면 진행 중 점들 정리
  useEffect(() => {
    setDrawingPoints([]);
    if (drawTool === 'calibrate') {
      // 기존 보정값이 있으면 그 점들로 시작 (수정 가능)
      // 모달은 자동으로 띄우지 않음 - 두 점이 모두 찍혀야 자동으로 띄움
      setCalibrationPoints(
        map.calibration ? [map.calibration.point_a, map.calibration.point_b] : []
      );
      setCalibModalOpen(false);
    } else {
      setCalibModalOpen(false);
      setCalibrationPoints([]);
    }
  }, [drawTool, map.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // 캘리브레이션 점이 2개가 되면 자동으로 모달 띄움
  useEffect(() => {
    if (drawTool === 'calibrate' && calibrationPoints.length === 2) {
      setCalibModalOpen(true);
    }
  }, [drawTool, calibrationPoints.length]);

  const screenToNormalized = (clientX: number, clientY: number): Point2D | null => {
    if (!imageRef.current) return null;
    const rect = imageRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return null;
    return { x, y };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    pointerStart.current = { x: e.clientX, y: e.clientY, t: Date.now() };
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (!start) return;
    if (!editMode) return;
    if (panDisabled) return;
    const dx = Math.abs(e.clientX - start.x);
    const dy = Math.abs(e.clientY - start.y);
    const dt = Date.now() - start.t;
    if (dx > 5 || dy > 5 || dt > 500) return;

    const norm = screenToNormalized(e.clientX, e.clientY);
    if (!norm) return;

    if (drawTool === 'marker') {
      // 클릭한 위치가 어느 구역 안인지 확인
      const containingZone = findZoneContaining(norm, zones);
      if (containingZone) {
        // 구역 안 클릭 시 정확히 그 위치(클릭 지점)로 마커 추가
        onAddMarker(norm.x, norm.y, currentTypeId);
      } else {
        onAddMarker(norm.x, norm.y, currentTypeId);
      }
    } else if (drawTool === 'zone' || drawTool === 'path') {
      setDrawingPoints((prev) => [...prev, norm]);
    } else if (drawTool === 'calibrate') {
      setCalibrationPoints((prev) => {
        if (prev.length >= 2) return [norm]; // 이미 2개면 새로 시작
        return [...prev, norm];
      });
    }
  };

  const openMarkerEditor = (marker: Marker) => {
    pointerStart.current = null;
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

  // 그리기 완료
  const finishDrawing = () => {
    if (drawTool === 'zone' && drawingPoints.length >= 3) {
      onAddZone({
        map_id: map.id,
        name: `구역 ${zones.length + 1}`,
        color: '#5cc8ff',
        points: drawingPoints,
      });
    } else if (drawTool === 'path' && drawingPoints.length >= 2) {
      onAddPath({
        map_id: map.id,
        color: '#5cffa8',
        points: drawingPoints,
      });
    }
    setDrawingPoints([]);
  };

  const cancelDrawing = () => {
    setDrawingPoints([]);
  };

  /**
   * 마커가 드래그로 이동하기 직전에 호출되어, 도착 위치(dropX, dropY)를 가공.
   * - 도착이 어떤 구역 안이면 → zoneArrivalMode에 따라 위치 결정
   *   - 'exact': 클릭한 정확한 지점
   *   - 'center': 구역의 중심(centroid)
   * - 길이 있다면 → 길을 따라가는 애니메이션 경로 생성
   * - 구역에 도착하면 ZoneArrivalPicker를 잠깐 띄워 모드 변경 가능
   */
  const handleMarkerDropWithAnimation = (
    marker: Marker,
    dropX: number,
    dropY: number
  ) => {
    const fromPos: Point2D = { x: marker.x, y: marker.y };
    const exactDrop: Point2D = { x: dropX, y: dropY };

    // 도착 지점이 어느 구역 안인지 확인
    const arrivedZone = findZoneContaining(exactDrop, zones);

    // 모드에 따라 실제 도착 위치 결정
    const finalTarget: Point2D = arrivedZone && zoneArrivalMode === 'center'
      ? polygonCentroid(arrivedZone.points)
      : exactDrop;

    // 매우 짧은 거리면 즉시 업데이트
    const directDist = distance(fromPos, finalTarget);
    if (directDist < 0.005) {
      onUpdateMarker(marker.id, { x: finalTarget.x, y: finalTarget.y });
      return;
    }

    // 길을 따라가는 경로 생성 (최단 경로)
    const route = buildMovementPath(fromPos, finalTarget, paths);
    const totalNormDist = route.reduce((acc, p, i) => {
      if (i === 0) return 0;
      return acc + distance(route[i - 1], p);
    }, 0);
    const duration = computeMoveDurationMs(totalNormDist, map);

    animation.startMovement(marker.id, route, duration, (finalPos) => {
      onUpdateMarker(marker.id, { x: finalPos.x, y: finalPos.y });

      // 구역에 도착했으면 picker 표시
      if (arrivedZone) {
        setLastArrival({
          markerId: marker.id,
          zoneId: arrivedZone.id,
          zoneName: arrivedZone.name,
          exactPos: exactDrop,
        });
      }
    });
  };

  /**
   * Picker에서 모드 변경 시 호출 - 마지막 도착한 마커를 새 모드에 맞춰 다시 이동
   */
  const handleArrivalModeChange = (mode: ZoneArrivalMode) => {
    updateZoneArrivalMode(mode);
    if (!lastArrival) return;
    const marker = markers.find((m) => m.id === lastArrival.markerId);
    const arrivedZone = zones.find((z) => z.id === lastArrival.zoneId);
    if (!marker || !arrivedZone) {
      setLastArrival(null);
      return;
    }

    const newTarget: Point2D =
      mode === 'center'
        ? polygonCentroid(arrivedZone.points)
        : lastArrival.exactPos;

    const fromPos: Point2D = { x: marker.x, y: marker.y };
    if (distance(fromPos, newTarget) < 0.005) {
      onUpdateMarker(marker.id, { x: newTarget.x, y: newTarget.y });
      return;
    }

    // 거리 짧으면 직선, 그 외엔 길 따라가기
    const route = buildMovementPath(fromPos, newTarget, paths);
    const totalNormDist = route.reduce((acc, p, i) => {
      if (i === 0) return 0;
      return acc + distance(route[i - 1], p);
    }, 0);
    const duration = computeMoveDurationMs(totalNormDist, map);

    animation.startMovement(marker.id, route, duration, (finalPos) => {
      onUpdateMarker(marker.id, { x: finalPos.x, y: finalPos.y });
    });
  };

  return (
    <div
      className={`relative w-full h-full overflow-hidden bg-bg ${
        editMode ? 'edit-mode-active' : ''
      }`}
    >
      {editMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/40 backdrop-blur-md text-amber-300 text-xs font-medium shadow-lg fade-up">
          <Pencil size={12} />
          <span>편집 모드</span>
          {drawTool !== 'marker' && (
            <span className="text-amber-300/60">
              · {drawTool === 'zone' ? '구역 그리기' : drawTool === 'path' ? '길 그리기' : '거리 보정'}
            </span>
          )}
        </div>
      )}

      <TransformWrapper
        ref={transformRef}
        initialScale={1}
        minScale={0.5}
        maxScale={8}
        wheel={{ step: 0.1 }}
        pinch={{ step: 5 }}
        panning={{ disabled: panDisabled }}
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

            {/* SVG 오버레이 - 구역, 길, 그리기 미리보기 */}
            {showOverlay && (
              <MapOverlay
                mapWidth={map.width}
                mapHeight={map.height}
                zones={zones}
                paths={paths}
                mapDoc={map}
                drawingPoints={drawingPoints}
                drawingMode={drawTool === 'zone' || drawTool === 'path' ? drawTool : null}
                drawingColor={drawTool === 'zone' ? '#5cc8ff' : '#5cffa8'}
                calibrationPoints={drawTool === 'calibrate' ? calibrationPoints : undefined}
                interactive={false}
              />
            )}

            {/* 마커들 */}
            {markers.map((marker) => {
              const type = markerTypes.find((t) => t.id === marker.type_id);
              // 애니메이션 중이면 임시 위치 사용
              const moving = animation.activeMovements.get(marker.id);
              const displayMarker = moving
                ? { ...marker, x: moving.currentPos.x, y: moving.currentPos.y }
                : marker;
              const isAnim = !!moving;
              return (
                <MarkerDot
                  key={marker.id}
                  marker={displayMarker}
                  type={type}
                  scale={scale}
                  showLabel={showLabels}
                  // 애니메이션 중에는 드래그/클릭 비활성화
                  editable={editMode && drawTool === 'marker' && !isAnim}
                  containerRef={imageRef}
                  onDragStart={() => setPanDisabled(true)}
                  onDragEnd={() => setPanDisabled(false)}
                  onClick={() => openMarkerEditor(marker)}
                  onMove={(x, y) => handleMarkerDropWithAnimation(marker, x, y)}
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

      {/* 줌 레벨 + 보정 정보 */}
      <div className="absolute bottom-4 left-4 glass-panel rounded-lg px-3 py-1.5 text-xs text-text-muted font-mono flex items-center gap-2">
        <span>{(scale * 100).toFixed(0)}%</span>
        {map.calibration && (
          <>
            <span className="text-text-dim">·</span>
            <span className="text-amber-300/80">
              📏 {map.calibration.real_distance_m}m 보정됨
            </span>
          </>
        )}
      </div>

      {/* === 우측 상단 (라벨/오버레이/전체화면) === */}
      <div className="absolute top-4 right-4 flex items-center gap-1 glass-panel rounded-lg p-1">
        <button
          className="btn btn-ghost !p-2 !rounded-md"
          onClick={() => setShowOverlay((s) => !s)}
          title={showOverlay ? '구역/길 숨김' : '구역/길 표시'}
        >
          {showOverlay ? '🌐' : '◯'}
        </button>
        <button
          className="btn btn-ghost !p-2 !rounded-md"
          onClick={() => setShowLabels((s) => !s)}
          title={showLabels ? '라벨 숨김' : '라벨 표시'}
        >
          {showLabels ? <Eye size={16} /> : <EyeOff size={16} />}
        </button>
        {onToggleFullscreen && (
          <button
            className="btn btn-ghost !p-2 !rounded-md"
            onClick={onToggleFullscreen}
            title={isFullscreen ? '전체화면 종료' : '전체화면'}
          >
            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
        )}
      </div>

      {/* === 편집 모드일 때 그리기 도구 === */}
      {editMode && (
        <DrawingTools
          mode={drawTool}
          onModeChange={setDrawTool}
          drawingPointCount={drawingPoints.length}
          onFinishDrawing={finishDrawing}
          onCancelDrawing={cancelDrawing}
          hasCalibration={!!map.calibration}
        />
      )}

      {/* === 마커가 구역에 도착했을 때 정렬 모드 선택 === */}
      {lastArrival && (
        <ZoneArrivalPicker
          zoneName={lastArrival.zoneName}
          currentMode={zoneArrivalMode}
          onChangeMode={handleArrivalModeChange}
          onClose={() => setLastArrival(null)}
        />
      )}

      {/* === 거리 보정 - 점 찍기 안내 (두 점 찍기 전에는 모달 대신 가벼운 가이드) === */}
      {editMode && drawTool === 'calibrate' && !calibModalOpen && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 glass-panel rounded-xl shadow-xl fade-up overflow-hidden max-w-[92vw]">
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border">
            <span className="text-amber-400">📏</span>
            <div className="text-xs">
              <div className="font-medium text-amber-300">
                {calibrationPoints.length === 0 && '거리 보정 — 첫 번째 점을 클릭하세요'}
                {calibrationPoints.length === 1 && '거리 보정 — 두 번째 점을 클릭하세요'}
              </div>
              <div className="text-[10px] text-text-dim mt-0.5">
                실제 거리를 알고 있는 두 지점을 찍으면 미터 입력창이 열립니다
              </div>
            </div>
            {calibrationPoints.length > 0 && (
              <button
                className="btn btn-ghost !p-1.5 !text-[11px] !text-text-muted ml-1"
                onClick={() => setCalibrationPoints([])}
                title="다시 찍기"
              >
                다시
              </button>
            )}
            <button
              className="btn btn-ghost !p-1.5 !text-text-dim"
              onClick={() => setDrawTool('marker')}
              title="취소"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      {/* === 거리 보정 모달 - 두 점이 모두 찍히면 자동으로 열림 === */}
      {calibModalOpen && drawTool === 'calibrate' && (
        <CalibrationModal
          current={map.calibration}
          points={calibrationPoints}
          onPointsChange={(pts) => {
            setCalibrationPoints(pts);
            // 점이 0이나 1개로 줄면 모달 닫고 다시 찍기 모드로
            if (pts.length < 2) {
              setCalibModalOpen(false);
            }
          }}
          onSave={(c) => {
            onSetCalibration(c);
            setDrawTool('marker');
          }}
          onClear={() => {
            onSetCalibration(undefined);
            setDrawTool('marker');
          }}
          onClose={() => {
            setDrawTool('marker');
          }}
        />
      )}

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

              <p className="text-[11px] text-text-dim text-center pt-1">
                💡 마커를 길게 누르고 드래그하면 자동으로 길을 따라 이동합니다
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
