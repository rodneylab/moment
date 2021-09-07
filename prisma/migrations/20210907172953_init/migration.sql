/*
  Warnings:

  - Made the column `address` on table `Gallery` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Gallery" ALTER COLUMN "address" SET NOT NULL;
