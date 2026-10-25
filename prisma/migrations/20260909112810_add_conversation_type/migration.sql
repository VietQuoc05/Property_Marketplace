-- CreateEnum
CREATE TYPE "public"."ConversationType" AS ENUM ('CONTRACT', 'DIRECT');

-- AlterTable
ALTER TABLE "public"."Conversation" ADD COLUMN     "type" "public"."ConversationType" NOT NULL DEFAULT 'CONTRACT',
ALTER COLUMN "contractId" DROP NOT NULL;
