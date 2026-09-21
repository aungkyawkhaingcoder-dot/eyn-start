const {test,beforeEach}=require('node:test');
const assert=require('node:assert/strict');
const {generateKeyPairSync}=require('node:crypto');
const jwt=require('jsonwebtoken');
const {OAuth2Client}=require('google-auth-library');
const keys=generateKeyPairSync('rsa',{modulusLength:2048});
const publicKey=keys.publicKey.export({type:'spki',format:'pem'});
// Only key retrieval is mocked; Google's real cryptographic verifier still runs.
OAuth2Client.prototype.getFederatedSignonCertsAsync=async()=>({certs:{test:publicKey},format:'PEM'});
const {verifyGoogleIdentity}=require('../src/auth/google/verify.ts');
const web='web.apps.googleusercontent.com',mobile='mobile.apps.googleusercontent.com';
function token(overrides={},privateKey=keys.privateKey){const now=Math.floor(Date.now()/1000);return jwt.sign({iss:'https://accounts.google.com',aud:web,sub:'google-123',email:'User@gmail.com',email_verified:true,nonce:'a'.repeat(64),iat:now,exp:now+3600,...overrides},privateKey,{algorithm:'RS256',keyid:'test'});}
beforeEach(()=>{process.env.GOOGLE_WEB_CLIENT_ID=web;process.env.GOOGLE_MOBILE_CLIENT_IDS=mobile;});
test('verifies Google signature and normalizes verified identity',async()=>{const p=await verifyGoogleIdentity(token(),false);assert.equal(p.subject,'google-123');assert.equal(p.email,'user@gmail.com');assert.equal(p.authoritativeEmail,true);});
test('rejects wrong signature, issuer, audience, expiry, nonce and unverified email',async()=>{
 const other=generateKeyPairSync('rsa',{modulusLength:2048});
 for(const value of [token({},other.privateKey),token({iss:'https://evil.example'}),token({aud:mobile}),token({iat:1,exp:2}),token({nonce:undefined}),token({email_verified:false}),token({azp:mobile})])await assert.rejects(verifyGoogleIdentity(value,false),e=>e.code==='Error_InvalidGoogleToken');
});
test('mobile audience is separate; external email is not considered authoritative',async()=>{
 assert.equal((await verifyGoogleIdentity(token({aud:mobile}),true)).subject,'google-123');
 await assert.rejects(verifyGoogleIdentity(token(),true));
 assert.equal((await verifyGoogleIdentity(token({email:'user@example.com'}),false)).authoritativeEmail,false);
 assert.equal((await verifyGoogleIdentity(token({email:'user@example.com',hd:'example.com'}),false)).authoritativeEmail,true);
});
test('missing client configuration fails closed',async()=>{delete process.env.GOOGLE_WEB_CLIENT_ID;await assert.rejects(verifyGoogleIdentity(token(),false),e=>e.status===503);});
