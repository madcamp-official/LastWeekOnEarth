import { Router } from "express";
import { notImplemented } from "../../lib/notImplemented";
import { googleLoginHandler } from "./google.controller";

// CLAUDE.md 섹션 3 인증 흐름
const router = Router();

router.post("/check-username", notImplemented);
router.post("/check-email", notImplemented);
router.post("/phone/send-otp", notImplemented);
router.post("/phone/verify-otp", notImplemented);
router.post("/signup", notImplemented);
router.post("/login", notImplemented);
router.post("/google", googleLoginHandler);
router.post("/refresh", notImplemented);
router.post("/logout", notImplemented);

export default router;
