-- CreateTable
CREATE TABLE "SessionMetrics" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "mode" TEXT NOT NULL,
    "rounds" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "SessionMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SessionMetrics_createdAt_idx" ON "SessionMetrics"("createdAt");

-- CreateIndex
CREATE INDEX "SessionMetrics_mode_idx" ON "SessionMetrics"("mode");

-- CreateIndex
CREATE INDEX "SessionMetrics_completed_idx" ON "SessionMetrics"("completed");
