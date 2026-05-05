import { useRef, useState, useCallback } from 'react';
import { compressMapImage, formatBytes } from '../lib/imageUtils';

interface UseMapUploadParams {
  onAdd: (data: {
    name: string;
    image_data: string;
    width: number;
    height: number;
  }) => void;
}

export function useMapUpload({ onAdd }: UseMapUploadParams) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadInfo, setUploadInfo] = useState<string | null>(null);

  const triggerUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploading(true);
      setUploadInfo('이미지 압축 중...');
      try {
        const result = await compressMapImage(file);
        const ratio = ((1 - result.compressedSize / result.originalSize) * 100).toFixed(0);
        setUploadInfo(
          `${formatBytes(result.originalSize)} → ${formatBytes(result.compressedSize)} (${ratio}% 절감)`
        );
        onAdd({
          name: file.name.replace(/\.[^.]+$/, ''),
          image_data: result.dataUrl,
          width: result.width,
          height: result.height,
        });
        setTimeout(() => setUploadInfo(null), 3000);
      } catch (err) {
        console.error(err);
        setUploadInfo('업로드 실패');
        setTimeout(() => setUploadInfo(null), 3000);
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [onAdd]
  );

  return { fileInputRef, uploading, uploadInfo, triggerUpload, handleUpload };
}
