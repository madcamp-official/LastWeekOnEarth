import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes";
import contactsRoutes from "../modules/contacts/contacts.routes";
import groupsRoutes from "../modules/groups/groups.routes";
import cvRoutes from "../modules/cv/cv.routes";
import mailRoutes from "../modules/mail/mail.routes";
import notificationsRoutes from "../modules/notifications/notifications.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/contacts", contactsRoutes);
router.use("/groups", groupsRoutes);
router.use("/cv", cvRoutes);
router.use("/mail-drafts", mailRoutes);
router.use("/notifications", notificationsRoutes);

export default router;
