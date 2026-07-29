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

/**
 * getNeighborUserIds의 반대 방향 — "나를 이웃으로 보고 있는(=내 소식이 피드에 뜨는) 사람들".
 * 새 소식을 올렸을 때 누구에게 알림을 보낼지 정할 때 쓴다.
 */
export async function getFollowerUserIds(myUserId: string): Promise<string[]> {
  const me = await prisma.user.findUnique({
    where: { id: myUserId },
    select: { email: true, emails: { select: { email: true } } },
  });
  if (!me) return [];

  const myEmails = [me.email, ...me.emails.map((e) => e.email)];

  const contacts = await prisma.contact.findMany({
    where: {
      ownerUserId: { not: myUserId },
      OR: [{ targetUserId: myUserId }, { email: { in: myEmails } }],
    },
    select: { ownerUserId: true },
  });

  return Array.from(new Set(contacts.map((c) => c.ownerUserId)));
}

/**
 * resolveContactUserId의 반대 방향 — "내(ownerUserId)가 등록해둔 인맥 중 이 계정(targetUserId)에
 * 해당하는 Contact"를 찾는다. 쪽지를 보낼 때 "연락했음"과 동일하게 자동으로 로그를 남길지
 * 판단하는 데 쓴다 — 상대를 인맥으로 등록해두지 않았으면(예: 이웃이지만 미등록) null을 반환한다.
 */
export async function findOwnedContactForUser(ownerUserId: string, targetUserId: string) {
  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { email: true, emails: { select: { email: true } } },
  });
  if (!target) return null;

  const targetEmails = [target.email, ...target.emails.map((e) => e.email)];

  return prisma.contact.findFirst({
    where: {
      ownerUserId,
      OR: [{ targetUserId }, { email: { in: targetEmails } }],
    },
  });
}

/**
 * 인맥 한 명이 실제로 어떤 계정에 연결되는지 판별한다 (targetUserId 직접 연결 또는 이메일 일치).
 * 메일함에서 쪽지 자동 전송처럼 "이 인맥이 계정을 가진 사람인가"를 개별로 확인할 때 쓴다.
 */
export async function resolveContactUserId(contact: { targetUserId: string | null; email: string | null }): Promise<string | null> {
  if (contact.targetUserId) return contact.targetUserId;
  if (!contact.email) return null;

  const user = await prisma.user.findFirst({
    where: { OR: [{ email: contact.email }, { emails: { some: { email: contact.email } } }] },
    select: { id: true },
  });
  return user?.id ?? null;
}
