import React, { useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { MapDoc, Marker } from '../lib/types';

interface MapTabsProps {
  maps: MapDoc[];
  markers: Marker[];
  currentMapId: string | null;
  onSelect: (id: string) => void;
  onUploadClick: () => void;
}

export function MapTabs({
  maps,
  markers,
  currentMapId,
  onSelect,
  onUploadClick,
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

  if (maps.length === 0) return null;

  return (
    <div className="flex items-center gap-1 px-2 py-2 border-b border-border bg-bg-elevated/50 backdrop-blur-md">
      <button
        className="hidden md:flex btn btn-ghost !p-1.5 !text-text-muted flex-shrink-0"
        onClick={() => scroll('left')}
        title="왼쪽"
      >
        <ChevronLeft size={14} />
      </button>

      <div
        ref={scrollRef}
        className="flex-1 flex items-center gap-1 overflow-x-auto scrollbar-thin"
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

      <div className="w-px h-6 bg-border mx-1 flex-shrink-0" />

      <button
        className="btn btn-ghost !p-1.5 !text-text-muted hover:!text-accent flex-shrink-0"
        onClick={onUploadClick}
        title="지도 추가"
      >
        <Plus size={16} />
      </button>
    </div>
  );
}
