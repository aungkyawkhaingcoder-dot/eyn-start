const {test,beforeEach}=require('node:test');
const assert=require('node:assert/strict');
process.env.NODE_ENV='development';process.env.APP_ENV='local';
process.env.ACCESS_TOKEN_SECRET='test-access';process.env.REFRESH_TOKEN_SECRET='test-refresh';
process.env.GOOGLE_WEB_CLIENT_ID='web.apps.googleusercontent.com';process.env.GOOGLE_MOBILE_CLIENT_IDS='mobile.apps.googleusercontent.com';
process.env.CORS_ORIGINS='http://localhost:3000';
let users,accounts,challenges,chain,identity,verifyCalls;
const clone=x=>structuredClone(x);
function matches(row,where){return Object.entries(where).every(([k,v])=>{
 if(v&&typeof v==='object'){if('gt'in v)return row[k]>v.gt;if('lt'in v)return row[k]<v.lt;if('equals'in v)return row[k]?.toLowerCase()===v.equals.toLowerCase();}
 return row[k]===v;
});}
const prisma={
 oAuthChallenge:{
 async deleteMany({where}){challenges=challenges.filter(r=>!matches(r,where));},
 async create({data}){challenges.push({consumedAt:null,...clone(data)});},
 async updateMany({where,data}){const rows=challenges.filter(r=>matches(r,where));rows.forEach(r=>Object.assign(r,data));return {count:rows.length};}},
 oAuthAccount:{async findUnique({where}){const a=accounts.find(r=>matches(r,where.provider_subject));return a?{...a,user:clone(users.find(u=>u.id===a.userId))}:null;}},
 user:{
 async findFirst({where}){return clone(users.find(r=>matches(r,where))??null);},
 async create({data}){const {oauthAccounts,...rest}=data;const u={id:users.length+1,phone:null,status:'ACTIVE',...rest};users.push(u);accounts.push({...oauthAccounts.create,userId:u.id});return clone(u);},
 async updateMany({where,data}){const rows=users.filter(r=>matches(r,where));rows.forEach(r=>Object.assign(r,data));return {count:rows.length};}},
 $transaction(fn){const run=chain.then(async()=>{const before=clone({users,accounts,challenges});try{return await fn(prisma);}catch(e){({users,accounts,challenges}=before);throw e;}});chain=run.catch(()=>{});return run;}
};
function mock(path,exports){const id=require.resolve(path);require.cache[id]={id,filename:id,loaded:true,exports};}
mock('../src/lib/prisma.ts',{prisma});
const verify=require('../src/auth/google/verify.ts');
mock('../src/auth/google/verify.ts',{...verify,verifyGoogleIdentity:async()=>{verifyCalls++;return identity;}});
const services=require('../src/services/googleAuthServices.ts');
const handlers=require('../src/ControllerHandler/googleAuthHandlers.ts');
function req(body={},mobile=false){return {body,headers:mobile?{'x-platform':'mobile'}:{origin:'http://localhost:3000'},cookies:{},is:t=>t==='application/json'};}
function res(){return {cookies:{},cleared:[],headers:{},cookie(k,v,o){this.cookies[k]={value:v,options:o};return this;},clearCookie(k){this.cleared.push(k);},setHeader(k,v){this.headers[k]=v;},status(s){this.statusCode=s;return this;},json(b){this.body=b;}};}
async function challenge(mobile=false){const r=res();await handlers.googleChallengeHandler(req({},mobile),r);identity.nonce=r.body.nonce;return r;}
async function login(c,mobile=false){const q=req({idToken:'google-token',challengeId:c.body.challengeId},mobile);q.cookies.googleLoginChallenge=c.body.challengeId;const r=res();await handlers.googleLoginHandler(q,r);return r;}
beforeEach(()=>{users=[];accounts=[];challenges=[];chain=Promise.resolve();verifyCalls=0;identity={subject:'sub1',email:'person@gmail.com',name:'Person',nonce:'',authoritativeEmail:true};});
test('browser Google signup creates passwordless account, HttpOnly cookies and one-use challenge',async()=>{
 const c=await challenge();assert.notEqual(challenges[0].id,c.body.challengeId);assert.notEqual(challenges[0].nonceHash,c.body.nonce);
 const r=await login(c);assert.equal(users.length,1);assert.equal(users[0].password,null);assert.ok(users[0].emailVerifiedAt);
 assert.equal(r.body.accessToken,undefined);assert.ok(r.cookies.accessToken.options.httpOnly);assert.equal(r.cookies.refreshToken.value,users[0].randomToken);
 await assert.rejects(login(c),e=>e.status===401);
});
test('mobile Google login returns app tokens and repeat sign-in reuses provider subject',async()=>{
 const a=await login(await challenge(true),true);assert.ok(a.body.accessToken);assert.ok(a.body.refreshToken);assert.ok(a.body.expiresIn);assert.deepEqual(a.cookies,{});
 identity.email='changed@gmail.com';const b=await login(await challenge(true),true);assert.equal(users.length,1);assert.equal(b.body.id,a.body.id);assert.equal(users[0].email,'person@gmail.com');assert.notEqual(b.body.refreshToken,a.body.refreshToken);
});
test('browser cookie binding, origin and JSON are required before verifying Google token',async()=>{
 const c=await challenge();for(const mutate of [q=>q.cookies={},q=>q.headers.origin='https://evil.example',q=>delete q.headers.origin,q=>q.is=()=>false]){
 const q=req({idToken:'google-token',challengeId:c.body.challengeId});q.cookies.googleLoginChallenge=c.body.challengeId;mutate(q);await assert.rejects(handlers.googleLoginHandler(q,res()));}
 assert.equal(verifyCalls,0);assert.equal(users.length,0);
});
test('expired, wrong-nonce and wrong-platform challenges cannot create a session',async()=>{
 for(const scenario of ['expired','nonce','platform']){const c=await challenge(true);
 if(scenario==='expired')challenges.at(-1).expiresAt=new Date(0);
 const p={...identity};if(scenario==='nonce')p.nonce='f'.repeat(64);
 await assert.rejects(services.completeGoogleLogin(p,c.body.challengeId,scenario!=='platform'),e=>e.status===401);}
 assert.equal(users.length,0);
});
test('same email never automatically links; third-party Google emails require separate verification',async()=>{
 users.push({id:1,email:'PERSON@GMAIL.COM',password:'password-hash',randomToken:'existing',status:'ACTIVE'});
 await assert.rejects(login(await challenge()),e=>e.code==='Error_AccountLinkRequired');assert.equal(accounts.length,0);assert.equal(users[0].randomToken,'existing');
 identity.email='person@example.com';identity.authoritativeEmail=false;
 await assert.rejects(login(await challenge()),e=>e.code==='Error_GoogleEmailVerificationRequired');assert.equal(users.length,1);
});
test('frozen accounts cannot login and concurrent replay creates only one session',async()=>{
 const c=await challenge(true);const result=await Promise.allSettled([login(c,true),login(c,true)]);assert.equal(result.filter(r=>r.status==='fulfilled').length,1);assert.equal(users.length,1);
 users[0].status='FREEZE';const previous=users[0].randomToken;
 await assert.rejects(login(await challenge(true),true),e=>e.code==='ERROR_FREEZE');assert.equal(users[0].randomToken,previous);
});
