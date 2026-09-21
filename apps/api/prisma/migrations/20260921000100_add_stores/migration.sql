CREATE TABLE "Store" (
 "id" SERIAL PRIMARY KEY, "ownerId" INTEGER NOT NULL,
 "name" VARCHAR(80) NOT NULL, "slug" VARCHAR(60) NOT NULL,
 "description" VARCHAR(1000) NOT NULL DEFAULT '', "currency" VARCHAR(3) NOT NULL DEFAULT 'MMK',
 "published" BOOLEAN NOT NULL DEFAULT false,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "Store_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Store_slug_key" ON "Store"("slug");
CREATE INDEX "Store_ownerId_idx" ON "Store"("ownerId");
CREATE TABLE "StoreProduct" (
 "id" SERIAL PRIMARY KEY, "storeId" INTEGER NOT NULL,
 "name" VARCHAR(160) NOT NULL, "description" VARCHAR(3000) NOT NULL DEFAULT '',
 "price" DECIMAL(12,2) NOT NULL, "inventory" INTEGER NOT NULL DEFAULT 0,
 "imageUrl" VARCHAR(2000) NOT NULL DEFAULT '', "published" BOOLEAN NOT NULL DEFAULT false,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "StoreProduct_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "StoreProduct_price_check" CHECK ("price" >= 0),
 CONSTRAINT "StoreProduct_inventory_check" CHECK ("inventory" >= 0)
);
CREATE INDEX "StoreProduct_storeId_createdAt_idx" ON "StoreProduct"("storeId", "createdAt");
