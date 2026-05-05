import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Navigation,
  Check,
  AlertTriangle,
  X,
  Lock,
  ChevronRight,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { useAppData } from '../hooks/useAppData';
import { useGpsTracking } from '../hooks/useGpsTracking';
import { useGpsAccess } from '../hooks/useGpsAccess';
import { getOrCreateUser, updateUser } from '../lib/userStore';
import { Marker, User as UserType } from '../lib/types';

/**
 * 스탭 참여 페이지.
 *
 * 흐름:
 * 1. 사용자(자동 ID 생성) 준비
 * 2. GPS 액세스 키 검증 (URL `?gps=KEY` 또는 입력)
 * 3. 어떤 마커가 "나"인지 선택 (해당 마커 이름이 닉네임이 됨)
 * 4. GPS 권한 요청 → 추적 시작 (백그라운드 가능한 한 유지)
 *
 * 마커 선택의 의미:
 * - 선택한 마커의 type/이름이 사용자의 표시 이름이 됨
 * - GPS 위치가 그 마커와 자동으로 동기화 (마커도 GPS 위치로 이동)
 * - 다른 사람이 이미 사용 중인 마커는 표시되지만 경고 표시
 */
export default function StaffPage() {
  const router = useRouter();
  const data = useAppData();
  const [user, setUser] = useState<UserType | null>(null);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);

  const gpsAccess = useGpsAccess(data.appSettings?.gps_key);

  // 사용자 초기화
  useEffect(() => {
    setUser(getOrCreateUser());
  }, []);

  // 선택한 마커 정보
  const selectedMarker = selectedMarkerId
    ? data.markers.find((m) => m.id === selectedMarkerId)
    : null;
  const selectedMarkerType = selectedMarker
    ? data.markerTypes.find((t) => t.id === selectedMarker.type_id)
    : null;

  // 선택된 마커의 지도 ID (GPS는 그 지도에 매핑됨)
  const linkedMapId = selectedMarker?.map_id;
  const linkedMap = linkedMapId ? data.maps.find((m) => m.id === linkedMapId) || null : null;

  // 선택한 마커 정보로 사용자 이름 동기화
  useEffect(() => {
    if (!user || !selectedMarker || !selectedMarkerType) return;
    const newName = selectedMarker.note?.trim() || selectedMarkerType.label;
    if (user.name !== newName || user.color !== selectedMarkerType.color) {
      const updated = updateUser({
        name: newName,
        color: selectedMarkerType.color,
      });
      setUser(updated);
    }
  }, [selectedMarker, selectedMarkerType, user]);

  // GPS 추적 - 선택한 마커와 연동
  const gps = useGpsTracking({
    user: user || {
      id: '',
      name: '',
      color: '#7c5cff',
      created_at: new Date().toISOString(),
    },
    currentMap: linkedMap,
    onUpdateLocation: (loc) => {
      data.upsertGpsLocation(loc);
      // 선택된 마커가 있으면 그 마커도 GPS 위치로 이동
      if (selectedMarker && loc.map_id && loc.x !== undefined && loc.y !== undefined) {
        // 짧은 거리는 즉시 (애니메이션 없음 - 부드러운 따라가기는 GPS 마커가 담당)
        data.updateMarker(selectedMarker.id, {
          x: loc.x,
          y: loc.y,
          // 이동 애니메이션 필드는 사용 안 함 (GPS는 실시간 직접 갱신)
          moving_from_x: null,
          moving_from_y: null,
          moving_route: null,
          moving_started_at: null,
          moving_duration_ms: null,
        });
      }
    },
    onClearLocation: data.removeGpsLocation,
  });

  if (data.loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-bg">
        <Loader2 className="animate-spin text-accent" size={28} />
      </div>
    );
  }

  // 단계별 화면
  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center bg-bg">
        <Loader2 className="animate-spin text-accent" size={28} />
      </div>
    );
  }

  // 1단계: 키 미인증 시 입력
  if (gpsAccess.requiresKey && !gpsAccess.hasAccess) {
    return <KeyEntryStep onSubmit={gpsAccess.saveKey} userKey={gpsAccess.userKey} />;
  }

  // 2단계: 마커 선택
  if (!gps.state.enabled) {
    return (
      <MarkerPickerStep
        markers={data.markers}
        markerTypes={data.markerTypes}
        markerStatuses={data.markerStatuses}
        maps={data.maps}
        gpsLocations={data.gpsLocations}
        currentUserId={user.id}
        selectedMarkerId={selectedMarkerId}
        onSelect={setSelectedMarkerId}
        canStart={!!selectedMarker}
        gpsError={gps.state.error}
        onStart={() => gps.start()}
        onBackToMain={() => router.push('/')}
      />
    );
  }

  // 3단계: 추적 중 화면
  return (
    <TrackingStep
      user={user}
      selectedMarker={selectedMarker}
      selectedMarkerType={selectedMarkerType}
      linkedMap={linkedMap}
      gps={gps}
      onStop={() => {
        gps.stop();
        setSelectedMarkerId(null);
      }}
    />
  );
}

// === 1단계: 키 입력 화면 ===
function KeyEntryStep({
  onSubmit,
  userKey,
}: {
  onSubmit: (k: string) => void;
  userKey: string;
}) {
  const [input, setInput] = useState('');
  const wrong = !!userKey;
  return (
    <div className="h-screen flex items-center justify-center bg-bg p-6">
      <div className="w-full max-w-sm glass-panel rounded-2xl p-6 fade-up">
        <div className="flex flex-col items-center text-center mb-5">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mb-3">
            <Lock className="text-amber-400" size={22} />
          </div>
          <h1 className="font-display text-xl font-bold mb-1">스탭 액세스 키</h1>
          <p className="text-xs text-text-muted leading-relaxed">
            관리자가 알려준 GPS 키를 입력하세요
          </p>
        </div>
        <input
          className="input mb-3 font-mono"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="키 입력"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter' && input.trim()) onSubmit(input.trim());
          }}
        />
        {wrong && (
          <p className="text-xs text-red-400 text-center mb-2">
            키가 일치하지 않습니다
          </p>
        )}
        <button
          className="btn btn-primary w-full justify-center"
          disabled={!input.trim()}
          onClick={() => onSubmit(input.trim())}
        >
          확인
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

// === 2단계: 마커 선택 화면 ===
function MarkerPickerStep({
  markers,
  markerTypes,
  markerStatuses,
  maps,
  gpsLocations,
  currentUserId,
  selectedMarkerId,
  onSelect,
  canStart,
  gpsError,
  onStart,
  onBackToMain,
}: any) {
  // 다른 사용자가 이미 추적 중인 마커 ID 매핑
  // (GPS 위치가 마커 위에 거의 일치하면 = 그 사용자가 그 마커를 사용 중)
  const inUseByOthers = new Set<string>();
  for (const loc of gpsLocations) {
    if (loc.user_id === currentUserId) continue;
    if (loc.x === undefined || loc.y === undefined) continue;
    // 가장 가까운 마커 (오차 0.01 이내) 찾기
    for (const m of markers) {
      if (m.map_id !== loc.map_id) continue;
      const dx = m.x - loc.x;
      const dy = m.y - loc.y;
      if (dx * dx + dy * dy < 0.0001) {
        inUseByOthers.add(m.id);
      }
    }
  }

  const grouped = maps.map((map: any) => ({
    map,
    markers: markers.filter((m: Marker) => m.map_id === map.id),
  }));

  return (
    <div className="h-screen flex flex-col bg-bg">
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-accent/15 border border-accent/30 flex items-center justify-center">
            <Sparkles size={14} className="text-accent" />
          </div>
          <h1 className="font-display text-lg font-bold">스탭 모드</h1>
          <button
            className="ml-auto btn btn-ghost !p-1.5 !text-text-muted"
            onClick={onBackToMain}
            title="메인으로"
          >
            <X size={14} />
          </button>
        </div>
        <p className="text-xs text-text-muted">
          어떤 마커가 본인인지 선택하세요. GPS 위치가 그 마커에 자동으로 반영됩니다.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {markers.length === 0 ? (
          <div className="text-center py-12 text-text-muted">
            <p className="text-sm mb-2">아직 마커가 없습니다</p>
            <p className="text-xs text-text-dim">
              관리자가 메인 페이지에서 마커를 추가해야 합니다
            </p>
          </div>
        ) : (
          grouped.map(({ map, markers: mapMarkers }: any) =>
            mapMarkers.length === 0 ? null : (
              <div key={map.id}>
                <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span>{map.name}</span>
                  <span className="text-text-dim font-normal normal-case">
                    · {mapMarkers.length}개 마커
                  </span>
                </div>
                <div className="space-y-1.5">
                  {mapMarkers.map((marker: Marker) => {
                    const type = markerTypes.find(
                      (t: any) => t.id === marker.type_id
                    );
                    const status = marker.status_id
                      ? markerStatuses.find((s: any) => s.id === marker.status_id)
                      : null;
                    const inUse = inUseByOthers.has(marker.id);
                    const selected = selectedMarkerId === marker.id;
                    return (
                      <button
                        key={marker.id}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all border ${
                          selected
                            ? 'border-accent bg-accent/10'
                            : 'border-border bg-bg-elevated hover:border-border-strong'
                        }`}
                        onClick={() => onSelect(marker.id)}
                      >
                        <div
                          className="w-7 h-7 rounded-full flex-shrink-0 relative"
                          style={{
                            background: type?.color || '#7c5cff',
                            boxShadow: `0 0 12px ${type?.color || '#7c5cff'}80`,
                          }}
                        >
                          {selected && (
                            <Check
                              size={14}
                              className="absolute inset-0 m-auto text-white drop-shadow"
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {type?.label || '알 수 없음'}
                          </div>
                          {(marker.note || status) && (
                            <div className="text-[11px] text-text-dim truncate flex items-center gap-1.5 mt-0.5">
                              {status && (
                                <span style={{ color: status.color }}>
                                  ● {status.label}
                                </span>
                              )}
                              {marker.note && <span>· {marker.note}</span>}
                            </div>
                          )}
                        </div>
                        {inUse && (
                          <span
                            className="text-[9px] font-medium px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 flex-shrink-0"
                            title="다른 사용자가 사용 중일 수 있음"
                          >
                            사용 중
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )
          )
        )}
      </div>

      {gpsError && (
        <div className="mx-4 mb-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex gap-2">
          <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
          <span>{gpsError}</span>
        </div>
      )}

      <div className="p-4 border-t border-border">
        <button
          className="btn btn-primary w-full justify-center !py-3"
          disabled={!canStart}
          onClick={onStart}
        >
          <Navigation size={16} />
          위치 공유 시작
        </button>
        <p className="text-[10px] text-text-dim text-center mt-2 leading-relaxed">
          GPS 권한 요청에 허용해주세요. 화면이 켜진 동안 위치가 자동 전송됩니다.
        </p>
      </div>
    </div>
  );
}

// === 3단계: 추적 중 화면 ===
function TrackingStep({
  user,
  selectedMarker,
  selectedMarkerType,
  linkedMap,
  gps,
  onStop,
}: any) {
  const lastPos = gps.state.lastPosition;
  const ageSeconds = lastPos ? Math.floor((Date.now() - lastPos.timestamp) / 1000) : 0;

  return (
    <div className="h-screen flex flex-col bg-bg">
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-2 mb-1">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center animate-pulse"
            style={{
              background: user.color,
              boxShadow: `0 0 16px ${user.color}`,
            }}
          >
            <Navigation size={14} style={{ color: '#0a0a0f' }} />
          </div>
          <h1 className="font-display text-lg font-bold">추적 중</h1>
        </div>
        <p className="text-xs text-text-muted">{user.name}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* 선택된 마커 정보 */}
        {selectedMarker && selectedMarkerType && (
          <div className="bg-bg-elevated rounded-xl p-3 border border-border">
            <div className="text-[10px] text-text-dim uppercase tracking-wider mb-2">
              연동된 마커
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full"
                style={{
                  background: selectedMarkerType.color,
                  boxShadow: `0 0 12px ${selectedMarkerType.color}80`,
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium">{selectedMarkerType.label}</div>
                {linkedMap && (
                  <div className="text-xs text-text-dim truncate">
                    {linkedMap.name}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* GPS 상태 */}
        <div className="bg-bg-elevated rounded-xl p-4 border border-emerald-500/30 bg-emerald-500/5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm font-medium text-emerald-300">위치 전송 중</span>
            {gps.state.wakeLockActive && (
              <span className="ml-auto text-[10px] text-emerald-400/70">
                화면 잠금 방지 ON
              </span>
            )}
          </div>
          {lastPos ? (
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-text-dim text-[10px] mb-0.5">위도</div>
                <div className="font-mono">{lastPos.lat.toFixed(6)}</div>
              </div>
              <div>
                <div className="text-text-dim text-[10px] mb-0.5">경도</div>
                <div className="font-mono">{lastPos.lng.toFixed(6)}</div>
              </div>
              <div>
                <div className="text-text-dim text-[10px] mb-0.5">정확도</div>
                <div className="font-mono">±{lastPos.accuracy.toFixed(0)}m</div>
              </div>
              <div>
                <div className="text-text-dim text-[10px] mb-0.5">갱신</div>
                <div className="font-mono">
                  {ageSeconds < 5 ? '방금' : `${ageSeconds}s 전`}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-text-muted">위치 측정 대기 중...</p>
          )}
        </div>

        {/* 안내 */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-200/90 leading-relaxed">
          📱 <strong>주의</strong>: 모바일 브라우저에서 다른 앱으로 전환하면 GPS 추적이
          일시 중단될 수 있습니다. 가능하면 이 화면을 켠 채로 두세요.
          <br />
          💡 PWA로 설치하면 백그라운드 유지가 더 잘 됩니다.
        </div>
      </div>

      <div className="p-4 border-t border-border">
        <button
          className="btn btn-danger w-full justify-center !py-3"
          onClick={onStop}
        >
          위치 공유 중단
        </button>
      </div>
    </div>
  );
}
