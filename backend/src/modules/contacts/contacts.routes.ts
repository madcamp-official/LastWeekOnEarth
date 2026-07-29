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

const LINKED_PROFILE_INCLUDE = {
  targetUser: { select: { avatarUrl: true } },
} as const;

type ContactWithLinkedProfile = Prisma.ContactGetPayload<{
  include: typeof LINKED_PROFILE_INCLUDE;
}>;

function toContactResponse(contact: ContactWithLinkedProfile) {
  const { targetUser, ...data } = contact;
  return {
    ...data,
    // 연결된 계정의 최신 프로필 사진을 우선 사용한다. 개인적으로 지정한 사진은 연결 계정이 없을 때 유지한다.
    photoUrl: targetUser?.avatarUrl ?? data.photoUrl,
  };
}

const contactCreateSchema = z.object({
  name: z.string().min(1),
  affiliation: z.string().nullable().optional(),
  email: z.string().email().optional(),
  phone: z.string().nullable().optional(),
  memo: z.string().nullable().optional(),
  // 사진은 별도 스토리지 연동 전까지 base64 data URL 문자열을 그대로 저장한다 (User.avatarUrl과 동일 방식).
  photoUrl: z.string().max(5_000_000).nullable().optional(),
  contactMethod: z.enum(["EMAIL", "KAKAO", "CALL", "OTHER"]).optional(),
  // 이 기간(일)이 지나도록 연락이 없으면 푸시로 리마인드 (기본 90일 = 3개월).
  reminderIntervalDays: z.coerce.number().int().min(1).optional(),
});

const contactUpdateSchema = contactCreateSchema.partial();

const logCreateSchema = z.object({
  channel: z.enum(["EMAIL", "CALL", "MEETING", "OTHER"]),
  memo: z.string().optional(),
});

async function findOwnedContactOrThrow(id: string, ownerUserId: string) {
  const contact = await prisma.contact.findFirst({
    where: { id, ownerUserId },
    include: LINKED_PROFILE_INCLUDE,
  });
  if (!contact) {
    throw new HttpError(404, "인맥을 찾을 수 없습니다.");
  }
  return contact;
}

function normalizeEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  const at = normalized.lastIndexOf("@");
  if (at < 0) return normalized;

  let local = normalized.slice(0, at);
  let domain = normalized.slice(at + 1);
  if (domain === "gmail.com" || domain === "googlemail.com") {
    domain = "gmail.com";
    local = local.split("+", 1)[0].replace(/\./g, "");
  }
  return `${local}@${domain}`;
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

async function assertNotOwnerIdentity(
  ownerUserId: string,
  email: string | null | undefined,
  phone: string | null | undefined,
) {
  if (!email && !phone) return;

  const owner = await prisma.user.findUnique({
    where: { id: ownerUserId },
    select: {
      email: true,
      phone: true,
      emails: { select: { email: true } },
      gmailAuthorization: { select: { grantedEmail: true } },
    },
  });
  if (!owner) {
    throw new HttpError(404, "사용자를 찾을 수 없습니다.");
  }

  const normalizedEmail = email ? normalizeEmail(email) : null;
  const ownerEmails = [
    owner.email,
    ...owner.emails.map((item) => item.email),
    ...(owner.gmailAuthorization ? [owner.gmailAuthorization.grantedEmail] : []),
  ].map(normalizeEmail);
  const matchesEmail = normalizedEmail ? ownerEmails.includes(normalizedEmail) : false;

  const normalizedPhone = phone ? normalizePhone(phone) : null;
  const ownerPhone = owner.phone ? normalizePhone(owner.phone) : null;
  const matchesPhone = Boolean(normalizedPhone && ownerPhone && normalizedPhone === ownerPhone);

  if (matchesEmail || matchesPhone) {
    throw new HttpError(400, "자기 자신은 인맥으로 추가할 수 없습니다.");
  }
}

async function assertEmailNotUsedByAnotherContact(
  ownerUserId: string,
  email: string | null | undefined,
  excludeContactId?: string,
) {
  if (!email) return;

  const contacts = await prisma.contact.findMany({
    where: {
      ownerUserId,
      ...(excludeContactId ? { id: { not: excludeContactId } } : {}),
    },
    select: {
      email: true,
      emails: { select: { email: true } },
    },
  });
  const normalizedEmail = normalizeEmail(email);
  const alreadyUsed = contacts.some((contact) =>
    [contact.email, ...contact.emails.map((item) => item.email)]
      .filter((item): item is string => Boolean(item))
      .some((item) => normalizeEmail(item) === normalizedEmail),
  );

  if (alreadyUsed) {
    throw new HttpError(409, "이미 인맥에 등록된 이메일입니다.");
  }
}

// 수동으로 입력한 email+phone이 실제 가입 계정과 일치하면 targetUserId로 연동한다(BLE 태깅과 동일한 방식).
// 본인 계정과 일치하는 경우는 연동하지 않는다(자기 자신을 태깅할 수 없는 것과 동일한 이유).
async function findLinkedUserId(
  email: string | null | undefined,
  phone: string | null | undefined,
  ownerUserId: string,
): Promise<string | null> {
  if (!email || !phone) return null;
  const matched = await prisma.user.findFirst({ where: { email, phone } });
  if (!matched || matched.id === ownerUserId) return null;
  return matched.id;
}

router.get(
  "/",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const contacts = await prisma.contact.findMany({
      where: { ownerUserId: req.user!.userId },
      orderBy: { createdAt: "desc" },
      include: LINKED_PROFILE_INCLUDE,
    });
    res.json(contacts.map(toContactResponse));
  }),
);

router.post(
  "/",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const body = contactCreateSchema.parse(req.body);
    await assertNotOwnerIdentity(req.user!.userId, body.email, body.phone);
    await assertEmailNotUsedByAnotherContact(req.user!.userId, body.email);
    const targetUserId = await findLinkedUserId(body.email, body.phone, req.user!.userId);
    const contact = await prisma.contact.create({
      data: { ...body, ownerUserId: req.user!.userId, source: "MANUAL", targetUserId },
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

// 스캔 목록에 상대 이름을 보여주기 위한 미리보기 — Contact를 만들지 않고 이름/소속/사진만 조회한다.
// resolveBleCode(token)만 재사용하고, /ble-tag처럼 Contact를 읽고 쓰는 뒷부분은 실행하지 않는다.
router.get(
  "/ble-preview/:token",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const targetUserId = resolveBleCode(req.params.token);
    if (!targetUserId) {
      throw new HttpError(400, "유효하지 않거나 만료된 BLE 코드입니다.");
    }
    if (targetUserId === req.user!.userId) {
      throw new HttpError(400, "자기 자신입니다.");
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true, affiliation: true, avatarUrl: true },
    });
    if (!targetUser) {
      throw new HttpError(404, "상대 사용자를 찾을 수 없습니다.");
    }

    // userId를 같이 내려줘야 클라이언트가 "같은 사람이 스캔 재시작으로 새 코드를 다시 발급받아
    // 광고한 것"과 "새로운 사람"을 구분할 수 있다 — 코드만으로 구분하면 같은 사람이 두 번 뜬다.
    res.json({ userId: targetUser.id, name: targetUser.name, affiliation: targetUser.affiliation, avatarUrl: targetUser.avatarUrl });
  }),
);

// 인맥 등록은 단방향이다(A가 B를 태깅해도 B의 주소록에 A가 자동으로 생기지 않음). 그래서 "나를
// 등록한 사람 중, 나는 아직 등록하지 않은 사람" 목록을 보여주고 골라서 등록할 수 있게 한다.
router.get(
  "/incoming",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const myId = req.user!.userId;

    // 나를 target으로 등록해둔 사람들(=나를 등록한 사람들)의 소유자 id.
    const incoming = await prisma.contact.findMany({
      where: { targetUserId: myId, ownerUserId: { not: myId } },
      select: { ownerUserId: true },
      distinct: ["ownerUserId"],
    });
    const incomingUserIds = incoming.map((c) => c.ownerUserId);
    if (incomingUserIds.length === 0) {
      return res.json([]);
    }

    // 그 중 내가 이미 등록해둔 사람은 제외한다.
    const alreadyMine = await prisma.contact.findMany({
      where: { ownerUserId: myId, targetUserId: { in: incomingUserIds } },
      select: { targetUserId: true },
    });
    const alreadyMineIds = new Set(alreadyMine.map((c) => c.targetUserId));
    const remainingIds = incomingUserIds.filter((id) => !alreadyMineIds.has(id));
    if (remainingIds.length === 0) {
      return res.json([]);
    }

    const users = await prisma.user.findMany({
      where: { id: { in: remainingIds } },
      select: { id: true, name: true, affiliation: true, avatarUrl: true },
    });
    return res.json(users);
  }),
);

router.post(
  "/incoming/:userId",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const myId = req.user!.userId;
    const targetUserId = req.params.userId;

    if (targetUserId === myId) {
      throw new HttpError(400, "자기 자신을 등록할 수 없습니다.");
    }

    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) {
      throw new HttpError(404, "사용자를 찾을 수 없습니다.");
    }

    const existing = await prisma.contact.findFirst({ where: { ownerUserId: myId, targetUserId } });
    if (existing) {
      throw new HttpError(409, "이미 등록된 사용자입니다.");
    }

    const contact = await prisma.contact.create({
      data: {
        ownerUserId: myId,
        targetUserId,
        name: targetUser.name,
        affiliation: targetUser.affiliation,
        email: targetUser.email,
        phone: targetUser.phone,
        source: "BLE",
      },
    });
    if (contact.email) {
      await ensureContactPrimaryEmail(contact.id);
    }
    res.status(201).json(contact);
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const contact = await findOwnedContactOrThrow(req.params.id, req.user!.userId);
    res.json(toContactResponse(contact));
  }),
);

router.patch(
  "/:id",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const existing = await findOwnedContactOrThrow(req.params.id, req.user!.userId);
    const body = contactUpdateSchema.parse(req.body);

    const nextEmail = "email" in body ? body.email : existing.email;
    const nextPhone = "phone" in body ? body.phone : existing.phone;
    if ("email" in body || "phone" in body) {
      await assertNotOwnerIdentity(req.user!.userId, nextEmail, nextPhone);
    }
    if ("email" in body) {
      await assertEmailNotUsedByAnotherContact(req.user!.userId, nextEmail, existing.id);
    }
    const targetUserId =
      "email" in body || "phone" in body
        ? await findLinkedUserId(nextEmail, nextPhone, req.user!.userId)
        : undefined;

    const updated = await prisma.contact.update({
      where: { id: req.params.id },
      data: targetUserId !== undefined ? { ...body, targetUserId } : body,
    });
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
    await assertNotOwnerIdentity(req.user!.userId, email, null);
    await assertEmailNotUsedByAnotherContact(req.user!.userId, email);
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

router.patch(
  "/:id/emails/:emailId",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const contact = await findOwnedContactOrThrow(req.params.id, req.user!.userId);
    const target = await prisma.contactEmail.findFirst({
      where: { id: req.params.emailId, contactId: contact.id },
    });
    if (!target) {
      throw new HttpError(404, "이메일을 찾을 수 없습니다.");
    }

    const { email } = contactEmailAddSchema.parse(req.body);
    await assertNotOwnerIdentity(req.user!.userId, email, null);
    await assertEmailNotUsedByAnotherContact(req.user!.userId, email, contact.id);

    const siblingEmails = await prisma.contactEmail.findMany({
      where: { contactId: contact.id, id: { not: target.id } },
      select: { email: true },
    });
    if (siblingEmails.some((item) => normalizeEmail(item.email) === normalizeEmail(email))) {
      throw new HttpError(409, "이미 인맥에 등록된 이메일입니다.");
    }
    const linkedTargetUserId = target.isPrimary
      ? await findLinkedUserId(email, contact.phone, req.user!.userId)
      : null;

    try {
      const updated = await prisma.$transaction(async (tx) => {
        const updatedEmail = await tx.contactEmail.update({
          where: { id: target.id },
          data: { email },
        });
        if (target.isPrimary) {
          await tx.contact.update({
            where: { id: contact.id },
            data: { email, targetUserId: linkedTargetUserId },
          });
        }
        return updatedEmail;
      });
      res.json(updated);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new HttpError(409, "이미 인맥에 등록된 이메일입니다.");
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

    await assertNotOwnerIdentity(req.user!.userId, target.email, null);

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
