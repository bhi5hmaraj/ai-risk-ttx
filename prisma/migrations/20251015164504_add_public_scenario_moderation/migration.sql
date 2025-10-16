/*
  Warnings:

  - You are about to drop the column `authorEmail` on the `PublicScenario` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `PublicScenario` table. All the data in the column will be lost.
  - You are about to drop the column `isPublic` on the `PublicScenario` table. All the data in the column will be lost.
  - You are about to drop the column `prompt` on the `PublicScenario` table. All the data in the column will be lost.
  - You are about to drop the column `scenarioData` on the `PublicScenario` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `PublicScenario` table. All the data in the column will be lost.
  - You are about to drop the column `upvotes` on the `PublicScenario` table. All the data in the column will be lost.
  - You are about to drop the column `views` on the `PublicScenario` table. All the data in the column will be lost.
  - Added the required column `customPrompt` to the `PublicScenario` table without a default value. This is not possible if the table is not empty.
  - Added the required column `gameSetup` to the `PublicScenario` table without a default value. This is not possible if the table is not empty.
  - Added the required column `initialEvent` to the `PublicScenario` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."PublicScenario_upvotes_idx";

-- AlterTable
ALTER TABLE "PublicScenario" DROP COLUMN "authorEmail",
DROP COLUMN "description",
DROP COLUMN "isPublic",
DROP COLUMN "prompt",
DROP COLUMN "scenarioData",
DROP COLUMN "title",
DROP COLUMN "upvotes",
DROP COLUMN "views",
ADD COLUMN     "customPrompt" TEXT NOT NULL,
ADD COLUMN     "gameSetup" JSONB NOT NULL,
ADD COLUMN     "initialEvent" JSONB NOT NULL,
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedBy" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "submitterName" TEXT,
ADD COLUMN     "voteCount" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "PublicScenario_status_idx" ON "PublicScenario"("status");

-- CreateIndex
CREATE INDEX "PublicScenario_voteCount_idx" ON "PublicScenario"("voteCount" DESC);

-- CreateIndex
CREATE INDEX "PublicScenario_submittedAt_idx" ON "PublicScenario"("submittedAt" DESC);
