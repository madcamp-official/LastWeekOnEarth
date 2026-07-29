import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAuth, type AuthenticatedRequest } from "../../middleware/auth.middleware";
import { HttpError } from "../../middleware/error.middleware";

// CLAUDE.md Phase 3 (연락 빈도 초과 알림) — contactReminderRunner.ts가 만들어둔 알림을 조회/읽음 처리한다.
const router = Router();

router.use(requireAuth);

const ACTOR_SELECT = { id: true, name: true, avatarUrl: true } as const;

router.get(
  "/",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: "desc" },
      include: { actor: { select: ACTOR_SELECT } },
    });

    const contactIds = [...new Set(notifications.map((n) => n.contactId).filter((id): id is string => !!id))];
    const contacts = contactIds.length
      ? await prisma.contact.findMany({ where: { id: { in: contactIds } }, select: { id: true, name: true } })
      : [];
    const contactById = new Map(contacts.map((c) => [c.id, c]));

    res.json(
      notifications.map((n) => ({
        ...n,
        contact: n.contactId ? contactById.get(n.contactId) ?? null : null,
      })),
    );
  }),
);

router.get(
  "/unread-count",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const count = await prisma.notification.count({ where: { userId: req.user!.userId, read: false } });
    res.json({ count });
  }),
);

router.patch(
  "/read-all",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    await prisma.notification.updateMany({ where: { userId: req.user!.userId, read: false }, data: { read: true } });
    res.status(204).send();
  }),
);

router.patch(
  "/:id/read",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const notification = await prisma.notification.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    });
    if (!notification) {
      throw new HttpError(404, "알림을 찾을 수 없습니다.");
    }
    const updated = await prisma.notification.update({
      where: { id: notification.id },
      data: { read: true },
    });
    res.json(updated);
  }),
);

export default router;
