import React, { useEffect, useState } from 'react';
import { Target, Crosshair, X } from 'lucide-react';

export type ZoneArrivalMode = 'exact' | 'center';

interface ZoneArrivalPickerProps {
  /** 도착한 구역 이름 */
  zoneName: string;
  /** 현재 기본 모드 */
  currentMode: ZoneArrivalMode;
  /** 모드 변경 시 호출 (변경 즉시 마커가 다시 이동) */
  onChangeMode: (mode: ZoneArrivalMode) => void;
  /** 패널 닫기 (자동/수동) */
  onClose: () => void;
}

/**
 * 마커가 구역에 도착한 직후 잠깐 떠서 "정확한 지점" / "구역 중심" 선택 가능.
 * 5초 후 자동으로 사라짐.
 */
export function ZoneArrivalPicker({
  zoneName,
  currentMode,
  onChangeMode,
  onClose,
}: ZoneArrivalPickerProps) {
  const [hovered, setHovered] = useState(false);

  // 5초 후 자동 닫힘 (마우스 호버 중이면 연장)
  useEffect(() => {
    if (hovered) return;
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [hovered, onClose]);

  return (
    <div
      className="absolute top-16 left-1/2 -translate-x-1/2 z-30 glass-panel rounded-xl shadow-2xl fade-up overflow-hidden"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <Target size={12} className="text-accent" />
        <span className="text-xs font-medium">
          <span className="text-accent">{zoneName}</span>
          <span className="text-text-muted"> 도착</span>
        </span>
        <button
          className="btn btn-ghost !p-1 !text-text-dim ml-1"
          onClick={onClose}
        >
          <X size={11} />
        </button>
      </div>
      <div className="flex">
        <ArrivalOption
          active={currentMode === 'exact'}
          onClick={() => onChangeMode('exact')}
          icon={<Crosshair size={13} />}
          title="정확한 지점"
          desc="클릭한 곳"
        />
        <div className="w-px bg-border" />
        <ArrivalOption
          active={currentMode === 'center'}
          onClick={() => onChangeMode('center')}
          icon={<Target size={13} />}
          title="구역 중심"
          desc="중앙 정렬"
        />
      </div>
      <p className="text-[10px] text-text-dim px-3 py-1.5 bg-bg-elevated/50">
        다음 이동부터 이 설정이 기본값으로 적용됩니다
      </p>
    </div>
  );
}

function ArrivalOption({
  active,
  onClick,
  icon,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <button
      className={`flex-1 flex flex-col items-center gap-0.5 px-4 py-2 transition-colors ${
        active
          ? 'bg-accent/15 text-accent'
          : 'text-text-muted hover:text-text hover:bg-bg-hover'
      }`}
      onClick={onClick}
    >
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-xs font-medium">{title}</span>
      </div>
      <span className="text-[10px] opacity-70">{desc}</span>
    </button>
  );
}
