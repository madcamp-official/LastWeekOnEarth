import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { issueTokens } from "../../lib/issueTokens";
import { generateUniqueUsername } from "../../lib/generateUniqueUsername";
import { sendVerificationEmail } from "../../lib/mailer";

// 영문 1자 이상 + 숫자 1자 이상 + 총 6자 이상. 신규 가입 시에만 강제한다 (아래 참고).
const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;

const EMAIL_CODE_TTL_MS = 10 * 60 * 1000;

function generateSixDigitCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

const sendCodeSchema = z.object({
  email: z.string().email("올바른 이메일 형식이 아닙니다."),
});

/**
 * 신규 가입에 필요한 이메일 인증코드를 발급/발송한다. 이미 가입된 이메일이면 코드를 보낼 필요가
 * 없다(로그인은 비밀번호만으로 되므로) — 대신 계정이 이미 있다고 바로 알려준다.
 */
export async function sendEmailCodeHandler(req: Request, res: Response) {
  const parsed = sendCodeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0]?.message ?? "email이 필요합니다." });
  }
  const { email } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: "이미 가입된 이메일입니다. 로그인해주세요." });
  }

  const code = generateSixDigitCode();
  await prisma.emailVerification.create({
    data: { email, code, expiresAt: new Date(Date.now() + EMAIL_CODE_TTL_MS) },
  });

  await sendVerificationEmail(email, code);
  return res.status(200).json({ sent: true });
}

const emailLoginSchema = z.object({
  email: z.string().email("올바른 이메일 형식이 아닙니다."),
  password: z.string().min(1, "비밀번호를 입력해주세요."),
  code: z.string().optional(),
});

/**
 * 이메일 로그인. 계정이 없으면 그 자리에서 자동 가입시킨다 (입력한 비밀번호가 새 계정의 비밀번호가 됨).
 * 신규 계정은 name/affiliation이 빈 값으로 생성되므로, 모바일에서 user.name이 비어있으면
 * 프로필 완성 화면(ProfileSetupScreen)으로 보내 이름/소속/전화번호를 입력받는다.
 */
export async function emailLoginHandler(req: Request, res: Response) {
  const parsed = emailLoginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0]?.message ?? "email, password가 필요합니다." });
  }
  const { email, password, code } = parsed.data;

  let user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    if (!user.passwordHash) {
      return res.status(409).json({ error: "이미 다른 방식(Google)으로 가입된 이메일입니다." });
    }
    if (!(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." });
    }
  } else {
    if (!PASSWORD_COMPLEXITY_REGEX.test(password)) {
      return res.status(400).json({ error: "비밀번호는 영문+숫자 조합 6자 이상이어야 합니다." });
    }

    // 처음 보는 이메일이면 실존 여부를 인증코드로 확인한다 — 코드가 아직 없으면 클라이언트가
    // 먼저 /auth/email/send-code를 호출하도록 유도한다.
    if (!code) {
      return res.status(428).json({ error: "이메일 인증이 필요합니다.", requiresVerification: true });
    }

    const verification = await prisma.emailVerification.findFirst({
      where: { email, code, verified: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    if (!verification) {
      return res.status(400).json({ error: "인증코드가 올바르지 않거나 만료되었습니다." });
    }
    await prisma.emailVerification.update({ where: { id: verification.id }, data: { verified: true } });

    const passwordHash = await bcrypt.hash(password, 10);
    const username = await generateUniqueUsername(email.split("@")[0]);
    try {
      user = await prisma.user.create({
        data: {
          username,
          passwordHash,
          name: "",
          affiliation: "",
          email,
          emailVerified: true,
        },
      });
    } catch (err) {
      // email(또는 동시 생성 시 username)의 unique 제약 위반 — 동시 요청 등으로 그새 가입된 경우.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        return res.status(409).json({ error: "이미 가입된 이메일입니다." });
      }
      throw err;
    }
  }

  const { accessToken, refreshToken } = await issueTokens(user);

  return res.status(200).json({
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      affiliation: user.affiliation,
      email: user.email,
      phone: user.phone,
      phoneVerified: user.phoneVerified,
      avatarUrl: user.avatarUrl,
    },
  });
}
