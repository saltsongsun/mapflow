import { v4 as uuid } from 'uuid';
import { User, GPS_USER_COLORS } from './types';

const USER_KEY = 'pb:user';

function isClient() {
  return typeof window !== 'undefined';
}

/**
 * 4자리 랜덤 식별자 (예: "3F2A")
 * 단, 시각적으로 헷갈리는 문자(0, O, 1, I) 제외
 */
function generateShortId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 4; i++) {
    s += chars[Math.floor(Math.random() * chars.length)];
  }
  return s;
}

function pickColor(): string {
  return GPS_USER_COLORS[Math.floor(Math.random() * GPS_USER_COLORS.length)];
}

/**
 * 현재 사용자 정보를 가져옴. 없으면 자동 생성.
 * 클라이언트에서만 호출.
 */
export function getOrCreateUser(): User {
  if (!isClient()) {
    // SSR fallback (실제로 사용되지 않음)
    return {
      id: 'ssr',
      name: '게스트',
      color: GPS_USER_COLORS[0],
      created_at: new Date().toISOString(),
    };
  }

  const raw = localStorage.getItem(USER_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as User;
      // 최소한의 검증
      if (parsed.id && parsed.name && parsed.color) return parsed;
    } catch {
      /* 파싱 실패 시 새로 생성 */
    }
  }

  const newUser: User = {
    id: uuid(),
    name: `사용자-${generateShortId()}`,
    color: pickColor(),
    created_at: new Date().toISOString(),
  };
  localStorage.setItem(USER_KEY, JSON.stringify(newUser));
  return newUser;
}

export function updateUser(patch: Partial<User>): User {
  const current = getOrCreateUser();
  const next: User = { ...current, ...patch };
  if (isClient()) {
    localStorage.setItem(USER_KEY, JSON.stringify(next));
  }
  return next;
}
