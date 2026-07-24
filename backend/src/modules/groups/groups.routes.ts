import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAuth, type AuthenticatedRequest } from "../../middleware/auth.middleware";
import { HttpError } from "../../middleware/error.middleware";

// CLAUDE.md 섹션 5 (연락 빈도 그룹)
const router = Router();

router.use(requireAuth);

const groupCreateSchema = z.object({
  name: z.string().min(1),
  frequencyDays: z.number().int().positive(),
});

const groupUpdateSchema = groupCreateSchema.partial();

async function findOwnedGroupOrThrow(id: string, ownerUserId: string) {
  const group = await prisma.contactGroup.findFirst({ where: { id, ownerUserId } });
  if (!group) {
    throw new HttpError(404, "그룹을 찾을 수 없습니다.");
  }
  return group;
}

router.get(
  "/",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const groups = await prisma.contactGroup.findMany({
      where: { ownerUserId: req.user!.userId },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { members: true } } },
    });
    res.json(
      groups.map((g) => ({
        id: g.id,
        name: g.name,
        frequencyDays: g.frequencyDays,
        createdAt: g.createdAt,
        memberCount: g._count.members,
      })),
    );
  }),
);

router.post(
  "/",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const body = groupCreateSchema.parse(req.body);
    const group = await prisma.contactGroup.create({
      data: { ...body, ownerUserId: req.user!.userId },
    });
    res.status(201).json({ ...group, memberCount: 0 });
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    await findOwnedGroupOrThrow(req.params.id, req.user!.userId);
    const group = await prisma.contactGroup.findUnique({
      where: { id: req.params.id },
      include: { members: { include: { contact: true } } },
    });
    res.json({
      id: group!.id,
      name: group!.name,
      frequencyDays: group!.frequencyDays,
      createdAt: group!.createdAt,
      contacts: group!.members.map((m) => m.contact),
    });
  }),
);

router.patch(
  "/:id",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    await findOwnedGroupOrThrow(req.params.id, req.user!.userId);
    const body = groupUpdateSchema.parse(req.body);
    const updated = await prisma.contactGroup.update({ where: { id: req.params.id }, data: body });
    res.json(updated);
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    await findOwnedGroupOrThrow(req.params.id, req.user!.userId);
    await prisma.contactGroup.delete({ where: { id: req.params.id } });
    res.status(204).send();
  }),
);

router.post(
  "/:id/members",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    await findOwnedGroupOrThrow(req.params.id, req.user!.userId);
    const { contactId } = z.object({ contactId: z.string() }).parse(req.body);

    const contact = await prisma.contact.findFirst({
      where: { id: contactId, ownerUserId: req.user!.userId },
    });
    if (!contact) {
      throw new HttpError(404, "인맥을 찾을 수 없습니다.");
    }

    const member = await prisma.contactGroupMember.upsert({
      where: { groupId_contactId: { groupId: req.params.id, contactId } },
      update: {},
      create: { groupId: req.params.id, contactId },
    });
    res.status(201).json(member);
  }),
);

router.delete(
  "/:id/members/:contactId",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    await findOwnedGroupOrThrow(req.params.id, req.user!.userId);
    await prisma.contactGroupMember.deleteMany({
      where: { groupId: req.params.id, contactId: req.params.contactId },
    });
    res.status(204).send();
  }),
);

router.get(
  "/:id/overdue",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const group = await findOwnedGroupOrThrow(req.params.id, req.user!.userId);
    const threshold = new Date(Date.now() - group.frequencyDays * 24 * 60 * 60 * 1000);

    const members = await prisma.contactGroupMember.findMany({
      where: { groupId: group.id },
      include: { contact: true },
    });

    const overdue = members
      .map((m) => m.contact)
      .filter((c) => !c.lastContactedAt || c.lastContactedAt < threshold);

    res.json(overdue);
  }),
);

export default router;
