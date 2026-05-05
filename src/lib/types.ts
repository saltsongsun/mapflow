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

/** 지도 위의 점 (정규화 좌표 0~1) */
export interface Point2D {
  x: number;
  y: number;
}

/** 구역 (다각형) - 마커가 이 구역으로 이동 가능 */
export interface Zone {
  id: string;
  map_id: string;
  name: string;
  color: string; // 외곽선/채움 색상
  points: Point2D[]; // 다각형의 꼭짓점들 (3개 이상)
  created_at: string;
  updated_at: string;
}

/** 길 (폴리라인) - 마커 이동 경로의 가이드로 사용 */
export interface PathLine {
  id: string;
  map_id: string;
  name?: string;
  color: string;
  points: Point2D[]; // 2개 이상의 점
  created_at: string;
  updated_at: string;
}

/**
 * 거리 보정(스케일 캘리브레이션) 정보.
 * 사용자가 지도 위 두 점을 찍고 실제 거리(미터)를 입력하면,
 * "정규화 좌표 1.0 단위 = ?미터"를 역산해서 이동 시간을 계산할 수 있다.
 * 지도 이미지의 가로 비율은 고정이므로 가로 기준으로 계산.
 */
export interface MapCalibration {
  // 두 기준점 (정규화 좌표)
  point_a: Point2D;
  point_b: Point2D;
  // 두 점 사이의 실제 거리 (미터)
  real_distance_m: number;
}

export interface MapDoc {
  id: string;
  name: string;
  image_data: string; // base64 또는 URL
  width: number;
  height: number;
  /** 거리 보정 (없으면 시간 미설정 - 기본 애니메이션 시간 사용) */
  calibration?: MapCalibration;
  created_at: string;
  updated_at: string;
}

// 기본 보행 속도 (km/h)
export const DEFAULT_WALKING_SPEED_KMH = 3;

// 보정 미설정 시 마커 이동 기본 지속 시간 (ms)
export const DEFAULT_MOVE_DURATION_MS = 1500;
// 너무 짧거나 너무 긴 이동 방지
export const MIN_MOVE_DURATION_MS = 400;
export const MAX_MOVE_DURATION_MS = 30000;

// 기본 마커 타입
export const DEFAULT_MARKER_TYPES: MarkerType[] = [];
