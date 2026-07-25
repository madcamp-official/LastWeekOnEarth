import { prisma } from "./prisma";

/**
 * User.email/Contact.email(대표 이메일 캐시 필드)만 있던 시절 데이터를 위한 지연 백필.
 * 여러 이메일 목록을 처음 조회/추가하는 시점에, 기존 대표 이메일을 UserEmail/ContactEmail의
 * isPrimary 행으로 편입시켜 둔다.
 */
export async function ensureUserPrimaryEmail(userId: string): Promise<void> {
  const hasPrimary = await prisma.userEmail.findFirst({ where: { userId, isPrimary: true } });
  if (hasPrimary) return;

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  await prisma.userEmail.upsert({
    where: { email: user.email },
    update: { userId, isPrimary: true },
    create: { userId, email: user.email, isPrimary: true },
  });
}

export async function ensureContactPrimaryEmail(contactId: string): Promise<void> {
  const hasPrimary = await prisma.contactEmail.findFirst({ where: { contactId, isPrimary: true } });
  if (hasPrimary) return;

  const contact = await prisma.contact.findUniqueOrThrow({ where: { id: contactId } });
  if (!contact.email) return;

  await prisma.contactEmail.upsert({
    where: { contactId_email: { contactId, email: contact.email } },
    update: { isPrimary: true },
    create: { contactId, email: contact.email, isPrimary: true },
  });
}
