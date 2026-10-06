const {test}=require('node:test');
const assert=require('node:assert/strict');
let calls=0;let failure;
const id=require.resolve('../src/middleware/auth.ts');
require.cache[id]={id,filename:id,loaded:true,exports:{authMiddleware:(req,res,next)=>{calls++;return next(failure);}}};
const {checkoutSession}=require('../src/middleware/checkoutSession.ts');
test('guest skips authentication, while any presented session uses the existing verifier',()=>{
 calls=0;failure=undefined;
 checkoutSession({cookies:{},headers:{}},{},error=>assert.equal(error,undefined));
 assert.equal(calls,0);
 for(const req of [
  {cookies:{refreshToken:'session'},headers:{}},
  {cookies:{accessToken:'expired'},headers:{}},
  {cookies:{},headers:{authorization:'Bearer token','x-platform':'mobile'}},
  {cookies:{},headers:{'x-refresh-token':'token','x-platform':'mobile'}}
 ]) checkoutSession(req,{},()=>{});
 assert.equal(calls,4);
 failure=Object.assign(Error('Invalid session'),{status:401});
 checkoutSession({cookies:{refreshToken:'invalid'},headers:{}},{},error=>assert.equal(error,failure));
});
