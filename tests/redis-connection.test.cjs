const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createRedisConnection}=require('../src/auth/refresh/connection.ts');
test('idle stale socket reconnects and concurrent callers share recovery',async()=>{
 let connections=0,pings=0,disconnects=0;
 const redis={status:'ready',async connect(){connections++;this.status='ready';},async ping(){if(++pings===1)throw Error('stale socket');return 'PONG';},disconnect(){disconnects++;this.status='end';}};
 const c=createRedisConnection(redis);await Promise.all(Array.from({length:10},()=>c.ready()));
 assert.equal(connections,1);assert.equal(disconnects,1);assert.equal(pings,2);
});
test('Redis outage fails boundedly, then recovers on next request without restart',async()=>{
 let available=false,attempts=0;
 const redis={status:'end',async connect(){attempts++;if(!available)throw Error('offline');this.status='ready';},async ping(){return 'PONG';},disconnect(){this.status='end';}};
 const c=createRedisConnection(redis);await assert.rejects(c.ready());assert.equal(attempts,2);
 available=true;await c.ready();assert.equal(redis.status,'ready');assert.equal(attempts,3);
});
