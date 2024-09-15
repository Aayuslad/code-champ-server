/*
  Warnings:

  - A unique constraint covering the columns `[problemNumber]` on the table `Problem` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `problemNumber` to the `Problem` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Constraint" DROP CONSTRAINT "Constraint_problemId_fkey";

-- DropForeignKey
ALTER TABLE "Hint" DROP CONSTRAINT "Hint_problemId_fkey";

-- AlterTable
ALTER TABLE "Problem" ADD COLUMN     "problemNumber" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Problem_problemNumber_key" ON "Problem"("problemNumber");

-- AddForeignKey
ALTER TABLE "Constraint" ADD CONSTRAINT "Constraint_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hint" ADD CONSTRAINT "Hint_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
