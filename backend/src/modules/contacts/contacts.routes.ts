import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { notImplemented } from "../../lib/notImplemented";

// CLAUDE.md 섹션 4 (BLE 태깅), 섹션 5 (수동 등록)
const router = Router();

router.use(requireAuth);

router.get("/", notImplemented);
router.post("/", notImplemented);
router.get("/:id", notImplemented);
router.patch("/:id", notImplemented);
router.delete("/:id", notImplemented);

router.post("/ble-tag", notImplemented);

router.post("/:id/logs", notImplemented);
router.get("/:id/logs", notImplemented);

export default router;
