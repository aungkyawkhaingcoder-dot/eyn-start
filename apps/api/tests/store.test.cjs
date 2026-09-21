const {test}=require('node:test');const assert=require('node:assert/strict');
const {storeInput,productInput,positiveId}=require('../src/services/store/validation.ts');
const draft={name:'EYN Studio',slug:'eyn-studio',description:'Goods',currency:'MMK',published:false};
const item={name:'Lamp',description:'Warm light',price:'25000.50',inventory:5,imageUrl:'',published:true};
test('store validation normalizes names and prevents invalid slugs/currency/mass assignment',()=>{
 assert.deepEqual(storeInput({...draft,name:' EYN Studio ',ownerId:900}),draft);
 for(const value of [{...draft,slug:'bad/path'},{...draft,currency:'EUR'},{...draft,published:'true'},null])assert.throws(()=>storeInput(value));
 for(const value of ['0','-1','1 OR 1=1','9007199254740992'])assert.throws(()=>positiveId(value));
});
test('product validation keeps money decimal-safe and rejects negative stock/unsafe image schemes',()=>{
 assert.equal(productInput(item).price,'25000.50');
 for(const value of [{...item,price:'1.001'},{...item,price:'-1'},{...item,inventory:-1},{...item,inventory:1.2},{...item,imageUrl:'javascript:alert(1)'}])assert.throws(()=>productInput(value));
});
const store={id:10,ownerId:1,...draft};let wrote=false;
const prisma={
 store:{findFirst:async({where})=>where.id===store.id&&where.ownerId===store.ownerId?store:null,
 update:async({where,data})=>{assert.equal(where.ownerId,2);throw Object.assign(Error(),{code:'P2025'});}},
 storeProduct:{findMany:async()=>[],create:async()=>{wrote=true;},updateMany:async({where})=>{assert.equal(where.store.ownerId,2);return {count:0};},deleteMany:async({where})=>{assert.equal(where.store.ownerId,2);assert.equal(where.storeId,10);return {count:0};}},
 $transaction:async fn=>fn(prisma)
};
const id=require.resolve('../src/lib/prisma.ts');require.cache[id]={id,filename:id,loaded:true,exports:{prisma}};
const service=require('../src/services/store/storeServices.ts');
test('another user cannot read, edit, add products or delete products in a store',async()=>{
 for(const call of [()=>service.ownedStore(2,10),()=>service.listProducts(2,10),()=>service.saveStore(2,draft,10),()=>service.saveProduct(2,10,item),()=>service.deleteProduct(2,10,20)])await assert.rejects(call(),e=>e.status===404);
 assert.equal(wrote,false);
});
test('public storefront only selects published data and excludes owner credentials',async()=>{
 const original=prisma.store.findFirst;
 prisma.store.findFirst=async({where,select})=>{assert.deepEqual(where,{slug:'eyn-studio',published:true,owner:{status:'ACTIVE'}});assert.equal(select.ownerId,undefined);assert.equal(select.owner,undefined);assert.deepEqual(select.products.where,{published:true});return {name:'EYN'};};
 try{assert.equal((await service.publicStore('eyn-studio')).name,'EYN');}finally{prisma.store.findFirst=original;}
});
