-- DropForeignKey
ALTER TABLE "public"."Listing" DROP CONSTRAINT "Listing_districtId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Listing" DROP CONSTRAINT "Listing_wardId_fkey";

-- AlterTable
ALTER TABLE "public"."Listing" ALTER COLUMN "districtId" DROP NOT NULL,
ALTER COLUMN "wardId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."Listing" ADD CONSTRAINT "Listing_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "public"."District"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Listing" ADD CONSTRAINT "Listing_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "public"."Ward"("id") ON DELETE SET NULL ON UPDATE CASCADE;
