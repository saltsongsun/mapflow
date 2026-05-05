import React, { useState } from 'react';
import {
  Upload,
  Map,
  Trash2,
  Settings,
  Cloud,
  CloudOff,
  Loader2,
  Layers,
  Activity,
  Navigation,
  User as UserIcon,
  Pencil,
  Check,
  Key,
  Lock,
} from 'lucide-react';
import {
  MapDoc,
  MarkerType,
  MarkerStatus,
  Marker,
  GpsLocation,
  User,
  GPS_OFFLINE_THRESHOLD_MS,
} from '../lib/types';
import { useMapUpload } from '../hooks/useMapUpload';

interface SidebarProps {
  maps: MapDoc[];
  markers: Marker[];
  markerTypes: MarkerType[];
  markerStatuses: MarkerStatus[];
  gpsLocations: GpsLocation[];
  user: User;
  gpsEnabled: boolean;
  gpsError: string | null;
  /** GPS 키가 필요한지 (서버에 키가 설정되어 있는지) */
  gpsRequiresKey: boolean;
  /** 현재 사용자가 GPS 액세스를 가졌는지 */
  gpsHasAccess: boolean;
  currentMapId: string | null;
  currentTypeId: string;
  syncStatus: 'local' | 'synced' | 'syncing' | 'error';
  isCloudConnected: boolean;
  hasGeoCalibration: boolean;
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
  onOpenStatusManager: () => void;
  onOpenGpsAccess: () => void;
  onUpdateUserName: (name: string) => void;
  onToggleGps: () => void;
  onClose?: () => void;
}

export function Sidebar({
  maps,
  markers,
  markerTypes,
  markerStatuses,
  gpsLocations,
  user,
  gpsEnabled,
  gpsError,
  gpsRequiresKey,
  gpsHasAccess,
  currentMapId,
  currentTypeId,
  syncStatus,
  isCloudConnected,
  hasGeoCalibration,
  onAddMap,
  onSelectMap,
  onRemoveMap,
  onSelectType,
  onOpenTypeManager,
  onOpenStatusManager,
  onOpenGpsAccess,
  onUpdateUserName,
  onToggleGps,
  onClose,
}: SidebarProps) {
  const { fileInputRef, uploading, uploadInfo, triggerUpload, handleUpload } = useMapUpload(
    { onAdd: onAddMap }
  );
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(user.name);

  const saveNameEdit = () => {
    const trimmed = nameInput.trim();
    if (trimmed && trimmed !== user.name) {
      onUpdateUserName(trimmed);
    }
    setEditingName(false);
  };

  // 활성 GPS 사용자 (마지막 갱신이 너무 오래되지 않은)
  const now = Date.now();
  const activeGpsUsers = gpsLocations.filter(
    (l) => now - new Date(l.updated_at).getTime() < GPS_OFFLINE_THRESHOLD_MS
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

      {/* === 사용자 정보 + GPS 토글 === */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              background: user.color,
              boxShadow: `0 0 12px ${user.color}80`,
            }}
          >
            <UserIcon size={14} style={{ color: '#0a0a0f' }} />
          </div>
          {editingName ? (
            <div className="flex-1 flex items-center gap-1">
              <input
                className="input !text-xs !py-1.5"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveNameEdit();
                  if (e.key === 'Escape') {
                    setNameInput(user.name);
                    setEditingName(false);
                  }
                }}
                autoFocus
                maxLength={20}
              />
              <button
                className="btn btn-primary !p-1.5 flex-shrink-0"
                onClick={saveNameEdit}
              >
                <Check size={12} />
              </button>
            </div>
          ) : (
            <div className="flex-1 min-w-0 flex items-center gap-1">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{user.name}</div>
                <div className="text-[10px] text-text-dim font-mono truncate">
                  ID: {user.id.slice(0, 8)}
                </div>
              </div>
              <button
                className="btn btn-ghost !p-1.5 !text-text-muted hover:!text-text"
                onClick={() => {
                  setNameInput(user.name);
                  setEditingName(true);
                }}
                title="이름 변경"
              >
                <Pencil size={12} />
              </button>
            </div>
          )}
        </div>

        {/* GPS 토글 */}
        {gpsRequiresKey && !gpsHasAccess ? (
          // 키가 필요하고 권한 없을 때 - 키 입력 안내 버튼
          <button
            className="w-full flex items-center gap-2 p-2.5 rounded-lg text-xs font-medium transition-all border bg-bg-elevated border-border text-text-muted hover:text-text hover:border-amber-500/40"
            onClick={onOpenGpsAccess}
          >
            <Lock size={14} className="text-amber-400" />
            <span className="flex-1 text-left">
              <div>GPS 잠금됨</div>
              <div className="text-[10px] text-text-dim font-normal mt-0.5">
                액세스 키 입력 필요
              </div>
            </span>
            <Key size={12} className="text-amber-400" />
          </button>
        ) : (
          // 권한 있음 (또는 키 미설정) - 일반 토글
          <button
            className={`w-full flex items-center gap-2 p-2.5 rounded-lg text-xs font-medium transition-all border ${
              gpsEnabled
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-bg-elevated border-border text-text-muted hover:text-text hover:border-border-strong'
            }`}
            onClick={onToggleGps}
          >
            <Navigation size={14} className={gpsEnabled ? 'animate-pulse' : ''} />
            <span className="flex-1 text-left">
              {gpsEnabled ? '내 위치 공유 중' : '내 위치 공유 시작'}
            </span>
            {gpsEnabled && (
              <span className="text-[9px] uppercase tracking-wider opacity-80">ON</span>
            )}
          </button>
        )}

        {/* GPS 키 관리 버튼 */}
        <button
          className="w-full flex items-center gap-2 mt-1.5 px-2.5 py-1.5 rounded-lg text-[10px] text-text-dim hover:text-text hover:bg-bg-hover transition-colors"
          onClick={onOpenGpsAccess}
        >
          <Key size={10} />
          <span>GPS 키 관리</span>
          {gpsRequiresKey && (
            <span className="ml-auto text-[9px] text-amber-400/80">🔒 보호됨</span>
          )}
        </button>
        {gpsError && (
          <p className="text-[10px] text-red-400 mt-1.5 leading-tight">{gpsError}</p>
        )}
        {!hasGeoCalibration && gpsEnabled && (
          <p className="text-[10px] text-amber-400/80 mt-1.5 leading-tight">
            ⚠ 이 지도에 GPS 보정이 없어 화면에 표시되지 않습니다 (편집 모드 → GPS 도구)
          </p>
        )}

        {/* 활성 GPS 사용자 목록 */}
        {activeGpsUsers.length > 0 && (
          <div className="mt-3 space-y-1">
            <div className="text-[10px] text-text-dim uppercase tracking-wider mb-1">
              활성 사용자 ({activeGpsUsers.length})
            </div>
            {activeGpsUsers.map((loc) => {
              const isSelf = loc.user_id === user.id;
              const age = now - new Date(loc.updated_at).getTime();
              return (
                <div
                  key={loc.user_id}
                  className="flex items-center gap-2 text-xs p-1.5 rounded bg-bg-elevated/50"
                >
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{
                      background: loc.user_color,
                      boxShadow: `0 0 6px ${loc.user_color}`,
                    }}
                  />
                  <span className="flex-1 truncate">
                    {loc.user_name}
                    {isSelf && <span className="text-text-dim"> (나)</span>}
                  </span>
                  <span className="text-[10px] text-text-dim font-mono">
                    {age < 10000 ? '실시간' : `${Math.floor(age / 1000)}s`}
                  </span>
                </div>
              );
            })}
          </div>
        )}
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

        {/* === 상태 === */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-text-muted uppercase tracking-wider">
              <Activity size={12} />
              상태
            </div>
            <button
              className="btn btn-ghost !p-1 !text-text-muted hover:!text-text"
              onClick={onOpenStatusManager}
              title="상태 관리"
            >
              <Settings size={12} />
            </button>
          </div>

          {markerStatuses.length === 0 ? (
            <button
              className="w-full text-center py-3 px-3 rounded-lg border border-dashed border-border-strong text-xs text-text-muted hover:text-accent hover:border-accent transition-colors"
              onClick={onOpenStatusManager}
            >
              + 상태 만들기
            </button>
          ) : (
            <div className="space-y-1">
              {markerStatuses.map((status) => {
                const count = markers.filter(
                  (m) => m.map_id === currentMapId && m.status_id === status.id
                ).length;
                return (
                  <div
                    key={status.id}
                    className="w-full flex items-center gap-2.5 p-2 rounded-lg bg-bg-elevated/50 border border-transparent"
                  >
                    <div className="relative w-3 h-3 flex-shrink-0">
                      <div
                        className="absolute inset-0 rounded-full"
                        style={{
                          background: status.color,
                          boxShadow: `0 0 8px ${status.color}`,
                        }}
                      />
                    </div>
                    <span className="text-sm flex-1 truncate">{status.label}</span>
                    <span className="text-xs text-text-dim font-mono">{count}</span>
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-xs text-text-dim mt-3 leading-relaxed">
            마커 클릭 후 편집 모달에서 변경 가능
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
          className="absolute top-3 right-3 btn btn-ghost !p-1.5"
          onClick={onClose}
          title="닫기"
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
