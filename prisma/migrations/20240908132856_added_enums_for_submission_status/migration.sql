/*
  Warnings:

  - You are about to drop the column `accepted` on the `Submission` table. All the data in the column will be lost.
  - Added the required column `status` to the `Submission` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "submissionStatus" AS ENUM ('Accepted', 'Rejected', 'Pending');

-- AlterTable
ALTER TABLE "Submission" DROP COLUMN "accepted",
ADD COLUMN     "status" "submissionStatus" NOT NULL;
