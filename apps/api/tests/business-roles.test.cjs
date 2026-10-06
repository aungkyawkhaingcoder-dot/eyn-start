const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync,readdirSync}=require('node:fs');
const {join}=require('node:path');
const {PGlite}=require('@electric-sql/pglite');
test('business role migration preserves admins and maps legacy users by store ownership',async()=>{
 const db=new PGlite();const root=join(__dirname,'../prisma/migrations');
 try{
  for(const name of readdirSync(root).filter(n=>n.startsWith('20') && n<'20261006000100').sort()) await db.exec(readFileSync(join(root,name,'migration.sql'),'utf8'));
  await db.exec(`INSERT INTO "User" ("role","randomToken","updatedAt") VALUES
   ('USER','one',NOW()),('USER','two',NOW()),('AUTHOR','three',NOW()),('AUTHOR','four',NOW()),('ADMIN','five',NOW()),('ADMIN','six',NOW());
   INSERT INTO "Store" ("ownerId","name","slug","updatedAt") VALUES (2,'Store 2','store-2',NOW()),(4,'Store 4','store-4',NOW()),(6,'Store 6','store-6',NOW());`);
  await db.exec(readFileSync(join(root,'20261006000100_business_roles/migration.sql'),'utf8'));
  const rows=(await db.query('SELECT "role"::text AS role,"randomToken" FROM "User" ORDER BY "id"')).rows;
  assert.deepEqual(rows.map(r=>r.role),['CUSTOMER','MERCHANT','CUSTOMER','MERCHANT','ADMIN','ADMIN']);
  assert.deepEqual(rows.map(r=>r.randomToken),['one','two','three','four','five','six']);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM "Store"')).rows[0].n,3);
  const created=(await db.query(`INSERT INTO "User" ("randomToken","updatedAt") VALUES ('new',NOW()) RETURNING "role"::text AS role`)).rows[0];
  assert.equal(created.role,'CUSTOMER');
 }finally{await db.close();}
});
