/*
  Warnings:

  - You are about to drop the column `expectedEndDate` on the `Contract` table. All the data in the column will be lost.
  - You are about to drop the column `listingId` on the `Contract` table. All the data in the column will be lost.
  - You are about to drop the column `startDate` on the `Contract` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[contractId]` on the table `Conversation` will be added. If there are existing duplicate values, this will fail.
  - Made the column `contractId` on table `Conversation` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "public"."ContractInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- DropForeignKey
ALTER TABLE "public"."Contract" DROP CONSTRAINT "Contract_listingId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Conversation" DROP CONSTRAINT "Conversation_contractId_fkey";

-- DropIndex
DROP INDEX "public"."Contract_listingId_idx";

-- AlterTable
ALTER TABLE "public"."Contract" DROP COLUMN "expectedEndDate",
DROP COLUMN "listingId",
DROP COLUMN "startDate";

-- AlterTable
ALTER TABLE "public"."Conversation" ALTER COLUMN "contractId" SET NOT NULL;

-- CreateTable
CREATE TABLE "public"."ContractInvitation" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "inviteeId" TEXT NOT NULL,
    "status" "public"."ContractInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContractInvitation_contractId_idx" ON "public"."ContractInvitation"("contractId");

-- CreateIndex
CREATE INDEX "ContractInvitation_inviteeId_idx" ON "public"."ContractInvitation"("inviteeId");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_contractId_key" ON "public"."Conversation"("contractId");

-- AddForeignKey
ALTER TABLE "public"."ContractInvitation" ADD CONSTRAINT "ContractInvitation_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "public"."Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ContractInvitation" ADD CONSTRAINT "ContractInvitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ContractInvitation" ADD CONSTRAINT "ContractInvitation_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Conversation" ADD CONSTRAINT "Conversation_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "public"."Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
