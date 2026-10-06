const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync, readdirSync } = require("node:fs");
const { join } = require("node:path");
const { PGlite } = require("@electric-sql/pglite");
test("storefront migration preserves legacy products and imports store catalog without ID collisions", async () => {
  const db = new PGlite();
  try {
    const root = join(__dirname, "fixtures/legacy-storefront");
    await db.exec(readFileSync(join(root, "before-checkout.sql"), "utf8"));
    await db.exec(`INSERT INTO "User" ("email","randomToken","updatedAt") VALUES ('test@example.com','test',NOW());
   INSERT INTO "Store" ("ownerId","name","slug","updatedAt") VALUES (1,'Sample','sample',NOW());
   INSERT INTO "Category" ("name") VALUES ('Legacy'); INSERT INTO "Type" ("name") VALUES ('Legacy');
   INSERT INTO "Product" ("name","description","price","typeId","categoryId","updatedAt") VALUES ('Existing','Keep me',10.25,1,1,NOW());
   INSERT INTO "StoreProduct" ("storeId","name","price","inventory","published","updatedAt") VALUES (1,'Store item',20.35,5,true,NOW());`);
    await db.exec(
      readFileSync(
        join(root, "checkout.sql"),
        "utf8",
      ),
    );
    const rows = (
      await db.query(
        'SELECT "id","name","storeId","legacyStoreProductId","price"::text FROM "Product" ORDER BY "id"',
      )
    ).rows;
    assert.equal(rows.length, 2);
    assert.equal(rows[0].name, "Existing");
    assert.equal(rows[0].storeId, null);
    assert.equal(rows[1].legacyStoreProductId, 1);
    assert.equal(rows[1].storeId, 1);
    assert.equal(rows[1].price, "20.35");
    assert.equal(
      (await db.query('SELECT count(*)::int AS n FROM "StoreProduct"')).rows[0]
        .n,
      1,
    );
    await db.exec(
      `INSERT INTO "Order" ("storeId","totalPrice","code","requestKey","updatedAt") VALUES (1,20.35,'EYN-test','same-key',NOW());`,
    );
    await assert.rejects(
      db.exec(
        `INSERT INTO "Order" ("storeId","totalPrice","code","requestKey","updatedAt") VALUES (1,20.35,'EYN-test2','same-key',NOW());`,
      ),
      (e) => e.code === "23505",
    );
    await assert.rejects(
      db.exec(
        `INSERT INTO "Taggable" ("tagId","type","typeId","productId") VALUES (999,'product',999,999);`,
      ),
      (e) => e.code === "23503",
    );
  } finally {
    await db.close();
  }
});

test("current consolidated migrations initialize an empty storefront database", async () => {
 const db = new PGlite();
 try {
  const root=join(__dirname,"../prisma/migrations");
  for(const folder of readdirSync(root).filter(n=>n.startsWith("20")).sort()) {
   await db.exec(readFileSync(join(root,folder,"migration.sql"),"utf8"));
  }
  const columns=(await db.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'Store'`)).rows.map(row=>row.column_name);
  assert.ok(columns.includes("storefrontConfig"));
  assert.ok(columns.includes("published"));
  await db.query('SELECT "requestKey", "storeId", "totalPrice" FROM "Order" LIMIT 0');
  await db.query('SELECT "legacyStoreProductId", "inventory", "published" FROM "Product" LIMIT 0');
 } finally {await db.close();}
});
