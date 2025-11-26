-- AlterTable
ALTER TABLE "Feedback" ADD COLUMN     "reviewed" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Feedback_reviewed_idx" ON "Feedback"("reviewed");
