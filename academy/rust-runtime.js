// A bounded teaching interpreter, not rustc, a borrow checker or DuskVM.
// ponytail: only the lesson's Rust/data types; extend with native differential cases.
// Learner text is data throughout. No eval, Function, imports or host-object access.
export const U64_MAX = (1n << 64n) - 1n;
export const FIELD = 0x73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001n;
export class Rejection extends Error {}
export class RuntimeLimit extends Error {}
const option = value => ({kind:'some',value});
const equal = (a,b) => typeof a === 'object' && a !== null && typeof b === 'object' && b !== null
  ? JSON.stringify(a,(_,v)=>typeof v==='bigint'?String(v):v) === JSON.stringify(b,(_,v)=>typeof v==='bigint'?String(v):v) : a === b;
export const scalar = n => ({kind:'scalar',value:((BigInt(n)%FIELD)+FIELD)%FIELD});
export const contractId = hex => ({kind:'id',hex});
function dataSize(value) {
  let bytes=0;const pending=[value];
  while(pending.length){const item=pending.pop();bytes+=typeof item==='string'?item.length*2:8;
    if(item&&typeof item==='object'){
      if(item.kind==='closure')throw new RuntimeLimit('Stored closures are outside the teaching subset.');
      for(const [key,v]of Object.entries(item)){bytes+=key.length*2;pending.push(v);}
    }
    if(bytes>32768)throw new RuntimeLimit('A lesson value exceeds the 32 KiB teaching limit.');
  }
  return bytes;
}
const checked = value => {dataSize(value);return value;};
const clone = value => structuredClone(checked(value));
const operators = new Map([['..',1],['..=',1],['||',2],['&&',3],['==',4],['!=',4],['<',5],['<=',5],['>',5],['>=',5],['+',6],['-',6],['*',7],['/',7],['%',7]]);
const keywords = new Set('as async await break const continue crate dyn else enum extern false fn for if impl in let loop match mod move mut pub ref return self static struct super trait true type unsafe use where while gen'.split(' '));

export function parseRust(source, options={}) {
  if(typeof source!=='string'||source.length>8000||!source.trim()||new TextEncoder().encode(source).length>8000) throw Error('Keep the source between 1 and 8,000 UTF-8 bytes.');
  const tokens=[], pattern=/\s+|\/\/[^\r\n]*|0x[\da-fA-F_]+(?:u64|u32|usize|u8)?|\d[\d_]*(?:u64|u32|usize|u8)?|[A-Za-z_][A-Za-z0-9_]*|"(?:[^"\\]|\\.)*"|::|->|=>|\.\.=|\.\.|&&|\|\||==|!=|<=|>=|\+=|-=|\*=|\/=|%=|[{}()[\]#&!.,:;=+*/%<>|?\-]/y;
  const fail=(message,offset=tokens[p]?.offset??source.length)=>{
    const lines=source.slice(0,offset).split('\n');
    throw Error(`Not supported by this lesson runtime at line ${lines.length}, column ${lines.at(-1).length+1}. ${message}`);
  };
  for(let at=0;at<source.length;) {
    if(source.startsWith('/*',at)) {
      const start=at; let depth=1; at+=2;
      while(at<source.length&&depth) { if(source.startsWith('/*',at)){depth++;at+=2;}else if(source.startsWith('*/',at)){depth--;at+=2;}else at++; }
      if(depth) fail('Close the block comment.',start); continue;
    }
    pattern.lastIndex=at; const m=pattern.exec(source);
    if(!m) fail('Use the documented Rust subset.',at);
    if(!/^\s|^\/\//.test(m[0])) tokens.push({text:m[0],offset:at});
    at=pattern.lastIndex;
  }
  tokens.push({text:'<end>',offset:source.length});
  let p=0, nesting=0, expressions=0, types=0;
  const structs=new Map(), methods=new Map(), constants=new Map();
  const peek=()=>tokens[p].text, take=t=>peek()===t&&(p++,true);
  const expect=t=>{if(!take(t))fail(`Expected ${t}, found ${peek()}.`);};
  const name=()=>{const n=peek();if(!/^[A-Za-z_][A-Za-z0-9_]*$/.test(n))fail('Expected an identifier.');p++;return n;};
  const type=()=>{
    if(++types>32)fail('Type nesting is limited to 32.');
    if(take('&')) { const mut=take('mut'),t='&'+(mut?'mut ':'')+type();types--;return t; }
    if(take('(')) { const args=[];if(!take(')')){do{args.push(type());}while(take(',')&&peek()!==')');expect(')');}types--;return '('+args.join(',')+')'; }
    let t=name();
    if(take('<')){const args=[];do{args.push(type());}while(take(','));expect('>');t+='<'+args.join(',')+'>';}
    if(!['u64','u32','usize','u8','bool','Self','ContractId','BlsScalar','Composer','Constraint','Error','_'].includes(t)&&!structs.has(t)&&!/^Vec<|^Option<|^Result</.test(t))fail(`Type ${t} is outside the lesson subset.`);
    types--;return t;
  };
  function args(close) { const list=[];if(!take(close)){do{list.push(expr());}while(take(',')&&peek()!==close);expect(close);}return list; }
  function block() {
    if(++nesting>64)fail('Use fewer nested blocks (limit 64).');
    expect('{');const body=[];
    while(!take('}')) {
      if(take(';'))continue;
      if(take('let')) {
        const mut=!!take('mut'), id=name(); if(keywords.has(id))fail('Use a non-keyword binding name.');
        const declared=take(':')?type():null;expect('=');const value=expr();expect(';');body.push({kind:'let',id,mut,declared,value});
      } else if(take('return')) {const value=[';','}'].includes(peek())?{kind:'unit'}:expr();if(!take(';')&&peek()!=='}')fail('End return with a semicolon.');body.push({kind:'return',value});}
      else if(['break','continue'].includes(peek())){const kind=tokens[p++].text;expect(';');body.push({kind});}
      else if(take('for')) {const id=name();expect('in');const iterable=expr();body.push({kind:'for',id,iterable,body:block()});}
      else if(take('while')){const condition=expr();body.push({kind:'while',condition,body:block()});}
      else if(take('loop'))body.push({kind:'loop',body:block()});
      else {
        const left=expr();
        if(['=','+=','-=','*=','/=','%='].includes(peek())) {const op=tokens[p++].text,value=expr();expect(';');body.push({kind:'assign',left,op,value});}
        else if(take(';')||left.kind==='if'&&peek()!=='}')body.push({kind:'discard',value:left});
        else {if(peek()!=='}')fail('Only a final expression may omit its semicolon.');body.push({kind:'tail',value:left});}
      }
    }
    nesting--;return body;
  }
  function expr(min=0,depth=0) {
    if(++expressions>64||depth>64)fail('Use fewer nested expressions (limit 64).');
    const text=peek();let n;
    if(take('if')) {const condition=expr(0,depth+1),yes=block();let no=[];if(take('else'))no=peek()==='if'?[{kind:'tail',value:expr(0,depth+1)}]:block();n={kind:'if',condition,yes,no};}
    else if(take('|')) {const params=[];if(!take('|')){do{params.push(name());}while(take(','));expect('|');}n={kind:'closure',params,value:peek()==='{'?{kind:'block',body:block()}:expr(0,depth+1)};}
    else if(['&','*','!','-'].includes(text)){p++;const mut=text==='&'&&!!take('mut');n={kind:'unary',op:text,mut,value:expr(8,depth+1)};}
    else if(take('(')){const list=args(')');n=list.length===1?list[0]:list.length?{kind:'tuple',list}:{kind:'unit'};}
    else if(take('[')){if(take(']'))n={kind:'array',list:[]};else{const first=expr();if(take(';')){const count=expr();expect(']');n={kind:'repeat',value:first,count};}else{const list=[first];while(take(',')&&peek()!==']')list.push(expr());expect(']');n={kind:'array',list};}}}
    else if(take('{')){p--;n={kind:'block',body:block()};}
    else if(/^\d/.test(text)){p++;const clean=text.replace(/(?:u64|u32|usize|u8)$/,'').replaceAll('_','');const value=BigInt(clean);if(value>U64_MAX)fail('Integer literals must fit u64.');n={kind:'literal',value};}
    else if(text.startsWith('"')){p++;try{n={kind:'literal',value:JSON.parse(text)};}catch{fail('Use ordinary quoted strings without Rust-specific escapes.');}}
    else if(take('true'))n={kind:'literal',value:true};
    else if(take('false'))n={kind:'literal',value:false};
    else {
      let id=name(),generic=[];
      while(take('::')){if(take('<')){do{generic.push(type());}while(take(','));expect('>');break;}id+='::'+name();}
      if(take('!')) {if(!['assert','assert_eq','panic','vec'].includes(id))fail(`Macro ${id}! is unavailable.`);const bracket=take('[');if(!bracket)expect('(');n={kind:'macro',id,args:args(bracket?']':')')};}
      else if((id==='Self'||structs.has(id))&&peek()==='{') {
        expect('{');const fields=[];if(!take('}')){do{const key=name();fields.push([key,take(':')?expr():{kind:'name',id:key}]);}while(take(',')&&peek()!=='}');expect('}');}n={kind:'struct',id,fields};
      } else n={kind:'name',id,generic};
    }
    let chain=0;
    while(true) {
      if(++chain>64)fail('Method and field chains are limited to 64.');
      if(take('('))n={kind:'call',fn:n,args:args(')')};
      else if(take('.')) {const id=name();n={kind:'member',object:n,id};}
      else if(take('[')){const index=expr();expect(']');n={kind:'index',object:n,index};}
      else if(take('?'))n={kind:'try',value:n};
      else if(peek()==='as'&&min<=8){p++;n={kind:'cast',value:n,type:type()};}
      else break;
    }
    while((operators.get(peek())??-1)>=min) {
      const op=tokens[p++].text,right=expr(operators.get(op)+1,depth+1),height=1+Math.max(n.height||0,right.height||0);
      if(height>64)fail('Arithmetic trees are limited to 64 levels.');n={kind:'binary',op,left:n,right,height};
    }
    expressions--;return n;
  }
  function declarations(end) {
    while(peek()!==end) {
      if(take('#')) {
        const inner=!!take('!');expect('[');const attr=[];while(!take(']')){if(peek()==='<end>')fail('Close the attribute.');attr.push(tokens[p++].text);}
        if(!(inner&&['no_std','cfg ( target_family = "wasm" )'].includes(attr.join(' ')))&&!['dusk_forge :: contract','derive ( Default )'].includes(attr.join(' ')))fail('Only the supplied lesson annotations are supported.');
        continue;
      }
      if(take('extern')){expect('crate');expect('alloc');expect(';');continue;}
      if(take('use')) {
        const parts=[];while(!take(';')){if(peek()==='<end>')fail('End the import.');parts.push(tokens[p++].text);}
        if(!['alloc::vec::Vec','dusk_core::abi','dusk_core::abi::{self,ContractId}','dusk_core::abi::{ContractId,self}','dusk_core::transfer::TRANSFER_CONTRACT','dusk_plonk::prelude::*'].includes(parts.join('')))fail('Only the supplied lesson imports are supported.');continue;
      }
      const pub=!!take('pub');
      if(take('mod')){expect(options.module??'registry');expect('{');declarations('}');expect('}');continue;}
      if(take('struct')) {
        const id=name();if(structs.has(id))fail('Duplicate struct.');const fields=new Map();structs.set(id,fields);expect('{');
        if(!take('}')){do{take('pub');const key=name();expect(':');if(fields.has(key))fail('Duplicate field.');fields.set(key,type());}while(take(',')&&peek()!=='}');expect('}');}continue;
      }
      if(take('const')){const id=name();expect(':');const declared=type();expect('=');const value=expr();expect(';');if(constants.has(id))fail('Duplicate constant.');constants.set(id,{declared,value});continue;}
      if(take('impl')) {
        let owner=name();if(take('for')){if(owner!=='Circuit')fail('Only the Circuit trait is supported.');owner=name();}if(!structs.has(owner))fail('Implement a declared lesson struct.');expect('{');
        while(!take('}')) {
          const exported=!!take('pub'),constant=!!take('const');expect('fn');const id=name(),params=[];let receiver=false,mutable=false;
          expect('(');if(!take(')')){do{
            if(take('&')) {mutable=!!take('mut');expect('self');if(receiver||params.length)fail('Keep the receiver first.');receiver=true;}
            else {const name_=name();expect(':');params.push({name:name_,type:type()});}
          }while(take(',')&&peek()!==')');expect(')');}
          const output=take('->')?type():'()',body=block(),key=owner+'::'+id;
          if(methods.has(key))fail('Duplicate method.');methods.set(key,{owner,id,exported,constant,receiver,mutable,params,output,body});
        }
        continue;
      }
      fail(`Unsupported declaration ${pub?'pub ':''}${peek()}.`);
    }
  }
  declarations('<end>');
  if(!structs.size||!methods.size)fail('Keep the supplied lesson structs and methods.');
  return {structs,methods,constants};
}

export function createRuntime(source, hosts={}) {
  const program=parseRust(source,{module:hosts.module}), globals=new Map(), contract=hosts.contract??'Registry';let budget=200000,depth=0;
  const unsupported=message=>{throw Error('Not supported by this lesson runtime. '+message);};
  const tick=()=>{if(--budget<0)throw new RuntimeLimit('Lesson runtime instruction limit reached. This is not a successful contract rejection.');};
  const bool=x=>{if(typeof x!=='boolean')unsupported('A condition must be Boolean.');return x;};
  const uint=x=>{if(typeof x!=='bigint'||x<0n||x>U64_MAX)unsupported('Expected a u64 value.');return x;};
  const bounded=n=>{uint(n);if(n>128n)throw new RuntimeLimit('Lesson collections are limited to 128 elements.');return Number(n);};
  const validate=(v,t,owner)=>{
    t=t==='Self'?owner:t;
    if(t==='()'){if(v!==undefined)unsupported('This method must return no value.');}
    else if(['u64','usize','u32','u8'].includes(t)){uint(v);if(t!=='u64'&&v>(1n<<BigInt(t==='u8'?8:32))-1n)unsupported('Value exceeds '+t+'.');}
    else if(t==='bool')bool(v);
    else if(t==='ContractId'){if(v?.kind!=='id')unsupported('Expected a ContractId.');}
    else if(t==='BlsScalar'){if(v?.kind!=='scalar')unsupported('Expected a scalar field value.');}
    else if(t.startsWith('&'))validate(v,t.replace(/^&(?:mut )?/,''),owner);
    else if(t.startsWith('Option<')){if(v!==null){if(v?.kind!=='some')unsupported('Expected Some or None.');validate(v.value,t.slice(7,-1),owner);}}
    else if(t.startsWith('Vec<')){if(v?.kind!=='vec')unsupported('Expected a vector.');v.element=t.slice(4,-1);for(const e of v.items)validate(e,v.element,owner);}
    else if(t.startsWith('Result<')){if(!['ok','err'].includes(v?.kind))unsupported('Expected Ok or Err.');if(v.kind==='ok'){const inner=t.slice(7,-1);let end=0,nesting=0;for(;end<inner.length;end++){if('(<'.includes(inner[end]))nesting++;if(')>'.includes(inner[end]))nesting--;if(inner[end]===','&&!nesting)break;}validate(v.value,inner.slice(0,end),owner);}}
    else if(program.structs.has(t)){if(v?.kind!=='struct'||v.type!==t)unsupported('Expected '+t+'.');if(Object.keys(v.fields).length!==program.structs.get(t).size||Object.keys(v.fields).some(k=>!program.structs.get(t).has(k)))unsupported('Supply exactly the declared fields.');for(const [k,ft]of program.structs.get(t))validate(v.fields[k],ft,t);}
    else if(!['Composer','Constraint','Error','_'].includes(t))unsupported('Unsupported type '+t+'.');
    return v;
  };
  function lookup(env,id) {for(let e=env;e;e=e.parent)if(e.vars.has(id))return e.vars.get(id);unsupported('Unknown binding '+id+'.');}
  const scope=parent=>({parent,vars:new Map()});
  function arithmetic(op,a,b) {
    const field=a?.kind==='scalar'||b?.kind==='scalar';
    if(field){if(a?.kind!=='scalar'||b?.kind!=='scalar')unsupported('Do not mix scalar and integer arithmetic.');a=a.value;b=b.value;}
    else{uint(a);uint(b);}
    if(['/','%'].includes(op)&&b===0n)throw new Rejection('division by zero');
    let n=op==='+'?a+b:op==='-'?a-b:op==='*'?a*b:op==='/'?a/b:a%b;
    if(field){if(!['+','-','*'].includes(op))unsupported('Scalar division is outside the subset.');return scalar(n);}
    if(n<0n||n>U64_MAX)throw new Rejection('u64 overflow or underflow');return n;
  }
  function reference(n,env) {
    if(n.kind==='name'){const cell=lookup(env,n.id);return {get:()=>cell.value,set:v=>{if(!cell.mutable)unsupported('Assignment requires a mutable binding or &mut self.');cell.value=v;},mutable:cell.mutable};}
    if(n.kind==='member'||n.kind==='index') {
      const parent=reference(n.object,env),obj=parent.get();let key;
      if(n.kind==='member'){if(obj?.kind!=='struct'||!Object.hasOwn(obj.fields,n.id))unsupported('Unknown field '+n.id+'.');key=n.id;}
      else {if(obj?.kind!=='vec')unsupported('Index a vector.');key=Number(uint(value(n.index,env)));if(key>=obj.items.length)throw new Rejection('index out of bounds');}
      const data=n.kind==='member'?obj.fields:obj.items;
      return {get:()=>data[key],mutable:parent.mutable,set:v=>{if(!parent.mutable)unsupported('Mutation requires &mut self or a mutable binding.');if(n.kind==='member')validate(v,program.structs.get(obj.type).get(key),obj.type);else if(obj.element)validate(v,obj.element,env.owner);data[key]=v;}};
    }
    unsupported('Unsupported assignment target.');
  }
  function closure(fn,args) {
    if(fn?.kind!=='closure'||fn.params.length!==args.length)unsupported('Expected a matching closure.');
    const env=scope(fn.env);env.owner=fn.env.owner;fn.params.forEach((id,i)=>env.vars.set(id,{value:args[i],mutable:false}));return value(fn.value,env);
  }
  function method(obj,id,args,mutable,env) {
    if(obj?.kind!=='struct'&&obj?.kind!=='host') {
      const arity={len:0,is_empty:0,iter:0,iter_mut:0,get:1,push:1,remove:1,swap_remove:1,clear:0,position:1,find:1,map:1,sum:0,expect:1,unwrap:0,unwrap_or:1,is_some:0,is_none:0,is_ok:0,is_err:0,filter:1,checked_add:1,wrapping_add:1,wrapping_mul:1,pow:1};
      if(!Object.hasOwn(arity,id)||args.length!==arity[id])unsupported('Arguments do not match '+id+'.');
    }
    if(obj?.kind==='struct')return invoke(obj,id,args,mutable);
    if(obj?.kind==='host')return hosts.method(obj,id,args);
    if(obj?.kind==='vec') {
      if(id==='len')return BigInt(obj.items.length);
      if(id==='is_empty')return obj.items.length===0;
      if(['iter','iter_mut'].includes(id)){if(id==='iter_mut'&&!mutable)unsupported('iter_mut requires a mutable vector.');return {kind:'iterator',items:obj.items};}
      if(id==='get'){const i=uint(args[0]);return i<BigInt(obj.items.length)?option(obj.items[Number(i)]):null;}
      if(['push','remove','swap_remove','clear'].includes(id)) {
        if(!mutable)unsupported('A vector mutation requires &mut self.');
        if(id==='push'){if(obj.items.length>=128)throw new RuntimeLimit('Lesson vectors are limited to 128 records.');if(obj.element)validate(args[0],obj.element,env.owner);if(dataSize(obj)+dataSize(args[0])>32768)throw new RuntimeLimit('A lesson vector exceeds the 32 KiB teaching limit.');obj.items.push(clone(args[0]));return;}
        if(id==='clear'){obj.items.length=0;return;}
        const i=Number(uint(args[0]));if(i>=obj.items.length)throw new Rejection('index out of bounds');
        if(id==='remove')return obj.items.splice(i,1)[0];
        const removed=obj.items[i],last=obj.items.pop();if(i<obj.items.length)obj.items[i]=last;return removed;
      }
    }
    if(obj?.kind==='iterator') {
      if(id==='position'||id==='find'){for(let i=0;i<obj.items.length;i++){tick();if(bool(closure(args[0],[obj.items[i]])))return option(id==='position'?BigInt(i):obj.items[i]);}return null;}
      if(id==='map')return {kind:'iterator',items:obj.items.map(item=>{tick();return closure(args[0],[item]);})};
      if(id==='sum')return obj.items.reduce((n,item)=>arithmetic('+',n,item),0n);
    }
    if(obj===null||['some','ok','err'].includes(obj?.kind)) {
      const present=obj!==null&&obj.kind!=='err';
      if(['expect','unwrap'].includes(id)){if(!present)throw new Rejection(typeof args[0]==='string'?args[0]:'called unwrap on an absent or failed value');return obj.value;}
      if(id==='unwrap_or')return present?obj.value:args[0];
      if(id==='is_some'||id==='is_ok')return present;
      if(id==='is_none'||id==='is_err')return !present;
      if(id==='filter')return present&&bool(closure(args[0],[obj.value]))?obj:null;
      if(id==='map')return present?{kind:obj.kind,value:closure(args[0],[obj.value])}:obj;
    }
    if(typeof obj==='bigint') {
      if(id==='checked_add'){try{return option(arithmetic('+',obj,args[0]));}catch(e){if(e instanceof Rejection)return null;throw e;}}
      if(id==='wrapping_add')return (obj+uint(args[0]))&U64_MAX;
      if(id==='wrapping_mul')return (obj*uint(args[0]))&U64_MAX;
      if(id==='pow'){let n=1n;for(let i=uint(args[0]);i>0n;i--){tick();n=arithmetic('*',n,obj);if(n<=1n)break;}return n;}
    }
    unsupported('Method '+id+' is unavailable for this value.');
  }
  function value(n,env) {
    tick();
    switch(n.kind) {
      case 'unit':return;
      case 'literal':return n.value;
      case 'name':
        if(n.id==='None')return null;
        if(n.id==='u64::MAX')return U64_MAX;
        if(n.id==='TRANSFER_CONTRACT')return contractId('01'+'00'.repeat(31));
        if(globals.has(n.id))return clone(globals.get(n.id));
        return lookup(env,n.id).value;
      case 'struct':{
        const type=n.id==='Self'?env.owner:n.id,fields=Object.create(null);if(!program.structs.has(type))unsupported('Unknown struct '+type+'.');
        for(const [key,v]of n.fields){if(Object.hasOwn(fields,key))unsupported('Duplicate struct field.');fields[key]=value(v,env);}
        if(Object.keys(fields).length!==program.structs.get(type).size||Object.keys(fields).some(k=>!program.structs.get(type).has(k)))unsupported('Supply exactly the declared fields.');
        return validate(checked({kind:'struct',type,fields}),type,type);
      }
      case 'member':{const obj=value(n.object,env);if(obj?.kind!=='struct'||!Object.hasOwn(obj.fields,n.id))unsupported('Unknown field '+n.id+'.');return obj.fields[n.id];}
      case 'index':{const obj=value(n.object,env),i=Number(uint(value(n.index,env)));if(obj?.kind!=='vec')unsupported('Index a vector.');if(i>=obj.items.length)throw new Rejection('index out of bounds');return obj.items[i];}
      case 'tuple':return checked({kind:'tuple',items:n.list.map(x=>value(x,env))});
      case 'array':return checked({kind:'array',items:n.list.map(x=>value(x,env))});
      case 'repeat':{const count=bounded(value(n.count,env)),v=value(n.value,env);if(dataSize(v)*count>32768)throw new RuntimeLimit('A repeated value exceeds the 32 KiB teaching limit.');return checked({kind:'array',items:Array.from({length:count},()=>clone(v))});}
      case 'closure':return {...n,env};
      case 'block':return statements(n.body,scope(env));
      case 'if':return statements(bool(value(n.condition,env))?n.yes:n.no,scope(env));
      case 'unary':{const v=value(n.value,env);if(['&','*'].includes(n.op))return v;if(n.op==='!')return !bool(v);if(v?.kind==='scalar')return scalar(-v.value);throw new Rejection('u64 negation underflow');}
      case 'cast':{const v=uint(value(n.value,env));if(!['u64','u32','usize','u8'].includes(n.type))unsupported('Only unsigned integer casts are supported.');return BigInt.asUintN(n.type==='u64'?64:n.type==='u8'?8:32,v);}
      case 'binary':{
        const a=value(n.left,env);
        if(n.op==='&&')return bool(a)&&bool(value(n.right,env));if(n.op==='||')return bool(a)||bool(value(n.right,env));
        const b=value(n.right,env);
        if(n.op==='==')return equal(a,b);if(n.op==='!=')return !equal(a,b);
        if(['<','<=','>','>='].includes(n.op)){uint(a);uint(b);return n.op==='<'?a<b:n.op==='<='?a<=b:n.op==='>'?a>b:a>=b;}
        if(n.op.startsWith('..')){uint(a);uint(b);const length=b-a+(n.op==='..='?1n:0n);return {kind:'iterator',items:Array.from({length:length<0n?0:bounded(length)},(_,i)=>a+BigInt(i))};}
        return arithmetic(n.op,a,b);
      }
      case 'try':{const v=value(n.value,env);if(v?.kind==='err')throw {control:'return',value:v};if(v?.kind!=='ok')unsupported('? requires a Result.');return v.value;}
      case 'macro':{
        if(n.id==='vec')return checked({kind:'vec',items:n.args.map(a=>value(a,env))});
        if(n.id==='assert'&&bool(value(n.args[0],env)))return;
        if(n.id==='assert_eq'&&equal(value(n.args[0],env),value(n.args[1],env)))return;
        const message=n.args[n.id==='assert'?1:n.id==='assert_eq'?2:0];throw new Rejection(message?String(value(message,env)):'assertion failed');
      }
      case 'call':{
        const args=n.args.map(a=>value(a,env));
        if(n.fn.kind==='name') {
          const id=n.fn.id;
          if(['Some','Ok','Err'].includes(id)){if(args.length!==1)unsupported(id+' takes one value.');return {kind:({Some:'some',Ok:'ok',Err:'err'})[id],value:args[0]};}
          if(id==='Vec::new'){if(args.length)unsupported('Vec::new takes no arguments.');return {kind:'vec',items:[]};}
          if(id==='ContractId::from_bytes'){const bytes=args[0];if(args.length!==1||bytes?.kind!=='array'||bytes.items.length!==32||bytes.items.some(v=>typeof v!=='bigint'||v<0n||v>255n))unsupported('ContractId needs 32 bytes.');return contractId(bytes.items.map(n=>n.toString(16).padStart(2,'0')).join(''));}
          if(id==='BlsScalar::from'){if(args.length!==1)unsupported('BlsScalar::from takes one value.');return scalar(uint(args[0]));}
          if(hosts.functions?.has(id))return hosts.functions.get(id)(args,n.fn.generic);
          unsupported('Function '+id+' is unavailable.');
        }
        if(n.fn.kind==='member') {
          const object=value(n.fn.object,env);let mutable=false;
          if(['name','member','index'].includes(n.fn.object.kind)){try{mutable=reference(n.fn.object,env).mutable;}catch(e){if(!e.message?.includes('Unknown binding'))throw e;}}
          return method(object,n.fn.id,args,mutable,env);
        }
        unsupported('Only named lesson functions and methods may be called.');
      }
    }
    unsupported('Unsupported expression.');
  }
  function statements(body,env) {
    for(const s of body) {
      tick();if(!env.owner)env.owner=env.parent?.owner;
      if(s.kind==='let'){const v=value(s.value,env);if(s.declared)validate(v,s.declared,env.owner);if(s.id!=='_')env.vars.set(s.id,{value:v,mutable:s.mut});}
      else if(s.kind==='assign'){const ref=reference(s.left,env),v=value(s.value,env);ref.set(s.op==='='?v:arithmetic(s.op[0],ref.get(),v));}
      else if(s.kind==='return')throw {control:'return',value:value(s.value,env)};
      else if(s.kind==='tail')return value(s.value,env);
      else if(s.kind==='discard')value(s.value,env);
      else if(['break','continue'].includes(s.kind))throw {control:s.kind};
      else if(['for','while','loop'].includes(s.kind)) {
        const sequence=s.kind==='for'?value(s.iterable,env):null;
        if(sequence&&!['vec','iterator','array'].includes(sequence.kind))unsupported('for needs a vector or bounded range.');
        let i=0;
        while(s.kind==='for'?i<sequence.items.length:s.kind==='loop'||bool(value(s.condition,env))) {
          tick();const child=scope(env);child.owner=env.owner;
          if(sequence)child.vars.set(s.id,{value:sequence.items[i++],mutable:false});
          try{statements(s.body,child);}catch(e){if(e.control==='break')break;if(e.control!=='continue')throw e;}
        }
      }
    }
  }
  function invoke(self,id,args=[],mutable=true,owner=self?.type) {
    tick();if(++depth>48){depth--;throw new RuntimeLimit('Lesson call-depth limit reached.');}
    try {
      const m=program.methods.get(owner+'::'+id);if(!m)unsupported('Missing method '+id+'.');
      if(m.params.length!==args.length||m.receiver!==!!self)unsupported('Arguments do not match '+id+'.');
      if(m.mutable&&!mutable)unsupported('A mutable method needs &mut self.');
      const env=scope(null);env.owner=owner;
      if(self)env.vars.set('self',{value:self,mutable:m.mutable});
      m.params.forEach((p,i)=>env.vars.set(p.name,{value:validate(args[i],p.type,owner),mutable:p.type.startsWith('&mut ')}));
      let result;try{result=statements(m.body,env);}catch(e){if(e.control!=='return')throw e;result=e.value;}
      return validate(result,m.output,owner);
    } finally {depth--;}
  }
  for(const [id,c]of program.constants)globals.set(id,validate(value(c.value,{vars:new Map(),owner:contract}),c.declared,contract));
  return {program,invoke,validate,globals,create:()=>invoke(null,'new',[],true,contract)};
}
