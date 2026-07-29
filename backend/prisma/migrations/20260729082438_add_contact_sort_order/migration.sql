-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Contact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerUserId" TEXT NOT NULL,
    "targetUserId" TEXT,
    "name" TEXT NOT NULL,
    "affiliation" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "memo" TEXT,
    "photoUrl" TEXT,
    "contactMethod" TEXT NOT NULL DEFAULT 'OTHER',
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "lastContactedAt" DATETIME,
    "reminderIntervalDays" INTEGER NOT NULL DEFAULT 90,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Contact_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Contact_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Contact" ("affiliation", "contactMethod", "createdAt", "email", "id", "lastContactedAt", "memo", "name", "ownerUserId", "phone", "photoUrl", "reminderIntervalDays", "source", "targetUserId", "updatedAt") SELECT "affiliation", "contactMethod", "createdAt", "email", "id", "lastContactedAt", "memo", "name", "ownerUserId", "phone", "photoUrl", "reminderIntervalDays", "source", "targetUserId", "updatedAt" FROM "Contact";
DROP TABLE "Contact";
ALTER TABLE "new_Contact" RENAME TO "Contact";
CREATE INDEX "Contact_ownerUserId_idx" ON "Contact"("ownerUserId");
CREATE INDEX "Contact_targetUserId_idx" ON "Contact"("targetUserId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
