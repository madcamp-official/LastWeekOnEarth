import { prisma } from "./prisma";
import { HttpError } from "../middleware/error.middleware";
import { sendGmailOnBehalfOfUser } from "./googleMailAuth";
import { notifyUser } from "./notify";
import { resolveContactUserId } from "./socialFeed";

export interface SendDraftDmResult {
  dmSent: boolean;
  // 받는 사람이 계정 없이 수동 등록된 인맥이라 쪽지를 못 보냈을 때만 채워진다.
  dmSkippedReason?: string;
}

export interface SendEmailDraftResult extends SendDraftDmResult {
  messageId: string;
}

// 받는 사람이 실제 계정(targetUserId)과 연결돼 있으면 초안 내용을 쪽지로 보낸다.
// 수동 등록만 돼 있고 계정이 없는 인맥이면 쪽지를 보낼 수 없으므로 호출부에서 안내하도록 알려준다.
async function sendDraftAsDm(
  ownerUserId: string,
  targetUserId: string | null,
  subject: string,
  body: string,
): Promise<SendDraftDmResult> {
  if (!targetUserId) {
    return { dmSent: false, dmSkippedReason: "사용자에게만 쪽지를 보낼 수 있어요." };
  }

  const message = await prisma.message.create({
    data: {
      senderId: ownerUserId,
      receiverId: targetUserId,
      content: subject ? `${subject}\n\n${body}` : body,
    },
  });

  const sender = await prisma.user.findUnique({ where: { id: ownerUserId }, select: { name: true } });
  await notifyUser({
    userId: targetUserId,
    actorId: ownerUserId,
    messageId: message.id,
    type: "DM_MESSAGE",
    title: "새로운 쪽지",
    body: `${sender?.name ?? "누군가"}님이 메시지를 보냈습니다.`,
  });

  return { dmSent: true };
}

/**
 * 초안을 Gmail로 실제 발송하고 SENT로 표시한다. 즉시 발송(/:id/send)과 예약 발송 러너
 * (scheduledMailRunner.ts) 양쪽에서 공유해서 쓴다.
 */
export async function sendEmailDraft(draftId: string, ownerUserId: string): Promise<SendEmailDraftResult> {
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

  const targetUserId = await resolveContactUserId(draft.contact);
  const dmResult = await sendDraftAsDm(ownerUserId, targetUserId, draft.subject, draft.body);
  return { messageId, ...dmResult };
}

/**
 * TEXT(문자) 채널 초안은 실제 SMS 연동이 없어서 "발송하기"가 곧 상대방에게 쪽지(디엠)를
 * 보내는 것과 같다. 계정이 없는 수동 등록 인맥이면 보낼 방법이 없으므로 에러로 알린다.
 */
export async function sendTextDraft(draftId: string, ownerUserId: string): Promise<SendDraftDmResult> {
  const draft = await prisma.emailDraft.findFirst({
    where: { id: draftId, ownerUserId },
    include: { contact: true },
  });
  if (!draft) {
    throw new HttpError(404, "초안을 찾을 수 없습니다.");
  }
  if (draft.channel !== "TEXT") {
    throw new HttpError(400, "TEXT 채널 초안만 이 방식으로 발송할 수 있습니다.");
  }
  if (!draft.contact) {
    throw new HttpError(400, "그룹 공통 초안은 개별 전송을 지원하지 않습니다.");
  }
  const targetUserId = await resolveContactUserId(draft.contact);
  if (!targetUserId) {
    throw new HttpError(400, "사용자에게만 쪽지를 보낼 수 있어요.");
  }

  const sentAt = new Date();
  await prisma.$transaction([
    prisma.emailDraft.update({ where: { id: draft.id }, data: { status: "SENT" } }),
    prisma.contactLog.create({
      data: { contactId: draft.contact.id, channel: "OTHER", memo: draft.subject || "쪽지 발송", contactedAt: sentAt },
    }),
    prisma.contact.update({ where: { id: draft.contact.id }, data: { lastContactedAt: sentAt } }),
  ]);

  return sendDraftAsDm(ownerUserId, targetUserId, draft.subject, draft.body);
}
