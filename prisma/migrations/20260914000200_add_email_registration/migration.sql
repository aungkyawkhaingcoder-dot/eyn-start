ALTER TABLE "User" ALTER COLUMN "phone" DROP NOT NULL;
ALTER TABLE "User" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD CONSTRAINT "User_contact_required" CHECK ("phone" IS NOT NULL OR "email" IS NOT NULL);
-- Fail rather than merge pre-existing accounts if case-insensitive duplicates exist.
CREATE UNIQUE INDEX "User_email_lower_key" ON "User" (LOWER("email"));
CREATE TABLE "EmailOtp" (
  "id" SERIAL NOT NULL,
  "email" VARCHAR(70) NOT NULL,
  "otp" TEXT NOT NULL DEFAULT '',
  "rememberToken" TEXT,
  "verifyToken" TEXT,
  "expiresAt" TIMESTAMP(3),
  "verifyExpiresAt" TIMESTAMP(3),
  "verifiedAt" TIMESTAMP(3),
  "lastSentAt" TIMESTAMP(3),
  "quotaDay" VARCHAR(10) NOT NULL DEFAULT '',
  "count" INTEGER NOT NULL DEFAULT 0,
  "error" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmailOtp_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EmailOtp_email_key" ON "EmailOtp"("email");
