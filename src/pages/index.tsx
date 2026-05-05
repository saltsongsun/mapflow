import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import {
  Menu,
  MapPin,
  Image as ImageIcon,
  AlertTriangle,
  X,
  Upload,
  Layers,
  Share2,
  Maximize,
  Minimize,
  Lock,
  Pencil,
} from 'lucide-react';
import { useAppData } from '../hooks/useAppData';
import { useMapUpload } from '../hooks/useMapUpload';
import { useFullscreen } from '../hooks/useFullscreen';
import { useGpsTracking } from '../hooks/useGpsTracking';
import { useGpsAccess } from '../hooks/useGpsAccess';
import { Sidebar } from '../components/Sidebar';
import { MarkerTypeManager } from '../components/MarkerTypeManager';
import { MarkerStatusManager } from '../components/MarkerStatusManager';
import { GpsAccessModal } from '../components/GpsAccessModal';
import { MapTabs } from '../components/MapTabs';
import { ShareModal } from '../components/ShareModal';
import { getOrCreateUser, updateUser } from '../lib/userStore';
import { User } from '../lib/types';

// 지도 뷰어는 클라이언트 전용 (window 의존)
const MapViewer = dynamic(
  () => import('../components/MapViewer').then((m) => m.MapViewer),
  { ssr: false }
);

const SUPABASE_BANNER_DISMISS_KEY = 'pb:supabase-banner-dismissed';
const EDIT_MODE_KEY = 'pb:edit-mode';

export default function HomePage() {
  const data = useAppData();
  const fullscreen = useFullscreen();
  const fullscreenTargetRef = useRef<HTMLDivElement>(null);
  // 사이드바는 평상시 접혀있음 (데스크톱/모바일 통합 햄버거 방식)
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [typeManagerOpen, setTypeManagerOpen] = useState(false);
  const [statusManagerOpen, setStatusManagerOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [bannerDismissed, setBannerDismissed] = useState(true);
  const [editMode, setEditMode] = useState(false);

  // 사용자 (자동 생성/복원)
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    setUser(getOrCreateUser());
  }, []);

  const handleUpdateUserName = (name: string) => {
    const updated = updateUser({ name });
    setUser(updated);
  };

  // GPS 액세스 키 관리
  const gpsAccess = useGpsAccess(data.appSettings?.gps_key);
  const [gpsAccessModalOpen, setGpsAccessModalOpen] = useState(false);

  // GPS 추적
  const gps = useGpsTracking({
    user: user || {
      id: '',
      name: '',
      color: '#7c5cff',
      created_at: new Date().toISOString(),
    },
    currentMap: data.currentMap,
    onUpdateLocation: data.upsertGpsLocation,
    onClearLocation: data.removeGpsLocation,
  });

  const handleToggleGps = () => {
    // 키가 필요한데 권한 없으면 모달 열기
    if (gpsAccess.requiresKey && !gpsAccess.hasAccess) {
      setGpsAccessModalOpen(true);
      return;
    }
    if (gps.state.enabled) {
      gps.stop();
    } else {
      gps.start();
    }
  };

  // 권한이 갑자기 사라지면 (예: 관리자가 키를 변경) 즉시 GPS 끄기
  useEffect(() => {
    if (gpsAccess.requiresKey && !gpsAccess.hasAccess && gps.state.enabled) {
      gps.stop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gpsAccess.hasAccess, gpsAccess.requiresKey]);

  // 편집 모드 복원 (sessionStorage - 탭 닫으면 초기화되어 안전한 보기 모드로 시작)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem(EDIT_MODE_KEY);
      if (saved === '1') setEditMode(true);
    }
  }, []);

  const toggleEditMode = () => {
    setEditMode((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(EDIT_MODE_KEY, next ? '1' : '0');
      }
      return next;
    });
  };

  // 클라이언트에서만 현재 URL 가져옴
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setShareUrl(window.location.origin + window.location.pathname);
    }
  }, []);

  // 페이지에서도 업로드 가능하게 (탭의 + 버튼용)
  const { fileInputRef, handleUpload, triggerUpload } = useMapUpload({
    onAdd: data.addMap,
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBannerDismissed(localStorage.getItem(SUPABASE_BANNER_DISMISS_KEY) === '1');
    }
  }, []);

  // 마커 종류가 비었고 지도가 있으면 자동으로 종류 설정 모달 안내
  // (사용자가 닫으면 다시 띄우지 않음)
  const [autoOpenedTypeManager, setAutoOpenedTypeManager] = useState(false);
  useEffect(() => {
    if (
      !data.loading &&
      data.markerTypes.length === 0 &&
      data.maps.length > 0 &&
      !autoOpenedTypeManager
    ) {
      setTypeManagerOpen(true);
      setAutoOpenedTypeManager(true);
    }
  }, [data.loading, data.markerTypes.length, data.maps.length, autoOpenedTypeManager]);

  const handleMapSelect = (id: string) => {
    data.selectMap(id);
    setSidebarOpen(false);
  };

  const dismissBanner = () => {
    localStorage.setItem(SUPABASE_BANNER_DISMISS_KEY, '1');
    setBannerDismissed(true);
  };

  if (data.loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-text-muted">불러오는 중...</div>
      </div>
    );
  }

  const showSupabaseBanner = !data.isCloudConnected && !bannerDismissed;
  const currentTypeName = data.markerTypes.find((t) => t.id === data.currentTypeId)?.label;
  const currentTypeColor = data.markerTypes.find((t) => t.id === data.currentTypeId)?.color;

  return (
    <div
      ref={fullscreenTargetRef}
      className="h-screen w-screen flex bg-bg overflow-hidden noise-bg"
    >
      {/* 숨겨진 파일 인풋 (탭의 + 버튼용) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUpload}
      />

      {/* === 사이드바 (햄버거로 토글, 평상시 접힘) === */}
      {sidebarOpen && user && (
        <>
          <div className="backdrop" onClick={() => setSidebarOpen(false)} />
          <div className="fixed left-0 top-0 bottom-0 z-50">
            <Sidebar
              maps={data.maps}
              markers={data.markers}
              markerTypes={data.markerTypes}
              markerStatuses={data.markerStatuses}
              gpsLocations={data.gpsLocations}
              user={user}
              gpsEnabled={gps.state.enabled}
              gpsError={gps.state.error}
              gpsRequiresKey={gpsAccess.requiresKey}
              gpsHasAccess={gpsAccess.hasAccess}
              currentMapId={data.currentMapId}
              currentTypeId={data.currentTypeId}
              syncStatus={data.syncStatus}
              isCloudConnected={data.isCloudConnected}
              hasGeoCalibration={!!data.currentMap?.geo_calibration}
              onAddMap={(d) => data.addMap(d)}
              onSelectMap={handleMapSelect}
              onRemoveMap={data.removeMap}
              onSelectType={data.selectType}
              onOpenTypeManager={() => setTypeManagerOpen(true)}
              onOpenStatusManager={() => setStatusManagerOpen(true)}
              onOpenGpsAccess={() => {
                setSidebarOpen(false);
                setGpsAccessModalOpen(true);
              }}
              onUpdateUserName={handleUpdateUserName}
              onToggleGps={handleToggleGps}
              onClose={() => setSidebarOpen(false)}
            />
          </div>
        </>
      )}

      {/* === 메인 영역 === */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Supabase 미연결 배너 */}
        {showSupabaseBanner && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center gap-2 text-xs">
            <AlertTriangle size={14} className="text-amber-400 flex-shrink-0" />
            <div className="flex-1 text-amber-200/90">
              <strong>Supabase 환경변수가 설정되지 않았습니다.</strong>{' '}
              <span className="text-amber-200/70">
                현재는 이 브라우저에만 저장됩니다. Vercel에 NEXT_PUBLIC_SUPABASE_URL과
                NEXT_PUBLIC_SUPABASE_ANON_KEY를 추가해 다중 기기 동기화를 활성화하세요.
              </span>
            </div>
            <button
              className="btn btn-ghost !p-1 !text-amber-300/70 hover:!text-amber-200"
              onClick={dismissBanner}
              title="닫기"
            >
              <X size={12} />
            </button>
          </div>
        )}

        {/* 모바일 헤더 */}
        <div className="md:hidden glass-panel border-b border-border px-3 py-2 flex items-center gap-2 flex-shrink-0">
          <button
            className="btn btn-ghost !p-2"
            onClick={() => setSidebarOpen(true)}
            title="메뉴"
          >
            <Menu size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="font-display font-semibold gradient-text truncate text-sm">
              {data.currentMap?.name || '배치도'}
            </div>
            {data.currentMap && currentTypeName && (
              <div className="text-[10px] text-text-dim truncate flex items-center gap-1">
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full"
                  style={{
                    background: currentTypeColor,
                    boxShadow: `0 0 4px ${currentTypeColor}`,
                  }}
                />
                {currentTypeName} · {data.currentMarkers.length}개
              </div>
            )}
          </div>
          {data.currentMap && (
            <button
              className={`btn !p-2 transition-colors ${
                editMode
                  ? '!bg-amber-500/15 !border-amber-500/40 !text-amber-300 border'
                  : 'btn-ghost'
              }`}
              onClick={toggleEditMode}
              title={editMode ? '편집 종료' : '편집 시작'}
            >
              {editMode ? <Pencil size={16} /> : <Lock size={16} />}
            </button>
          )}
          {data.markerTypes.length > 0 && (
            <button
              className="btn btn-ghost !p-2"
              onClick={() => setTypeManagerOpen(true)}
              title="마커 종류"
            >
              <Layers size={16} />
            </button>
          )}
          <button
            className="btn btn-ghost !p-2"
            onClick={() => setShareOpen(true)}
            title="공유"
          >
            <Share2 size={16} />
          </button>
          {fullscreen.isSupported && (
            <button
              className="btn btn-ghost !p-2"
              onClick={() => fullscreen.toggle(fullscreenTargetRef.current)}
              title={fullscreen.isFullscreen ? '전체화면 종료' : '전체화면'}
            >
              {fullscreen.isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
            </button>
          )}
        </div>

        {/* 지도 탭 + 데스크톱 액션 버튼 (한 줄에 배치 → 겹침 방지) */}
        <MapTabs
          maps={data.maps}
          markers={data.markers}
          currentMapId={data.currentMapId}
          onSelect={handleMapSelect}
          onUploadClick={triggerUpload}
          leadingSlot={
            <div className="hidden md:flex items-center gap-2">
              <button
                className="btn btn-ghost !p-2 !rounded-md"
                onClick={() => setSidebarOpen(true)}
                title="메뉴"
              >
                <Menu size={16} />
              </button>
              <button
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  editMode
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                    : 'bg-bg-elevated text-text-muted hover:text-text border-transparent hover:border-border'
                }`}
                onClick={toggleEditMode}
                title={editMode ? '편집 종료 (보기 모드로)' : '편집 시작'}
              >
                {editMode ? <Pencil size={13} /> : <Lock size={13} />}
                {editMode ? '편집 중' : '보기'}
              </button>
              {currentTypeName && editMode && data.currentMap && (
                <div className="flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg bg-bg-elevated">
                  <span className="text-text-dim">현재:</span>
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{
                      background: currentTypeColor,
                      boxShadow: `0 0 6px ${currentTypeColor}`,
                    }}
                  />
                  <span className="font-medium">{currentTypeName}</span>
                </div>
              )}
            </div>
          }
          trailingSlot={
            <div className="hidden md:flex items-center gap-1">
              <button
                className="btn btn-ghost !p-2 !rounded-md"
                onClick={() => setShareOpen(true)}
                title="공유"
              >
                <Share2 size={14} />
              </button>
              {fullscreen.isSupported && (
                <button
                  className="btn btn-ghost !p-2 !rounded-md"
                  onClick={() => fullscreen.toggle(fullscreenTargetRef.current)}
                  title={fullscreen.isFullscreen ? '전체화면 종료' : '전체화면'}
                >
                  {fullscreen.isFullscreen ? (
                    <Minimize size={14} />
                  ) : (
                    <Maximize size={14} />
                  )}
                </button>
              )}
            </div>
          }
        />

        {/* 지도 영역 */}
        <div className="flex-1 relative overflow-hidden">
          {data.currentMap ? (
            data.markerTypes.length === 0 ? (
              <NoMarkerTypesState onOpen={() => setTypeManagerOpen(true)} />
            ) : (
              <MapViewer
                map={data.currentMap}
                markers={data.currentMarkers}
                markerTypes={data.markerTypes}
                markerStatuses={data.markerStatuses}
                zones={data.currentZones}
                paths={data.currentPaths}
                gpsLocations={data.currentGpsLocations}
                currentUserId={user?.id || ''}
                currentTypeId={data.currentTypeId}
                editMode={editMode}
                onAddMarker={(x, y, typeId) =>
                  data.addMarker({
                    map_id: data.currentMap!.id,
                    type_id: typeId,
                    x,
                    y,
                  })
                }
                onRemoveMarker={data.removeMarker}
                onUpdateMarker={data.updateMarker}
                onAddZone={data.addZone}
                onRemoveZone={data.removeZone}
                onAddPath={data.addPath}
                onRemovePath={data.removePath}
                onSetCalibration={(c) => data.setCalibration(data.currentMap!.id, c)}
                onSetGeoCalibration={(c) =>
                  data.setGeoCalibration(data.currentMap!.id, c)
                }
                isFullscreen={fullscreen.isFullscreen}
                onToggleFullscreen={
                  fullscreen.isSupported
                    ? () => fullscreen.toggle(fullscreenTargetRef.current)
                    : undefined
                }
              />
            )
          ) : (
            <EmptyState
              hasMaps={data.maps.length > 0}
              onUpload={triggerUpload}
            />
          )}
        </div>
      </main>

      {/* === 마커 타입 관리 모달 === */}
      {typeManagerOpen && (
        <MarkerTypeManager
          types={data.markerTypes}
          onSave={data.saveMarkerTypes}
          onClose={() => setTypeManagerOpen(false)}
        />
      )}

      {/* === 마커 상태 관리 모달 === */}
      {statusManagerOpen && (
        <MarkerStatusManager
          statuses={data.markerStatuses}
          onSave={data.saveMarkerStatuses}
          onClose={() => setStatusManagerOpen(false)}
        />
      )}

      {/* === GPS 액세스 키 모달 === */}
      {gpsAccessModalOpen && (
        <GpsAccessModal
          serverKey={data.appSettings?.gps_key}
          userKey={gpsAccess.userKey}
          hasAccess={gpsAccess.hasAccess}
          onSaveUserKey={gpsAccess.saveKey}
          onClearUserKey={gpsAccess.clearKey}
          onSetServerKey={data.setGpsKey}
          onClose={() => setGpsAccessModalOpen(false)}
        />
      )}

      {/* === 공유 모달 === */}
      {shareOpen && shareUrl && (
        <ShareModal
          url={shareUrl}
          gpsKey={data.appSettings?.gps_key}
          isCloudConnected={data.isCloudConnected}
          onClose={() => setShareOpen(false)}
        />
      )}
    </div>
  );
}

function EmptyState({ hasMaps, onUpload }: { hasMaps: boolean; onUpload: () => void }) {
  return (
    <div className="h-full flex items-center justify-center empty-glow">
      <div className="text-center max-w-sm px-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-bg-elevated border border-border mb-4">
          {hasMaps ? (
            <MapPin className="text-accent" size={28} />
          ) : (
            <ImageIcon className="text-accent" size={28} />
          )}
        </div>
        <h2 className="font-display text-xl font-semibold mb-2">
          {hasMaps ? '지도를 선택하세요' : '시작하기'}
        </h2>
        <p className="text-sm text-text-muted leading-relaxed mb-5">
          {hasMaps
            ? '상단 탭이나 사이드바에서 지도를 선택해 마커를 배치할 수 있습니다.'
            : '지도 이미지를 업로드한 뒤, 클릭하여 인원이나 위치를 표시하세요. 자동으로 압축되어 빠르게 로드됩니다.'}
        </p>
        {!hasMaps && (
          <button className="btn btn-primary" onClick={onUpload}>
            <Upload size={14} />
            지도 업로드
          </button>
        )}
      </div>
    </div>
  );
}

function NoMarkerTypesState({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="h-full flex items-center justify-center empty-glow">
      <div className="text-center max-w-sm px-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-bg-elevated border border-border mb-4">
          <Layers className="text-accent" size={28} />
        </div>
        <h2 className="font-display text-xl font-semibold mb-2">
          마커 종류를 만들어주세요
        </h2>
        <p className="text-sm text-text-muted leading-relaxed mb-5">
          이름과 색상을 자유롭게 설정해 어떤 표시를 할지 정하세요. 예: "김OO", "팀 A",
          "점검중" 등.
        </p>
        <button className="btn btn-primary" onClick={onOpen}>
          <Layers size={14} />
          종류 만들기
        </button>
      </div>
    </div>
  );
}
