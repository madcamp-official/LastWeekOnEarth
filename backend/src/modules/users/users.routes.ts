import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAuth, type AuthenticatedRequest } from "../../middleware/auth.middleware";
import { HttpError } from "../../middleware/error.middleware";

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

export default router;
