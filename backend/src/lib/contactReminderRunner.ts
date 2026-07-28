import { prisma } from "./prisma";
import { sendExpoPushNotification } from "./expoPush";

const CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1시간마다 확인 (리마인더 단위가 "일" 수준이라 이 정도 주기로 충분)

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

/**
 * 각 인맥의 reminderIntervalDays(기본 90일)가 지나도록 연락(lastContactedAt/로그)이 없으면
 * 소유자에게 푸시 알림을 보낸다. 같은 미연락 기간에 중복 발송하지 않도록, 마지막 연락 이후
 * 이미 CONTACT_REMINDER 알림을 보낸 적이 있으면 건너뛴다.
 */
async function runDueContactReminders(): Promise<void> {
  const contacts = await prisma.contact.findMany({
    where: { owner: { expoPushToken: { not: null } } },
    include: { owner: { select: { id: true, expoPushToken: true } } },
  });

  const now = new Date();

  for (const contact of contacts) {
    const baseDate = contact.lastContactedAt ?? contact.createdAt;
    const dueAt = addDays(baseDate, contact.reminderIntervalDays);
    if (dueAt > now) continue;

    const alreadyNotified = await prisma.notification.findFirst({
      where: { contactId: contact.id, type: "CONTACT_REMINDER", createdAt: { gt: baseDate } },
    });
    if (alreadyNotified) continue;

    await prisma.notification.create({
      data: {
        userId: contact.ownerUserId,
        contactId: contact.id,
        type: "CONTACT_REMINDER",
        scheduledAt: now,
        sent: true,
      },
    });

    if (contact.owner.expoPushToken) {
      await sendExpoPushNotification(
        contact.owner.expoPushToken,
        "연락할 시기예요",
        `${contact.name}님과 연락한 지 오래됐어요. 안부를 전해보세요!`,
        { contactId: contact.id },
      ).catch((err) => console.error("[contactReminderRunner] 푸시 발송 실패:", err));
    }
  }
}

export function startContactReminderRunner(): void {
  setInterval(() => {
    runDueContactReminders().catch((err) => console.error("[contactReminderRunner] 실행 오류:", err));
  }, CHECK_INTERVAL_MS);
}
