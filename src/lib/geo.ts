import { GeoPoint, Point2D, GeoCalibration } from './types';

/**
 * 두 GPS 좌표 사이의 거리 (미터, 하버사인 공식).
 * 짧은 거리에서는 정확함.
 */
export function geoDistanceMeters(a: GeoPoint, b: GeoPoint): number {
  const R = 6371000; // 지구 반지름 m
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

/**
 * GPS 좌표를 지도의 정규화 좌표(0~1)로 변환.
 *
 * 단순 어파인 모델:
 * 두 기준점 (geo_a → point_a), (geo_b → point_b)을 알면,
 * 지도 평면이 회전 가능한 어파인 변환으로 GPS와 매핑된다고 가정.
 *
 * 두 기준점만으로는 회전+스케일까지만 결정 가능 (시어 미지원).
 * 대부분의 평면도/위성 사진에는 충분한 정확도.
 */
export function geoToMapPoint(
  geo: GeoPoint,
  calib: GeoCalibration
): Point2D | null {
  const { point_a, point_b, geo_a, geo_b } = calib;

  // GPS 차이 벡터
  const gdx = geo_b.lng - geo_a.lng;
  const gdy = geo_b.lat - geo_a.lat;
  // 지도 차이 벡터
  const mdx = point_b.x - point_a.x;
  const mdy = point_b.y - point_a.y;

  const gNorm = gdx * gdx + gdy * gdy;
  if (gNorm < 1e-18) return null; // 두 기준점이 사실상 같음

  // 입력 GPS의 기준점 a로부터의 차이
  const ix = geo.lng - geo_a.lng;
  const iy = geo.lat - geo_a.lat;

  /*
   * 변환 행렬 풀이:
   * 우리는 GPS 평면 → 지도 평면의 회전+스케일 행렬을 찾고 있다.
   * 두 기준점이 있으면, GPS 차이 벡터 (gdx, gdy)를 지도 차이 벡터 (mdx, mdy)로
   * 매핑하는 회전+스케일 R 만 결정 가능.
   *
   * 분해:
   *   복소수 곱 c * z = w 에서 z = (gdx, gdy), w = (mdx, mdy) 일 때
   *   c = w/z = (w * conj(z)) / |z|^2
   *
   *   c = (mdx*gdx + mdy*gdy) + i*(mdy*gdx - mdx*gdy)) / |gdx,gdy|^2
   *
   * 그러면 입력 (ix, iy) → c * (ix + i*iy) = (cR*ix - cI*iy, cI*ix + cR*iy)
   */
  const cR = (mdx * gdx + mdy * gdy) / gNorm;
  const cI = (mdy * gdx - mdx * gdy) / gNorm;

  const ox = cR * ix - cI * iy;
  const oy = cI * ix + cR * iy;

  return {
    x: point_a.x + ox,
    y: point_a.y + oy,
  };
}

/**
 * 지도 정규화 좌표를 GPS로 역변환.
 * (위 변환의 역행렬 적용)
 */
export function mapPointToGeo(
  point: Point2D,
  calib: GeoCalibration
): GeoPoint | null {
  const { point_a, point_b, geo_a, geo_b } = calib;

  const mdx = point_b.x - point_a.x;
  const mdy = point_b.y - point_a.y;
  const gdx = geo_b.lng - geo_a.lng;
  const gdy = geo_b.lat - geo_a.lat;

  const mNorm = mdx * mdx + mdy * mdy;
  if (mNorm < 1e-18) return null;

  // 역변환: c' = z/w
  const cR = (mdx * gdx + mdy * gdy) / mNorm;
  const cI = (mdx * gdy - mdy * gdx) / mNorm;

  const ix = point.x - point_a.x;
  const iy = point.y - point_a.y;
  const lng_off = cR * ix - cI * iy;
  const lat_off = cI * ix + cR * iy;

  return {
    lng: geo_a.lng + lng_off,
    lat: geo_a.lat + lat_off,
  };
}

/** 두 GPS 좌표가 충분히 가까운지 (보정 가능 여부 검증용) */
export function geoCalibrationValid(
  pa: Point2D,
  pb: Point2D,
  ga: GeoPoint,
  gb: GeoPoint
): { valid: boolean; reason?: string } {
  const mapDist = Math.hypot(pb.x - pa.x, pb.y - pa.y);
  if (mapDist < 0.05) {
    return { valid: false, reason: '두 점이 너무 가깝습니다' };
  }
  const realDist = geoDistanceMeters(ga, gb);
  if (realDist < 1) {
    return { valid: false, reason: 'GPS 두 좌표가 거의 같습니다' };
  }
  if (realDist > 50000) {
    return { valid: false, reason: 'GPS 좌표 차이가 너무 큽니다 (50km 이상)' };
  }
  return { valid: true };
}
