import React from 'react';
import {
  Upload,
  Map,
  Trash2,
  Settings,
  Cloud,
  CloudOff,
  Loader2,
  Layers,
} from 'lucide-react';
import { MapDoc, MarkerType, Marker } from '../lib/types';
import { useMapUpload } from '../hooks/useMapUpload';

interface SidebarProps {
  maps: MapDoc[];
  markers: Marker[];
  markerTypes: MarkerType[];
  currentMapId: string | null;
  currentTypeId: string;
  syncStatus: 'local' | 'synced' | 'syncing' | 'error';
  isCloudConnected: boolean;
  onAddMap: (data: {
    name: string;
    image_data: string;
    width: number;
    height: number;
  }) => void;
  onSelectMap: (id: string) => void;
  onRemoveMap: (id: string) => void;
  onSelectType: (id: string) => void;
  onOpenTypeManager: () => void;
  onClose?: () => void;
}

export function Sidebar({
  maps,
  markers,
  markerTypes,
  currentMapId,
  currentTypeId,
  syncStatus,
  isCloudConnected,
  onAddMap,
  onSelectMap,
  onRemoveMap,
  onSelectType,
  onOpenTypeManager,
  onClose,
}: SidebarProps) {
  const { fileInputRef, uploading, uploadInfo, triggerUpload, handleUpload } = useMapUpload(
    { onAdd: onAddMap }
  );

  const counts = markerTypes.map((type) => ({
    type,
    count: markers.filter(
      (m) => m.map_id === currentMapId && m.type_id === type.id
    ).length,
  }));

  return (
    <aside className="w-72 h-full flex flex-col bg-bg-panel border-r border-border relative">
      {/* === 헤더 === */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-1">
          <h1 className="font-display text-xl font-bold gradient-text">배치도</h1>
          <SyncBadge status={syncStatus} isConnected={isCloudConnected} />
        </div>
        <p className="text-xs text-text-dim tracking-wide">PERSONNEL BOARD</p>
      </div>

      {/* === 지도 업로드 === */}
      <div className="p-4 border-b border-border">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleUpload}
        />
        <button
          className="btn btn-primary w-full justify-center"
          onClick={triggerUpload}
          disabled={uploading}
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {uploading ? '처리 중...' : '지도 업로드'}
        </button>
        {uploadInfo && (
          <p className="text-xs text-text-muted mt-2 text-center toast">{uploadInfo}</p>
        )}
      </div>

      {/* === 지도 목록 === */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
            <Map size={12} />
            지도 목록 ({maps.length})
          </div>

          {maps.length === 0 ? (
            <div className="text-center py-8 text-xs text-text-dim">
              아직 지도가 없습니다
            </div>
          ) : (
            <div className="space-y-1">
              {maps.map((map) => (
                <div
                  key={map.id}
                  className={`group flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${
                    currentMapId === map.id
                      ? 'bg-accent/15 border border-accent/30'
                      : 'hover:bg-bg-hover border border-transparent'
                  }`}
                  onClick={() => onSelectMap(map.id)}
                >
                  <div className="w-9 h-9 rounded bg-bg-elevated overflow-hidden flex-shrink-0">
                    <img
                      src={map.image_data}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{map.name}</div>
                    <div className="text-xs text-text-dim">
                      {markers.filter((m) => m.map_id === map.id).length}개 마커
                    </div>
                  </div>
                  <button
                    className="opacity-0 group-hover:opacity-100 btn btn-ghost !p-1.5 !text-text-muted hover:!text-red-400 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`'${map.name}'을(를) 삭제할까요?`)) {
                        onRemoveMap(map.id);
                      }
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* === 마커 종류 === */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-text-muted uppercase tracking-wider">
              <Layers size={12} />
              마커 종류
            </div>
            <button
              className="btn btn-ghost !p-1 !text-text-muted hover:!text-text"
              onClick={onOpenTypeManager}
              title="종류 관리"
            >
              <Settings size={12} />
            </button>
          </div>

          {markerTypes.length === 0 ? (
            <button
              className="w-full text-center py-3 px-3 rounded-lg border border-dashed border-border-strong text-xs text-text-muted hover:text-accent hover:border-accent transition-colors"
              onClick={onOpenTypeManager}
            >
              + 첫 종류 만들기
            </button>
          ) : (
            <div className="space-y-1">
              {counts.map(({ type, count }) => (
                <button
                  key={type.id}
                  className={`w-full flex items-center gap-2.5 p-2 rounded-lg transition-all text-left ${
                    currentTypeId === type.id
                      ? 'bg-bg-elevated border border-border-strong'
                      : 'hover:bg-bg-hover border border-transparent'
                  }`}
                  onClick={() => onSelectType(type.id)}
                >
                  <div className="relative w-3 h-3 flex-shrink-0">
                    <div
                      className="absolute inset-0 rounded-full"
                      style={{
                        background: type.color,
                        boxShadow: `0 0 8px ${type.color}`,
                      }}
                    />
                    {currentTypeId === type.id && (
                      <div
                        className="absolute inset-0 rounded-full animate-ping-slow"
                        style={{ background: type.color, opacity: 0.5 }}
                      />
                    )}
                  </div>
                  <span className="text-sm flex-1 truncate">{type.label}</span>
                  <span className="text-xs text-text-dim font-mono">{count}</span>
                </button>
              ))}
            </div>
          )}

          <p className="text-xs text-text-dim mt-3 leading-relaxed">
            지도 클릭 시 선택된 종류로 표시됩니다
          </p>
        </div>
      </div>

      {/* === 푸터 === */}
      <div className="p-4 border-t border-border">
        <div className="text-xs text-text-dim leading-relaxed">
          {isCloudConnected ? (
            <>☁︎ 클라우드 동기화 활성</>
          ) : (
            <>
              <span className="text-amber-400/80">⚠ Supabase 미연결</span>
              <br />
              로컬 저장만 됩니다
            </>
          )}
        </div>
      </div>

      {onClose && (
        <button
          className="md:hidden absolute top-3 right-3 btn btn-ghost !p-1.5"
          onClick={onClose}
        >
          ✕
        </button>
      )}
    </aside>
  );
}

function SyncBadge({
  status,
  isConnected,
}: {
  status: 'local' | 'synced' | 'syncing' | 'error';
  isConnected: boolean;
}) {
  if (!isConnected) {
    return (
      <div
        className="flex items-center gap-1 text-[10px] text-amber-400/80 px-1.5 py-0.5 rounded bg-bg-elevated"
        title="Supabase 환경변수 미설정 - 로컬 저장만 됨"
      >
        <CloudOff size={10} />
        오프라인
      </div>
    );
  }

  const map = {
    local: { color: 'text-text-dim', label: '대기' },
    syncing: { color: 'text-accent', label: '동기화' },
    synced: { color: 'text-emerald-400', label: '동기화됨' },
    error: { color: 'text-red-400', label: '오류' },
  };
  const cfg = map[status];

  return (
    <div
      className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-bg-elevated ${cfg.color}`}
    >
      {status === 'syncing' ? (
        <Loader2 size={10} className="animate-spin" />
      ) : (
        <Cloud size={10} />
      )}
      {cfg.label}
    </div>
  );
}
