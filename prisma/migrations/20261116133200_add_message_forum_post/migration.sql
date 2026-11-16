-- AlterTable
ALTER TABLE "public"."Message" ADD COLUMN "forumPostId" TEXT;

-- CreateIndex
CREATE INDEX "Message_forumPostId_idx" ON "public"."Message"("forumPostId");

-- AddForeignKey
ALTER TABLE "public"."Message" ADD CONSTRAINT "Message_forumPostId_fkey" FOREIGN KEY ("forumPostId") REFERENCES "public"."ForumPost"("id") ON DELETE SET NULL ON UPDATE CASCADE;
