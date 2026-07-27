import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAuth, type AuthenticatedRequest } from "../../middleware/auth.middleware";
import { HttpError } from "../../middleware/error.middleware";
import { getNeighborUserIds } from "../../lib/socialFeed";

// 소식 탭: 진짜 소셜 피드. "내 소식"과 "이웃 소식"(계정이 연결된 인맥)으로 나뉜다.
const router = Router();

router.use(requireAuth);

const AUTHOR_SELECT = { id: true, name: true, affiliation: true, avatarUrl: true } as const;

router.get(
  "/me",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const posts = await prisma.post.findMany({
      where: { authorId: req.user!.userId },
      orderBy: { createdAt: "desc" },
      include: { author: { select: AUTHOR_SELECT } },
    });
    res.json(posts);
  }),
);

router.get(
  "/feed",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const neighborIds = await getNeighborUserIds(req.user!.userId);
    if (neighborIds.length === 0) {
      res.json([]);
      return;
    }

    const posts = await prisma.post.findMany({
      where: { authorId: { in: neighborIds } },
      orderBy: { createdAt: "desc" },
      include: { author: { select: AUTHOR_SELECT } },
    });
    res.json(posts);
  }),
);

const createSchema = z.object({
  content: z.string().min(1).max(2000),
  // 사진은 별도 스토리지 연동 전까지 base64 data URL 문자열을 그대로 저장한다.
  photoUrl: z.string().max(5_000_000).optional(),
});

router.post(
  "/",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const body = createSchema.parse(req.body);
    const post = await prisma.post.create({
      data: { authorId: req.user!.userId, content: body.content, photoUrl: body.photoUrl },
      include: { author: { select: AUTHOR_SELECT } },
    });
    res.status(201).json(post);
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const post = await prisma.post.findFirst({
      where: { id: req.params.id, authorId: req.user!.userId },
    });
    if (!post) {
      throw new HttpError(404, "게시물을 찾을 수 없습니다.");
    }
    await prisma.post.delete({ where: { id: post.id } });
    res.status(204).send();
  }),
);

export default router;
