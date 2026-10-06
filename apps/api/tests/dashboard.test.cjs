const {test}=require('node:test');
const assert=require('node:assert/strict');
let reads=0;
let empty=false;
const prisma={$transaction:async(fn,options)=>{
 assert.equal(options.isolationLevel,'RepeatableRead');
 return fn({store:{findFirst:async({where})=>where.id===10&&where.ownerId===7?{id:10}:null},order:{
 groupBy:async query=>{reads++;assert.equal(query.where.storeId,10);assert.deepEqual(query.where.store,{ownerId:7});
  if(empty)return [];
  if(query.by[0]==='status')return [{status:'PENDING',_count:{_all:2}},{status:'COMPLETED',_count:{_all:3}},{status:'CANCELLED',_count:{_all:1}}];
  assert.equal(query.where.status,'COMPLETED');return [{currency:'USD',_sum:{totalPrice:{toString:()=> '19.99'}}},{currency:'MMK',_sum:{totalPrice:{toString:()=> '25000'}}}];
 },
 findMany:async query=>{reads++;assert.equal(query.where.storeId,10);assert.deepEqual(query.where.store,{ownerId:7});assert.equal(query.take,5);assert.equal(query.select.phone,undefined);return [];}
 }});
}};
const id=require.resolve('../src/lib/prisma.ts');require.cache[id]={id,filename:id,loaded:true,exports:{prisma}};
const {storeDashboard}=require('../src/services/store/dashboardServices.ts');
test('dashboard isolates owners and rejects before aggregate reads',async()=>{
 reads=0;await assert.rejects(storeDashboard(8,10),e=>e.status===404);assert.equal(reads,0);
});
test('dashboard counts statuses and preserves separate decimal currency totals',async()=>{
 empty=false;const data=await storeDashboard(7,10);
 assert.equal(data.totalOrders,6);assert.equal(data.pendingOrders,2);assert.equal(data.completedOrders,3);
 assert.deepEqual(data.completedValue,[{currency:'USD',amount:'19.99'},{currency:'MMK',amount:'25000'}]);
});
test('new store dashboard returns honest empty metrics',async()=>{
 empty=true;assert.deepEqual(await storeDashboard(7,10),{totalOrders:0,pendingOrders:0,completedOrders:0,completedValue:[],recentOrders:[]});empty=false;
});
