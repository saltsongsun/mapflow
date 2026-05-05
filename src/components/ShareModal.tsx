import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import { Copy, Check, Share2, X, Download, AlertTriangle, Cloud } from 'lucide-react';

interface ShareModalProps {
  url: string;
  isCloudConnected: boolean;
  onClose: () => void;
}

export function ShareModal({ url, isCloudConnected, onClose }: ShareModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(true);
  const [hasNativeShare, setHasNativeShare] = useState(false);
  const qrRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setHasNativeShare(typeof navigator !== 'undefined' && !!navigator.share);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setGenerating(true);
    // 다크모드용 컬러 설정
    QRCode.toDataURL(url, {
      width: 320,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#e8e8f0',
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
  }, [url]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 폴백: 임시 input으로 복사
      const input = document.createElement('input');
      input.value = url;
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
        title: '인원배치도 현황판',
        text: '배치도를 공유합니다',
        url,
      });
    } catch (e) {
      // 사용자가 취소한 경우는 무시
      if ((e as Error).name !== 'AbortError') {
        console.error('공유 실패:', e);
      }
    }
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = 'personnel-board-qr.png';
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

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* === Supabase 미연결 경고 === */}
          {!isCloudConnected && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex gap-2">
              <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-200/90 leading-relaxed">
                <strong>Supabase 미연결 상태</strong>
                <br />
                <span className="text-amber-200/70">
                  공유한 링크로 접속해도 데이터가 보이지 않습니다. 다중 기기 공유는
                  Supabase 환경변수를 설정해야 동작합니다.
                </span>
              </div>
            </div>
          )}

          {isCloudConnected && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex gap-2">
              <Cloud size={14} className="text-emerald-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-200/90 leading-relaxed">
                <strong>실시간 동기화 활성</strong>
                <br />
                <span className="text-emerald-200/70">
                  이 링크로 접속한 모든 기기에서 같은 데이터를 보고 편집할 수 있습니다.
                </span>
              </div>
            </div>
          )}

          {/* === QR 코드 === */}
          <div className="flex flex-col items-center">
            <div className="bg-bg-elevated rounded-2xl p-4 border border-border">
              {generating ? (
                <div className="w-[280px] h-[280px] flex items-center justify-center text-text-dim text-xs">
                  생성 중...
                </div>
              ) : qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="QR Code"
                  className="w-[280px] h-[280px] block rounded-lg"
                  style={{
                    imageRendering: 'pixelated',
                  }}
                />
              ) : (
                <div className="w-[280px] h-[280px] flex items-center justify-center text-red-400 text-xs">
                  QR 생성 실패
                </div>
              )}
            </div>
            <p className="text-xs text-text-dim mt-3 text-center">
              모바일 카메라로 스캔하면 바로 열립니다
            </p>
          </div>

          {/* === URL 표시 === */}
          <div>
            <label className="text-xs text-text-muted mb-1.5 block">링크</label>
            <div className="flex items-center gap-2">
              <input className="input flex-1 font-mono text-xs" readOnly value={url} />
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
