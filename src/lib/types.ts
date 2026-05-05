export interface MarkerType {
  id: string;
  label: string;
  color: string;
  icon?: string;
}

export interface Marker {
  id: string;
  map_id: string;
  type_id: string;
  // 0~1 범위의 정규화된 좌표 (이미지 크기 무관)
  x: number;
  y: number;
  note?: string;
  created_at: string;
  updated_at: string;
}

export interface MapDoc {
  id: string;
  name: string;
  image_data: string; // base64 또는 URL
  width: number;
  height: number;
  created_at: string;
  updated_at: string;
}

export interface AppState {
  maps: MapDoc[];
  markers: Marker[];
  markerTypes: MarkerType[];
  currentMapId: string | null;
  currentTypeId: string;
}

// 기본 마커 타입 - 첫 실행 시 비어있어 사용자가 직접 정의하도록 유도
// (빈 배열이면 앱이 자동으로 설정 모달을 띄움)
export const DEFAULT_MARKER_TYPES: MarkerType[] = [];

// "처음 만들어보기" 버튼이 추가하는 시드 (참고용 - 사용자가 자유롭게 수정/삭제)
export const STARTER_MARKER_TYPES: MarkerType[] = [
  { id: 'starter-1', label: '인원 1', color: '#7c5cff' },
  { id: 'starter-2', label: '인원 2', color: '#5cc8ff' },
];
