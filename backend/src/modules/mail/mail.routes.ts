import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAuth, type AuthenticatedRequest } from "../../middleware/auth.middleware";
import { HttpError } from "../../middleware/error.middleware";
import { generateContactDraft } from "../../lib/gemini";
import { sendEmailDraft } from "../../lib/sendMailDraft";

// CLAUDE.md 섹션 5 (AI 메일/문자 초안 생성)
const router = Router();

router.use(requireAuth);

const draftRelations = {
  contact: { select: { id: true, name: true, affiliation: true, photoUrl: true } },
  group: { select: { id: true, name: true } },
} as const;

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

// "생일 축하"/"축하 인사"처럼 축하 대상을 골라야 하는 상황인지 서버에서도 한 번 더 판단.
// 프론트 프리셋과 이름을 맞춰두되, 사용자가 "기타"로 직접 입력한 문구에도 "축하"가 들어있으면 걸리게 느슨하게 잡는다.
function isCelebrationOccasion(occasion: string): boolean {
  return occasion.includes("축하") || occasion.includes("생일");
}

// 생일은 축하 사유가 이미 분명하므로 별도 상세 입력을 요구하지 않는다.
function requiresCelebrationDetail(occasion: string): boolean {
  return isCelebrationOccasion(occasion) && !occasion.includes("생일");
}

const generateSchema = z.object({
  contactId: z.string().min(1),
  occasion: z.string().min(1),
  recipientType: z.string().min(1),
  channel: z.enum(["EMAIL", "TEXT"]),
  subject: z.string().optional(),
  celebrationDetail: z.string().optional(),
});

// 인맥 + 상황(경조사/안부인사/명절인사 등) + 받는 사람 유형(교수님/동기/VC 심사역 등) + 채널(이메일/문자)을
// 받아 Gemini로 초안을 생성하고, 바로 DRAFT 상태로 저장까지 한다.
router.post(
  "/generate",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const body = generateSchema.parse(req.body);
    if (requiresCelebrationDetail(body.occasion) && !body.celebrationDetail?.trim()) {
      throw new HttpError(400, "무엇을 축하하는지 입력해주세요.");
    }

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
      celebrationDetail: body.celebrationDetail,
      celebrantName: body.celebrationDetail ? contact.name : undefined,
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
  celebrationDetail: z.string().optional(),
  // 축하 대상인 구성원 (생일 축하/축하 인사일 때만 사용). 그 사람에게는 본인 축하 문구,
  // 나머지 구성원에게는 "함께 축하하자"는 문구로 갈린다.
  celebrantContactId: z.string().optional(),
  // SHARED: 그룹 전체에게 보낼 공통 초안 1개만 생성. PER_MEMBER: 구성원별로 각각 개인화된 초안 생성.
  mode: z.enum(["SHARED", "PER_MEMBER"]).default("PER_MEMBER"),
});

// 그룹 구성원에게 같은 상황/유형/채널로 초안을 생성한다. mode에 따라 "공통 초안 1개" 또는
// "구성원별 개인화된 초안 여러 개" 중 하나로 만든다.
router.post(
  "/batch-generate",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const body = batchGenerateSchema.parse(req.body);
    if (requiresCelebrationDetail(body.occasion) && !body.celebrationDetail?.trim()) {
      throw new HttpError(400, "무엇을 축하하는지 입력해주세요.");
    }

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

    if (isCelebrationOccasion(body.occasion) && !body.celebrantContactId) {
      throw new HttpError(400, "누구를 축하하는지 선택해주세요.");
    }

    let celebrant: (typeof members)[number]["contact"] | undefined;
    if (body.celebrantContactId) {
      celebrant = members.find((m) => m.contactId === body.celebrantContactId)?.contact;
      if (!celebrant) {
        throw new HttpError(400, "선택한 구성원이 이 그룹에 없습니다.");
      }
    }

    const sender = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.userId } });

    if (body.mode === "SHARED") {
      const { subject, body: draftBody } = await generateContactDraft({
        channel: body.channel,
        occasion: body.occasion,
        recipientType: body.recipientType,
        senderName: sender.name,
        subject: body.subject,
        celebrationDetail: body.celebrationDetail,
        celebrantName: celebrant?.name,
      });

      const draft = await prisma.emailDraft.create({
        data: {
          ownerUserId: req.user!.userId,
          groupId: group.id,
          subject,
          body: draftBody,
          channel: body.channel,
          status: "DRAFT",
        },
        include: { group: { select: { id: true, name: true } } },
      });

      res.status(201).json([draft]);
      return;
    }

    const drafts = [];
    for (const member of members) {
      const isCelebrantThemself = celebrant && member.contactId === celebrant.id;
      const { subject, body: draftBody } = await generateContactDraft({
        channel: body.channel,
        occasion: body.occasion,
        recipientType: body.recipientType,
        contactName: member.contact.name,
        contactAffiliation: member.contact.affiliation,
        senderName: sender.name,
        subject: body.subject,
        celebrationDetail: body.celebrationDetail,
        celebrantName: celebrant ? (isCelebrantThemself ? member.contact.name : celebrant.name) : undefined,
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
      include: draftRelations,
    });
    res.json(drafts);
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const draft = await prisma.emailDraft.findFirst({
      where: { id: req.params.id, ownerUserId: req.user!.userId },
      include: draftRelations,
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
  scheduledAt: z.coerce.date().optional(),
});

router.patch(
  "/:id",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    await findOwnedDraftOrThrow(req.params.id, req.user!.userId);
    const body = updateSchema.parse(req.body);
    const updated = await prisma.emailDraft.update({
      where: { id: req.params.id },
      data: body,
      include: draftRelations,
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

// draft 채널이 EMAIL이고 대상(연락처)에 이메일이 있어야 즉시 발송 가능.
// 그룹 SHARED 초안은 받는 사람이 여러 명이라 여기선 단일 연락처 초안만 지원한다.
router.post(
  "/:id/send",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const messageId = await sendEmailDraft(req.params.id, req.user!.userId);
    const updated = await prisma.emailDraft.findUniqueOrThrow({
      where: { id: req.params.id },
      include: draftRelations,
    });
    res.json({ ...updated, gmailMessageId: messageId });
  }),
);

export default router;
