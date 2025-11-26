-- AlterTable
ALTER TABLE "SessionMetrics" ADD COLUMN     "maxRounds" INTEGER,
ADD COLUMN     "startedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "SessionMetrics_startedAt_idx" ON "SessionMetrics"("startedAt");

-- CreateIndex
CREATE INDEX "SessionMetrics_maxRounds_idx" ON "SessionMetrics"("maxRounds");
