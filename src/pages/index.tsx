import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Menu, MapPin, Image as ImageIcon, AlertTriangle, X, Upload, Layers } from 'lucide-react';
import { useAppData } from '../hooks/useAppData';
import { useMapUpload } from '../hooks/useMapUpload';
import { Sidebar } from '../components/Sidebar';
import { MarkerTypeManager } from '../components/MarkerTypeManager';
import { MapTabs } from '../components/MapTabs';

// 지도 뷰어는 클라이언트 전용 (window 의존)
const MapViewer = dynamic(
  () => import('../components/MapViewer').then((m) => m.MapViewer),
  { ssr: false }
);

const SUPABASE_BANNER_DISMISS_KEY = 'pb:supabase-banner-dismissed';

export default function HomePage() {
  const data = useAppData();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [typeManagerOpen, setTypeManagerOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(true);

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
    setMobileSidebarOpen(false);
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
    <div className="h-screen w-screen flex bg-bg overflow-hidden noise-bg">
      {/* 숨겨진 파일 인풋 (탭의 + 버튼용) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUpload}
      />

      {/* === 데스크톱 사이드바 === */}
      <div className="hidden md:block">
        <Sidebar
          maps={data.maps}
          markers={data.markers}
          markerTypes={data.markerTypes}
          currentMapId={data.currentMapId}
          currentTypeId={data.currentTypeId}
          syncStatus={data.syncStatus}
          isCloudConnected={data.isCloudConnected}
          onAddMap={(d) => data.addMap(d)}
          onSelectMap={handleMapSelect}
          onRemoveMap={data.removeMap}
          onSelectType={data.selectType}
          onOpenTypeManager={() => setTypeManagerOpen(true)}
        />
      </div>

      {/* === 모바일 사이드바 === */}
      {mobileSidebarOpen && (
        <>
          <div className="md:hidden backdrop" onClick={() => setMobileSidebarOpen(false)} />
          <div className="md:hidden fixed left-0 top-0 bottom-0 z-50">
            <Sidebar
              maps={data.maps}
              markers={data.markers}
              markerTypes={data.markerTypes}
              currentMapId={data.currentMapId}
              currentTypeId={data.currentTypeId}
              syncStatus={data.syncStatus}
              isCloudConnected={data.isCloudConnected}
              onAddMap={(d) => data.addMap(d)}
              onSelectMap={handleMapSelect}
              onRemoveMap={data.removeMap}
              onSelectType={data.selectType}
              onOpenTypeManager={() => setTypeManagerOpen(true)}
              onClose={() => setMobileSidebarOpen(false)}
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
            onClick={() => setMobileSidebarOpen(true)}
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
          {data.markerTypes.length > 0 && (
            <button
              className="btn btn-ghost !p-2"
              onClick={() => setTypeManagerOpen(true)}
              title="마커 종류"
            >
              <Layers size={16} />
            </button>
          )}
        </div>

        {/* 지도 탭 (지도가 있을 때만) */}
        <MapTabs
          maps={data.maps}
          markers={data.markers}
          currentMapId={data.currentMapId}
          onSelect={handleMapSelect}
          onUploadClick={triggerUpload}
        />

        {/* 데스크톱 현재 종류 표시 (좌측 상단) */}
        {data.currentMap && currentTypeName && (
          <div className="hidden md:flex absolute top-3 right-32 z-30 glass-panel rounded-lg px-3 py-1.5 items-center gap-2 text-xs">
            <span className="text-text-dim">현재 마커:</span>
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
                currentTypeId={data.currentTypeId}
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
