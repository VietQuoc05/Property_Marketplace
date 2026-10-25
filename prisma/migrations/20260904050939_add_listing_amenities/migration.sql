-- CreateEnum
CREATE TYPE "public"."ListingAmenity" AS ENUM ('SCHOOL', 'POOL', 'STORE', 'PARK', 'HOSPITAL', 'STATION', 'GYM', 'YARD', 'CAFE');

-- AlterTable
ALTER TABLE "public"."Listing" ADD COLUMN     "amenities" "public"."ListingAmenity"[];
