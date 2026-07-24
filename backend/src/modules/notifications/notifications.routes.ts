import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { notImplemented } from "../../lib/notImplemented";

// CLAUDE.md Phase 3 (연락 빈도 초과 알림)
const router = Router();

router.use(requireAuth);

router.get("/", notImplemented);
router.patch("/:id/read", notImplemented);

export default router;
