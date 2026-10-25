/*
  Warnings:

  - You are about to drop the column `yob` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."SocialAccount" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "yob";

-- RenameForeignKey
ALTER TABLE "public"."SocialAccount" RENAME CONSTRAINT "SocialAccount_user_fkey" TO "SocialAccount_userId_fkey";
