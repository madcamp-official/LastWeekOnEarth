import { prisma } from "./prisma";
import { sendEmailDraft, sendTextDraft } from "./sendMailDraft";

const CHECK_INTERVAL_MS = 60_000;

/**
 * 예약 발송(SCHEDULED + scheduledAt 지난 초안)을 주기적으로 확인해 채널별로 발송한다.
 * EMAIL은 Gmail 실제 발송, TEXT는 쪽지(디엠) 발송. 별도 큐/워커 없이 서버 프로세스 안에서
 * 폴링하는 단순 구현 (테스트 단계용).
 */
async function runDueScheduledMails(): Promise<void> {
  const due = await prisma.emailDraft.findMany({
    where: { status: "SCHEDULED", scheduledAt: { lte: new Date() } },
  });

  for (const draft of due) {
    try {
      if (draft.channel === "EMAIL") {
        await sendEmailDraft(draft.id, draft.ownerUserId);
      } else {
        await sendTextDraft(draft.id, draft.ownerUserId);
      }
    } catch (err) {
      console.error(`[scheduledMailRunner] 초안 ${draft.id} 예약 발송 실패:`, err);
    }
  }
}

export function startScheduledMailRunner(): void {
  setInterval(() => {
    runDueScheduledMails().catch((err) => console.error("[scheduledMailRunner] 실행 오류:", err));
  }, CHECK_INTERVAL_MS);
}
