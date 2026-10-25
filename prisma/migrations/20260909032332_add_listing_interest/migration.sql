-- CreateTable
CREATE TABLE "public"."ListingInterest" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingInterest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ListingInterest_listingId_idx" ON "public"."ListingInterest"("listingId");

-- CreateIndex
CREATE INDEX "ListingInterest_userId_idx" ON "public"."ListingInterest"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ListingInterest_listingId_userId_key" ON "public"."ListingInterest"("listingId", "userId");

-- AddForeignKey
ALTER TABLE "public"."ListingInterest" ADD CONSTRAINT "ListingInterest_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "public"."Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ListingInterest" ADD CONSTRAINT "ListingInterest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
