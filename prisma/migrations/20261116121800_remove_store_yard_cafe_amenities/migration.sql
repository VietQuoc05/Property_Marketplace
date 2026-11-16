-- Remove deprecated amenities (STORE, YARD, CAFE) from existing listings
UPDATE "public"."Listing"
SET "amenities" = array_remove(
  array_remove(
    array_remove("amenities", 'STORE'::"public"."ListingAmenity"),
    'YARD'::"public"."ListingAmenity"
  ),
  'CAFE'::"public"."ListingAmenity"
)
WHERE "amenities" && ARRAY[
  'STORE'::"public"."ListingAmenity",
  'YARD'::"public"."ListingAmenity",
  'CAFE'::"public"."ListingAmenity"
];

-- AlterEnum
BEGIN;
CREATE TYPE "public"."ListingAmenity_new" AS ENUM ('SCHOOL', 'POOL', 'PARK', 'HOSPITAL', 'STATION', 'GYM');
ALTER TABLE "public"."Listing" ALTER COLUMN "amenities" TYPE "public"."ListingAmenity_new"[] USING ("amenities"::text[]::"public"."ListingAmenity_new"[]);
ALTER TYPE "public"."ListingAmenity" RENAME TO "ListingAmenity_old";
ALTER TYPE "public"."ListingAmenity_new" RENAME TO "ListingAmenity";
DROP TYPE "public"."ListingAmenity_old";
COMMIT;
