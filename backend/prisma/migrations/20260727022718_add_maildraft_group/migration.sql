-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_EmailDraft" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerUserId" TEXT NOT NULL,
    "contactId" TEXT,
    "groupId" TEXT,
    "batchId" TEXT,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'EMAIL',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailDraft_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EmailDraft_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "EmailDraft_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ContactGroup" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "EmailDraft_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "EmailBatch" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_EmailDraft" ("batchId", "body", "channel", "contactId", "createdAt", "id", "ownerUserId", "scheduledAt", "status", "subject") SELECT "batchId", "body", "channel", "contactId", "createdAt", "id", "ownerUserId", "scheduledAt", "status", "subject" FROM "EmailDraft";
DROP TABLE "EmailDraft";
ALTER TABLE "new_EmailDraft" RENAME TO "EmailDraft";
CREATE INDEX "EmailDraft_ownerUserId_idx" ON "EmailDraft"("ownerUserId");
CREATE INDEX "EmailDraft_contactId_idx" ON "EmailDraft"("contactId");
CREATE INDEX "EmailDraft_groupId_idx" ON "EmailDraft"("groupId");
CREATE INDEX "EmailDraft_batchId_idx" ON "EmailDraft"("batchId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
