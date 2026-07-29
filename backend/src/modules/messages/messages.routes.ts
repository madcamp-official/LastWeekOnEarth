import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAuth, type AuthenticatedRequest } from "../../middleware/auth.middleware";
import { HttpError } from "../../middleware/error.middleware";
import { getNeighborUserIds } from "../../lib/socialFeed";
import { notifyUser } from "../../lib/notify";

// 소식의 "답장"은 댓글이 아니라 작성자에게 보내는 1:1 디엠이 된다. 아무나와 디엠할 수 있는 게
// 아니라 소식 피드와 같은 기준(이웃 관계, 어느 한쪽이라도 상대를 인맥으로 등록했으면 허용)으로 제한한다.
const router = Router();

router.use(requireAuth);

const PARTNER_SELECT = { id: true, name: true, affiliation: true, avatarUrl: true } as const;
const CONTACT_SELECT = { id: true, name: true, affiliation: true, photoUrl: true } as const;
const MESSAGE_INCLUDE = {
  post: { select: { id: true, content: true, authorId: true } },
  sharedProfile: { select: PARTNER_SELECT },
  sharedContact: { select: CONTACT_SELECT },
} as const;

// 공유하려는 프로필이 내 것이거나, 나와 이웃 관계에 있는 사람이어야 한다 (임의 사용자 프로필 유출 방지).
async function assertProfileShareable(myUserId: string, profileId: string) {
  if (profileId === myUserId) return;
  const [myNeighbors, theirNeighbors] = await Promise.all([
    getNeighborUserIds(myUserId),
    getNeighborUserIds(profileId),
  ]);
  if (!myNeighbors.includes(profileId) && !theirNeighbors.includes(myUserId)) {
    throw new HttpError(404, "공유할 수 없는 프로필입니다.");
  }
}

// 내 주소록에 있는 인맥(계정 여부 무관)이면 전부 공유할 수 있다 — 단, 내가 등록한 것이어야 한다.
async function assertContactShareable(myUserId: string, contactId: string) {
  const contact = await prisma.contact.findFirst({ where: { id: contactId, ownerUserId: myUserId }, select: { id: true } });
  if (!contact) {
    throw new HttpError(404, "공유할 수 없는 인맥입니다.");
  }
}

async function assertCanMessage(myUserId: string, otherUserId: string) {
  if (myUserId === otherUserId) {
    throw new HttpError(400, "본인에게는 디엠을 보낼 수 없습니다.");
  }
  const [myNeighbors, theirNeighbors] = await Promise.all([
    getNeighborUserIds(myUserId),
    getNeighborUserIds(otherUserId),
  ]);
  if (!myNeighbors.includes(otherUserId) && !theirNeighbors.includes(myUserId)) {
    throw new HttpError(404, "디엠을 보낼 수 없는 사용자입니다.");
  }
}

// 아직 쪽지를 주고받은 적 없는 인맥에게도 새로 대화를 시작할 수 있도록 후보 목록을 내려준다.
router.get(
  "/contacts",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const neighborIds = await getNeighborUserIds(req.user!.userId);
    if (neighborIds.length === 0) {
      res.json([]);
      return;
    }
    const users = await prisma.user.findMany({ where: { id: { in: neighborIds } }, select: PARTNER_SELECT });
    res.json(users);
  }),
);

router.get(
  "/unread-count",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const count = await prisma.message.count({ where: { receiverId: req.user!.userId, read: false } });
    res.json({ count });
  }),
);

// 대화 상대 목록: 나와 주고받은 메시지가 있는 사람들을 마지막 메시지 시각순으로.
router.get(
  "/conversations",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const myUserId = req.user!.userId;
    const messages = await prisma.message.findMany({
      where: { OR: [{ senderId: myUserId }, { receiverId: myUserId }] },
      orderBy: { createdAt: "desc" },
      include: MESSAGE_INCLUDE,
    });

    const byPartner = new Map<string, typeof messages[number]>();
    for (const m of messages) {
      const partnerId = m.senderId === myUserId ? m.receiverId : m.senderId;
      if (!byPartner.has(partnerId)) byPartner.set(partnerId, m);
    }

    const partnerIds = [...byPartner.keys()];
    const partners = partnerIds.length
      ? await prisma.user.findMany({ where: { id: { in: partnerIds } }, select: PARTNER_SELECT })
      : [];
    const partnerById = new Map(partners.map((p) => [p.id, p]));

    const unreadCounts = await prisma.message.groupBy({
      by: ["senderId"],
      where: { receiverId: myUserId, read: false, senderId: { in: partnerIds } },
      _count: { senderId: true },
    });
    const unreadByPartner = new Map(unreadCounts.map((u) => [u.senderId, u._count.senderId]));

    const conversations = partnerIds
      .map((partnerId) => {
        const lastMessage = byPartner.get(partnerId)!;
        const partner = partnerById.get(partnerId);
        if (!partner) return null;
        return {
          partner,
          lastMessage,
          unreadCount: unreadByPartner.get(partnerId) ?? 0,
        };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null)
      .sort((a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime());

    res.json(conversations);
  }),
);

router.get(
  "/conversations/:userId/thread",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const myUserId = req.user!.userId;
    const otherUserId = req.params.userId;
    await assertCanMessage(myUserId, otherUserId);

    const thread = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: myUserId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: myUserId },
        ],
      },
      orderBy: { createdAt: "asc" },
      include: MESSAGE_INCLUDE,
    });
    res.json(thread);
  }),
);

const sendSchema = z
  .object({
    content: z.string().max(2000).optional(),
    photoUrl: z.string().max(5_000_000).optional(),
    sharedProfileId: z.string().optional(),
    sharedContactId: z.string().optional(),
    postId: z.string().optional(),
  })
  .refine((body) => !!(body.content?.trim() || body.photoUrl || body.sharedProfileId || body.sharedContactId), {
    message: "내용, 사진, 프로필/인맥 공유 중 하나는 있어야 합니다.",
  });

router.post(
  "/conversations/:userId",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const myUserId = req.user!.userId;
    const otherUserId = req.params.userId;
    await assertCanMessage(myUserId, otherUserId);
    const { content, photoUrl, sharedProfileId, sharedContactId, postId } = sendSchema.parse(req.body);

    if (sharedProfileId) {
      await assertProfileShareable(myUserId, sharedProfileId);
    }
    if (sharedContactId) {
      await assertContactShareable(myUserId, sharedContactId);
    }

    const message = await prisma.message.create({
      data: {
        senderId: myUserId,
        receiverId: otherUserId,
        content: content?.trim() ?? "",
        photoUrl,
        sharedProfileId,
        sharedContactId,
        postId,
      },
      include: MESSAGE_INCLUDE,
    });

    const sender = await prisma.user.findUnique({ where: { id: myUserId }, select: { name: true } });
    const bodyPreview = photoUrl
      ? "사진을 보냈습니다."
      : sharedProfileId || sharedContactId
        ? "인맥을 공유했습니다."
        : "메시지를 보냈습니다.";
    await notifyUser({
      userId: otherUserId,
      actorId: myUserId,
      messageId: message.id,
      postId,
      type: "DM_MESSAGE",
      title: "새로운 쪽지",
      body: `${sender?.name ?? "누군가"}님이 ${bodyPreview}`,
    });

    res.status(201).json(message);
  }),
);

router.patch(
  "/conversations/:userId/read",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const myUserId = req.user!.userId;
    const otherUserId = req.params.userId;
    await prisma.message.updateMany({
      where: { senderId: otherUserId, receiverId: myUserId, read: false },
      data: { read: true },
    });
    res.status(204).send();
  }),
);

export default router;
