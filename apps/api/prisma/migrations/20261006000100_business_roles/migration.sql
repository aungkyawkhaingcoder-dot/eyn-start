-- Role is an account's primary business role, not a restriction on buying.
-- Preserve admins; infer merchant capability from existing store ownership.
BEGIN;
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TYPE "Role" RENAME TO "LegacyRole";
CREATE TYPE "Role" AS ENUM ('CUSTOMER', 'MERCHANT', 'ADMIN');
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role" USING (
  CASE WHEN "role"::text = 'ADMIN' THEN 'ADMIN' ELSE 'CUSTOMER' END
)::"Role";
UPDATE "User" SET "role" = 'MERCHANT'
WHERE "role" <> 'ADMIN' AND EXISTS (
  SELECT 1 FROM "Store" WHERE "Store"."ownerId" = "User"."id"
);
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'CUSTOMER';
DROP TYPE "LegacyRole";
COMMIT;
