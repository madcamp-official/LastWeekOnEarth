import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { notImplemented } from "../../lib/notImplemented";

// CLAUDE.md Phase 4 (CV 타임라인)
const router = Router();

router.use(requireAuth);

router.get("/", notImplemented);
router.post("/", notImplemented);
router.patch("/:id", notImplemented);
router.delete("/:id", notImplemented);

export default router;
