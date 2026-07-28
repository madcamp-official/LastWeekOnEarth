import { Router } from "express";
import { notImplemented } from "../../lib/notImplemented";
import { googleLoginHandler } from "./google.controller";
import { loginHandler } from "./login.controller";
import { emailLoginHandler, sendEmailCodeHandler } from "./email.controller";
import { refreshHandler, logoutHandler } from "./refresh.controller";

// CLAUDE.md 섹션 3 인증 흐름
const router = Router();

router.post("/check-username", notImplemented);
router.post("/check-email", notImplemented);
router.post("/phone/send-otp", notImplemented);
router.post("/phone/verify-otp", notImplemented);
router.post("/signup", notImplemented);
router.post("/login", loginHandler);
router.post("/email/send-code", sendEmailCodeHandler);
router.post("/email", emailLoginHandler);
router.post("/google", googleLoginHandler);
router.post("/refresh", refreshHandler);
router.post("/logout", logoutHandler);

export default router;
