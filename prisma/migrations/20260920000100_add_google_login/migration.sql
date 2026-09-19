ALTER TABLE "User" ALTER COLUMN "password" DROP NOT NULL;
CREATE TABLE "OAuthAccount" (
  "id" SERIAL NOT NULL,
  "provider" VARCHAR(20) NOT NULL,
  "subject" VARCHAR(255) NOT NULL,
  "userId" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OAuthAccount_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OAuthAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "OAuthAccount_provider_subject_key" ON "OAuthAccount"("provider", "subject");
CREATE UNIQUE INDEX "OAuthAccount_userId_provider_key" ON "OAuthAccount"("userId", "provider");
CREATE TABLE "OAuthChallenge" (
  "id" VARCHAR(64) NOT NULL,
  "nonceHash" VARCHAR(64) NOT NULL,
  "platform" VARCHAR(10) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OAuthChallenge_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "OAuthChallenge_expiresAt_idx" ON "OAuthChallenge"("expiresAt");
