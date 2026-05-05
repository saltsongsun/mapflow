import React, { useState } from 'react';
import { X, Key, Eye, EyeOff, Lock, ShieldCheck, Copy, Check, Info } from 'lucide-react';

interface GpsAccessModalProps {
  /** 서버에 저장된 키 (관리자만 볼 수 있어야 하지만 인증 없으니 신뢰 기반) */
  serverKey: string | undefined;
  userKey: string;
  hasAccess: boolean;
  /** 사용자 본인이 입력한 키 저장 */
  onSaveUserKey: (key: string) => void;
  onClearUserKey: () => void;
  /** 서버(공통) 키 변경 - 관리자용 */
  onSetServerKey: (key: string) => void;
  onClose: () => void;
}

export function GpsAccessModal({
  serverKey,
  userKey,
  hasAccess,
  onSaveUserKey,
  onClearUserKey,
  onSetServerKey,
  onClose,
}: GpsAccessModalProps) {
  const [keyInput, setKeyInput] = useState('');
  const [showAdminMode, setShowAdminMode] = useState(false);
  const [adminKeyInput, setAdminKeyInput] = useState(serverKey || '');
  const [showAdminKey, setShowAdminKey] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSubmitUserKey = () => {
    const trimmed = keyInput.trim();
    if (!trimmed) return;
    onSaveUserKey(trimmed);
    setKeyInput('');
  };

  const handleSubmitAdminKey = () => {
    onSetServerKey(adminKeyInput.trim());
    alert('GPS 키가 변경되었습니다. 새 키를 알려준 사용자만 GPS를 사용할 수 있습니다.');
  };

  const handleCopyShareLink = () => {
    if (typeof window === 'undefined' || !serverKey) return;
    const url = `${window.location.origin}${window.location.pathname}?gps=${encodeURIComponent(serverKey)}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const requiresKey = !!serverKey && serverKey.length > 0;

  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[92vw] max-w-md max-h-[90vh] glass-panel rounded-2xl shadow-2xl fade-up flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-display text-base font-semibold flex items-center gap-2">
            <Key size={16} className="text-accent" />
            GPS 액세스 키
          </h3>
          <button className="btn btn-ghost !p-1.5" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* === 현재 상태 === */}
          <div
            className={`rounded-xl p-3 border flex gap-2.5 ${
              hasAccess
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : 'bg-red-500/10 border-red-500/30'
            }`}
          >
            {hasAccess ? (
              <ShieldCheck size={18} className="text-emerald-400 flex-shrink-0" />
            ) : (
              <Lock size={18} className="text-red-400 flex-shrink-0" />
            )}
            <div className="text-xs leading-relaxed">
              <div className={hasAccess ? 'text-emerald-300 font-semibold' : 'text-red-300 font-semibold'}>
                {hasAccess
                  ? requiresKey
                    ? '✓ GPS 사용 권한 있음'
                    : 'GPS 보호 미설정 (모두 사용 가능)'
                  : '✗ GPS 사용 권한 없음'}
              </div>
              <div className="text-text-dim mt-0.5">
                {requiresKey
                  ? '관리자가 알려준 키와 일치해야 GPS를 켤 수 있습니다'
                  : '아래에서 키를 설정하면 키를 가진 사람만 GPS를 사용할 수 있습니다'}
              </div>
            </div>
          </div>

          {/* === 사용자 키 입력 === */}
          {requiresKey && !hasAccess && (
            <div>
              <label className="text-xs text-text-muted mb-1.5 block flex items-center gap-1">
                <Key size={11} />키 입력
              </label>
              <div className="flex items-center gap-2">
                <input
                  className="input flex-1 font-mono"
                  type="text"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmitUserKey()}
                  placeholder="액세스 키"
                  autoFocus
                />
                <button
                  className="btn btn-primary"
                  onClick={handleSubmitUserKey}
                  disabled={!keyInput.trim()}
                >
                  확인
                </button>
              </div>
              {userKey && userKey !== serverKey && (
                <p className="text-xs text-red-400 mt-2">
                  현재 저장된 키가 일치하지 않습니다
                </p>
              )}
            </div>
          )}

          {/* === 권한 있을 때: 키 제거 옵션 === */}
          {requiresKey && hasAccess && userKey && (
            <div className="bg-bg-elevated rounded-xl p-3 border border-border">
              <div className="text-xs text-text-muted mb-2">현재 저장된 키</div>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-2 py-1 bg-bg rounded text-xs font-mono text-text">
                  {'•'.repeat(Math.min(userKey.length, 20))}
                </code>
                <button
                  className="btn btn-ghost !text-xs !text-red-400"
                  onClick={() => {
                    if (confirm('저장된 키를 제거할까요? GPS 사용이 차단됩니다.')) {
                      onClearUserKey();
                    }
                  }}
                >
                  제거
                </button>
              </div>
            </div>
          )}

          {/* === 관리자 모드 === */}
          <div className="border-t border-border pt-3">
            <button
              className="text-xs text-text-dim hover:text-text flex items-center gap-1"
              onClick={() => setShowAdminMode((s) => !s)}
            >
              <Info size={11} />
              {showAdminMode ? '관리자 옵션 숨기기' : '관리자 옵션 보기'}
            </button>

            {showAdminMode && (
              <div className="mt-3 space-y-3 fade-up">
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex gap-2">
                  <Info size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-200/90 leading-relaxed">
                    <strong>주의</strong>: 인증이 없는 시스템이라 누구나 이 옵션을 변경할
                    수 있습니다. 키를 알려준 사람만 GPS를 사용한다는 협의가 전제입니다.
                  </div>
                </div>

                <div>
                  <label className="text-xs text-text-muted mb-1.5 block">
                    공통 GPS 키 설정 (모든 기기 공유)
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        className="input w-full font-mono pr-9"
                        type={showAdminKey ? 'text' : 'password'}
                        value={adminKeyInput}
                        onChange={(e) => setAdminKeyInput(e.target.value)}
                        placeholder="비워두면 보호 해제"
                      />
                      <button
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-text-dim hover:text-text"
                        onClick={() => setShowAdminKey((s) => !s)}
                        title={showAdminKey ? '숨기기' : '보기'}
                      >
                        {showAdminKey ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    <button className="btn btn-primary" onClick={handleSubmitAdminKey}>
                      적용
                    </button>
                  </div>
                  <p className="text-[10px] text-text-dim mt-1">
                    빈 값으로 저장하면 누구나 GPS를 사용할 수 있게 됩니다
                  </p>
                </div>

                {/* 공유 링크 */}
                {requiresKey && (
                  <div>
                    <label className="text-xs text-text-muted mb-1.5 block">
                      키 포함 공유 링크
                    </label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-2 py-1.5 bg-bg-elevated rounded text-[10px] font-mono text-text truncate border border-border">
                        ...{`?gps=${serverKey}`.slice(0, 32)}
                      </code>
                      <button
                        className={`btn ${copied ? 'btn-primary' : 'btn-ghost'} !px-2`}
                        onClick={handleCopyShareLink}
                      >
                        {copied ? <Check size={12} /> : <Copy size={12} />}
                      </button>
                    </div>
                    <p className="text-[10px] text-text-dim mt-1">
                      이 링크로 접속한 사람은 자동으로 키가 등록됩니다
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
