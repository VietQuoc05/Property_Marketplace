/*
  Warnings:

  - The values [ROOMMATE] on the enum `ListingSaleType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `currentOccupants` on the `Listing` table. All the data in the column will be lost.
  - You are about to drop the column `maxOccupants` on the `Listing` table. All the data in the column will be lost.
  - You are about to drop the column `preferredGender` on the `Listing` table. All the data in the column will be lost.
  - You are about to drop the column `gender` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `Report` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Request` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RequestReceiver` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."ListingSaleType_new" AS ENUM ('RENT', 'SALE', 'BOTH');
ALTER TABLE "public"."Listing" ALTER COLUMN "saleType" TYPE "public"."ListingSaleType_new" USING ("saleType"::text::"public"."ListingSaleType_new");
ALTER TYPE "public"."ListingSaleType" RENAME TO "ListingSaleType_old";
ALTER TYPE "public"."ListingSaleType_new" RENAME TO "ListingSaleType";
DROP TYPE "public"."ListingSaleType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "public"."Report" DROP CONSTRAINT "Report_contractId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Report" DROP CONSTRAINT "Report_receiverId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Report" DROP CONSTRAINT "Report_senderId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Request" DROP CONSTRAINT "Request_contractId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Request" DROP CONSTRAINT "Request_senderId_fkey";

-- DropForeignKey
ALTER TABLE "public"."RequestReceiver" DROP CONSTRAINT "RequestReceiver_receiverId_fkey";

-- DropForeignKey
ALTER TABLE "public"."RequestReceiver" DROP CONSTRAINT "RequestReceiver_requestId_fkey";

-- AlterTable
ALTER TABLE "public"."Listing" DROP COLUMN "currentOccupants",
DROP COLUMN "maxOccupants",
DROP COLUMN "preferredGender",
ADD COLUMN     "br" INTEGER,
ADD COLUMN     "wc" INTEGER;

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "gender";

-- DropTable
DROP TABLE "public"."Report";

-- DropTable
DROP TABLE "public"."Request";

-- DropTable
DROP TABLE "public"."RequestReceiver";

-- DropEnum
DROP TYPE "public"."RequestStatus";
