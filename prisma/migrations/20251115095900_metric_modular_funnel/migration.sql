-- AlterTable
ALTER TABLE "SessionMetrics" ADD COLUMN     "currentRoundStartedAt" TIMESTAMP(3),
ADD COLUMN     "roundDurations" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "scenarioTitle" TEXT;

-- CreateIndex
CREATE INDEX "SessionMetrics_scenarioTitle_idx" ON "SessionMetrics"("scenarioTitle");

-- CreateIndex
CREATE INDEX "SessionMetrics_rounds_idx" ON "SessionMetrics"("rounds");
