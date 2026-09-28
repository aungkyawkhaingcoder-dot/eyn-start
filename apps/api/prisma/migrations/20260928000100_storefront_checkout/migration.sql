-- Additive migration. Existing unassigned legacy records remain unassigned.
-- StoreProduct is retained as an archive; application writes move to Product.
BEGIN;
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED');
ALTER TABLE "Store" ADD COLUMN "logoUrl" VARCHAR(2000) NOT NULL DEFAULT '',
 ADD COLUMN "coverUrl" VARCHAR(2000) NOT NULL DEFAULT '',
 ADD COLUMN "theme" VARCHAR(30) NOT NULL DEFAULT 'eyn-light';
ALTER TABLE "Product" ALTER COLUMN "price" TYPE DECIMAL(12,2),
 ALTER COLUMN "typeId" DROP NOT NULL, ALTER COLUMN "categoryId" DROP NOT NULL,
 ADD COLUMN "storeId" INTEGER, ADD COLUMN "legacyStoreProductId" INTEGER,
 ADD COLUMN "imageUrl" VARCHAR(2000) NOT NULL DEFAULT '',
 ADD COLUMN "published" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Product" ADD CONSTRAINT "Product_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE UNIQUE INDEX "Product_legacyStoreProductId_key" ON "Product"("legacyStoreProductId");
CREATE INDEX "Product_storeId_published_createdAt_idx" ON "Product"("storeId", "published", "createdAt");
INSERT INTO "Product" ("name", "description", "price", "inventory", "storeId", "legacyStoreProductId", "imageUrl", "published", "createdAt", "updatedAt")
 SELECT "name", "description", "price", "inventory", "storeId", "id", "imageUrl", "published", "createdAt", "updatedAt" FROM "StoreProduct";
ALTER TABLE "Category" ADD COLUMN "storeId" INTEGER;
ALTER TABLE "Category" ADD CONSTRAINT "Category_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE UNIQUE INDEX "Category_storeId_name_key" ON "Category"("storeId", "name");
ALTER TABLE "Tag" ADD COLUMN "storeId" INTEGER;
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE UNIQUE INDEX "Tag_storeId_name_key" ON "Tag"("storeId", "name");
ALTER TABLE "Taggable" ADD COLUMN "productId" INTEGER;
ALTER TABLE "Taggable" ADD CONSTRAINT "Taggable_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "Taggable_tagId_productId_key" ON "Taggable"("tagId", "productId");
ALTER TABLE "Order" ALTER COLUMN "totalPrice" TYPE DECIMAL(16,2), ALTER COLUMN "userId" DROP NOT NULL,
 ADD COLUMN "storeId" INTEGER,
 ADD COLUMN "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
 ADD COLUMN "currency" VARCHAR(3) NOT NULL DEFAULT 'MMK',
 ADD COLUMN "customerName" VARCHAR(120) NOT NULL DEFAULT '',
 ADD COLUMN "phone" VARCHAR(30) NOT NULL DEFAULT '',
 ADD COLUMN "address" VARCHAR(1000) NOT NULL DEFAULT '',
 ADD COLUMN "notes" VARCHAR(1000) NOT NULL DEFAULT '',
 ADD COLUMN "requestKey" VARCHAR(80), ADD COLUMN "requestHash" VARCHAR(64);
ALTER TABLE "Order" ADD CONSTRAINT "Order_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE UNIQUE INDEX "Order_storeId_requestKey_key" ON "Order"("storeId", "requestKey");
CREATE INDEX "Order_storeId_status_createdAt_idx" ON "Order"("storeId", "status", "createdAt");
ALTER TABLE "ProductsOnOrder" ADD COLUMN "productName" VARCHAR(255) NOT NULL DEFAULT '', ADD COLUMN "unitPrice" DECIMAL(12,2) NOT NULL DEFAULT 0;
-- Legacy prices cannot be reconstructed historically; preserve current values as a backfill.
UPDATE "ProductsOnOrder" l SET "productName" = p."name", "unitPrice" = p."price" FROM "Product" p WHERE p."id" = l."productId";
COMMIT;
