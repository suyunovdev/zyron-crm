-- AlterTable
ALTER TABLE "User" ADD COLUMN "tgLinkToken" TEXT;
ALTER TABLE "User" ADD COLUMN "tgLinkTokenExp" DATETIME;

-- CreateIndex
CREATE UNIQUE INDEX "User_tgLinkToken_key" ON "User"("tgLinkToken");

