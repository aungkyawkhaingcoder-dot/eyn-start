CREATE TABLE "StoreDomain" (
 "id" SERIAL PRIMARY KEY,
 "storeId" INTEGER NOT NULL REFERENCES "Store"("id") ON DELETE CASCADE,
 "hostname" VARCHAR(253) NOT NULL UNIQUE,
 "verificationToken" VARCHAR(80) NOT NULL,
 "verifiedAt" TIMESTAMP(3),
 "expiresAt" TIMESTAMP(3) NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "StoreDomain_storeId_idx" ON "StoreDomain"("storeId");
