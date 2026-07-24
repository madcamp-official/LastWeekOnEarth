import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { notImplemented } from "../../lib/notImplemented";

// CLAUDE.md 섹션 5 (연락 빈도 그룹)
const router = Router();

router.use(requireAuth);

router.get("/", notImplemented);
router.post("/", notImplemented);
router.get("/:id", notImplemented);
router.patch("/:id", notImplemented);
router.delete("/:id", notImplemented);

router.post("/:id/members", notImplemented);
router.delete("/:id/members/:contactId", notImplemented);

router.get("/:id/overdue", notImplemented);

export default router;
