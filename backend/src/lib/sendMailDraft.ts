import { prisma } from "./prisma";
import { HttpError } from "../middleware/error.middleware";
import { sendGmailOnBehalfOfUser } from "./googleMailAuth";

/**
 * 초안을 Gmail로 실제 발송하고 SENT로 표시한다. 즉시 발송(/:id/send)과 예약 발송 러너
 * (scheduledMailRunner.ts) 양쪽에서 공유해서 쓴다.
 */
export async function sendEmailDraft(draftId: string, ownerUserId: string): Promise<string> {
  const draft = await prisma.emailDraft.findFirst({
    where: { id: draftId, ownerUserId },
    include: { contact: true },
  });
  if (!draft) {
    throw new HttpError(404, "초안을 찾을 수 없습니다.");
  }
  if (draft.channel !== "EMAIL") {
    throw new HttpError(400, "EMAIL 채널 초안만 발송할 수 있습니다.");
  }
  if (!draft.contact?.email) {
    throw new HttpError(400, "받는 사람의 이메일이 없습니다. 그룹 공통 초안은 개별 전송을 지원하지 않습니다.");
  }

  const { messageId } = await sendGmailOnBehalfOfUser(ownerUserId, {
    to: draft.contact.email,
    subject: draft.subject,
    body: draft.body,
  });

  const sentAt = new Date();
  // 발송 = 실제 연락이므로 연락처 로그에도 남기고 lastContactedAt/리마인더 기준일을 갱신한다.
  await prisma.$transaction([
    prisma.emailDraft.update({ where: { id: draft.id }, data: { status: "SENT" } }),
    prisma.contactLog.create({
      data: { contactId: draft.contact.id, channel: "EMAIL", memo: draft.subject, contactedAt: sentAt },
    }),
    prisma.contact.update({ where: { id: draft.contact.id }, data: { lastContactedAt: sentAt } }),
  ]);

  return messageId;
}
