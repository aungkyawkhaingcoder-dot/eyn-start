const { test } = require("node:test");
const assert = require("node:assert/strict");
const { getAdminSession } = require("../src/ControllerHandler/admin/sessionHandler");
function invoke(user) {
 const result = {};
 const res = { status(code) { result.status=code; return this; }, json(body) {result.body=body; return this;}, setHeader(key,value){ result[key]=value; } };
 getAdminSession({user},res);return result;
}
test("admin session excludes credentials and cannot be cached",()=>{
 const result=invoke({id:1,role:"ADMIN",status:"ACTIVE",password:"secret",randomToken:"secret"});
 assert.equal(result.status,200);assert.equal(result["Cache-Control"],"no-store");
 assert.deepEqual(result.body,{admin:{id:1,role:"ADMIN",status:"ACTIVE"}});
});
test("admin session denies missing users, merchant roles and inactive administrators",()=>{
 for(const user of [undefined,{id:1,role:"USER",status:"ACTIVE"},...['INACTIVE','SUSPENDED','FREEZE','BAN'].map(status=>({id:1,role:"ADMIN",status}))]) {
  const result=invoke(user);assert.equal(result.status,403);assert.equal(result.body.admin,undefined);
 }
});
