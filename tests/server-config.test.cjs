const { test } = require('node:test');
const assert = require('node:assert/strict');
const {readServerConfig}=require('../src/config/server.ts');
function environment(values, action) {
  const keys=['APP_ENV','NODE_ENV','CORS_ORIGINS','COOKIE_SAME_SITE','TRUST_PROXY_HOPS'];
  const saved=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
  try { for(const k of keys) {delete process.env[k];if(values[k]!==undefined)process.env[k]=values[k];} action(); }
  finally {for(const k of keys){if(saved[k]===undefined)delete process.env[k];else process.env[k]=saved[k];}}
}
test('online development and production use HTTPS cookies and their own origins',()=>{
  for(const env of ['development','production']) environment({APP_ENV:env,NODE_ENV:'production',CORS_ORIGINS:`https://${env}.example.com`,COOKIE_SAME_SITE:'lax',TRUST_PROXY_HOPS:'1'},()=>{
    const c=readServerConfig();assert.equal(c.secure,true);assert.equal(c.sameSite,'lax');
    assert.deepEqual(c.origins,[`https://${env}.example.com`]);assert.equal(c.trustProxy,1);
  });
});
test('hosted startup rejects missing/wildcard/HTTP origins and insecure runtime',()=>{
 for(const changes of [{CORS_ORIGINS:''},{CORS_ORIGINS:'*'},{CORS_ORIGINS:'http://dev.example.com'},
  {CORS_ORIGINS:'https://dev.example.com/path'},{NODE_ENV:'development'},{TRUST_PROXY_HOPS:'true'},{COOKIE_SAME_SITE:'invalid'}]) {
  environment({APP_ENV:'development',NODE_ENV:'production',CORS_ORIGINS:'https://dev.example.com',...changes},()=>assert.throws(readServerConfig));
 }
});
test('existing local configuration works and SameSite none cannot use insecure cookies',()=>{
 environment({NODE_ENV:'development'},()=>{const c=readServerConfig();assert.equal(c.environment,'local');assert.equal(c.secure,false);assert.equal(c.sameSite,'lax');assert.equal(c.trustProxy,false);});
 environment({NODE_ENV:'development',COOKIE_SAME_SITE:'none'},()=>assert.throws(readServerConfig));
});
