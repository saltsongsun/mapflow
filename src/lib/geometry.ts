import {
  Point2D,
  Zone,
  PathLine,
  MapDoc,
  DEFAULT_WALKING_SPEED_KMH,
  DEFAULT_MOVE_DURATION_MS,
  MIN_MOVE_DURATION_MS,
  MAX_MOVE_DURATION_MS,
} from './types';

/** 두 정규화 점 사이의 유클리드 거리 (정규화 단위) */
export function distance(a: Point2D, b: Point2D): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 점이 다각형 내부에 있는지 (Ray casting 알고리즘).
 * 정규화 좌표 기준이라 가로/세로 비율 차이는 무시 가능.
 */
export function pointInPolygon(point: Point2D, polygon: Point2D[]): boolean {
  if (polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersect =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** 다각형의 무게중심(centroid) 계산 */
export function polygonCentroid(polygon: Point2D[]): Point2D {
  if (polygon.length === 0) return { x: 0.5, y: 0.5 };
  if (polygon.length === 1) return polygon[0];
  let sumX = 0;
  let sumY = 0;
  for (const p of polygon) {
    sumX += p.x;
    sumY += p.y;
  }
  return { x: sumX / polygon.length, y: sumY / polygon.length };
}

/** 마커가 어느 구역에 속하는지 (없으면 null) */
export function findZoneContaining(point: Point2D, zones: Zone[]): Zone | null {
  for (const zone of zones) {
    if (pointInPolygon(point, zone.points)) return zone;
  }
  return null;
}

/**
 * 선분 위에서 점 p에 가장 가까운 점 (선분 위로 투영).
 * 결과는 선분 양 끝점 사이로 클램프됨.
 */
export function projectPointOnSegment(
  p: Point2D,
  a: Point2D,
  b: Point2D
): { point: Point2D; t: number; distSq: number } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-12) {
    return {
      point: { x: a.x, y: a.y },
      t: 0,
      distSq: distance(p, a) ** 2,
    };
  }
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const point = { x: a.x + dx * t, y: a.y + dy * t };
  return {
    point,
    t,
    distSq: distance(p, point) ** 2,
  };
}

/**
 * 폴리라인(여러 점을 잇는 선) 위에서 점 p에 가장 가까운 위치를 찾음.
 * 반환: 가장 가까운 점, 폴리라인의 시작점에서부터의 누적 거리(arcLength).
 */
export function projectPointOnPolyline(
  p: Point2D,
  polyline: Point2D[]
): { point: Point2D; arcLength: number; distSq: number } | null {
  if (polyline.length < 2) return null;
  let bestDistSq = Infinity;
  let bestPoint: Point2D = polyline[0];
  let bestSegIdx = 0;
  let bestT = 0;
  for (let i = 0; i < polyline.length - 1; i++) {
    const proj = projectPointOnSegment(p, polyline[i], polyline[i + 1]);
    if (proj.distSq < bestDistSq) {
      bestDistSq = proj.distSq;
      bestPoint = proj.point;
      bestSegIdx = i;
      bestT = proj.t;
    }
  }
  // 시작점에서부터의 누적 거리 계산
  let arcLength = 0;
  for (let i = 0; i < bestSegIdx; i++) {
    arcLength += distance(polyline[i], polyline[i + 1]);
  }
  arcLength += distance(polyline[bestSegIdx], bestPoint);
  return { point: bestPoint, arcLength, distSq: bestDistSq };
}

/**
 * 출발점 → 도착점으로 이동할 때, 그려진 길(폴리라인) 네트워크에서 최단 경로를 찾음.
 *
 * 알고리즘:
 * 1. 모든 길의 꼭짓점을 그래프 노드로 등록
 * 2. 같은 위치(또는 매우 가까운 위치)에 있는 노드들을 병합 (교차점 자동 인식)
 * 3. 각 길의 인접 꼭짓점 사이를 엣지로 연결 (가중치 = 거리)
 * 4. 출발/도착점에서 모든 길 세그먼트로 투영 → 가장 가까운 투영점을 그래프에 임시 노드로 추가
 * 5. 다익스트라로 최단 경로 계산
 * 6. 직선 거리와 비교하여 길 사용이 비효율적이면 직선 사용
 */
export function buildMovementPath(
  from: Point2D,
  to: Point2D,
  paths: PathLine[]
): Point2D[] {
  if (paths.length === 0) return [from, to];

  // 직선 베이스라인
  const directDist = distance(from, to);
  // 출발/도착이 어떤 길에든 너무 멀면 직선 사용 (구역 안에서 짧게 이동 등)
  const ENTRY_THRESHOLD = 0.15;

  // === 1단계: 그래프 노드 구성 ===
  // 노드 = { x, y, neighbors: [{nodeIdx, dist}] }
  type Node = { p: Point2D; neighbors: Map<number, number> };
  const nodes: Node[] = [];

  // 좌표 → 노드 인덱스 (중복/교차점 병합용 해시)
  const MERGE_THRESHOLD = 0.005; // 0.5% 이내면 같은 점으로 취급
  const findOrCreateNode = (p: Point2D): number => {
    for (let i = 0; i < nodes.length; i++) {
      if (distance(nodes[i].p, p) < MERGE_THRESHOLD) return i;
    }
    nodes.push({ p, neighbors: new Map() });
    return nodes.length - 1;
  };

  const addEdge = (a: number, b: number, dist: number) => {
    if (a === b) return;
    const existing = nodes[a].neighbors.get(b);
    if (existing === undefined || existing > dist) {
      nodes[a].neighbors.set(b, dist);
      nodes[b].neighbors.set(a, dist);
    }
  };

  // 모든 길의 꼭짓점들을 노드로 등록하고 인접 꼭짓점끼리 엣지 연결
  for (const path of paths) {
    if (path.points.length < 2) continue;
    let prevIdx = findOrCreateNode(path.points[0]);
    for (let i = 1; i < path.points.length; i++) {
      const curIdx = findOrCreateNode(path.points[i]);
      const d = distance(path.points[i - 1], path.points[i]);
      addEdge(prevIdx, curIdx, d);
      prevIdx = curIdx;
    }
  }

  if (nodes.length === 0) return [from, to];

  // === 2단계: from/to를 그래프에 연결 ===
  // 각 길의 모든 세그먼트에 대해 from/to의 가장 가까운 투영점을 찾고
  // 그 투영점을 임시 노드로 추가, 그 세그먼트 양 끝점과 연결
  const connectEntryPoint = (
    p: Point2D,
    label: string
  ): { nodeIdx: number; entryPoint: Point2D; minDist: number } | null => {
    type BestProj = {
      pathIdx: number;
      segIdx: number;
      proj: Point2D;
      distSq: number;
      t: number;
    };
    let best: BestProj | null = null;

    paths.forEach((path, pathIdx) => {
      for (let i = 0; i < path.points.length - 1; i++) {
        const proj = projectPointOnSegment(p, path.points[i], path.points[i + 1]);
        if (!best || proj.distSq < best.distSq) {
          best = { pathIdx, segIdx: i, proj: proj.point, distSq: proj.distSq, t: proj.t };
        }
      }
    });

    if (!best) return null;
    const bestProj: BestProj = best;
    const minDist = Math.sqrt(bestProj.distSq);
    if (minDist > ENTRY_THRESHOLD) return null;

    const path = paths[bestProj.pathIdx];
    const segStartIdx = findOrCreateNode(path.points[bestProj.segIdx]);
    const segEndIdx = findOrCreateNode(path.points[bestProj.segIdx + 1]);

    if (bestProj.t < 0.01) {
      return { nodeIdx: segStartIdx, entryPoint: path.points[bestProj.segIdx], minDist };
    }
    if (bestProj.t > 0.99) {
      return {
        nodeIdx: segEndIdx,
        entryPoint: path.points[bestProj.segIdx + 1],
        minDist,
      };
    }

    const projNode: Node = { p: bestProj.proj, neighbors: new Map() };
    nodes.push(projNode);
    const projIdx = nodes.length - 1;
    addEdge(projIdx, segStartIdx, distance(bestProj.proj, path.points[bestProj.segIdx]));
    addEdge(projIdx, segEndIdx, distance(bestProj.proj, path.points[bestProj.segIdx + 1]));
    return { nodeIdx: projIdx, entryPoint: bestProj.proj, minDist };
  };

  const fromEntry = connectEntryPoint(from, 'from');
  const toEntry = connectEntryPoint(to, 'to');

  if (!fromEntry || !toEntry) {
    // 출발 또는 도착이 길에 못 닿음 → 직선
    return [from, to];
  }

  // === 3단계: 다익스트라 최단 경로 ===
  const N = nodes.length;
  const dist = new Array<number>(N).fill(Infinity);
  const prev = new Array<number>(N).fill(-1);
  const visited = new Array<boolean>(N).fill(false);

  dist[fromEntry.nodeIdx] = 0;

  // 단순 O(N^2) 다익스트라 (노드 수가 많지 않으므로 충분)
  for (let i = 0; i < N; i++) {
    let u = -1;
    let minDistVal = Infinity;
    for (let j = 0; j < N; j++) {
      if (!visited[j] && dist[j] < minDistVal) {
        minDistVal = dist[j];
        u = j;
      }
    }
    if (u === -1 || u === toEntry.nodeIdx) break;
    visited[u] = true;

    nodes[u].neighbors.forEach((edgeDist, v) => {
      const newDist = dist[u] + edgeDist;
      if (newDist < dist[v]) {
        dist[v] = newDist;
        prev[v] = u;
      }
    });
  }

  if (dist[toEntry.nodeIdx] === Infinity) {
    // 그래프상 경로 없음 → 직선
    return [from, to];
  }

  // === 4단계: 경로 복원 ===
  const pathNodeIndices: number[] = [];
  let cur = toEntry.nodeIdx;
  while (cur !== -1) {
    pathNodeIndices.push(cur);
    if (cur === fromEntry.nodeIdx) break;
    cur = prev[cur];
  }
  pathNodeIndices.reverse();

  const pathPoints = pathNodeIndices.map((idx) => nodes[idx].p);
  // 출발 → 진입점 → ... → 이탈점 → 도착
  const fullRoute = [from, ...pathPoints, to];

  // === 5단계: 비교 ===
  const routeTotal = computePolylineLength(fullRoute);
  // 직선보다 1.5배 이상 길면 길 사용을 포기 (현실적)
  if (routeTotal > directDist * 1.5 && directDist < 0.5) {
    return [from, to];
  }

  return fullRoute;
}

/**
 * 폴리라인을 따라 arcLength 구간 [startArc, endArc]을 잘라내어 중간 점들을 반환.
 * 진입점/이탈점은 호출자가 별도로 추가하므로 여기선 그 사이의 꼭짓점들만 반환.
 */
function sliceAlongPolyline(
  polyline: Point2D[],
  startArc: number,
  endArc: number
): Point2D[] {
  const result: Point2D[] = [];
  const reversed = startArc > endArc;
  const lo = Math.min(startArc, endArc);
  const hi = Math.max(startArc, endArc);

  let acc = 0;
  for (let i = 0; i < polyline.length - 1; i++) {
    const segStart = acc;
    const segEnd = acc + distance(polyline[i], polyline[i + 1]);
    // segEnd 위치(꼭짓점)이 [lo, hi] 범위 안이면 포함
    if (segEnd > lo && segEnd < hi) {
      result.push(polyline[i + 1]);
    }
    acc = segEnd;
  }

  if (reversed) result.reverse();
  return result;
}

function computePolylineLength(points: Point2D[]): number {
  let len = 0;
  for (let i = 0; i < points.length - 1; i++) {
    len += distance(points[i], points[i + 1]);
  }
  return len;
}

/**
 * 정규화 거리(0~1)를 실제 미터로 환산.
 * 보정 정보가 있으면 두 기준점의 실제 거리/정규화 거리 비율을 사용.
 */
export function normalizedToMeters(
  normalizedDist: number,
  map: MapDoc
): number | null {
  if (!map.calibration) return null;
  const { point_a, point_b, real_distance_m } = map.calibration;
  const calibNormDist = distance(point_a, point_b);
  if (calibNormDist < 1e-9) return null;
  // 단순 비례 (이미지 평면에서의 거리)
  return (normalizedDist / calibNormDist) * real_distance_m;
}

/**
 * 마커 이동 시 애니메이션에 걸리는 시간(ms) 계산.
 * 보정 정보가 있으면:
 *   - calibration.speed_kmh가 있으면 그 값 사용
 *   - 없으면 DEFAULT_WALKING_SPEED_KMH 사용
 * 보정 자체가 없으면 거리에 비례한 기본 시간 사용.
 */
export function computeMoveDurationMs(
  totalNormalizedDist: number,
  map: MapDoc,
  speedKmh?: number
): number {
  const meters = normalizedToMeters(totalNormalizedDist, map);
  if (meters === null) {
    // 보정 없음: 거리에 비례한 기본 시간
    const fallback = totalNormalizedDist * DEFAULT_MOVE_DURATION_MS * 2;
    return Math.max(MIN_MOVE_DURATION_MS, Math.min(MAX_MOVE_DURATION_MS, fallback));
  }
  // 우선순위: 인자로 받은 속도 > calibration의 속도 > 기본 속도
  const effectiveSpeed =
    speedKmh ?? map.calibration?.speed_kmh ?? DEFAULT_WALKING_SPEED_KMH;
  // m/s = (km/h * 1000) / 3600
  const metersPerSecond = (effectiveSpeed * 1000) / 3600;
  const seconds = meters / metersPerSecond;
  const ms = seconds * 1000;
  return Math.max(MIN_MOVE_DURATION_MS, Math.min(MAX_MOVE_DURATION_MS, ms));
}

/**
 * 폴리라인 위 progress (0~1) 위치의 점 계산.
 * progress=0 → 시작점, progress=1 → 끝점, 중간은 길이 비율로 보간.
 */
export function pointAlongPolyline(polyline: Point2D[], progress: number): Point2D {
  if (polyline.length === 0) return { x: 0, y: 0 };
  if (polyline.length === 1) return polyline[0];
  const t = Math.max(0, Math.min(1, progress));
  const totalLen = computePolylineLength(polyline);
  if (totalLen < 1e-9) return polyline[0];

  const target = totalLen * t;
  let acc = 0;
  for (let i = 0; i < polyline.length - 1; i++) {
    const segLen = distance(polyline[i], polyline[i + 1]);
    if (acc + segLen >= target) {
      const remain = target - acc;
      const localT = segLen < 1e-9 ? 0 : remain / segLen;
      return {
        x: polyline[i].x + (polyline[i + 1].x - polyline[i].x) * localT,
        y: polyline[i].y + (polyline[i + 1].y - polyline[i].y) * localT,
      };
    }
    acc += segLen;
  }
  return polyline[polyline.length - 1];
}

/** 이징 함수 (자연스러운 시작/멈춤) */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * 마커가 이동 중인지 + 현재 시각의 보간 위치를 계산.
 * 시간 기반이라 백그라운드 후 복귀해도 정확한 위치를 즉시 산출.
 *
 * @returns
 *  - { animating: false, position: 마커.x/y } : 이동 중 아님 (또는 종료됨)
 *  - { animating: true, position: 보간된 좌표 } : 이동 중
 */
export function computeMarkerPosition(marker: {
  x: number;
  y: number;
  moving_from_x?: number | null;
  moving_from_y?: number | null;
  moving_route?: { x: number; y: number }[] | null;
  moving_started_at?: string | null;
  moving_duration_ms?: number | null;
}): { animating: boolean; position: Point2D; progress: number } {
  if (
    !marker.moving_started_at ||
    !marker.moving_duration_ms ||
    marker.moving_from_x === null ||
    marker.moving_from_x === undefined ||
    marker.moving_from_y === null ||
    marker.moving_from_y === undefined
  ) {
    return {
      animating: false,
      position: { x: marker.x, y: marker.y },
      progress: 1,
    };
  }

  const startedAt = new Date(marker.moving_started_at).getTime();
  if (Number.isNaN(startedAt)) {
    return {
      animating: false,
      position: { x: marker.x, y: marker.y },
      progress: 1,
    };
  }

  const elapsed = Date.now() - startedAt;
  const rawT = elapsed / marker.moving_duration_ms;

  if (rawT >= 1) {
    // 이미 완료됨
    return {
      animating: false,
      position: { x: marker.x, y: marker.y },
      progress: 1,
    };
  }

  if (rawT <= 0) {
    return {
      animating: true,
      position: { x: marker.moving_from_x, y: marker.moving_from_y },
      progress: 0,
    };
  }

  const eased = easeInOutCubic(rawT);
  // 경로가 있으면 그 위에서 보간, 없으면 직선
  const route =
    marker.moving_route && marker.moving_route.length >= 2
      ? marker.moving_route
      : [
          { x: marker.moving_from_x, y: marker.moving_from_y },
          { x: marker.x, y: marker.y },
        ];
  const pos = pointAlongPolyline(route, eased);
  return { animating: true, position: pos, progress: rawT };
}

/** 폴리라인 총 길이 (외부 export) */
export function polylineLength(points: Point2D[]): number {
  return computePolylineLength(points);
}
