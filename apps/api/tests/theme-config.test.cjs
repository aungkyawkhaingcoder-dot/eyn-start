const {test}=require('node:test');
const assert=require('node:assert/strict');
const {normalizeStorefrontConfig}=require('../../../packages/theme/src/config.ts');
test('theme normalization preserves legacy colors, styles and section flags without mutation',()=>{
 const legacy={primary:'#c8a46b',background:'#ffffff',backgroundEffect:'mesh',designStyle:'glassmorphism',fontFamily:'inter',radius:'small',heroTitle:'Original',showBest:false};
 const before={...legacy};const normalized=normalizeStorefrontConfig(legacy);
 assert.deepEqual(legacy,before);
 assert.deepEqual(normalized,{...legacy,version:1,template:'default'});
 assert.deepEqual(normalizeStorefrontConfig(null),{version:1,template:'default'});
});
