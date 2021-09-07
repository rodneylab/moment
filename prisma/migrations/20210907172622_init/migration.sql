/*
  Warnings:

  - You are about to drop the `TubeStation` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "TubeStation" DROP CONSTRAINT "TubeStation_galleryId_fkey";

-- DropTable
DROP TABLE "TubeStation";
