const {test}=require('node:test');
const assert=require('node:assert/strict');
const {storeInput}=require('../src/services/store/validation.ts');
const base={name:'Demo',slug:'demo',currency:'MMK',description:'',published:false};
test('storefront config accepts only bounded copy, hex colors and section flags',()=>{
 assert.deepEqual(storeInput({...base,storefrontConfig:{heroTitle:' Hello ',background:'#123abc',showHero:false}}).storefrontConfig,{heroTitle:'Hello',background:'#123abc',showHero:false});
 for(const config of [{background:'url(https://example.com)'},{heroTitle:'a'.repeat(161)},{showHero:'false'},{ownerId:2},[],null])assert.throws(()=>storeInput({...base,storefrontConfig:config}));
});
test('legacy store updates omit config; an explicit empty config resets defaults',()=>{
 assert.equal(Object.hasOwn(storeInput(base),'storefrontConfig'),false);
 assert.deepEqual(storeInput({...base,storefrontConfig:{}}).storefrontConfig,{});
});
test('theme generator parameters are bounded and survive save validation',()=>{
 const config={themeHue:'281.6396234331059',themeChroma:'0.11949973822037381',themeLightness:'0.7712331152153334',themeBase:'0.016'};
 assert.deepEqual(storeInput({...base,storefrontConfig:config}).storefrontConfig,config);
 for(const config of [{themeHue:'361'},{themeBase:'0.05'},{themeChroma:'NaN'},{themeLightness:'-1'},{themeHue:''},{themeBase:0.01}]) assert.throws(()=>storeInput({...base,storefrontConfig:config}));
});
