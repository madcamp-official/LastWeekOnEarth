import { randomBytes } from "crypto";

/**
 * BLE 광고 패킷(보통 20~24바이트 한계)에 담을 수 있는 짧은 일회성 코드 저장소.
 * 기존에 JWT로 시도했으나(약 200자) 전파로 실어 보낼 수 없어, 서버 메모리에
 * code -> userId 매핑만 두고 짧은 8자리 hex 코드만 광고하도록 바꿨다.
 *
 * 주의: 프로세스 메모리 기반이라 서버가 여러 인스턴스로 스케일아웃되면 동작하지 않는다
 * (인스턴스마다 매핑이 다름). 지금 규모에서는 단일 인스턴스를 가정. 나중에 여러 인스턴스로
 * 늘려야 하면 Redis 등 공유 저장소로 옮길 것.
 */

const TTL_MS = 5 * 60 * 1000;
const store = new Map<string, { userId: string; expiresAt: number }>();

function sweepExpired() {
  const now = Date.now();
  for (const [code, entry] of store) {
    if (entry.expiresAt < now) store.delete(code);
  }
}

export function issueBleCode(userId: string): { code: string; expiresAt: Date } {
  sweepExpired();
  const code = randomBytes(4).toString("hex"); // 8 hex chars, BLE 광고 페이로드에 충분히 들어감
  const expiresAt = Date.now() + TTL_MS;
  store.set(code, { userId, expiresAt });
  return { code, expiresAt: new Date(expiresAt) };
}

export function resolveBleCode(code: string): string | null {
  const entry = store.get(code);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    store.delete(code);
    return null;
  }
  return entry.userId;
}
