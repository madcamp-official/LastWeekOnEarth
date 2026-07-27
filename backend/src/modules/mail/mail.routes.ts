import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAuth, type AuthenticatedRequest } from "../../middleware/auth.middleware";
import { HttpError } from "../../middleware/error.middleware";
import { generateContactDraft } from "../../lib/gemini";
import { notImplemented } from "../../lib/notImplemented";

// CLAUDE.md 섹션 5 (AI 메일/문자 초안 생성)
const router = Router();

router.use(requireAuth);

async function findOwnedContactOrThrow(id: string, ownerUserId: string) {
  const contact = await prisma.contact.findFirst({ where: { id, ownerUserId } });
  if (!contact) {
    throw new HttpError(404, "인맥을 찾을 수 없습니다.");
  }
  return contact;
}

async function findOwnedDraftOrThrow(id: string, ownerUserId: string) {
  const draft = await prisma.emailDraft.findFirst({ where: { id, ownerUserId } });
  if (!draft) {
    throw new HttpError(404, "초안을 찾을 수 없습니다.");
  }
  return draft;
}

const generateSchema = z.object({
  contactId: z.string().min(1),
  occasion: z.string().min(1),
  recipientType: z.string().min(1),
  channel: z.enum(["EMAIL", "TEXT"]),
  subject: z.string().optional(),
});

// 인맥 + 상황(경조사/안부인사/명절인사 등) + 받는 사람 유형(교수님/동기/VC 심사역 등) + 채널(이메일/문자)을
// 받아 Gemini로 초안을 생성하고, 바로 DRAFT 상태로 저장까지 한다.
router.post(
  "/generate",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const body = generateSchema.parse(req.body);
    const contact = await findOwnedContactOrThrow(body.contactId, req.user!.userId);
    const sender = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.userId } });

    const { subject, body: draftBody } = await generateContactDraft({
      channel: body.channel,
      occasion: body.occasion,
      recipientType: body.recipientType,
      contactName: contact.name,
      contactAffiliation: contact.affiliation,
      senderName: sender.name,
      subject: body.subject,
    });

    const draft = await prisma.emailDraft.create({
      data: {
        ownerUserId: req.user!.userId,
        contactId: contact.id,
        subject,
        body: draftBody,
        channel: body.channel,
        status: "DRAFT",
      },
    });

    res.status(201).json(draft);
  }),
);

const batchGenerateSchema = z.object({
  groupId: z.string().min(1),
  occasion: z.string().min(1),
  recipientType: z.string().min(1),
  channel: z.enum(["EMAIL", "TEXT"]),
  subject: z.string().optional(),
});

// 그룹 구성원 전체에게 같은 상황/유형/채널로 초안을 한 번에 생성한다.
router.post(
  "/batch-generate",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const body = batchGenerateSchema.parse(req.body);

    const group = await prisma.contactGroup.findFirst({
      where: { id: body.groupId, ownerUserId: req.user!.userId },
    });
    if (!group) {
      throw new HttpError(404, "그룹을 찾을 수 없습니다.");
    }

    const members = await prisma.contactGroupMember.findMany({
      where: { groupId: group.id },
      include: { contact: true },
    });
    if (members.length === 0) {
      throw new HttpError(400, "그룹에 구성원이 없습니다.");
    }

    const sender = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.userId } });

    const drafts = [];
    for (const member of members) {
      const { subject, body: draftBody } = await generateContactDraft({
        channel: body.channel,
        occasion: body.occasion,
        recipientType: body.recipientType,
        contactName: member.contact.name,
        contactAffiliation: member.contact.affiliation,
        senderName: sender.name,
        subject: body.subject,
      });

      const draft = await prisma.emailDraft.create({
        data: {
          ownerUserId: req.user!.userId,
          contactId: member.contact.id,
          subject,
          body: draftBody,
          channel: body.channel,
          status: "DRAFT",
        },
      });
      drafts.push(draft);
    }

    res.status(201).json(drafts);
  }),
);

router.get(
  "/",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const drafts = await prisma.emailDraft.findMany({
      where: { ownerUserId: req.user!.userId },
      orderBy: { createdAt: "desc" },
      include: { contact: { select: { id: true, name: true, affiliation: true, photoUrl: true } } },
    });
    res.json(drafts);
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const draft = await prisma.emailDraft.findFirst({
      where: { id: req.params.id, ownerUserId: req.user!.userId },
      include: { contact: { select: { id: true, name: true, affiliation: true, photoUrl: true } } },
    });
    if (!draft) {
      throw new HttpError(404, "초안을 찾을 수 없습니다.");
    }
    res.json(draft);
  }),
);

const updateSchema = z.object({
  subject: z.string().optional(),
  body: z.string().optional(),
  status: z.enum(["DRAFT", "SCHEDULED", "SENT"]).optional(),
});

router.patch(
  "/:id",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    await findOwnedDraftOrThrow(req.params.id, req.user!.userId);
    const body = updateSchema.parse(req.body);
    const updated = await prisma.emailDraft.update({
      where: { id: req.params.id },
      data: body,
      include: { contact: { select: { id: true, name: true, affiliation: true, photoUrl: true } } },
    });
    res.json(updated);
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    await findOwnedDraftOrThrow(req.params.id, req.user!.userId);
    await prisma.emailDraft.delete({ where: { id: req.params.id } });
    res.status(204).send();
  }),
);

router.post("/:id/send", notImplemented);

export default router;
