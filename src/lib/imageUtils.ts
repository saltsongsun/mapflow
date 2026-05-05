import imageCompression from 'browser-image-compression';

export interface CompressResult {
  dataUrl: string;
  width: number;
  height: number;
  originalSize: number;
  compressedSize: number;
}

/**
 * 이미지 자동 압축 - 큰 지도 이미지도 부드럽게 처리
 * 화질을 유지하면서 파일 크기를 줄여 저장 공간과 로딩 속도 최적화
 */
export async function compressMapImage(file: File): Promise<CompressResult> {
  const originalSize = file.size;

  // 압축 옵션: 최대 2.5MB, 가로/세로 최대 4096px (확대해도 선명하게)
  const options = {
    maxSizeMB: 2.5,
    maxWidthOrHeight: 4096,
    useWebWorker: true,
    fileType: 'image/jpeg' as const,
    initialQuality: 0.85,
  };

  let compressed: File;
  try {
    compressed = await imageCompression(file, options);
  } catch (e) {
    console.warn('압축 실패, 원본 사용:', e);
    compressed = file;
  }

  const dataUrl = await fileToDataUrl(compressed);
  const dimensions = await getImageDimensions(dataUrl);

  return {
    dataUrl,
    width: dimensions.width,
    height: dimensions.height,
    originalSize,
    compressedSize: compressed.size,
  };
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getImageDimensions(
  dataUrl: string
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = dataUrl;
  });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
