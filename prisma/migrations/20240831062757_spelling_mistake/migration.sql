/*
  Warnings:

  - You are about to drop the column `functionStructre` on the `Problem` table. All the data in the column will be lost.
  - Added the required column `functionStructure` to the `Problem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Problem" DROP COLUMN "functionStructre",
ADD COLUMN     "functionStructure" VARCHAR(1000) NOT NULL;
