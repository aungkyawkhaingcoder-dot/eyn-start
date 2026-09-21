const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
function run(access, refresh) {
  return spawnSync(process.execPath, ['--require', 'tsx/cjs', '-e', `
    const assert = require('node:assert/strict');
    const jwt = require('jsonwebtoken');
    const {issueTokens, ACCESS_TOKEN_SECONDS:a, REFRESH_TOKEN_SECONDS:r} = require('./src/auth/tokens.ts');
    const {sendAuthResponse} = require('./src/auth/transport.ts');
    const pair = issueTokens({id:1,phone:null,email:'test@example.com'});
    const access = jwt.verify(pair.accessToken, process.env.ACCESS_TOKEN_SECRET);
    const refresh = jwt.verify(pair.refreshToken, process.env.REFRESH_TOKEN_SECRET);
    assert.equal(access.exp-access.iat,a); assert.equal(refresh.exp-refresh.iat,r);
    const cookies = {}; let body;
    const res = {cookie(k,v,o){cookies[k]=o;},setHeader(){},status(){return this;},json(v){body=v;}};
    sendAuthResponse({headers:{}},res,pair,{message:'ok'});
    assert.equal(cookies.accessToken.maxAge,a*1000); assert.equal(cookies.refreshToken.maxAge,r*1000);
    sendAuthResponse({headers:{'x-platform':'mobile'}},res,pair,{message:'ok'});
    assert.equal(body.expiresIn,a);
    console.log(JSON.stringify([a,r]));
  `], {cwd:require('node:path').resolve(__dirname,'..'), encoding:'utf8',env:{...process.env,
    DOTENV_CONFIG_PATH:'/dev/null', ACCESS_TOKEN_SECRET:'test-access',REFRESH_TOKEN_SECRET:'test-refresh',
    ...(access === undefined ? {} : {ACCESS_TOKEN_TTL_SECONDS:access}),
    ...(refresh === undefined ? {} : {REFRESH_TOKEN_TTL_SECONDS:refresh})}});
}
test('custom token lifetimes match JWTs, browser cookies and mobile response',()=>{
  const result=run('60','3600'); assert.equal(result.status,0,result.stderr);
  assert.deepEqual(JSON.parse(result.stdout),[60,3600]);
});
test('invalid token lifetime config fails before issuing tokens',()=>{
  for(const value of ['','0','-1','1.5','15m','NaN','2147483648']) {
    for(const args of [[value,'3600'],['60',value]]) {
      const result=run(...args); assert.notEqual(result.status,0); assert.match(result.stderr,/must be an integer/);
    }
  }
});
