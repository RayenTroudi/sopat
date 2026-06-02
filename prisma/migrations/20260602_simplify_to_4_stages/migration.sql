-- Simplify project pipeline from 10 stages to 4 stages
-- Maps: old 1-2 → new 1, old 3-5 → new 2, old 6-9 → new 3, old 10 → new 4

-- Step 1: Add new columns
ALTER TABLE "Project" ADD COLUMN "stage" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Project" ADD COLUMN "stageUpdatedAt" TIMESTAMP(3);
ALTER TABLE "Project" ADD COLUMN "stageNotes" TEXT;

-- Step 2: Migrate existing stage data
UPDATE "Project" SET "stage" = 1 WHERE "currentStage" IN (1, 2);
UPDATE "Project" SET "stage" = 2 WHERE "currentStage" IN (3, 4, 5);
UPDATE "Project" SET "stage" = 3 WHERE "currentStage" IN (6, 7, 8, 9);
UPDATE "Project" SET "stage" = 4 WHERE "currentStage" = 10;

-- Step 3: Drop old stage column
ALTER TABLE "Project" DROP COLUMN "currentStage";

-- Step 4: Drop old lifecycle tables (in dependency order)
DROP TABLE IF EXISTS "StageItemCompletion";
DROP TABLE IF EXISTS "StageProgress";
DROP TABLE IF EXISTS "ChecklistItem";
DROP TABLE IF EXISTS "StageChecklist";
DROP TABLE IF EXISTS "LifecycleStage";

-- Step 5: Add index on new stage column
CREATE INDEX "Project_stage_idx" ON "Project"("stage");
DROP INDEX IF EXISTS "Project_currentStage_idx";
