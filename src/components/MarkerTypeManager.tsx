import React, { useState, useEffect } from 'react';
import { v4 as uuid } from 'uuid';
import { Plus, Trash2, X, GripVertical } from 'lucide-react';
import { MarkerType } from '../lib/types';

interface MarkerTypeManagerProps {
  types: MarkerType[];
  onSave: (types: MarkerType[]) => void;
  onClose: () => void;
}

const PRESET_COLORS = [
  '#7c5cff',
  '#5cc8ff',
  '#5cffa8',
  '#ffb35c',
  '#ff5c7c',
  '#ff5cd9',
  '#ffe55c',
  '#5cffe5',
  '#a78bff',
  '#ff8b5c',
  '#5cff8b',
  '#8b5cff',
];

export function MarkerTypeManager({ types, onSave, onClose }: MarkerTypeManagerProps) {
  // 처음 열렸을 때 비어있으면 빈 종류 1개를 미리 채워줌 (사용성)
  const [editing, setEditing] = useState<MarkerType[]>(() => {
    if (types.length === 0) {
      return [{ id: uuid(), label: '', color: PRESET_COLORS[0] }];
    }
    return types.map((t) => ({ ...t }));
  });

  const updateType = (id: string, patch: Partial<MarkerType>) => {
    setEditing((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };

  const addType = () => {
    const used = new Set(editing.map((t) => t.color));
    const available = PRESET_COLORS.find((c) => !used.has(c)) || PRESET_COLORS[0];
    setEditing((prev) => [
      ...prev,
      { id: uuid(), label: '', color: available },
    ]);
  };

  const removeType = (id: string) => {
    setEditing((prev) => prev.filter((t) => t.id !== id));
  };

  const handleSave = () => {
    const valid = editing.filter((t) => t.label.trim().length > 0);
    onSave(valid);
    onClose();
  };

  const isInitialSetup = types.length === 0;

  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[92vw] max-w-lg max-h-[85vh] glass-panel rounded-2xl shadow-2xl fade-up flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h3 className="font-display text-lg font-semibold">
              {isInitialSetup ? '마커 종류 설정' : '마커 종류 관리'}
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              {isInitialSetup
                ? '인원 이름, 팀, 상태 등 표시할 종류를 자유롭게 정하세요'
                : '이름과 색상을 자유롭게 변경할 수 있습니다'}
            </p>
          </div>
          <button className="btn btn-ghost !p-1.5" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {editing.map((type, idx) => (
            <div
              key={type.id}
              className="bg-bg-elevated rounded-xl p-3 border border-border fade-up"
              style={{ animationDelay: `${idx * 30}ms` }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-8 h-8 rounded-lg flex-shrink-0"
                  style={{
                    background: type.color,
                    boxShadow: `0 0 12px ${type.color}`,
                  }}
                />
                <input
                  className="input"
                  value={type.label}
                  onChange={(e) => updateType(type.id, { label: e.target.value })}
                  placeholder="예: 김OO, 팀A, 점검중..."
                  autoFocus={idx === 0 && type.label === ''}
                />
                <button
                  className="btn btn-ghost !p-2 !text-text-muted hover:!text-red-400"
                  onClick={() => removeType(type.id)}
                  title="삭제"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    className="w-6 h-6 rounded-md transition-transform hover:scale-110"
                    style={{
                      background: c,
                      boxShadow:
                        type.color === c
                          ? `0 0 0 2px white, 0 0 12px ${c}`
                          : `0 0 6px ${c}40`,
                    }}
                    onClick={() => updateType(type.id, { color: c })}
                  />
                ))}
                <input
                  type="color"
                  value={type.color}
                  onChange={(e) => updateType(type.id, { color: e.target.value })}
                  className="w-6 h-6 rounded-md border-0 bg-transparent cursor-pointer"
                />
              </div>
            </div>
          ))}

          <button
            className="btn btn-ghost w-full justify-center !py-3 border-dashed"
            onClick={addType}
          >
            <Plus size={14} />
            종류 추가
          </button>
        </div>

        <div className="flex items-center gap-2 p-4 border-t border-border">
          <button className="btn btn-ghost flex-1 justify-center" onClick={onClose}>
            취소
          </button>
          <button className="btn btn-primary flex-1 justify-center" onClick={handleSave}>
            저장
          </button>
        </div>
      </div>
    </>
  );
}
