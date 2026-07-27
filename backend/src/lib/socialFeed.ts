import { prisma } from "./prisma";

/**
 * "이웃"(소식을 볼 수 있는 상대) 판별 기준:
 * 1) 내가 등록한 인맥 중 BLE 태깅 등으로 실제 계정과 연결된 경우 (Contact.targetUserId)
 * 2) 내가 등록한 인맥의 이메일이 그 사람의 계정 이메일(대표 or 추가 이메일)과 일치하는 경우
 * 어느 한쪽이라도 걸리면 이웃으로 본다. 내 게시물은 항상 포함하지 않는다(별도 "내 소식" 탭에서 봄).
 */
export async function getNeighborUserIds(myUserId: string): Promise<string[]> {
  const contacts = await prisma.contact.findMany({
    where: { ownerUserId: myUserId },
    select: { targetUserId: true, email: true },
  });

  const directIds = contacts
    .map((c) => c.targetUserId)
    .filter((id): id is string => Boolean(id) && id !== myUserId);

  const emails = contacts.map((c) => c.email).filter((email): email is string => Boolean(email));

  let matchedByEmail: string[] = [];
  if (emails.length > 0) {
    const users = await prisma.user.findMany({
      where: {
        id: { not: myUserId },
        OR: [{ email: { in: emails } }, { emails: { some: { email: { in: emails } } } }],
      },
      select: { id: true },
    });
    matchedByEmail = users.map((u) => u.id);
  }

  return Array.from(new Set([...directIds, ...matchedByEmail]));
}
