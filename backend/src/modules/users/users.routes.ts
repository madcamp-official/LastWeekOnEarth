import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAuth, type AuthenticatedRequest } from "../../middleware/auth.middleware";

const router = Router();

router.use(requireAuth);

function toPublicUser(user: {
  id: string;
  username: string;
  name: string;
  email: string;
  phoneVerified: boolean;
  avatarUrl: string | null;
}) {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    email: user.email,
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
});

router.patch(
  "/me",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const body = meUpdateSchema.parse(req.body);
    const user = await prisma.user.update({ where: { id: req.user!.userId }, data: body });
    res.json(toPublicUser(user));
  }),
);

export default router;
