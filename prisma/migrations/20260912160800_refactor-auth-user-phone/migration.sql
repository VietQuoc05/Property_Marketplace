-- Migration: refactor-auth-user-phone
-- Add AuthProvider enum
-- Make User.email, User.password nullable, User.phone unique
-- Add SocialAccount model

-- Create AuthProvider enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'AuthProvider'
  ) THEN
    CREATE TYPE "AuthProvider" AS ENUM ('GOOGLE', 'FACEBOOK');
  END IF;
END $$;

-- Make User.email nullable (may already be, check first)
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;

-- Make User.password nullable (may already be, check first)
ALTER TABLE "User" ALTER COLUMN "password" DROP NOT NULL;

-- Add unique constraint on User.phone
-- First, check if there are duplicate phone values
-- If so, we need to handle them

-- Create SocialAccount table
CREATE TABLE IF NOT EXISTS "SocialAccount" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "provider" "AuthProvider" NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SocialAccount_user_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Add unique constraints
-- @@unique([provider, providerAccountId])
CREATE UNIQUE INDEX IF NOT EXISTS "SocialAccount_provider_providerAccountId_key"
  ON "SocialAccount" ("provider", "providerAccountId");

-- @@unique([userId, provider])
CREATE UNIQUE INDEX IF NOT EXISTS "SocialAccount_userId_provider_key"
  ON "SocialAccount" ("userId", "provider");

-- @@index([userId])
CREATE INDEX IF NOT EXISTS "SocialAccount_userId_idx" ON "SocialAccount" ("userId");

-- Add unique constraint on User.phone if not already present
-- We need to handle duplicates first
-- The following removes null phone values from consideration and handles duplicates
UPDATE "User" SET "phone" = NULL WHERE "phone" = '';

-- Delete duplicate phone entries (keep the one with smallest id)
DELETE FROM "User"
WHERE "phone" IS NOT NULL AND "id" NOT IN (
  SELECT MIN("id") FROM "User"
  WHERE "phone" IS NOT NULL
  GROUP BY "phone"
  HAVING COUNT(*) > 1
);

-- Now add the unique constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'User_phone_key'
  ) THEN
    ALTER TABLE "User" ADD CONSTRAINT "User_phone_key" UNIQUE ("phone");
  END IF;
END $$;
