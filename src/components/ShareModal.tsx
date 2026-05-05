import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  Copy,
  Check,
  Share2,
  X,
  Download,
  AlertTriangle,
  Cloud,
  Eye,
  Navigation,
  Lock,
} from 'lucide-react';

interface ShareModalProps {
  /** 기본(보기용) URL */
  url: string;
  /** GPS 키 (있으면 스탭 링크에 자동 포함) */
  gpsKey?: string;
  isCloudConnected: boolean;
  onClose: () => void;
}

type ShareMode = 'viewer' | 'staff';

export function ShareModal({ url, gpsKey, isCloudConnected, onClose }: ShareModalProps) {
  const [mode, setMode] = useState<ShareMode>('viewer');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(true);
  const [hasNativeShare, setHasNativeShare] = useState(false);

  useEffect(() => {
    setHasNativeShare(typeof navigator !== 'undefined' && !!navigator.share);
  }, []);

  // 모드별 URL 계산
  const baseUrl = url.split('?')[0];
  const staffUrl = (() => {
    const u = new URL(baseUrl + 'staff', baseUrl);
    if (gpsKey && gpsKey.length > 0) {
      u.searchParams.set('gps', gpsKey);
    }
    return u.toString();
  })();

  // 또는 단순 path 합성 (URL constructor가 base에 따라 달라질 수 있음)
  const buildStaffUrl = () => {
    if (typeof window === 'undefined') return '';
    const origin = window.location.origin;
    const path = '/staff';
    const params = new URLSearchParams();
    if (gpsKey && gpsKey.length > 0) params.set('gps', gpsKey);
    const qs = params.toString();
    return `${origin}${path}${qs ? '?' + qs : ''}`;
  };

  const currentUrl = mode === 'viewer' ? url : buildStaffUrl();

  useEffect(() => {
    let cancelled = false;
    setGenerating(true);
    QRCode.toDataURL(currentUrl, {
      width: 320,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: mode === 'staff' ? '#5cffe5' : '#e8e8f0',
        light: '#13131a',
      },
    })
      .then((dataUrl) => {
        if (!cancelled) {
          setQrDataUrl(dataUrl);
          setGenerating(false);
        }
      })
      .catch((e) => {
        console.error('QR 생성 실패:', e);
        if (!cancelled) setGenerating(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentUrl, mode]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement('input');
      input.value = currentUrl;
      document.body.appendChild(input);
      input.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (e) {
        console.error('복사 실패:', e);
      }
      document.body.removeChild(input);
    }
  };

  const handleNativeShare = async () => {
    if (!navigator.share) return;
    try {
      await navigator.share({
        title: mode === 'staff' ? '스탭 위치 공유 참여' : '인원배치도 현황판',
        text:
          mode === 'staff'
            ? '아래 링크로 접속해 본인 마커를 선택하면 GPS 위치가 자동 공유됩니다'
            : '배치도를 공유합니다',
        url: currentUrl,
      });
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        console.error('공유 실패:', e);
      }
    }
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = mode === 'staff' ? 'staff-qr.png' : 'personnel-board-qr.png';
    link.click();
  };

  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[92vw] max-w-md glass-panel rounded-2xl shadow-2xl fade-up flex flex-col max-h-[90vh]">
        {/* === 헤더 === */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h3 className="font-display text-lg font-semibold flex items-center gap-2">
              <Share2 size={18} className="text-accent" />
              공유하기
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              QR 또는 링크로 다른 기기에서 열기
            </p>
          </div>
          <button className="btn btn-ghost !p-1.5" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* === 탭 (보기용 / 스탭용) === */}
        <div className="px-5 pt-3 pb-1">
          <div className="flex bg-bg-elevated rounded-lg p-1 gap-1">
            <button
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-all ${
                mode === 'viewer'
                  ? 'bg-bg text-text shadow-sm'
                  : 'text-text-muted hover:text-text'
              }`}
              onClick={() => setMode('viewer')}
            >
              <Eye size={12} />
              보기용
            </button>
            <button
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-all ${
                mode === 'staff'
                  ? 'bg-[#5cffe5]/15 text-[#5cffe5] shadow-sm'
                  : 'text-text-muted hover:text-text'
              }`}
              onClick={() => setMode('staff')}
            >
              <Navigation size={12} />
              스탭용 (GPS)
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 pt-3 space-y-4">
          {/* === 모드별 안내 === */}
          {mode === 'viewer' && !isCloudConnected && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex gap-2">
              <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-200/90 leading-relaxed">
                <strong>Supabase 미연결 상태</strong>
                <br />
                <span className="text-amber-200/70">
                  공유한 링크로 접속해도 데이터가 보이지 않습니다.
                </span>
              </div>
            </div>
          )}

          {mode === 'viewer' && isCloudConnected && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex gap-2">
              <Cloud size={14} className="text-emerald-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-200/90 leading-relaxed">
                <strong>보기/편집용 링크</strong>
                <br />
                <span className="text-emerald-200/70">
                  지도와 마커를 보고 편집할 수 있습니다. 누구나 접속 가능.
                </span>
              </div>
            </div>
          )}

          {mode === 'staff' && (
            <div className="bg-[#5cffe5]/10 border border-[#5cffe5]/20 rounded-xl p-3 flex gap-2">
              <Navigation size={14} className="text-[#5cffe5] flex-shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed">
                <strong className="text-[#5cffe5]">스탭 참여용 링크</strong>
                <br />
                <span className="text-text-muted">
                  접속한 사람은 본인 마커를 선택하고 GPS 위치를 자동 공유합니다.
                </span>
                {gpsKey && gpsKey.length > 0 ? (
                  <div className="mt-2 flex items-center gap-1 text-[10px] text-emerald-300">
                    <Check size={10} />
                    GPS 키가 자동 포함됨 (스탭은 별도 입력 불필요)
                  </div>
                ) : (
                  <div className="mt-2 flex items-center gap-1 text-[10px] text-amber-300">
                    <Lock size={10} />
                    GPS 키 미설정 — 누구나 GPS 추적 가능 (사이드바에서 키 설정 권장)
                  </div>
                )}
              </div>
            </div>
          )}

          {/* === QR 코드 === */}
          <div className="flex flex-col items-center">
            <div
              className="bg-bg-elevated rounded-2xl p-4 border"
              style={{
                borderColor:
                  mode === 'staff' ? 'rgba(92, 255, 229, 0.3)' : 'rgba(255,255,255,0.08)',
                boxShadow:
                  mode === 'staff'
                    ? '0 0 24px rgba(92, 255, 229, 0.15)'
                    : undefined,
              }}
            >
              {generating ? (
                <div className="w-[280px] h-[280px] flex items-center justify-center text-text-dim text-xs">
                  생성 중...
                </div>
              ) : qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="QR Code"
                  className="w-[280px] h-[280px] block rounded-lg"
                  style={{ imageRendering: 'pixelated' }}
                />
              ) : (
                <div className="w-[280px] h-[280px] flex items-center justify-center text-red-400 text-xs">
                  QR 생성 실패
                </div>
              )}
            </div>
            <p className="text-xs text-text-dim mt-3 text-center">
              {mode === 'staff'
                ? '스탭에게 이 QR을 보여주세요'
                : '모바일 카메라로 스캔하면 바로 열립니다'}
            </p>
          </div>

          {/* === URL 표시 === */}
          <div>
            <label className="text-xs text-text-muted mb-1.5 block">링크</label>
            <div className="flex items-center gap-2">
              <input
                className="input flex-1 font-mono text-xs"
                readOnly
                value={currentUrl}
              />
              <button
                className={`btn ${copied ? 'btn-primary' : 'btn-ghost'} !px-3 flex-shrink-0`}
                onClick={handleCopy}
              >
                {copied ? (
                  <>
                    <Check size={14} />
                    <span className="hidden sm:inline">복사됨</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    <span className="hidden sm:inline">복사</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* === 액션 버튼 === */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              className="btn btn-ghost justify-center"
              onClick={handleDownloadQR}
              disabled={!qrDataUrl}
            >
              <Download size={14} />
              QR 저장
            </button>
            {hasNativeShare ? (
              <button className="btn btn-primary justify-center" onClick={handleNativeShare}>
                <Share2 size={14} />
                공유 메뉴
              </button>
            ) : (
              <button className="btn btn-primary justify-center" onClick={handleCopy}>
                <Copy size={14} />
                {copied ? '복사됨' : '링크 복사'}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
