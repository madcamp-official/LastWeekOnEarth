import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAuth, type AuthenticatedRequest } from "../../middleware/auth.middleware";
import { HttpError } from "../../middleware/error.middleware";
import { signGmailOAuthState, verifyGmailOAuthState } from "../../lib/jwt";
import { buildGmailConsentUrl, exchangeGmailAuthCode, isEmailAllowedForGmailTest } from "../../lib/googleMailAuth";

// 테스트 모드: config/env.ts GMAIL_ALLOWED_TEST_EMAILS 허용 목록에 있는 유저만
// "내 대신 Gmail 발송" 권한을 연동할 수 있다. /mail/gmail/* 로 마운트됨.
const router = Router();

router.get(
  "/connect",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.userId } });

    if (!isEmailAllowedForGmailTest(user.email)) {
      throw new HttpError(403, "현재 테스트 모드입니다. 이 계정은 Gmail 연동이 허용되지 않았습니다.");
    }

    const state = signGmailOAuthState({ userId: user.id });
    const consentUrl = buildGmailConsentUrl(state);
    res.json({ consentUrl });
  }),
);

// Google이 브라우저를 리다이렉트시키는 엔드포인트라 로그인 미들웨어를 걸 수 없다.
// 대신 /connect에서 서명해 넘긴 state로 사용자를 식별/검증한다.
router.get(
  "/callback",
  asyncHandler(async (req, res) => {
    const { code, state, error } = req.query as { code?: string; state?: string; error?: string };

    if (error) {
      res.status(400).send(`Google 인증이 거부되었습니다: ${error}`);
      return;
    }
    if (!code || !state) {
      throw new HttpError(400, "code/state가 필요합니다.");
    }

    let userId: string;
    try {
      userId = verifyGmailOAuthState(state).userId;
    } catch {
      throw new HttpError(400, "유효하지 않거나 만료된 state입니다. 처음부터 다시 시도해주세요.");
    }

    const { refreshToken, grantedEmail, scope } = await exchangeGmailAuthCode(code);

    await prisma.gmailAuthorization.upsert({
      where: { userId },
      update: { refreshToken, grantedEmail, scope },
      create: { userId, refreshToken, grantedEmail, scope },
    });

    res.send("Gmail 연동이 완료되었습니다. 이 창을 닫고 앱으로 돌아가세요.");
  }),
);

router.get(
  "/status",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const authorization = await prisma.gmailAuthorization.findUnique({ where: { userId: req.user!.userId } });
    res.json({
      connected: !!authorization,
      grantedEmail: authorization?.grantedEmail ?? null,
    });
  }),
);

router.delete(
  "/",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    await prisma.gmailAuthorization.deleteMany({ where: { userId: req.user!.userId } });
    res.status(204).send();
  }),
);

export default router;
