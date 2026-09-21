// Trusted checker, executed inside bubblewrap. Only generated WASM is editable.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createDuskApp} from '/sdk.mjs';

const bytes=readFileSync('/work/driver.wasm');
const app=createDuskApp({pinnedNodeUrl:'http://localhost',autoConnect:false,wallet:{waitForProvider:false,rememberLastUsedProvider:false}});
try {
  const driver=await app.driver('data:application/wasm;base64,'+bytes.toString('base64'));
  const schema=driver.getSchema();
  assert.ok(Array.isArray(schema.functions) && schema.functions.length<=40,'Invalid method schema');
  const required={register:['u64','u64'],cancel:['u64','()'],resize:['(u64,u64)','()'],confirm:['u64','()'],confirm_pair:['(u64,u64)','()'],accounted_seats:['()','u64'],get_registration:['u64','Option<u64>']};
  for(const [name,[input,output]] of Object.entries(required)) {
    const fn=schema.functions.find(fn=>fn.name===name);
    assert.equal(fn?.input.replace(/\s/g,''),input,`${name}: input ABI`);
    assert.equal(fn?.output.replace(/\s/g,''),output,`${name}: output ABI`);
  }
  assert.deepEqual(Array.from(driver.encodeInputFn('register','2')),[2,0,0,0,0,0,0,0]);
  assert.deepEqual(Array.from(driver.encodeInputFn('resize','[2,4]')),[2,0,0,0,0,0,0,0,4,0,0,0,0,0,0,0]);
  assert.equal(driver.decodeOutputFn('get_count',new Uint8Array(8).fill(255)),'18446744073709551615');
  const functions=schema.functions.map(({name,input,output})=>{
    assert.ok([name,input,output].every(v=>typeof v==='string' && v.length<=160),'Oversized method schema');
    return {name,input,output};
  });
  console.log(JSON.stringify({functions,encodedRegister:'0200000000000000',encodedResize:'02000000000000000400000000000000',decodedMax:'18446744073709551615'}));
} finally {app.wallet.destroy();}
