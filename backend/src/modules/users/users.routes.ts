import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAuth, type AuthenticatedRequest } from "../../middleware/auth.middleware";
import { HttpError } from "../../middleware/error.middleware";
import { ensureUserPrimaryEmail } from "../../lib/emails";

const router = Router();

router.use(requireAuth);

function toPublicUser(user: {
  id: string;
  username: string;
  name: string;
  affiliation: string;
  email: string;
  phone: string | null;
  phoneVerified: boolean;
  avatarUrl: string | null;
}) {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    affiliation: user.affiliation,
    email: user.email,
    phone: user.phone,
    phoneVerified: user.phoneVerified,
    avatarUrl: user.avatarUrl,
  };
}

router.get(
  "/me",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.userId } });
    res.json(toPublicUser(user));
  }),
);

// avatarUrl은 data URL(base64) 문자열을 그대로 저장한다. 별도 오브젝트 스토리지 연동 전까지의 임시 방편.
const meUpdateSchema = z.object({
  avatarUrl: z.string().max(5_000_000).nullable().optional(),
  name: z.string().min(1).optional(),
  affiliation: z.string().optional(),
  phone: z.string().min(1).nullable().optional(),
});

router.patch(
  "/me",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const body = meUpdateSchema.parse(req.body);
    // phone은 전화번호 인증 전이므로, 값이 바뀌면 인증 상태를 초기화한다.
    const data = "phone" in body ? { ...body, phoneVerified: false } : body;

    try {
      const user = await prisma.user.update({ where: { id: req.user!.userId }, data });
      res.json(toPublicUser(user));
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new HttpError(409, "이미 사용 중인 전화번호입니다.");
      }
      throw err;
    }
  }),
);

// 소유 관계(Contact, ContactGroup, CvEntry, EmailBatch/Draft, Notification, RefreshToken)는
// schema.prisma에 onDelete: Cascade로 걸려있어 유저 삭제 시 같이 정리된다.
router.delete(
  "/me",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    await prisma.user.delete({ where: { id: req.user!.userId } });
    res.status(204).send();
  }),
);

// --- 여러 이메일 관리 (구글 로그인 계정 외 학교 도메인 이메일 등 추가 등록, 대표 이메일 선정) ---

router.get(
  "/me/emails",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    await ensureUserPrimaryEmail(req.user!.userId);
    const emails = await prisma.userEmail.findMany({
      where: { userId: req.user!.userId },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    });
    res.json(emails);
  }),
);

const emailAddSchema = z.object({ email: z.string().email() });

router.post(
  "/me/emails",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    await ensureUserPrimaryEmail(req.user!.userId);
    const { email } = emailAddSchema.parse(req.body);

    try {
      const created = await prisma.userEmail.create({
        data: { userId: req.user!.userId, email, isPrimary: false },
      });
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new HttpError(409, "이미 등록된 이메일입니다.");
      }
      throw err;
    }
  }),
);

router.post(
  "/me/emails/:id/primary",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const target = await prisma.userEmail.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    });
    if (!target) {
      throw new HttpError(404, "이메일을 찾을 수 없습니다.");
    }

    await prisma.$transaction([
      prisma.userEmail.updateMany({
        where: { userId: req.user!.userId, isPrimary: true },
        data: { isPrimary: false },
      }),
      prisma.userEmail.update({ where: { id: target.id }, data: { isPrimary: true } }),
      prisma.user.update({
        where: { id: req.user!.userId },
        data: { email: target.email, emailVerified: false },
      }),
    ]);

    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.userId } });
    res.json(toPublicUser(user));
  }),
);

router.delete(
  "/me/emails/:id",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const target = await prisma.userEmail.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    });
    if (!target) {
      throw new HttpError(404, "이메일을 찾을 수 없습니다.");
    }
    if (target.isPrimary) {
      throw new HttpError(400, "대표 이메일은 삭제할 수 없습니다. 다른 이메일을 먼저 대표로 지정해주세요.");
    }

    await prisma.userEmail.delete({ where: { id: target.id } });
    res.status(204).send();
  }),
);

export default router;
