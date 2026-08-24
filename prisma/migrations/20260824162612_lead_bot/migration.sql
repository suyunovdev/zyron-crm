-- AlterTable
ALTER TABLE "Lead" ADD COLUMN "feedbackDisliked" TEXT;
ALTER TABLE "Lead" ADD COLUMN "feedbackLiked" TEXT;
ALTER TABLE "Lead" ADD COLUMN "preferredTeacher" TEXT;
ALTER TABLE "Lead" ADD COLUMN "subject" TEXT;
ALTER TABLE "Lead" ADD COLUMN "telegramChatId" TEXT;

-- CreateTable
CREATE TABLE "BotSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chatId" TEXT NOT NULL,
    "step" TEXT NOT NULL DEFAULT 'idle',
    "branchId" TEXT,
    "branchName" TEXT,
    "name" TEXT,
    "phone" TEXT,
    "subject" TEXT,
    "teacherName" TEXT,
    "teacherLevel" TEXT,
    "optionsJson" TEXT,
    "leadId" TEXT,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "BotSession_chatId_key" ON "BotSession"("chatId");

