import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../lib/asyncHandler";
import { issueBleCode, resolveBleCode } from "../../lib/bleCodeStore";
import { requireAuth, type AuthenticatedRequest } from "../../middleware/auth.middleware";
import { HttpError } from "../../middleware/error.middleware";
import { ensureContactPrimaryEmail } from "../../lib/emails";

// CLAUDE.md 섹션 4 (BLE 태깅), 섹션 5 (수동 등록)
const router = Router();

router.use(requireAuth);

const contactCreateSchema = z.object({
  name: z.string().min(1),
  affiliation: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  memo: z.string().optional(),
  // 사진은 별도 스토리지 연동 전까지 base64 data URL 문자열을 그대로 저장한다 (User.avatarUrl과 동일 방식).
  photoUrl: z.string().max(5_000_000).optional(),
});

const contactUpdateSchema = contactCreateSchema.partial();

const logCreateSchema = z.object({
  channel: z.enum(["EMAIL", "CALL", "MEETING", "OTHER"]),
  memo: z.string().optional(),
});

async function findOwnedContactOrThrow(id: string, ownerUserId: string) {
  const contact = await prisma.contact.findFirst({ where: { id, ownerUserId } });
  if (!contact) {
    throw new HttpError(404, "인맥을 찾을 수 없습니다.");
  }
  return contact;
}

router.get(
  "/",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const contacts = await prisma.contact.findMany({
      where: { ownerUserId: req.user!.userId },
      orderBy: { createdAt: "desc" },
    });
    res.json(contacts);
  }),
);

router.post(
  "/",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const body = contactCreateSchema.parse(req.body);
    const contact = await prisma.contact.create({
      data: { ...body, ownerUserId: req.user!.userId, source: "MANUAL" },
    });
    if (contact.email) {
      await ensureContactPrimaryEmail(contact.id);
    }
    res.status(201).json(contact);
  }),
);

// 내 프로필을 BLE로 advertise하기 위한 5분 만료 단기 코드 발급.
// CLAUDE.md 섹션 5에는 명시되어 있지 않지만 섹션 4의 흐름(상대가 내 코드를 스캔)을 위해 필요해 추가함.
// JWT가 아니라 8자리 hex 코드인 이유: BLE 광고 패킷은 보통 20~24바이트가 한계라
// 200자가 넘는 JWT는 실을 수 없음. 코드->userId 매핑은 서버 메모리에 둔다 (lib/bleCodeStore.ts).
router.post(
  "/ble-token",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { code, expiresAt } = issueBleCode(req.user!.userId);
    res.json({ token: code, expiresAt });
  }),
);

router.post(
  "/ble-tag",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { token } = z.object({ token: z.string() }).parse(req.body);

    const targetUserId = resolveBleCode(token);
    if (!targetUserId) {
      throw new HttpError(400, "유효하지 않거나 만료된 BLE 코드입니다.");
    }

    if (targetUserId === req.user!.userId) {
      throw new HttpError(400, "자기 자신을 태깅할 수 없습니다.");
    }

    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) {
      throw new HttpError(404, "상대 사용자를 찾을 수 없습니다.");
    }

    // 이미 태깅된 상대라면 새로 만들지 않고 최근 접촉 시각만 갱신 (재태깅 시 중복 생성 방지)
    const existing = await prisma.contact.findFirst({
      where: { ownerUserId: req.user!.userId, targetUserId: targetUser.id },
    });

    if (existing) {
      const updated = await prisma.contact.update({
        where: { id: existing.id },
        data: { lastContactedAt: new Date() },
      });
      return res.status(200).json(updated);
    }

    const contact = await prisma.contact.create({
      data: {
        ownerUserId: req.user!.userId,
        targetUserId: targetUser.id,
        name: targetUser.name,
        affiliation: targetUser.affiliation,
        email: targetUser.email,
        phone: targetUser.phone,
        source: "BLE",
        lastContactedAt: new Date(),
      },
    });
    if (contact.email) {
      await ensureContactPrimaryEmail(contact.id);
    }
    return res.status(201).json(contact);
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const contact = await findOwnedContactOrThrow(req.params.id, req.user!.userId);
    res.json(contact);
  }),
);

router.patch(
  "/:id",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    await findOwnedContactOrThrow(req.params.id, req.user!.userId);
    const body = contactUpdateSchema.parse(req.body);
    const updated = await prisma.contact.update({ where: { id: req.params.id }, data: body });
    res.json(updated);
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    await findOwnedContactOrThrow(req.params.id, req.user!.userId);
    await prisma.contact.delete({ where: { id: req.params.id } });
    res.status(204).send();
  }),
);

router.post(
  "/:id/logs",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const contact = await findOwnedContactOrThrow(req.params.id, req.user!.userId);
    const body = logCreateSchema.parse(req.body);

    const [log] = await prisma.$transaction([
      prisma.contactLog.create({
        data: { contactId: contact.id, channel: body.channel, memo: body.memo },
      }),
      prisma.contact.update({
        where: { id: contact.id },
        data: { lastContactedAt: new Date() },
      }),
    ]);

    res.status(201).json(log);
  }),
);

router.get(
  "/:id/logs",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    await findOwnedContactOrThrow(req.params.id, req.user!.userId);
    const logs = await prisma.contactLog.findMany({
      where: { contactId: req.params.id },
      orderBy: { contactedAt: "desc" },
    });
    res.json(logs);
  }),
);

// --- 여러 이메일 관리 (학교 도메인 이메일 등 추가 등록, 대표 이메일 선정) ---

router.get(
  "/:id/emails",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const contact = await findOwnedContactOrThrow(req.params.id, req.user!.userId);
    await ensureContactPrimaryEmail(contact.id);
    const emails = await prisma.contactEmail.findMany({
      where: { contactId: contact.id },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    });
    res.json(emails);
  }),
);

const contactEmailAddSchema = z.object({ email: z.string().email() });

router.post(
  "/:id/emails",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const contact = await findOwnedContactOrThrow(req.params.id, req.user!.userId);
    await ensureContactPrimaryEmail(contact.id);
    const { email } = contactEmailAddSchema.parse(req.body);
    const isFirst = (await prisma.contactEmail.count({ where: { contactId: contact.id } })) === 0;

    try {
      const created = await prisma.contactEmail.create({
        data: { contactId: contact.id, email, isPrimary: isFirst },
      });
      if (isFirst) {
        await prisma.contact.update({ where: { id: contact.id }, data: { email } });
      }
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
  "/:id/emails/:emailId/primary",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const contact = await findOwnedContactOrThrow(req.params.id, req.user!.userId);
    const target = await prisma.contactEmail.findFirst({
      where: { id: req.params.emailId, contactId: contact.id },
    });
    if (!target) {
      throw new HttpError(404, "이메일을 찾을 수 없습니다.");
    }

    await prisma.$transaction([
      prisma.contactEmail.updateMany({ where: { contactId: contact.id, isPrimary: true }, data: { isPrimary: false } }),
      prisma.contactEmail.update({ where: { id: target.id }, data: { isPrimary: true } }),
      prisma.contact.update({ where: { id: contact.id }, data: { email: target.email } }),
    ]);

    const updated = await prisma.contact.findUniqueOrThrow({ where: { id: contact.id } });
    res.json(updated);
  }),
);

router.delete(
  "/:id/emails/:emailId",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const contact = await findOwnedContactOrThrow(req.params.id, req.user!.userId);
    const target = await prisma.contactEmail.findFirst({
      where: { id: req.params.emailId, contactId: contact.id },
    });
    if (!target) {
      throw new HttpError(404, "이메일을 찾을 수 없습니다.");
    }
    if (target.isPrimary) {
      throw new HttpError(400, "대표 이메일은 삭제할 수 없습니다. 다른 이메일을 먼저 대표로 지정해주세요.");
    }

    await prisma.contactEmail.delete({ where: { id: target.id } });
    res.status(204).send();
  }),
);

export default router;
