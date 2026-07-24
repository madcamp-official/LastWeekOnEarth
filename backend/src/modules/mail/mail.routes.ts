import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { notImplemented } from "../../lib/notImplemented";

// CLAUDE.md 섹션 5 (AI 메일 초안 생성/일괄 생성)
const router = Router();

router.use(requireAuth);

router.post("/generate", notImplemented);
router.post("/batch-generate", notImplemented);
router.get("/", notImplemented);
router.get("/:id", notImplemented);
router.patch("/:id", notImplemented);
router.post("/:id/send", notImplemented);

export default router;
