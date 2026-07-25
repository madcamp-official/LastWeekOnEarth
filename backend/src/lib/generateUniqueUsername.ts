import { prisma } from "./prisma";

/**
 * 이메일 등 사람이 입력한 문자열 기반으로 겹치지 않는 username을 만든다.
 * google.controller.ts와 email.controller.ts(둘 다 회원가입 시 username을 직접 입력받지 않음)에서 공용으로 쓴다.
 */
export async function generateUniqueUsername(base: string): Promise<string> {
  const normalized = base.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20) || "user";

  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = attempt === 0 ? normalized : `${normalized}${Math.floor(1000 + Math.random() * 9000)}`;
    const existing = await prisma.user.findUnique({ where: { username: candidate } });
    if (!existing) return candidate;
  }

  return `${normalized}${Date.now()}`;
}
