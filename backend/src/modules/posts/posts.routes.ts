import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAuth, type AuthenticatedRequest } from "../../middleware/auth.middleware";
import { HttpError } from "../../middleware/error.middleware";
import { getFollowerUserIds, getNeighborUserIds } from "../../lib/socialFeed";
import { notifyUser } from "../../lib/notify";
import { emitToUser } from "../../lib/socket";

// 소식 탭: 진짜 소셜 피드. "내 소식"과 "이웃 소식"(계정이 연결된 인맥)으로 나뉜다.
const router = Router();

router.use(requireAuth);

const AUTHOR_SELECT = { id: true, name: true, affiliation: true, avatarUrl: true } as const;

// 목록 조회 시 좋아요 수/댓글 수/내가 좋아요 눌렀는지를 같이 계산해 붙인다.
async function attachSocialCounts<T extends { id: string }>(posts: T[], myUserId: string) {
  if (posts.length === 0) return posts.map((p) => ({ ...p, likeCount: 0, commentCount: 0, likedByMe: false }));

  const postIds = posts.map((p) => p.id);
  const [likeCounts, commentCounts, myLikes] = await Promise.all([
    prisma.postLike.groupBy({ by: ["postId"], where: { postId: { in: postIds } }, _count: { postId: true } }),
    prisma.postComment.groupBy({ by: ["postId"], where: { postId: { in: postIds } }, _count: { postId: true } }),
    prisma.postLike.findMany({ where: { postId: { in: postIds }, userId: myUserId }, select: { postId: true } }),
  ]);

  const likeCountByPost = new Map(likeCounts.map((l) => [l.postId, l._count.postId]));
  const commentCountByPost = new Map(commentCounts.map((c) => [c.postId, c._count.postId]));
  const likedPostIds = new Set(myLikes.map((l) => l.postId));

  return posts.map((p) => ({
    ...p,
    likeCount: likeCountByPost.get(p.id) ?? 0,
    commentCount: commentCountByPost.get(p.id) ?? 0,
    likedByMe: likedPostIds.has(p.id),
  }));
}

router.get(
  "/me",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const posts = await prisma.post.findMany({
      where: { authorId: req.user!.userId },
      orderBy: { createdAt: "desc" },
      include: { author: { select: AUTHOR_SELECT } },
    });
    res.json(await attachSocialCounts(posts, req.user!.userId));
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
    res.json(await attachSocialCounts(posts, req.user!.userId));
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
    res.status(201).json({ ...post, likeCount: 0, commentCount: 0, likedByMe: false });

    // 응답은 먼저 보내고, 이웃들에게 새 소식 알림은 백그라운드로 보낸다 — 알림 발송 지연 때문에
    // 글쓴이가 "게시 중..." 상태로 기다리게 하지 않기 위해서다. 응답을 이미 보낸 뒤라 여기서 에러가
    // 나면 asyncHandler가 next(err)로 넘겨도 errorHandler가 res.headersSent를 안 가려서 그대로
    // 다시 응답을 시도하다 죽는다 — 그래서 절대 밖으로 던지지 않고 이 안에서 끝낸다.
    try {
      const followerIds = await getFollowerUserIds(req.user!.userId);
      const postForFeed = { ...post, likeCount: 0, commentCount: 0, likedByMe: false };
      await Promise.all(
        followerIds.map((followerId) => {
          emitToUser(followerId, "post:new", postForFeed);
          return notifyUser({
            userId: followerId,
            actorId: req.user!.userId,
            postId: post.id,
            type: "NEW_POST",
            title: "새로운 소식",
            body: `${post.author.name}님이 새 소식을 올렸어요.`,
          });
        }),
      );
    } catch (err) {
      console.error("[posts] 새 소식 알림 발송 실패:", err);
    }
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

// 내가 볼 수 있는 소식(내 것 또는 이웃 것)인지 확인 — 좋아요/댓글도 그 범위에서만 허용한다.
async function assertVisiblePost(postId: string, myUserId: string) {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) {
    throw new HttpError(404, "게시물을 찾을 수 없습니다.");
  }
  if (post.authorId === myUserId) return post;

  const neighborIds = await getNeighborUserIds(myUserId);
  if (!neighborIds.includes(post.authorId)) {
    throw new HttpError(404, "게시물을 찾을 수 없습니다.");
  }
  return post;
}

router.get(
  "/:id",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    await assertVisiblePost(req.params.id, req.user!.userId);
    const post = await prisma.post.findUniqueOrThrow({
      where: { id: req.params.id },
      include: { author: { select: AUTHOR_SELECT } },
    });
    const [withCounts] = await attachSocialCounts([post], req.user!.userId);
    res.json(withCounts);
  }),
);

router.post(
  "/:id/like",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const post = await assertVisiblePost(req.params.id, req.user!.userId);
    await prisma.postLike.upsert({
      where: { postId_userId: { postId: req.params.id, userId: req.user!.userId } },
      update: {},
      create: { postId: req.params.id, userId: req.user!.userId },
    });
    const likeCount = await prisma.postLike.count({ where: { postId: req.params.id } });

    const liker = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { name: true } });
    await notifyUser({
      userId: post.authorId,
      actorId: req.user!.userId,
      postId: post.id,
      type: "POST_LIKE",
      title: "새로운 좋아요",
      body: `${liker?.name ?? "누군가"}님이 회원님의 소식을 좋아합니다.`,
    });

    res.status(201).json({ likedByMe: true, likeCount });
  }),
);

// 이 소식에 좋아요를 누른 사람 목록 (최신순).
router.get(
  "/:id/likes",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    await assertVisiblePost(req.params.id, req.user!.userId);
    const likes = await prisma.postLike.findMany({
      where: { postId: req.params.id },
      orderBy: { createdAt: "desc" },
      include: { user: { select: AUTHOR_SELECT } },
    });
    res.json(likes.map((l) => ({ ...l.user, likedAt: l.createdAt })));
  }),
);

router.delete(
  "/:id/like",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    await assertVisiblePost(req.params.id, req.user!.userId);
    await prisma.postLike.deleteMany({ where: { postId: req.params.id, userId: req.user!.userId } });
    const likeCount = await prisma.postLike.count({ where: { postId: req.params.id } });
    res.json({ likedByMe: false, likeCount });
  }),
);

router.get(
  "/:id/comments",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    await assertVisiblePost(req.params.id, req.user!.userId);
    const comments = await prisma.postComment.findMany({
      where: { postId: req.params.id },
      orderBy: { createdAt: "asc" },
      include: { author: { select: AUTHOR_SELECT } },
    });
    res.json(comments);
  }),
);

const commentCreateSchema = z.object({ content: z.string().min(1).max(1000) });

router.post(
  "/:id/comments",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    await assertVisiblePost(req.params.id, req.user!.userId);
    const { content } = commentCreateSchema.parse(req.body);
    const comment = await prisma.postComment.create({
      data: { postId: req.params.id, authorId: req.user!.userId, content },
      include: { author: { select: AUTHOR_SELECT } },
    });
    res.status(201).json(comment);
  }),
);

router.delete(
  "/:id/comments/:commentId",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const comment = await prisma.postComment.findFirst({
      where: { id: req.params.commentId, postId: req.params.id, authorId: req.user!.userId },
    });
    if (!comment) {
      throw new HttpError(404, "댓글을 찾을 수 없습니다.");
    }
    await prisma.postComment.delete({ where: { id: comment.id } });
    res.status(204).send();
  }),
);

export default router;
