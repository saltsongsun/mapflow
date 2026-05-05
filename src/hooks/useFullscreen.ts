import { useEffect, useState, useCallback } from 'react';

// iOS Safari는 일부 fullscreen API가 제한적이라 프리픽스 처리 필요
type FullscreenDoc = Document & {
  webkitFullscreenElement?: Element;
  webkitExitFullscreen?: () => Promise<void>;
};

type FullscreenElem = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void>;
};

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    const doc = document as FullscreenDoc;
    const el = document.documentElement as FullscreenElem;

    // 지원 여부 체크
    const supported = !!(
      el.requestFullscreen ||
      el.webkitRequestFullscreen
    );
    setIsSupported(supported);

    const updateState = () => {
      const fsEl = doc.fullscreenElement || doc.webkitFullscreenElement;
      setIsFullscreen(!!fsEl);
    };

    document.addEventListener('fullscreenchange', updateState);
    document.addEventListener('webkitfullscreenchange', updateState);

    return () => {
      document.removeEventListener('fullscreenchange', updateState);
      document.removeEventListener('webkitfullscreenchange', updateState);
    };
  }, []);

  const enter = useCallback(async (target?: HTMLElement | null) => {
    const el = (target || document.documentElement) as FullscreenElem;
    try {
      if (el.requestFullscreen) {
        await el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        await el.webkitRequestFullscreen();
      }
    } catch (e) {
      console.warn('전체화면 진입 실패:', e);
    }
  }, []);

  const exit = useCallback(async () => {
    const doc = document as FullscreenDoc;
    try {
      if (doc.exitFullscreen) {
        await doc.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        await doc.webkitExitFullscreen();
      }
    } catch (e) {
      console.warn('전체화면 종료 실패:', e);
    }
  }, []);

  const toggle = useCallback(
    (target?: HTMLElement | null) => {
      if (isFullscreen) {
        exit();
      } else {
        enter(target);
      }
    },
    [isFullscreen, enter, exit]
  );

  return { isFullscreen, isSupported, enter, exit, toggle };
}
