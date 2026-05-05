import React, { useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { MapDoc, Marker } from '../lib/types';

interface MapTabsProps {
  maps: MapDoc[];
  markers: Marker[];
  currentMapId: string | null;
  onSelect: (id: string) => void;
  onUploadClick: () => void;
  /** 탭 줄 왼쪽 끝에 표시할 액션 영역 (편집 토글 등) */
  leadingSlot?: React.ReactNode;
  /** 탭 줄 오른쪽 끝에 표시할 액션 영역 (공유, 전체화면 등) */
  trailingSlot?: React.ReactNode;
}

export function MapTabs({
  maps,
  markers,
  currentMapId,
  onSelect,
  onUploadClick,
  leadingSlot,
  trailingSlot,
}: MapTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);

  // 활성 탭으로 자동 스크롤
  useEffect(() => {
    if (activeTabRef.current && scrollRef.current) {
      activeTabRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [currentMapId]);

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({
      left: dir === 'left' ? -200 : 200,
      behavior: 'smooth',
    });
  };

  // 지도가 없어도 슬롯이 있으면 헤더 줄을 표시 (액션 버튼 자리 확보)
  if (maps.length === 0 && !leadingSlot && !trailingSlot) return null;

  return (
    <div className="flex items-center gap-2 px-2 py-2 border-b border-border bg-bg-elevated/50 backdrop-blur-md">
      {leadingSlot && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {leadingSlot}
          <div className="w-px h-6 bg-border" />
        </div>
      )}

      {maps.length > 0 && (
        <>
          <button
            className="hidden md:flex btn btn-ghost !p-1.5 !text-text-muted flex-shrink-0"
            onClick={() => scroll('left')}
            title="왼쪽"
          >
            <ChevronLeft size={14} />
          </button>

          <div
            ref={scrollRef}
            className="flex-1 flex items-center gap-1 overflow-x-auto min-w-0"
            style={{
              scrollbarWidth: 'thin',
              msOverflowStyle: 'none',
            }}
          >
            {maps.map((map) => {
              const isActive = currentMapId === map.id;
              const count = markers.filter((m) => m.map_id === map.id).length;
              return (
                <button
                  key={map.id}
                  ref={isActive ? activeTabRef : null}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-all flex-shrink-0 border ${
                    isActive
                      ? 'bg-accent/15 border-accent/40 text-text shadow-[0_0_12px_rgba(124,92,255,0.15)]'
                      : 'bg-bg-elevated border-transparent text-text-muted hover:text-text hover:bg-bg-hover hover:border-border'
                  }`}
                  onClick={() => onSelect(map.id)}
                >
                  <span className="font-medium max-w-[160px] truncate">{map.name}</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      isActive ? 'bg-accent/20 text-accent-glow' : 'bg-bg text-text-dim'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            className="hidden md:flex btn btn-ghost !p-1.5 !text-text-muted flex-shrink-0"
            onClick={() => scroll('right')}
            title="오른쪽"
          >
            <ChevronRight size={14} />
          </button>

          <button
            className="btn btn-ghost !p-1.5 !text-text-muted hover:!text-accent flex-shrink-0"
            onClick={onUploadClick}
            title="지도 추가"
          >
            <Plus size={16} />
          </button>
        </>
      )}

      {/* 지도가 없을 때는 비어 있는 가운데 영역으로 슬롯들을 양쪽에 밀어둠 */}
      {maps.length === 0 && <div className="flex-1" />}

      {trailingSlot && (
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-px h-6 bg-border" />
          {trailingSlot}
        </div>
      )}
    </div>
  );
}

