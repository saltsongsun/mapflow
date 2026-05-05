import React, { useState } from 'react';
import { v4 as uuid } from 'uuid';
import { Plus, Trash2, X, Activity } from 'lucide-react';
import { MarkerStatus } from '../lib/types';

interface MarkerStatusManagerProps {
  statuses: MarkerStatus[];
  onSave: (statuses: MarkerStatus[]) => void;
  onClose: () => void;
}

const STATUS_PRESET_COLORS = [
  '#5cffa8', // 초록 - 정상
  '#5cc8ff', // 파랑 - 진행중
  '#ffe55c', // 노랑 - 주의
  '#ffb35c', // 주황 - 경고
  '#ff5c7c', // 빨강 - 위험
  '#a78bff', // 보라 - 특수
  '#9a9ab0', // 회색 - 미정/오프라인
  '#5cffe5', // 청록 - 대기
];

export function MarkerStatusManager({
  statuses,
  onSave,
  onClose,
}: MarkerStatusManagerProps) {
  const [editing, setEditing] = useState<MarkerStatus[]>(() => {
    if (statuses.length === 0) {
      return [{ id: uuid(), label: '', color: STATUS_PRESET_COLORS[0] }];
    }
    return statuses.map((s) => ({ ...s }));
  });

  const updateStatus = (id: string, patch: Partial<MarkerStatus>) => {
    setEditing((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const addStatus = () => {
    const used = new Set(editing.map((s) => s.color));
    const available =
      STATUS_PRESET_COLORS.find((c) => !used.has(c)) || STATUS_PRESET_COLORS[0];
    setEditing((prev) => [...prev, { id: uuid(), label: '', color: available }]);
  };

  const removeStatus = (id: string) => {
    setEditing((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSave = () => {
    const valid = editing.filter((s) => s.label.trim().length > 0);
    onSave(valid);
    onClose();
  };

  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[92vw] max-w-lg max-h-[85vh] glass-panel rounded-2xl shadow-2xl fade-up flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h3 className="font-display text-lg font-semibold flex items-center gap-2">
              <Activity size={16} className="text-accent" />
              상태 관리
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              마커가 가질 수 있는 상태 (예: 정상/주의/위험/이동중)
            </p>
          </div>
          <button className="btn btn-ghost !p-1.5" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {editing.map((status, idx) => (
            <div
              key={status.id}
              className="bg-bg-elevated rounded-xl p-3 border border-border fade-up"
              style={{ animationDelay: `${idx * 30}ms` }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="relative w-8 h-8 flex-shrink-0">
                  <div
                    className="absolute inset-0 rounded-lg"
                    style={{
                      background: status.color,
                      boxShadow: `0 0 12px ${status.color}`,
                    }}
                  />
                  {/* 상태는 펄스 형태로 표시될 거라 미리보기에 펄스 효과 */}
                  <div
                    className="absolute inset-0 rounded-lg animate-pulse"
                    style={{ background: status.color, opacity: 0.4 }}
                  />
                </div>
                <input
                  className="input"
                  value={status.label}
                  onChange={(e) => updateStatus(status.id, { label: e.target.value })}
                  placeholder="예: 정상, 주의, 휴식..."
                  autoFocus={idx === 0 && status.label === ''}
                />
                <button
                  className="btn btn-ghost !p-2 !text-text-muted hover:!text-red-400"
                  onClick={() => removeStatus(status.id)}
                  title="삭제"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {STATUS_PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    className="w-6 h-6 rounded-md transition-transform hover:scale-110"
                    style={{
                      background: c,
                      boxShadow:
                        status.color === c
                          ? `0 0 0 2px white, 0 0 12px ${c}`
                          : `0 0 6px ${c}40`,
                    }}
                    onClick={() => updateStatus(status.id, { color: c })}
                  />
                ))}
                <input
                  type="color"
                  value={status.color}
                  onChange={(e) => updateStatus(status.id, { color: e.target.value })}
                  className="w-6 h-6 rounded-md border-0 bg-transparent cursor-pointer"
                />
              </div>
            </div>
          ))}

          <button
            className="btn btn-ghost w-full justify-center !py-3 border-dashed"
            onClick={addStatus}
          >
            <Plus size={14} />
            상태 추가
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
