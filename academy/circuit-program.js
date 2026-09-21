// Evaluate the edited circuit builder. The resulting gates, not answer patterns,
// configure the bundled real PLONK engine. Rust itself is not compiled here.
import {createRuntime, scalar, Rejection} from './rust-runtime.js';
export function circuitProgram(source) {
  const programs=[];
  for(const sample of [[0,0,0],[4,5,9],[2,3,5],[4,5,8]]) {
    const instructions=[];let count=0;
    const hex=n=>{if(n?.kind!=='scalar')throw Error('The circuit expects scalar field values.');return n.value.toString(16).padStart(64,'0').match(/../g).reverse().join('');};
    const coefficient=n=>hex(typeof n==='bigint'?scalar(n):n);
    const index=v=>{if(v?.kind!=='host'||v.type!=='Witness'||!Number.isInteger(v.index)||v.index<0||v.index>=count)throw Error('The circuit expects an allocated witness handle.');return v.index;};
    const emit=(op,witness=true)=>{if(instructions.length>=32)throw Error('The browser circuit supports at most 32 gate instructions.');instructions.push(op);return witness?{kind:'host',type:'Witness',index:count++}:undefined;};
    const functions=new Map([['Constraint::new',args=>{if(args.length)throw Error('Constraint::new takes no arguments.');return {kind:'host',type:'Constraint',left:0n,right:0n};}]]);
    const runtime=createRuntime(source,{functions,method:(object,method,args)=>{
      if(object.type==='Composer') {
        if(['append_witness','append_public'].includes(method)&&args.length===1)return emit([method==='append_public'?'public':'witness',hex(args[0])]);
        if(method==='assert_equal'&&args.length===2)return emit(['equal',...args.map(index)],false);
        if(method==='gate_add'&&args.length===1&&args[0]?.type==='Constraint') {const c=args[0];return emit(['add',coefficient(c.left),coefficient(c.right),index(c.a),index(c.b)]);}
      } else if(object.type==='Constraint'&&['left','right','a','b'].includes(method)&&args.length===1)return {...object,[method]:args[0]};
      throw Error('Not supported by this circuit runtime: '+method+'. Use the documented composer subset.');
    }});
    const self={kind:'struct',type:'SumCircuit',fields:Object.fromEntries(['a','b','total'].map((key,i)=>[key,scalar(sample[i])]))};
    runtime.validate(self,'SumCircuit','SumCircuit');
    try {const result=runtime.invoke(self,'circuit',[{kind:'host',type:'Composer'}]);if(result?.kind!=='ok')throw Error('Return Ok(()) after building the constraints.');}
    catch(error){if(error instanceof Rejection)throw Error('Circuit construction stopped at a Rust-style guard. Use proof constraints, not a panic or early return.');throw error;}
    programs.push(instructions);
  }
  const shape=ops=>JSON.stringify(ops.map(op=>['witness','public'].includes(op[0])?[op[0]]:op));
  if(programs.some(p=>shape(p)!==shape(programs[0])))throw Error('The circuit structure depends on witness values. Keep gates and public-input positions fixed.');
  return programs;
}
