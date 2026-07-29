import { prisma } from "./prisma";
import { sendExpoPushNotification } from "./expoPush";
import { emitToUser } from "./socket";

interface NotifyUserInput {
  userId: string;
  actorId?: string;
  postId?: string;
  messageId?: string;
  type: string;
  title: string;
  body: string;
}

// 좋아요/디엠처럼 즉시 발생하는 알림을 기록 + 푸시 발송한다. contactReminderRunner는 예약 발송이라
// scheduledAt을 미래로 잡지만, 여기서는 "지금 일어난 일"이라 sent=true, scheduledAt=now로 남긴다.
export async function notifyUser(input: NotifyUserInput): Promise<void> {
  if (input.actorId === input.userId) return;

  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      actorId: input.actorId,
      postId: input.postId,
      messageId: input.messageId,
      type: input.type,
      scheduledAt: new Date(),
      sent: true,
    },
    include: { actor: { select: { id: true, name: true, avatarUrl: true } } },
  });

  // 앱이 켜져 있으면(소켓 연결 중) 알림 화면 API 응답과 동일한 모양으로 즉시 밀어준다 —
  // NotificationsScreen뿐 아니라 이 이벤트를 재사용하는 쪽지/소식 화면도 같은 신호로 갱신된다.
  emitToUser(input.userId, "notification:new", notification);

  const recipient = await prisma.user.findUnique({ where: { id: input.userId }, select: { expoPushToken: true } });
  if (recipient?.expoPushToken) {
    await sendExpoPushNotification(recipient.expoPushToken, input.title, input.body, {
      notificationId: notification.id,
      type: input.type,
    }).catch((err) => console.error("[notify] 푸시 발송 실패:", err));
  }
}
