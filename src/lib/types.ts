export interface MarkerType {
  id: string;
  label: string;
  color: string;
  icon?: string;
}

/**
 * 마커 상태 - 작업 상황(예: 정상/주의/위험/휴식 등)을 시각화하기 위한 보조 라벨.
 * 마커 종류와는 별개의 차원: 마커 종류 = "누구/무엇", 상태 = "어떤 상황"
 */
export interface MarkerStatus {
  id: string;
  label: string;
  color: string;
}

export interface Marker {
  id: string;
  map_id: string;
  type_id: string;
  /** 상태 ID (선택) - 미설정 시 상태 표시 안 함 */
  status_id?: string;
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

/** GPS 좌표 (위도/경도) */
export interface GeoPoint {
  lat: number;
  lng: number;
}

/**
 * 익명 사용자 (인증 없는 간단한 ID 시스템).
 * 처음 접속 시 클라이언트가 자동으로 생성하고 localStorage에 저장.
 */
export interface User {
  id: string; // uuid
  name: string; // 사용자가 변경 가능한 닉네임
  color: string; // GPS 마커 색상
  created_at: string;
}

/**
 * GPS 위치 - 한 사용자의 현재 위치 (1행만 유지: upsert).
 * 화면에 켜져 있는 동안만 주기적으로 업데이트, 일정 시간 갱신 없으면 'stale' 표시.
 */
export interface GpsLocation {
  user_id: string;
  user_name: string;
  user_color: string;
  // GPS 원본
  lat: number;
  lng: number;
  accuracy_m?: number; // 정확도 (미터)
  // 현재 보고 있는 지도 ID + 변환된 정규화 좌표 (지도가 바뀌면 다시 계산)
  map_id?: string;
  x?: number;
  y?: number;
  updated_at: string;
}

/**
 * 지도 ↔ GPS 변환을 위한 보정 정보.
 * 지도의 두 지점에 대한 GPS 좌표를 알면 어파인 변환을 통해 임의 GPS → 지도 좌표 환산 가능.
 * 단순화 모델: 지도가 회전되지 않고 가로/세로 비율이 유지된다고 가정 (대부분의 평면도에 적합).
 */
export interface GeoCalibration {
  // 두 기준점 (지도 정규화 좌표)
  point_a: Point2D;
  point_b: Point2D;
  // 두 기준점에 해당하는 실제 GPS 좌표
  geo_a: GeoPoint;
  geo_b: GeoPoint;
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
 */
export interface MapCalibration {
  // 두 기준점 (정규화 좌표)
  point_a: Point2D;
  point_b: Point2D;
  // 두 점 사이의 실제 거리 (미터)
  real_distance_m: number;
  // 마커 이동 속도 (km/h). 미설정 시 DEFAULT_WALKING_SPEED_KMH 사용.
  speed_kmh?: number;
}

export interface MapDoc {
  id: string;
  name: string;
  image_data: string; // base64 또는 URL
  width: number;
  height: number;
  /** 거리 보정 (없으면 시간 미설정 - 기본 애니메이션 시간 사용) */
  calibration?: MapCalibration;
  /** GPS 보정 (없으면 GPS 사용자 표시 안 됨) */
  geo_calibration?: GeoCalibration;
  created_at: string;
  updated_at: string;
}

// 기본 보행 속도 (km/h) - 화면에서 보기 좋도록 실제 보행 속도(약 4km/h)보다 살짝 느리게
export const DEFAULT_WALKING_SPEED_KMH = 1.5;

// 보정 미설정 시 마커 이동 기본 지속 시간 (ms)
export const DEFAULT_MOVE_DURATION_MS = 3500;
// 너무 짧거나 너무 긴 이동 방지
export const MIN_MOVE_DURATION_MS = 800;
export const MAX_MOVE_DURATION_MS = 60000;

// GPS 관련 상수
export const GPS_UPDATE_INTERVAL_MS = 5000; // 서버 전송 주기
export const GPS_STALE_THRESHOLD_MS = 30000; // 이 시간 갱신 없으면 'stale' 표시
export const GPS_OFFLINE_THRESHOLD_MS = 90000; // 이 시간 갱신 없으면 표시 안 함

// GPS 마커용 기본 색상 풀 (사용자별 자동 할당)
export const GPS_USER_COLORS = [
  '#7c5cff',
  '#5cc8ff',
  '#5cffa8',
  '#ffb35c',
  '#ff5c7c',
  '#a78bff',
  '#ff5cd9',
  '#5cffe5',
];

/**
 * 앱 전역 설정 (Supabase에 저장, 모든 기기 공유).
 * 단일 행만 유지: id='global'
 */
export interface AppSettings {
  id: string; // 항상 'global'
  /** GPS 추적 활성화에 필요한 키. 빈 문자열이면 키 없이 누구나 사용 가능. */
  gps_key?: string;
  updated_at: string;
}

// 기본 마커 타입
export const DEFAULT_MARKER_TYPES: MarkerType[] = [];

// 기본 상태 (사용자가 자유롭게 수정/삭제 가능)
export const DEFAULT_MARKER_STATUSES: MarkerStatus[] = [
  { id: 'status-normal', label: '정상', color: '#5cffa8' },
  { id: 'status-caution', label: '주의', color: '#ffe55c' },
  { id: 'status-danger', label: '위험', color: '#ff5c7c' },
  { id: 'status-moving', label: '이동중', color: '#5cc8ff' },
];
