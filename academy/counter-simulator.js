// First-lesson teaching interpreter, not a Rust compiler or a DuskVM emulator.
// ponytail: bounded subset; extend syntax only alongside native conformance cases.
// Source is parsed as data. No eval, Function, imports or learner-defined calls.
const MAX = (1n << 64n) - 1n;
const precedence = new Map([['+',1],['-',1],['*',2],['/',2],['%',2]]);
const reserved = new Set('as async await break const continue crate dyn else enum extern false fn for if impl in let loop match mod move mut pub ref return self static struct super trait true type unsafe use where while abstract become box do final macro override priv try typeof unsized virtual yield gen u64'.split(' '));

function parse(source) {
  if (typeof source !== 'string' || !source.trim() || new TextEncoder().encode(source).length > 8000) {
    throw Error('Keep the simulator source between 1 and 8,000 UTF-8 bytes.');
  }
  const tokens = [];
  const token = /[ \t\r\n]+|\/\/[^\r\n]*|[0-9][0-9_]*(?:u64)?|[A-Za-z_][A-Za-z0-9_]*|"(?:[^"\\]|\\.)*"|::|->|\+=|-=|\*=|\/=|%=|[{}()[\]#&!.,:;=+*/%\-]/y;
  const fail = (message, offset) => {
    const lines = source.slice(0, offset).split('\n');
    throw Error(`Not supported by this lesson simulator at line ${lines.length}, column ${lines.at(-1).length + 1}. ${message}`);
  };
  for (let offset = 0; offset < source.length;) {
    if (source.startsWith('/*', offset)) {
      const start = offset; let depth = 1; offset += 2;
      while (offset < source.length && depth) {
        if (source.startsWith('/*', offset)) { depth++; offset += 2; }
        else if (source.startsWith('*/', offset)) { depth--; offset += 2; }
        else offset++;
      }
      if (depth) fail('Close the block comment.', start);
      continue;
    }
    token.lastIndex = offset;
    const match = token.exec(source);
    if (!match) fail('Use the documented first-lesson Rust subset.', offset);
    if (!/^[ \t\r\n]|^\/\//.test(match[0])) tokens.push({text:match[0], offset});
    offset = token.lastIndex;
  }
  tokens.push({text:'<end>', offset:source.length});
  let position = 0, method, locals;
  const peek = () => tokens[position].text;
  const error = message => fail(message, tokens[position].offset);
  const take = text => peek() === text && (++position, true);
  const expect = text => { if (!take(text)) error(`Expected ${text}; found ${peek()}. Keep the supplied contract scaffold.`); };
  const sequence = text => text.split(' ').forEach(expect);
  const typed = (node, type) => {
    if (node.type !== type) error(`Expected ${type}, not ${node.type}.`);
    return node;
  };
  function expression(minimum = 0, depth = 0) {
    if (depth > 64) error('Use fewer nested expressions (limit 64).');
    const text = peek(); let node;
    if (/^[0-9]/.test(text)) {
      position++;
      const value = BigInt(text.replace(/u64$/, '').replaceAll('_', ''));
      if (value > MAX) error('A u64 literal must be between 0 and 18446744073709551615.');
      node = {kind:'number', type:'u64', value};
    } else if (take('u64')) {
      sequence(':: MAX'); node = {kind:'number', type:'u64', value:MAX};
    } else if (take('self')) {
      if (method === 'new') error('new has no self receiver.');
      sequence('. count'); node = {kind:'field', type:'u64'};
    } else if (take('Self')) {
      sequence('{ count :');
      node = {kind:'state', type:'Self', value:typed(expression(0, depth + 1), 'u64')};
      take(','); expect('}');
    } else if (take('(')) {
      if (take(')')) node = {kind:'unit', type:'()'};
      else { node = expression(0, depth + 1); expect(')'); }
    } else if (locals.has(text)) {
      position++; node = {kind:'local', type:'u64', name:text};
    } else error(`Unsupported expression ${text}. Only u64 values, count and local u64 bindings are available.`);
    while ((precedence.get(peek()) ?? -1) >= minimum) {
      const op = tokens[position++].text;
      const right = typed(expression(precedence.get(op) + 1, depth + 1), 'u64');
      const height = 1 + Math.max(node.height || 0, right.height || 0);
      if (height > 64) error('Use a shorter arithmetic expression (limit 64 operations deep).');
      node = {kind:'binary', type:'u64', op, left:typed(node, 'u64'), right, height};
    }
    return node;
  }
  function body(type) {
    expect('{'); const statements = []; locals = new Map(); let returns = false;
    while (peek() !== '}') {
      if (take(';')) continue;
      if (take('let')) {
        const mutable = Boolean(take('mut')), name = peek();
        if (!/^[a-z][a-z0-9_]*$/.test(name) || reserved.has(name)) error('Use a lowercase local binding name.');
        position++;
        if (take(':')) expect('u64');
        expect('='); const value = typed(expression(), 'u64'); expect(';');
        locals.set(name, mutable); statements.push({kind:'let', name, value});
        continue;
      }
      if (take('return')) {
        const value = [';', '}'].includes(peek()) ? {kind:'unit', type:'()'} : expression();
        statements.push({kind:'return', value:typed(value, type)}); returns = true;
        if (!take(';') && peek() !== '}') error('End return with a semicolon.');
        continue;
      }
      const left = expression();
      if (['=', '+=', '-=', '*=', '/=', '%='].includes(peek())) {
        const op = tokens[position++].text;
        if (left.kind === 'field' ? method !== 'register' : left.kind !== 'local' || !locals.get(left.name)) {
          error('Assignment needs &mut self or a let mut binding.');
        }
        const value = typed(expression(), 'u64'); expect(';');
        statements.push({kind:'assign', left, op, value});
      } else if (take(';')) statements.push({kind:'discard', value:left});
      else {
        statements.push({kind:'return', value:typed(left, type)}); returns = true;
        if (peek() !== '}') error('Only the final expression may omit its semicolon.');
      }
    }
    expect('}');
    if (!returns && type !== '()') error(`The method must return ${type}.`);
    return statements;
  }
  sequence('# ! [ no_std ] # ! [ cfg ( target_family = "wasm" ) ]');
  sequence('# [ dusk_forge :: contract ] mod registry { pub struct Registry { count : u64');
  take(','); sequence('} impl Registry {');
  const methods = new Map();
  while (peek() !== '}') {
    expect('pub'); const constant = Boolean(take('const')); expect('fn'); method = peek();
    if (!['new','get_count','register'].includes(method) || methods.has(method)) error('Supply new, get_count and register exactly once.');
    position++; expect('(');
    if (constant !== (method === 'new')) error('Keep const on new only.');
    if (method !== 'new') { expect('&'); if (method === 'register') expect('mut'); expect('self'); }
    expect(')');
    const type = method === 'new' ? 'Self' : method === 'get_count' ? 'u64' : '()';
    if (type !== '()') { expect('->'); expect(type); }
    else if (take('->')) sequence('( )');
    methods.set(method, body(type));
  }
  sequence('} }');
  if (peek() !== '<end>' || methods.size !== 3) error('Use only the supplied Registry and its three methods.');
  return methods;
}

function arithmetic(op, left, right) {
  if ((op === '/' || op === '%') && right === 0n) throw Error('Simulator execution stopped: division by zero.');
  const value = op === '+' ? left + right : op === '-' ? left - right : op === '*' ? left * right : op === '/' ? left / right : left % right;
  if (value < 0n || value > MAX) throw Error('Simulator execution stopped: u64 overflow or underflow.');
  return value;
}

// Each instance has independent state; a failed call restores its previous count.
export function createCounter(source) {
  const methods = parse(source);
  let state;
  function execute(name) {
    const values = new Map();
    function value(node) {
      switch (node.kind) {
        case 'number': return node.value;
        case 'unit': return;
        case 'field': return state.count;
        case 'local': return values.get(node.name);
        case 'state': return {count:value(node.value)};
        case 'binary': return arithmetic(node.op, value(node.left), value(node.right));
      }
    }
    for (const statement of methods.get(name)) {
      if (statement.kind === 'return') return value(statement.value);
      if (statement.kind === 'let') values.set(statement.name, value(statement.value));
      else if (statement.kind === 'discard') value(statement.value);
      else {
        const next = statement.op === '=' ? value(statement.value) : arithmetic(statement.op[0], value(statement.left), value(statement.value));
        if (statement.left.kind === 'field') state.count = next;
        else values.set(statement.left.name, next);
      }
    }
  }
  state = execute('new');
  return {
    call(name) {
      if (!['get_count','register'].includes(name)) throw Error('The simulator exposes only get_count and parameterless register.');
      const before = state.count;
      try { return execute(name); }
      catch (error) { state.count = before; throw Error(error.message + ' The call was rolled back.'); }
    },
  };
}

// Same observations as the native opening scenario, computed from this source.
export function simulateCounter(source) {
  const counter = createCounter(source), fresh = createCounter(source);
  const read = instance => {
    const count = instance.call('get_count');
    if (instance.call('get_count') !== count) throw Error('Simulator: get_count changed between reads.');
    return count.toString();
  };
  const result = {ok:true, initial:read(counter), after:[], fresh:read(fresh)};
  for (let i = 0; i < 3; i++) { counter.call('register'); result.after.push(read(counter)); }
  return result;
}
