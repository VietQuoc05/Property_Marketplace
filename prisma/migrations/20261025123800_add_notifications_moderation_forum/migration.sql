-- CreateEnum
CREATE TYPE "public"."NeedType" AS ENUM ('APARTMENT', 'HOUSE', 'LAND', 'OFFICE', 'ROOM');

-- CreateEnum
CREATE TYPE "public"."NeedSaleType" AS ENUM ('RENT', 'SALE');

-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('CONTRACT_INVITATION', 'LISTING_INTEREST', 'LISTING_APPROVED', 'LISTING_REJECTED');

-- AlterEnum
BEGIN;
CREATE TYPE "public"."ListingSaleType_new" AS ENUM ('RENT', 'SALE');
ALTER TABLE "public"."Listing" ALTER COLUMN "saleType" TYPE "public"."ListingSaleType_new" USING ("saleType"::text::"public"."ListingSaleType_new");
ALTER TYPE "public"."ListingSaleType" RENAME TO "ListingSaleType_old";
ALTER TYPE "public"."ListingSaleType_new" RENAME TO "ListingSaleType";
DROP TYPE "public"."ListingSaleType_old";
COMMIT;

-- AlterEnum
ALTER TYPE "public"."ListingStatus" ADD VALUE 'PENDING_REVIEW';
ALTER TYPE "public"."ListingStatus" ADD VALUE 'REJECTED';

-- AlterTable
ALTER TABLE "public"."ConversationParticipant" ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastReadAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."Listing" DROP COLUMN "maxSize",
DROP COLUMN "minSize",
ADD COLUMN     "size" DECIMAL(65,30);

-- AlterTable
ALTER TABLE "public"."Message" ADD COLUMN     "listingId" TEXT;

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "public"."NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "data" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ListingModeration" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "intent" TEXT,
    "titleDescriptionMatch" BOOLEAN NOT NULL DEFAULT true,
    "imagesMatch" BOOLEAN NOT NULL DEFAULT true,
    "communityViolation" BOOLEAN NOT NULL DEFAULT false,
    "reasons" TEXT[],
    "rawResponse" JSONB,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListingModeration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ForumPost" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "needType" "public"."NeedType",
    "needSaleType" "public"."NeedSaleType",
    "cityId" TEXT,
    "districtId" TEXT,
    "wardId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ForumPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "public"."Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "public"."Notification"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ListingModeration_listingId_key" ON "public"."ListingModeration"("listingId");

-- CreateIndex
CREATE INDEX "ListingModeration_listingId_idx" ON "public"."ListingModeration"("listingId");

-- CreateIndex
CREATE INDEX "ListingModeration_decision_idx" ON "public"."ListingModeration"("decision");

-- CreateIndex
CREATE INDEX "ForumPost_userId_idx" ON "public"."ForumPost"("userId");

-- CreateIndex
CREATE INDEX "ForumPost_needType_idx" ON "public"."ForumPost"("needType");

-- CreateIndex
CREATE INDEX "ForumPost_needSaleType_idx" ON "public"."ForumPost"("needSaleType");

-- CreateIndex
CREATE INDEX "ForumPost_cityId_idx" ON "public"."ForumPost"("cityId");

-- CreateIndex
CREATE INDEX "ForumPost_districtId_idx" ON "public"."ForumPost"("districtId");

-- CreateIndex
CREATE INDEX "ForumPost_wardId_idx" ON "public"."ForumPost"("wardId");

-- CreateIndex
CREATE INDEX "ForumPost_createdAt_idx" ON "public"."ForumPost"("createdAt");

-- CreateIndex
CREATE INDEX "Message_listingId_idx" ON "public"."Message"("listingId");

-- AddForeignKey
ALTER TABLE "public"."Message" ADD CONSTRAINT "Message_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "public"."Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ListingModeration" ADD CONSTRAINT "ListingModeration_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "public"."Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ForumPost" ADD CONSTRAINT "ForumPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ForumPost" ADD CONSTRAINT "ForumPost_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "public"."City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ForumPost" ADD CONSTRAINT "ForumPost_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "public"."District"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ForumPost" ADD CONSTRAINT "ForumPost_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "public"."Ward"("id") ON DELETE SET NULL ON UPDATE CASCADE;
