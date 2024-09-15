/*
  Warnings:

  - You are about to drop the column `difficulty` on the `Problem` table. All the data in the column will be lost.
  - You are about to drop the column `isApproved` on the `Problem` table. All the data in the column will be lost.
  - You are about to drop the column `problemStatement` on the `Problem` table. All the data in the column will be lost.
  - You are about to drop the column `sampleTestCasesObjectkey` on the `Problem` table. All the data in the column will be lost.
  - You are about to drop the column `testCasesObjectKey` on the `Problem` table. All the data in the column will be lost.
  - Added the required column `description` to the `Problem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `difficultyLevel` to the `Problem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `functionStructre` to the `Problem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sampleTestCasesKey` to the `Problem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `submissionCode` to the `Problem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `testCasesKey` to the `Problem` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "difficultyLevel" AS ENUM ('Basic', 'Easy', 'Medium', 'Hard');

-- AlterTable
ALTER TABLE "Problem" DROP COLUMN "difficulty",
DROP COLUMN "isApproved",
DROP COLUMN "problemStatement",
DROP COLUMN "sampleTestCasesObjectkey",
DROP COLUMN "testCasesObjectKey",
ADD COLUMN     "approved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "description" VARCHAR(1000) NOT NULL,
ADD COLUMN     "difficultyLevel" "difficultyLevel" NOT NULL,
ADD COLUMN     "functionStructre" VARCHAR(1000) NOT NULL,
ADD COLUMN     "sampleTestCasesKey" TEXT NOT NULL,
ADD COLUMN     "submissionCode" TEXT NOT NULL,
ADD COLUMN     "testCasesKey" TEXT NOT NULL;

-- DropEnum
DROP TYPE "Difficulty";
