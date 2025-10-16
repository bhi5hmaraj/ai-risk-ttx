-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "schemaVersion" TEXT NOT NULL DEFAULT '1.0.0',
    "data" JSONB NOT NULL,
    "model" TEXT,
    "scenarioType" TEXT,
    "rolePlayed" TEXT,
    "gameCompleted" BOOLEAN NOT NULL DEFAULT false,
    "avgRating" DOUBLE PRECISION,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicScenario" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "scenarioData" JSONB NOT NULL,
    "authorEmail" TEXT,
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "views" INTEGER NOT NULL DEFAULT 0,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PublicScenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScenarioVote" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scenarioId" TEXT NOT NULL,
    "userFingerprint" TEXT NOT NULL,

    CONSTRAINT "ScenarioVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Feedback_schemaVersion_idx" ON "Feedback"("schemaVersion");

-- CreateIndex
CREATE INDEX "Feedback_createdAt_idx" ON "Feedback"("createdAt");

-- CreateIndex
CREATE INDEX "Feedback_model_idx" ON "Feedback"("model");

-- CreateIndex
CREATE INDEX "Feedback_scenarioType_idx" ON "Feedback"("scenarioType");

-- CreateIndex
CREATE INDEX "Feedback_gameCompleted_idx" ON "Feedback"("gameCompleted");

-- CreateIndex
CREATE INDEX "PublicScenario_upvotes_idx" ON "PublicScenario"("upvotes" DESC);

-- CreateIndex
CREATE INDEX "PublicScenario_createdAt_idx" ON "PublicScenario"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "ScenarioVote_scenarioId_idx" ON "ScenarioVote"("scenarioId");

-- CreateIndex
CREATE UNIQUE INDEX "ScenarioVote_scenarioId_userFingerprint_key" ON "ScenarioVote"("scenarioId", "userFingerprint");

-- AddForeignKey
ALTER TABLE "ScenarioVote" ADD CONSTRAINT "ScenarioVote_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "PublicScenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
