const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
process.env.NODE_ENV = 'development';
process.env.APP_ENV = 'local';
process.env.CORS_ORIGINS = 'http://localhost:3000';
process.env.GOOGLE_WEB_CLIENT_ID = 'web.apps.googleusercontent.com';
process.env.GOOGLE_WEB_CLIENT_SECRET = 'test-secret';
function mock(path, exports) { const id = require.resolve(path); require.cache[id] = { id, filename: id, loaded: true, exports }; }
let exchanges, completions, issued;
mock('../src/services/googleAuthServices.ts', {
 GOOGLE_CHALLENGE_SECONDS: 300,
 createGoogleChallenge: async () => ({ challengeId: 'a'.repeat(64), nonce: 'b'.repeat(64) }),
 completeGoogleLogin: async (identity, state, mobile) => { completions++; assert.equal(state, 'a'.repeat(64)); assert.equal(mobile, false); return {tokens:{}}; }
});
mock('../src/auth/transport.ts', { setAuthCookies: () => { issued++; } });
const verify = require('../src/auth/google/verify.ts');
mock('../src/auth/google/verify.ts', {...verify, verifyGoogleIdentity: async () => ({nonce:'b'.repeat(64)})});
const redirect = require('../src/auth/google/redirect.ts');
mock('../src/auth/google/redirect.ts', {...redirect, redirectClient: () => ({getToken:async args => { exchanges++; assert.equal(args.codeVerifier,'v'.repeat(43)); return {tokens:{id_token:'verified'}}; }})});
const handlers = require('../src/ControllerHandler/googleRedirectHandlers.ts');
function response() { return { cookies:{}, cleared:[], setHeader(){}, cookie(k,v,o){this.cookies[k]={v,o};}, clearCookie(k){this.cleared.push(k);}, json(v){this.body=v;}, redirect(status,url){this.status=status;this.url=url;} }; }
function request() { return {headers:{origin:'http://localhost:3000'},is:()=>true,query:{state:'a'.repeat(64),code:'code'},cookies:{googleRedirectState:'a'.repeat(64),googleRedirectVerifier:'v'.repeat(43)}}; }
beforeEach(()=>{exchanges=0;completions=0;issued=0;});
test('redirect URL includes account chooser, nonce, state and S256 PKCE without secret', async()=>{
 const res=response(); await handlers.googleRedirectStartHandler(request(),res);
 const url=new URL(res.body.authorizationUrl);
 assert.equal(url.origin,'https://accounts.google.com');
 assert.equal(url.searchParams.get('prompt'),'select_account');
 assert.equal(url.searchParams.get('nonce'),'b'.repeat(64));
 assert.equal(url.searchParams.get('state'),res.cookies.googleRedirectState.v);
 assert.equal(url.searchParams.get('code_challenge'),createHash('sha256').update(res.cookies.googleRedirectVerifier.v).digest('base64url'));
 assert.equal(res.cookies.googleRedirectVerifier.o.httpOnly,true);
 assert.equal(res.cookies.googleRedirectVerifier.o.sameSite,'lax');
 assert.ok(!url.href.includes('test-secret'));
});
test('start rejects other origins and non-JSON requests',async()=>{
 const req=request();req.headers.origin='https://evil.example';await assert.rejects(handlers.googleRedirectStartHandler(req,response()),e=>e.status===403);
 req.is=()=>false;await assert.rejects(handlers.googleRedirectStartHandler(req,response()),e=>e.status===415);
});
test('missing or mismatched browser binding never exchanges code',async()=>{
 for(const cookies of [{},{googleRedirectState:'c'.repeat(64),googleRedirectVerifier:'v'.repeat(43)}]){
 const res=response();await handlers.googleRedirectCallbackHandler({...request(),cookies},res);assert.match(res.url,/googleError=invalid$/);
 }assert.equal(exchanges,0);assert.equal(issued,0);
});
test('cancelled login clears transient cookies and does not issue a session',async()=>{
 const req=request();req.query.error='access_denied';const res=response();await handlers.googleRedirectCallbackHandler(req,res);
 assert.equal(exchanges,0);assert.equal(issued,0);assert.equal(res.cleared.length,2);assert.match(res.url,/googleError=cancelled$/);
});
test('successful callback exchanges code and completes verified session before redirect',async()=>{
 const res=response();await handlers.googleRedirectCallbackHandler(request(),res);
 assert.equal(exchanges,1);assert.equal(completions,1);assert.equal(issued,1);assert.equal(res.status,303);assert.equal(res.url,'http://localhost:3000/stores');
});
