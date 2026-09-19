const {test,beforeEach,afterEach}=require('node:test');
const assert=require('node:assert/strict');
const {setTimeout:delay}=require('node:timers/promises');
process.env.ACCESS_TOKEN_SECRET='test-access';process.env.REFRESH_TOKEN_SECRET='test-refresh';
let user,writes,available,commitDelay;const entries=new Map();
function mock(path,exports){const id=require.resolve(path);require.cache[id]={id,filename:id,loaded:true,exports};}
mock('ioredis',class {
 status='wait';on(){} disconnect(){this.status='end';}
 async connect(){if(!available)throw Error('offline');this.status='ready';}
 async ping(){if(!available)throw Error('offline');return 'PONG';}
 async get(key){return entries.get(key)??null;}
 async set(key,value,...args){if(args.includes('NX')&&entries.has(key))return null;entries.set(key,value);return 'OK';}
 async eval(script,num,key,owner){if(entries.get(key)===owner)entries.delete(key);return 1;}
});
mock('../src/auth/refresh/config.ts',{readRefreshConfig:()=>({strategy:'redis',redisUrl:'redis://test',prefix:'test',waitMs:25,lockMs:1000,graceMs:120000})});
mock('../src/services/authservices.ts',{
 getUserById:async()=>({...user}),
 replaceRefreshToken:async(id,old,replacement)=>{await delay(commitDelay);if(user.randomToken!==old)return false;user.randomToken=replacement;writes++;return true;},
});
const {issueTokens}=require('../src/auth/tokens.ts');
const {resolveBrowserSession,closeBrowserSessions}=require('../src/auth/refresh/browserSession.ts');
beforeEach(()=>{entries.clear();available=true;writes=0;commitDelay=0;user={id:1,phone:null,email:'test@example.com'};user.randomToken=issueTokens(user).refreshToken;});
afterEach(async()=>{await closeBrowserSessions();});
test('actual runtime timeout then completed DB commit recovers on retry',async()=>{
 const old=user.randomToken;commitDelay=60;
 await assert.rejects(resolveBrowserSession(old,true),e=>e.code==='Error_RefreshUnavailable');
 await delay(80);
 assert.notEqual(user.randomToken,old);
 const recovered=await resolveBrowserSession(old,true);
 assert.equal(recovered.tokens.refreshToken,user.randomToken);assert.equal(writes,1);
});
test('actual runtime recovers after Redis outage without restarting server',async()=>{
 const old=user.randomToken;available=false;
 await assert.rejects(resolveBrowserSession(old,true),e=>e.code==='Error_RefreshUnavailable');
 assert.equal(user.randomToken,old);assert.equal(writes,0);
 available=true;const recovered=await resolveBrowserSession(old,true);
 assert.equal(recovered.tokens.refreshToken,user.randomToken);assert.equal(writes,1);
});
