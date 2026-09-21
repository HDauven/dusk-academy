// Keep the save key; version 3 stores chapter IDs and migrates numeric v1/v2 saves.
export const storageKey = 'dusk-academy-forge-lesson-v1';
export const cleanName = name => Array.from(name.replace(/[\p{C}\u2028\u2029]/gu, '')).slice(0,20).join('');

export const starter = `#![no_std]
#![cfg(target_family = "wasm")]

#[dusk_forge::contract]
mod registry {
    pub struct Registry {
        count: u64,
    }

    impl Registry {
        pub const fn new() -> Self {
            Self { count: 7 }
        }

        pub fn get_count(&self) -> u64 {
            self.count
        }

        pub fn register(&mut self) {
            // Add one registration.
        }
    }
}`;

export const lessons = [
  {title:'Your first contract', skill:'Contract state', check:'change', summary:'Store a count between calls', parts:['Read the contract file','Change and read state','Understand the results']},
  {title:'Call arguments', skill:'Call arguments', check:'arguments', summary:'Pass an amount to register', parts:['Supply an input','Follow the call interface']},
  {title:'Contract rules', skill:'Input validation', check:'capacity', summary:'Reject invalid registrations', parts:['Accept or reject','Enforce the total','Read a failed call']},
  {title:'Registration records', skill:'Registration records', check:'recordCancel', summary:'Store, find and cancel individual registrations', parts:['Model a record','Store and find','Remove without corrupting']},
  {title:'Contract permissions', skill:'Contract permissions', check:'ownerResize', summary:'Bind records to their calling contract', parts:['Observe execution context','Bind and check ownership','Guard every mutation']},
  {title:'Events and contract calls', skill:'Contract interaction', check:'callConfirm', summary:'Emit receipts and call another native contract', parts:['Describe an event','Call a separate contract','Coordinate state changes']},
  {title:'Testing and building', skill:'Testing and building', check:'buildDriver', summary:'Check rollback and build a matching data-driver', parts:['Check state relationships','Test the failure boundary','Build the interface']},
];

export const chapters = [
  {
    id:'begin', lesson:0, part:0, kind:'intro', short:'Your first contract', title:'Build a registration counter',
    body:`<p>The workshop needs to count registrations. You’ll build a <strong>native Dusk contract</strong> that stores a count and adds one per successful call.</p><p>The Forge project is supplied. Read the file, make two small edits and check the returned counts. These lessons support a browser teaching simulator as well as local DuskVM. The Run button identifies the runtime. Rust syntax is introduced where the contract needs it.</p><p>Keep the same file as later lessons add arguments, rules and records. You do not need to complete another path, install learner-side packages or connect a wallet.</p>`,
    task:'Start the count at zero and add one registration per call.',
    note:'15 chapters with worked examples, optional practice and two coding checks. No wallet, tokens or live deployment required.'
  },
  {
    id:'contract-pieces', lesson:0, part:0, kind:'guide', short:'Rust, Forge, VM', title:'Know which tool does which job',
    body:`<p>You write the register in <strong>Rust</strong>. A compiler checks the program and produces <strong>WebAssembly</strong> (WASM), an executable format.</p><p><strong>Dusk Forge</strong> supplies contract tooling and the contract macro used in this file. <strong>DuskVM</strong> executes the resulting native Dusk contract.</p><p>In the native local version, Run compiles your edited file and executes fixed tests in DuskVM. The browser simulator instead interprets a supported Rust subset without compiling it. Neither sends a network transaction.</p>`,
    panelTitle:'The native build and run path', panel:`<ol class="example-flow"><li><strong>Source</strong><p>Your Rust file describes state and methods.</p></li><li><strong>Compile</strong><p>The server builds WASM against pinned Forge/Dusk dependencies.</p></li><li><strong>Execute</strong><p>A fresh local DuskVM deployment receives the lesson’s calls.</p></li><li><strong>Inspect</strong><p>The page displays actual returned values or compiler/VM errors.</p></li></ol>`,
    note:'The editor remains usable on reading pages. Its banner names the real coding checkpoint Run will check.'
  },
  {
    id:'contract-file', lesson:0, part:0, kind:'guide', short:'Read the file', title:'Find the state and its methods',
    body:`<p><code>mod registry { ... }</code> groups this contract’s Rust code. Braces show which definitions belong inside it.</p><p><code>#[dusk_forge::contract]</code> is an attribute macro. Forge uses the annotated module to generate the contract interface. Keep it above the module.</p><p><code>#![no_std]</code> selects a Rust environment without the normal standard library. The target guard limits this source to WASM. You do not need to rewrite these supplied annotations.</p>`,
    panelTitle:'Three places to recognize', panel:`<dl class="concept-list"><dt>pub struct Registry</dt><dd>The shape of the stored state. At first it has one field, count.</dd><dt>impl Registry</dt><dd>The block containing associated functions and methods for Registry.</dd><dt>new, get_count, register</dt><dd>Initialize a new instance, read its value, and change it.</dd></dl><p>Keep changes inside the intended method’s braces. A compiler error about an unexpected token often means a brace or semicolon is misplaced.</p>`
  },
  {
    id:'contract-state', lesson:0, part:0, kind:'practice', short:'Field or value?', title:'A type is not a starting value',
    body:`<p><code>count: u64</code> declares a field and its type. A u64 holds whole numbers from zero through 18446744073709551615.</p><p><code>Self { count: 7 }</code> constructs a Registry whose count starts at 7. The field declaration and the constructor value answer different questions.</p>`,
    question:'Which edit makes a new register begin empty?',
    choices:[['value','Change the constructor value from count: 7 to count: 0.'],['type','Rename u64 to empty.'],['getter','Make get_count return a fixed zero regardless of stored state.']], answer:'value',
    success:'Change the initial value. Keep the u64 field and a getter that reads it.',
    error:'The constructor chooses the starting value. Renaming a type or hiding state behind a fixed getter does not initialize an empty count.'
  },
  {
    id:'contract-getter', lesson:0, part:0, kind:'guide', short:'Read state', title:'Return what the contract actually stores',
    body:`<p>A <strong>getter</strong> is a method used to read a value. Our getter returns the stored count rather than calculating a separate website count.</p><p><code>&amp;self</code> borrows this Registry for reading. The arrow names the return type. The last expression has no semicolon because its value is the result.</p>`,
    panelTitle:'Read the getter from left to right', panel:`<pre class="example"><code>pub fn get_count(&amp;self) -&gt; u64 {
    self.count
}</code></pre><dl class="concept-list"><dt>pub fn get_count</dt><dd>A public function that Forge exposes through the contract interface.</dd><dt>self.count</dt><dd>The count field on this instance. If a later call changes it, the next read observes that value.</dd></dl><p>Calling this getter does not call new() again. The tests also check that the getter leaves state unchanged.</p>`
  },
  {
    id:'contract-initialization', lesson:0, part:1, kind:'guide', short:'Initialize once', title:'Choose the value for a fresh deployment',
    body:`<p>The supplied Forge constructor is <code>pub const fn new() -&gt; Self</code>. Inside this impl, <code>Self</code> means Registry. The constant constructor lets the generated contract start with this initial state.</p><p>Each Run starts a fresh instance. Native execution deploys it in local DuskVM; the simulator creates it in browser memory. Calls within that run share the instance. Editing new() is not an upgrade or migration of an existing live deployment.</p>`,
    panelTitle:'Declaration, construction, read', panel:`<pre class="example"><code>// Field type:
count: u64

// Initial state of a new instance:
Self { count: 7 }

// Read the current field:
self.count</code></pre><p>Your next edit changes only 7 to 0. Leave the getter and the empty register method in place for that first check.</p>`
  },
  {
    id:'state', lesson:0, part:1, kind:'code', check:'initial', scenario:'state', short:'Initial state', title:'Set the starting count to zero',
    body:`<p>Now change the initial state of a fresh register. Find the value inside new():</p><pre class="example"><code>Self { count: 7 }</code></pre><p>Replace 7 with 0. Keep the field type, the getter and the empty register method unchanged.</p><p>Run the starter first if you want to see its actual starting value. Then edit and Run again. This check reads the fresh deployment through get_count. Change the initializer, not the getter. The next coding check needs to read updated values.</p>`,
    task:'Change 7 to 0 in new(), then run the contract.',
    note:'get_count reads the stored count for the tests.',
    hint:'Set the value inside new() to Self { count: 0 }.',
    success:'The new contract starts at 0.',
  },
  {
    id:'contract-observe', lesson:0, part:1, kind:'practice', short:'Predict a read', title:'Initialization does not implement registration',
    body:`<p>You set the starting count to zero, but the starter’s register method still contains only a comment. The comment does not change the count.</p><p>The first check covers initialization. Next you’ll implement registration.</p>`,
    question:'With count initialized to zero and register still empty, what follows three register calls?',
    choices:[['three','The name register automatically makes the count three.'],['zero','The count stays zero because the method has no update.'],['seven','The initial seven returns after each call.']], answer:'zero',
    success:'The count stays zero. Next you will add the actual state update.',
    error:'Method names and comments do not change state. An empty method leaves the initialized zero unchanged.'
  },
  {
    id:'contract-entrypoints', lesson:0, part:1, kind:'guide', short:'Allow a change', title:'Give the entrypoint mutable access',
    body:`<p>An <strong>entrypoint</strong> is an exposed method another caller can invoke. In this Forge module, the public methods form the contract’s call interface.</p><p><code>&amp;mut self</code> borrows Registry with permission to change its fields. The method still needs a statement that updates the field.</p><p><code>self.count += 1;</code> adds to the old value. <code>self.count = 1;</code> replaces the old value. The semicolon ends either statement.</p>`,
    panelTitle:'Two different effects', panel:`<dl class="concept-list"><dt>Starting at 4, then count += 1</dt><dd>The new count is 5. Previous registrations are still included.</dd><dt>Starting at 4, then count = 1</dt><dd>The new count is 1. The old total was overwritten.</dd><dt>Who can call?</dt><dd>This opening contract has no caller restriction. Mutable Rust access is not user authentication.</dd></dl>`
  },
  {
    id:'entrypoint', lesson:0, part:1, kind:'code', check:'change', scenario:'state', short:'Entrypoint', title:'Add one registration',
    body:`<p>The public register method already has mutable access. Replace its comment with the state update:</p><pre class="example"><code>self.count += 1;</code></pre><p>Keep the zero initializer and the getter. Each call must add one to the state left by the previous call, not replace the total with one.</p><p>Run and inspect all three returned counts. Correct code gives 1, then 2, then 3 on the same deployment.</p>`,
    task:'Put this statement inside register. Run the contract and check the count after each of the three calls.',
    note:'get_count uses &self because it only reads state.',
    hint:'Replace the comment inside register with self.count += 1; (including the semicolon).',
    success:'Each register() call added one. The count is now 3.',
  },
  {
    id:'contract-trace', lesson:0, part:2, kind:'guide', short:'Follow the calls', title:'Read a sequence, not just the final number',
    body:`<p>The mutation check begins at zero and calls register three times on one deployment. It reads the count after each call.</p><p>A final value alone can hide a mistake. Returning 3 from a getter could match one last read while failing the starting and intermediate reads.</p>`,
    panelTitle:'Expected trace for the working increment', panel:`<ol class="example-flow"><li><strong>New deployment → 0</strong><p>The constructor supplies the starting state.</p></li><li><strong>First register → 1</strong><p>The update uses the previous zero.</p></li><li><strong>Second register → 2</strong><p>The previous one is still stored.</p></li><li><strong>Third register → 3</strong><p>The next update continues from two.</p></li></ol><p>This is an example trace. Press Run to see what your contract returns.</p>`
  },
  {
    id:'contract-persistence', lesson:0, part:2, kind:'practice', short:'What persists?', title:'A read does not reset the register',
    body:`<p>After two successful increments, this deployment holds 2. Another read should return that same stored value without initializing a new contract.</p><p>Pressing Run starts a fresh deployment. Your saved source and skill checks are browser progress, not the test instance’s stored count.</p>`,
    question:'After two increments, another getter call on the same deployment should return…',
    choices:[['two','2, without resetting or incrementing the count.'],['zero','0, because every method call runs the constructor.'],['three','3, because a getter is another registration.']], answer:'two',
    success:'It reads the stored 2. A new deployment and a read of an existing one are different operations.',
    error:'The getter neither initializes nor increments. Only a fresh deployment starts again from new().'
  },
  {
    id:'contract-debugging', lesson:0, part:2, kind:'guide', short:'Fix a failed run', title:'Use the failure to choose your next edit',
    body:`<p>A run can fail before or during execution, or it can execute successfully with the wrong result. Read the feedback before changing several things at once.</p><p>Native compiler details refer to <code>lib.rs</code>, the temporary source built from this editor. Simulator diagnostics instead identify syntax or types outside its supported subset. A simulator limitation does not mean your program is invalid Rust. Start with the named line.</p>`,
    panelTitle:'Three failures, three next steps', panel:`<dl class="concept-list"><dt>The contract didn’t compile</dt><dd>Check syntax and types. For example, adding the string "one" to u64 is not an integer addition.</dd><dt>DuskVM couldn’t complete the run</dt><dd>Inspect the VM details. A missing entrypoint or exhausted gas is not evidence that your business rule worked.</dd><dt>The count was 1, 1, 1</dt><dd>The code ran but replaced the count each time. Check for = 1 where you intended += 1.</dd></dl><p>Keep a working version in the editor, make one correction, and Run again. The page does not silently repair your source.</p>`
  },
  {
    id:'contract-boundaries', lesson:0, part:2, kind:'practice', short:'What was proved?', title:'A counter is not a membership system',
    body:`<p>The tests check a small state update in the selected runtime. A simulator check is not a native compilation or DuskVM check. Neither runtime establishes who submitted each call, whether a person already registered or whether a live transaction became final.</p><p>Rust field visibility does not encrypt contract state. Keep names, identity documents and other personal data out of this public counter.</p>`,
    question:'A count of 3 establishes what in this exercise?',
    choices:[['people','Three different verified people registered.'],['calls','Three successful increments occurred in this test deployment.'],['private','Three private identities are encrypted in the count field.']], answer:'calls',
    success:'The count records increments, not verified people or private identity data.',
    error:'This contract has no identity, duplicate or privacy mechanism. Do not infer capabilities it never implemented.'
  },
  {
    id:'learned', lesson:0, part:2, kind:'earned', short:'Contract state', title:'The count persists between calls',
    body:`<p>With the working increment, <code>get_count</code> returns 3 after three <code>register</code> calls. Each call updates the state left by the previous call.</p>
    <p>Refreshing an app or making another read does not re-run the constructor. A fresh deployment starts from <code>new()</code>.</p>
    <p>This contract counts accepted calls, not verified people. It has no identity check, duplicate prevention or caller restriction.</p>
    <p>Next, change <code>register</code> to accept an amount so one call can add several registrations.</p>`,
    note:'This counter is public, and anyone can call it. Dusk does not make contract data private automatically.',
  },
  {
    id:'groups', lesson:1, part:0, kind:'intro', short:'Group registration', title:'Register a group in one call',
    body:`<p>Three visitors arrive at the workshop together. The first version of <code>register</code> adds 1 per call, so counting the group takes three calls.</p>
    <p>Let the caller pass the group’s size. <code>register(3)</code> should add 3 to the count.</p>
    <p>Each call receives its own input. If the next caller supplies 2, that call receives 2. The stored count persists between successful calls.</p>
    <p>We’ll change both the method’s declaration and the statement that updates state. Adding a parameter without using it would leave the old one-per-call behavior.</p>`,
    task:'Add an amount parameter to register.',
    note:'Keep new and get_count unchanged.',
  },
  {
    id:'argument-lifetime', lesson:1, part:0, kind:'guide', short:'Input or state?', title:'One argument belongs to one call',
    body:`<p>A <strong>parameter</strong> is the name and type in a method declaration. An <strong>argument</strong> is the value supplied for a particular call.</p><p>For register(3), the parameter amount receives 3. A following register(2) receives a new amount of 2. The stored count is not replaced by either parameter.</p>`,
    panelTitle:'Two places with different lifetimes', panel:`<dl class="concept-list"><dt>amount: u64</dt><dd>An input to this register call. It is not a new field in Registry.</dd><dt>self.count</dt><dd>The total stored across successful calls.</dd><dt>self.count += amount</dt><dd>Add this call’s input to the state left by earlier calls.</dd></dl><p>Changing only the declaration is insufficient. The method must use amount instead of the fixed 1.</p>`
  },
  {
    id:'argument-prediction', lesson:1, part:0, kind:'practice', short:'Add or replace?', title:'Preserve earlier groups',
    body:`<p>Start at zero and consider inputs 2, 3 and 1. Each input describes one group. The state tracks the combined total.</p><p>Work out the intermediate values before changing the method. They help distinguish an addition from an accidental replacement.</p>`,
    question:'Which trace matches self.count += amount for those three inputs?',
    choices:[['sum','2 → 5 → 6.'],['replace','2 → 3 → 1.'],['fixed','1 → 2 → 3.']], answer:'sum',
    success:'Each group is added to the previous total: 2, then 5, then 6.',
    error:'Use both the previous state and this call’s amount. Replacement forgets earlier groups. A fixed increment ignores the argument.'
  },
  {
    id:'arguments', lesson:1, part:0, kind:'code', check:'arguments', scenario:'arguments', short:'Amount parameter', title:'Pass an amount to register',
    body:`<p>A <strong>parameter</strong> names an input in the method declaration. Add <code>amount: u64</code> after <code>&amp;mut self</code>:</p>
    <pre class="example"><code>pub fn register(&amp;mut self, amount: u64)</code></pre>
    <p>In <code>register(3)</code>, the argument <code>3</code> becomes <code>amount</code> for that call. The colon introduces its Rust type, and the comma separates it from <code>&amp;mut self</code>.</p>
    <p>Replace the fixed increment with <code>self.count += amount;</code>. Replacing the count with <code>amount</code> would lose earlier registrations.</p>
    <p>This changes the contract’s call interface. The lesson runner now supplies the typed input. A real app needs a matching interface and generated data-driver too.</p>
    <details class="try-it"><summary>Work out the count after arguments 2, 3 and 1</summary><p>Starting from zero, the count goes 2 → 5 → 6. Each addition uses the new input and the state left by the previous successful call.</p></details>`,
    task:'Add the parameter, replace the fixed 1 with amount, then run the tests.',
    note:'Each call gets its own amount. The contract keeps self.count between calls.',
    hint:'Use pub fn register(&mut self, amount: u64) { self.count += amount; }. Keep the rest of your contract.',
    success:'Calls with 2, 3 and 1 raised the count to 6.',
  },
  {
    id:'argument-interface', lesson:1, part:1, kind:'guide', short:'Typed interface', title:'A caller must use the new signature',
    body:`<p>The old entrypoint accepted no argument. It now expects a u64. The caller must encode that input using the contract’s actual interface.</p><p>The lesson runner changes to the argument scenario at the coding checkpoint. Reviewing an earlier page keeps this scenario, so the runner still uses the current ABI.</p>`,
    panelTitle:'Same method name, different interface', panel:`<pre class="example"><code>// Earlier:
pub fn register(&amp;mut self)

// Current:
pub fn register(&amp;mut self, amount: u64)</code></pre><p>A client’s matching data-driver translates typed arguments into bytes. It does not execute the contract or approve a transaction. The dApp path uses that driver separately.</p>`
  },
  {
    id:'argument-values', lesson:1, part:1, kind:'practice', short:'Seats or tokens?', title:'An input’s name does not make it a payment',
    body:`<p>Our amount counts registrations. There is no token transfer in this entrypoint. An argument named amount has only the meaning the contract gives it.</p><p>A live transaction’s attached value and gas are separate concerns. The local test does not charge network fees.</p>`,
    question:'What does register(3) request in this contract?',
    choices:[['seats','Add three registrations to the stored count.'],['tokens','Transfer three DUSK automatically.'],['gas','Set the gas allowance to three.']], answer:'seats',
    success:'It supplies a registration count. Tokens and gas are not inferred from the parameter name.',
    error:'Read the method body: it adds to count. There is no payment or gas-setting operation here.'
  },
  {
    id:'argument-trace', lesson:1, part:1, kind:'guide', short:'Inspect the trace', title:'Use before and after values to spot an error',
    body:`<p>The argument tests show each call, its execution result and the count before and after. Follow the state across rows.</p><p>If register(3) starts at 2 and ends at 3, it probably replaced the total. If it ends at 3 after adding one, the argument may still be ignored. The complete trace helps distinguish these mistakes.</p>`,
    panelTitle:'Read the middle row', panel:`<dl class="concept-list"><dt>Call</dt><dd>register(3): this request supplies three registrations.</dd><dt>Before</dt><dd>2: the first successful group is still included.</dd><dt>After</dt><dd>5: this call adds three to that previous two.</dd></dl><p>The last row should continue from 5, not deploy a new zero-count register. Run starts a new test. The rows within it share state.</p>`
  },
  {
    id:'arguments-learned', lesson:1, part:1, kind:'earned', short:'Call arguments', title:'register now accepts an amount',
    body:`<p>Calls with amounts 2, 3 and 1 left the count at 6. Each call used the same <code>register</code> entrypoint.</p>
    <p>Next, add rules for zero amounts and a maximum total of 10.</p>`,
  },
  {
    id:'rules', lesson:2, part:0, kind:'intro', short:'Registration rules', title:'Limit the register to 10 entries',
    body:`<p>The workshop has 10 places. Accept registration amounts above zero only if the total fits.</p>
    <p>A caller can bypass checks in a web form by calling the contract directly. The contract must enforce these limits.</p>
    <p>A valid type is not the same as a valid business request. <code>u64</code> excludes negative numbers, but still permits zero and values much larger than the workshop’s capacity.</p>
    <p>We’ll test both acceptance and rejection. Valid requests must still work after a failed one. Rejecting every call would make the register unusable.</p>`,
    task:'Reject zero and totals above 10. Check that rejected calls leave the count unchanged.',
    note:'Anyone can submit a valid amount at this stage.',
  },
  {
    id:'rule-boundary', lesson:2, part:0, kind:'guide', short:'Enforce the rule', title:'Put validation where every caller meets it',
    body:`<p>A web form can warn before a request is sent, but other callers can bypass that form. Contract rules belong inside the entrypoint too.</p><p>The u64 type rules out negative input. It does not rule out zero or a group too large for the workshop. Type checks and business checks do different work.</p>`,
    panelTitle:'Where validation belongs', panel:`<dl class="concept-list"><dt>Browser validation</dt><dd>Helps the user correct a request before approval or submission.</dd><dt>Contract validation</dt><dd>Enforces the rule even for callers using another app.</dd><dt>Positive amount</dt><dd>The condition amount &gt; 0 distinguishes a real group from zero. amount &gt;= 0 cannot: every u64 already satisfies it.</dd></dl>`
  },
  {
    id:'rule-cases', lesson:2, part:0, kind:'practice', short:'Rejected or ignored?', title:'No change does not always mean failure',
    body:`<p>An early return can finish a call successfully without changing state. An assertion failure panics, rejecting the operation.</p><p>Our rule requires zero to be rejected, not silently accepted. The tests inspect the call result as well as the final count.</p>`,
    question:'Which behavior meets the rule for register(0)?',
    choices:[['panic','The assertion fails, and the operation is reported as rejected.'],['return','The method returns successfully without adding anything.'],['all','The contract rejects every input, including positive groups.']], answer:'panic',
    success:'Zero must reject, while valid inputs still succeed. A state-only check would miss the silent-return mistake.',
    error:'The rule includes the outcome, not just an unchanged number. Neither silent success nor rejecting every request implements it.'
  },
  {
    id:'positive', lesson:2, part:0, kind:'code', check:'positive', scenario:'validation', short:'Reject zero', title:'Reject a zero amount',
    body:`<p><code>u64</code> includes zero. To require at least 1, add this check before updating the count.</p>
    <p><code>assert!</code> checks a condition. If it is false, the contract panics and the call fails:</p>
    <pre class="example"><code>assert!(amount &gt; 0, "Use a positive amount");</code></pre>
    <p>The condition is either true or false. Positive amounts continue to the addition. Zero stops the call. A plain early <code>return</code> would be a successful call that did nothing, not the rejection this task asks for.</p>
    <p>The tests deliberately call zero between valid requests. Read both its result and the count before and after it, then check that the following valid call succeeds.</p>
    <details class="try-it"><summary>Would amount &gt;= 0 enforce this rule?</summary><p>No. Every u64 is at least zero. That condition also accepts zero, so it cannot require a positive amount.</p></details>`,
    task:'Add the assertion before updating self.count. Run the tests to check that zero is rejected and positive amounts still work.',
    note:'The ! marks assert! as a Rust macro.',
    hint:'Insert assert!(amount > 0, "Use a positive amount"); before the addition.',
    success:'register(0) was rejected at 6. register(1) then raised the count to 7.',
  },
  {
    id:'rule-total', lesson:2, part:1, kind:'guide', short:'Total capacity', title:'Compare the resulting total with the limit',
    body:`<p>The workshop has ten seats altogether, not ten seats for every call. Check the previous count together with the new group.</p><p>The worked implementation adds first and asserts that the stored total is at most ten. This deliberately lets the next run demonstrate rollback. A correct guard before the write is also accepted.</p>`,
    panelTitle:'The same amount can have different outcomes', panel:`<dl class="concept-list"><dt>Empty register + 8</dt><dd>The result is 8, so the request fits.</dd><dt>Count 3 + 8</dt><dd>The result would be 11, so the request must fail.</dd><dt>Count 3 + 7</dt><dd>The result is exactly 10, which is allowed.</dd></dl><p>A check on amount alone cannot enforce a shared total.</p>`
  },
  {
    id:'rule-limit', lesson:2, part:1, kind:'practice', short:'Boundary case', title:'Include the last available seat',
    body:`<p>“At most ten” includes ten. A strict less-than comparison would reject a group that exactly fills the workshop.</p><p>Boundary tests should check below the limit, exactly at it and above it. Testing only small inputs cannot distinguish &lt; from &lt;=.</p>`,
    question:'The count is 3. Should register(7) succeed under this capacity rule?',
    choices:[['yes','Yes. The new total is exactly 10.'],['no','No. The total must always stay below 10.'],['input','Only if 7 is the first argument used in this deployment.']], answer:'yes',
    success:'Exactly ten is valid. The assertion should use <= 10, not < 10.',
    error:'The limit is inclusive. Earlier calls matter through the total, not through which argument happened to be used first.'
  },
  {
    id:'capacity', lesson:2, part:1, kind:'code', check:'capacity', scenario:'capacity', short:'Capacity', title:'Keep the total at 10 or less',
    body:`<p>The tests start at 3, then call <code>register(8)</code>. The total would be 11, exceeding the limit of 10.</p>
    <p>Check <code>self.count</code> after adding the amount:</p>
    <pre class="example"><code>assert!(self.count &lt;= 10, "The register is full");</code></pre>
    <p>With this assertion <em>after</em> the addition, the count reaches 11 before the call fails. DuskVM rolls back the failed call, so the next read returns 3.</p>
    <p>Check the total, not just whether this call’s amount is at most 10. An amount of 8 is valid for an empty register but too large when the current count is 3.</p>
    <p>Ten itself is allowed, which is why the comparison is <code>&lt;=</code>, not <code>&lt;</code>. Checked arithmetic also prevents an overflowing u64 addition from silently wrapping to a smaller count.</p>
    <details class="try-it"><summary>What happens to registrations before the failed call?</summary><p>They remain. Rollback restores the state from just before this call, not the state from before all earlier successful calls. Network gas charges and spent transaction inputs are separate from this contract-state rollback.</p></details>`,
    task:'Add the capacity assertion after the addition. Keep the zero check. Compare the before and after counts for rejected calls.',
    note:'The tests allow a total of 10, try 8 in a fresh register, and check u64::MAX (the largest u64). Failed calls can still cost gas on a network.',
    hint:'Keep the zero check. Insert assert!(self.count <= 10, "The register is full"); after the addition.',
    success:'register(8) was rejected at 3. register(7) then raised the count to 10.',
  },
  {
    id:'rule-overflow', lesson:2, part:1, kind:'guide', short:'Integer overflow', title:'Do not let a huge amount become a small total',
    body:`<p>A u64 has a maximum value. Adding beyond that range is <strong>overflow</strong>. Silently wrapping around could turn an invalid huge total into a small one that passes a capacity check.</p><p>This lesson compiles with overflow checks enabled, so ordinary overflowing addition fails. Do not replace it with wrapping_add to silence a failure.</p>`,
    panelTitle:'Keep the arithmetic rule explicit', panel:`<dl class="concept-list"><dt>Ordinary addition in this runner</dt><dd>Overflow is checked by the fixed compiler settings.</dd><dt>checked_add</dt><dd>Returns an Option. Callers must handle None as failure rather than inventing a value.</dd><dt>Production build</dt><dd>Verify arithmetic behavior in the intended build profile. Do not assume every Rust release profile matches this teaching runner.</dd></dl>`
  },
  {
    id:'rule-rollback', lesson:2, part:2, kind:'guide', short:'Rollback boundary', title:'Restore the state before the failed call',
    body:`<p>With the shown post-update capacity assertion, register(8) temporarily changes 3 to 11 before panicking. The VM restores the state to 3.</p><p>Rollback concerns the failed operation. It does not erase earlier successful registrations or rerun the constructor.</p>`,
    panelTitle:'A failed call between successful calls', panel:`<ol class="example-flow"><li><strong>register(3) succeeds</strong><p>The stored total becomes 3.</p></li><li><strong>register(8) fails</strong><p>The next read still reports 3, not 11 and not 0.</p></li><li><strong>register(7) succeeds</strong><p>The previous valid 3 plus 7 becomes 10.</p></li></ol><p>On a live network, gas charges and transaction-input consumption are separate from contract-state rollback.</p>`
  },
  {
    id:'rule-recovery', lesson:2, part:2, kind:'practice', short:'Recover after failure', title:'A rejection must not poison later valid work',
    body:`<p>A contract that always panics would reject invalid input, but it would not be a working register.</p><p>Our scenarios therefore interleave accepted and rejected calls and check that later valid work still sees the correct state.</p>`,
    question:'After register(3) succeeds and register(8) fails, what should a subsequent register(7) do?',
    choices:[['recover','Succeed and leave the count at 10.'],['reset','Succeed but leave the count at 7 because rollback erased the first call.'],['poison','Fail forever because a previous request was rejected.']], answer:'recover',
    success:'The previous 3 remains. Adding 7 fills the capacity. Failure must not corrupt or disable the register.',
    error:'Rollback preserves prior successful state. A subsequent valid call must still work from that state.'
  },
  {
    id:'rule-errors', lesson:2, part:2, kind:'guide', short:'Read the error', title:'Not every failed run validates a rule',
    body:`<p>The runner distinguishes contract panics from execution failures such as missing entrypoints, bad ABI data or gas exhaustion.</p><p>A deliberate assertion rejects an invalid request. An infinite loop that runs out of gas does not demonstrate the same rule, even though the count did not change.</p>`,
    panelTitle:'What the check needs', panel:`<dl class="concept-list"><dt>Valid call</dt><dd>Completes and leaves the expected new state.</dd><dt>Invalid business request</dt><dd>Rejects through the contract’s checks and preserves prior state.</dd><dt>Execution could not finish</dt><dd>Inspect compiler/VM details and fix the program. It does not earn the validation checkpoint.</dd></dl><p>Use both positive and negative examples. Rejection alone is not a useful contract.</p>`
  },
  {
    id:'validation-learned', lesson:2, part:2, kind:'earned', short:'Input validation', title:'A failed call keeps the previous state',
    body:`<p><code>register(8)</code> failed at a count of 3. <code>register(7)</code> then succeeded and brought the count to 10.</p>
    <p>The selected runtime rolled back failed calls while keeping earlier successful changes. A simulator check is not a native DuskVM run.</p>`,
    note:'Next, keep a record of each registration so it can be found and cancelled. Caller permissions come later.',
  },
  {
    id:'records', lesson:3, part:0, kind:'intro', short:'A record', title:'Remember which seats belong together',
    body:`<p>A total of 5 cannot tell us which group reserved 2 seats and which reserved 3. To cancel one group, the contract needs individual <strong>registration records</strong>.</p>
    <p>Give each record a stable <code>id</code> and a <code>seats</code> field. A Rust <code>struct</code> keeps those related values together:</p>
    <pre class="example"><code>struct Registration {
    id: u64,
    seats: u64,
}</code></pre>
    <p>We’ll store these records, allocate IDs, find a record and cancel it. The existing <code>count</code> will mean reserved seats. The number of records will mean groups. Two groups can reserve five seats.</p>
    <p>Keep working in your existing contract. Navigation leaves your source unchanged. Every Run deploys a fresh copy rather than migrating live state.</p>`,
    task:'Extend your register with individual records, without losing its positive-amount and capacity checks.',
    note:'Store IDs and seat counts, not names or identity documents. The records are public even when the Rust struct is private. Anyone can call these methods until a later permissions lesson.',
  },
  {
    id:'record-model', lesson:3, part:0, kind:'guide', short:'Groups and seats', title:'Give each stored number one meaning',
    body:`<p>The total count now means reserved seats. A record represents one group, which may reserve several seats. Record count and seat count are not interchangeable.</p><p>Keep Registration as an internal Rust struct. Registry is the public contract-state struct used by Forge. These records cross the ABI through typed getters rather than as the internal struct itself.</p>`,
    panelTitle:'Two groups, five seats', panel:`<dl class="concept-list"><dt>Record 0</dt><dd>2 seats.</dd><dt>Record 1</dt><dd>3 seats.</dd><dt>registration_count()</dt><dd>2 groups.</dd><dt>get_count()</dt><dd>5 reserved seats.</dd></dl><p>Cancellation will remove one group and subtract that group’s actual seats. It cannot just subtract one from every total.</p>`
  },
  {
    id:'record-storage', lesson:3, part:0, kind:'code', check:'recordStorage', scenario:'records-empty', short:'Storage', title:'Start with an empty collection',
    body:`<p>A <code>Vec</code> is a growable collection. DuskVM preserves its allocated memory between successful calls, just as it preserves <code>count</code>.</p>
    <p><code>alloc</code> supplies collections to this <code>no_std</code> contract. Add <code>extern crate alloc;</code> outside the contract module, after the two <code>#!</code> lines. Inside <code>mod registry</code>, add:</p>
    <pre class="example"><code>use alloc::vec::Vec;

struct Registration {
    id: u64,
    seats: u64,
}</code></pre>
    <p>Add <code>records: Vec&lt;Registration&gt;</code> beside <code>count</code> in <code>Registry</code>. Initialize it in <code>new()</code>:</p>
    <pre class="example"><code>Self { count: 0, records: Vec::new() }</code></pre>
    <p>Finally, add a getter inside <code>impl Registry</code>. <code>len()</code> counts records. <code>as u64</code> converts Rust’s collection length to our ABI’s count type.</p>
    <pre class="example"><code>pub fn registration_count(&amp;self) -&gt; u64 {
    self.records.len() as u64
}</code></pre>`,
    task:'Add the record type, collection and getter. Keep your existing methods. Run to check that two new deployments both have zero records.',
    hint:'Only Registry is pub inside the annotated module. Forge expects one public contract-state struct. Registration is an internal data type, so it does not need ABI serialization derives.',
    note:'This first check observes empty storage. Later checks will verify actual records after writes. No new Cargo dependency is needed.',
    success:'Both deployments start with zero reserved seats and zero records.',
  },
  {
    id:'record-ids', lesson:3, part:0, kind:'code', check:'recordIds', scenario:'records-ids', short:'Stable IDs', title:'Return an ID for each successful registration',
    body:`<p>A record’s identity must survive changes to the collection. Cancellation changes the number of records, so that number cannot serve as a permanent ID.</p>
    <p>Add <code>next_id: u64</code> to <code>Registry</code>, initialize it to 0 in <code>new()</code>, and expose a read:</p>
    <pre class="example"><code>pub fn next_id(&amp;self) -&gt; u64 {
    self.next_id
}</code></pre>
    <p>Change the signature to <code>pub fn register(&amp;mut self, amount: u64) -&gt; u64</code>. After your existing validation and count update, allocate and return an ID:</p>
    <pre class="example"><code>let id = self.next_id;
self.next_id += 1;
id</code></pre>
    <p>The final expression has no semicolon because it is the return value. <code>return id;</code> is also valid. Successful calls should receive 0, 1 and 2. Failed calls must not consume an ID.</p>`,
    task:'Add next_id and its getter. Make register return the allocated ID while preserving all existing guards.',
    hint:'Initialize both records: Vec::new() and next_id: 0 in new(). Keep the ID increment inside the same call as the count update, not in a getter.',
    note:'At this intermediate step IDs are allocated, but records are not yet saved. The next chapter connects the two. An ID is neither a secret nor evidence of ownership.',
    success:'Successful registrations returned IDs 0, 1 and 2. Rejected calls did not consume an ID.',
  },
  {
    id:'record-save', lesson:3, part:1, kind:'code', check:'recordSave', scenario:'records-save', short:'Save a record', title:'Store the ID and seat count together',
    body:`<p>The local <code>id</code> exists only during this call. A record stored in <code>self.records</code> remains available to later calls.</p>
    <p>After allocating the ID, append a record before returning it:</p>
    <pre class="example"><code>self.records.push(Registration {
    id,
    seats: amount,
});</code></pre>
    <p><code>id</code> is shorthand for <code>id: id</code>. <code>seats: amount</code> gives the record’s field a value from this call’s argument.</p>
    <p>Calls with 2, 3 and 5 seats should leave three records and ten reserved seats. A rejected call must leave the count, records and next ID unchanged.</p>`,
    task:'Append a record for each successful register call. Keep the allocated id as the method’s return value.',
    hint:'Put records.push(...) after let id = self.next_id and before the final id expression. Do not replace records with a new Vec on every call.',
    note:'The VM rolls back the whole failed call, not just count. Guards before or after writes are accepted if they enforce the same outcome.',
    success:'Three successful calls stored three records. Failed calls left the record count and next ID unchanged.',
  },
  {
    id:'record-lifetime', lesson:3, part:1, kind:'practice', short:'Keep the record', title:'A local variable is not persistent storage',
    body:`<p><code>let id = self.next_id;</code> creates a local value for the current call. Returning it tells the caller which ID was allocated.</p><p>The pushed Registration stores the ID and seats in self.records, so a later getter can find them. Replacing that collection on every call would lose earlier groups.</p>`,
    question:'Which operation makes the ID and seats available to later calls?',
    choices:[['return','Only returning id from the function.'],['push','Appending Registration { id, seats: amount } to self.records.'],['name','Giving the local variable the name id.']], answer:'push',
    success:'The persistent record keeps the values. A return value alone does not create stored lookup data.',
    error:'Store the pair in the contract’s collection. Local names and returned values do not automatically become persistent records.'
  },
  {
    id:'record-read', lesson:3, part:1, kind:'code', check:'recordRead', scenario:'records-read', short:'Read by ID', title:'Find the seats for a particular registration',
    body:`<p>Add <code>get_registration(&amp;self, id: u64) -&gt; u64</code>. It should return the seats in the matching record, not the register’s total.</p>
    <p>A loop can borrow the collection without consuming it. Match each record’s <code>id</code> field, rather than assuming an ID is a vector position:</p>
    <pre class="example"><code>pub fn get_registration(&amp;self, id: u64) -&gt; u64 {
    for record in &amp;self.records {
        if record.id == id {
            return record.seats;
        }
    }
    panic!("Unknown registration");
}</code></pre>
    <p>With records for 2, 3 and 5 seats, reads of IDs 0, 1 and 2 should return those separate values. Reading must not alter the total, record count or next ID.</p>`,
    task:'Add the lookup method and run it against all three stored records.',
    hint:'&self.records borrows the collection. record.id == id compares the stored ID with the supplied argument. Return record.seats when they match.',
    note:'The panic is a temporary missing-record behavior. The next chapter changes this API to represent absence explicitly. There are at most ten active records, so a short linear search is sufficient here.',
    success:'IDs 0, 1 and 2 returned 2, 3 and 5 seats without changing the register.',
  },
  {
    id:'record-missing', lesson:3, part:1, kind:'code', check:'recordMissing', scenario:'records-missing', short:'Missing IDs', title:'Represent an absent record with Option',
    body:`<p>A caller can request an ID that does not exist. Instead of failing a read or inventing a record with zero seats, return an <code>Option&lt;u64&gt;</code>.</p>
    <p><code>Some(seats)</code> means a record was found. <code>None</code> means it was not. Change the getter’s return type and its two return paths:</p>
    <pre class="example"><code>pub fn get_registration(&amp;self, id: u64) -&gt; Option&lt;u64&gt; {
    for record in &amp;self.records {
        if record.id == id {
            return Some(record.seats);
        }
    }
    None
}</code></pre>
    <p>Keep comparisons in <code>u64</code>. Casting an arbitrary ID to a WASM <code>usize</code> can truncate it. A large unknown ID must not turn into an existing small one.</p>`,
    task:'Return Some(seats) for known IDs and None for unknown ones, including in an empty deployment.',
    hint:'Change -> u64 to -> Option<u64>, wrap the found value in Some(...), and replace the final panic with None.',
    note:'This changes the method’s return ABI. The tests now decode Option<u64>, including when you run them from an earlier chapter.',
    success:'Known IDs returned Some(seats). Large unknown IDs and an empty register returned None.',
  },
  {
    id:'record-absence', lesson:3, part:2, kind:'guide', short:'Read or mutate?', title:'Choose a result for absence deliberately',
    body:`<p>A missing-record getter succeeds with None, meaning “there is no such record.” Some(seats) answers “found.”</p><p>A cancellation request is different. It promises to remove an existing record, so a missing ID must reject instead of pretending seats were released.</p>`,
    panelTitle:'One absent ID, two operations', panel:`<dl class="concept-list"><dt>get_registration(id)</dt><dd>Return None. Do not invent a zero-seat record or alias a large ID to a vector index.</dd><dt>cancel(id)</dt><dd>Reject when the record is absent. Cancelling the same ID twice must not release seats twice.</dd><dt>Client handling</dt><dd>The matching data-driver determines how Option is represented outside Rust. Do not guess the wire format from the word None.</dd></dl>`
  },
  {
    id:'record-cancel', lesson:3, part:2, kind:'code', check:'recordCancel', scenario:'records-cancel', short:'Cancellation', title:'Release exactly the cancelled record’s seats',
    body:`<p>Add <code>cancel(&amp;mut self, id: u64)</code>. First find the record’s current position. Reject an absent record so cancelling it twice cannot release seats twice.</p>
    <pre class="example"><code>let index = self.records.iter()
    .position(|record| record.id == id)
    .expect("Unknown registration");
let removed = self.records.remove(index);
self.count -= removed.seats;</code></pre>
    <p><code>|record| ...</code> is a small function called for each record. <code>position</code> returns <code>Some(index)</code> or <code>None</code>. <code>expect</code> panics on None. <code>remove</code> returns the removed record, so subtract its actual seats.</p>
    <p>Removal shifts vector positions, not record identities. Do not renumber surviving records or decrement <code>next_id</code>. The tests cancel a middle record, read the survivors, reject repeated cancellation and refill the available seats.</p>
    <details class="try-it"><summary>What must remain true after every successful change?</summary><p>count equals the sum of seats in active records. Active IDs are distinct. Cancellation never makes an old ID available again. A rejected call preserves all three state fields.</p></details>`,
    task:'Add cancel. Pass the lifecycle tests: cancellation, missing IDs, survivor lookups, fresh IDs and capacity recovery.',
    hint:'Use the block above inside pub fn cancel(&mut self, id: u64) { ... }. The method returns (), Rust’s unit value. Keep register and both record getters. Never change next_id during cancellation.',
    note:'These cancellation methods are still unrestricted and public. Knowing an ID does not authenticate its owner. This is a local teaching register, not a deployable reservation service.',
    success:'Cancellation released the correct seats, kept surviving IDs stable and allowed valid new registrations. Repeated cancellation was rejected.',
  },
  {
    id:'record-consistency', lesson:3, part:2, kind:'practice', short:'Stable identities', title:'Removal changes positions, not IDs',
    body:`<p>Suppose records 0, 1 and 2 reserve 2, 3 and 5 seats. Removing record 1 frees three seats and may shift vector positions.</p><p>The surviving record with ID 2 must still be found by ID 2. The next allocated ID comes from next_id, not the shortened collection length.</p>`,
    question:'After cancelling ID 1, which state is correct?',
    choices:[['stable','7 seats remain; ID 2 still reserves 5 seats; the next new ID is 3.'],['rename','Rename ID 2 to 1 and reuse ID 2 for the next group.'],['one','9 seats remain because one record was removed.']], answer:'stable',
    success:'Remove the stored seat contribution without renaming survivors or reusing an ID.',
    error:'Seat totals, vector positions and record identities are separate. Subtract three seats and preserve the stable IDs.'
  },
  {
    id:'records-learned', lesson:3, part:2, kind:'earned', short:'Learned', title:'The register remembers individual groups',
    body:`<p>Your contract now stores ID/seat records, returns newly allocated IDs, distinguishes missing records and cancels a specific registration.</p>
    <p>The lifecycle checks exercised create, read, reject, cancel and refill. Stored totals, record counts and ID allocation stayed consistent across calls.</p>
    <p>No personal data, wallet signature or ownership rule was added. The next lesson adds caller permissions. These records are not proof of identity or access rights.</p>`,
  },
  {
    id:'permissions', lesson:4, part:0, kind:'intro', short:'Who may act?', title:'Give each record a contract owner',
    body:`<p>So far, anyone can cancel any registration. We’ll allow only its <strong>owning contract</strong> to change it.</p>
    <p>Two local test contracts, <strong>A</strong> and <strong>B</strong>, act as booking agencies. DuskVM supplies their identities when they call your registry. A should not cancel B’s records.</p>
    <p>This is contract-to-contract authorization, not wallet login. <code>abi::caller()</code> identifies the immediate calling contract. It is not Ethereum’s <code>msg.sender</code> and does not generally identify the wallet user.</p>
    <p>Moonlight transaction routing can put the Transfer contract in that position. Transaction sender metadata is a separate API. We will reject direct queries and Transfer as record creators instead of treating all routed wallets as one owner.</p>`,
    task:'Observe the VM caller, save that identity, then guard cancellation and resizing.',
    note:'A and B are open, test-only relays. A production contract owner must authenticate who can ask it to act. Do not deploy these fixtures as wallet authorization.',
  },
  {
    id:'permission-context', lesson:4, part:0, kind:'guide', short:'Call context', title:'Ask the VM who immediately called',
    body:`<p>Authorization needs a trustworthy source for the caller’s identity. A parameter containing a ContractId is only a claim supplied as input.</p><p><code>abi::caller()</code> instead reads VM execution context. The result is optional because a direct local query has no calling contract.</p>`,
    panelTitle:'Read the call chain at Registry', panel:`<dl class="concept-list"><dt>Direct query → Registry</dt><dd>None: no immediate contract caller.</dd><dt>Agency A → Registry</dt><dd>Some(A): A is the immediately calling contract.</dd><dt>Agency B → Registry</dt><dd>Some(B): B has a different contract identity.</dd></dl><p>This does not recover a wallet user behind A or B. The test relays are open fixtures, not production login services.</p>`
  },
  {
    id:'permission-caller', lesson:4, part:0, kind:'code', check:'ownerCaller', scenario:'permissions-caller', short:'VM caller', title:'Read the immediate calling contract',
    body:`<p>Add this import inside <code>mod registry</code>:</p>
    <pre class="example"><code>use dusk_core::abi::{self, ContractId};</code></pre>
    <p><code>abi</code> exposes native VM functions. <code>ContractId</code> identifies a deployed contract. Return the VM’s optional caller:</p>
    <pre class="example"><code>pub fn current_caller(&amp;self) -&gt; Option&lt;ContractId&gt; {
    abi::caller()
}</code></pre>
    <p>A direct local query has no calling contract: <code>None</code>. A nested call has <code>Some(id)</code>. The runner deploys and calls A, B and a Transfer-ID test fixture without passing an owner argument into this method.</p>
    <details class="try-it"><summary>Would a caller-supplied ContractId establish identity?</summary><p>No. It is just input. Authorization must use authenticated execution context or a correctly verified, replay-protected signature.</p></details>`,
    task:'Add current_caller without changing your existing records or methods. Run and compare the four calling contexts.',
    note:'A Transfer-ID fixture tests an address policy. It is not the real Transfer contract and does not simulate a signed Moonlight transaction.',
    hint:'Use the Option<ContractId> return type. Do not unwrap it here: observing a direct query should return None, not panic.',
    success:'The VM reported A, B and Transfer separately. A direct query returned None.',
  },
  {
    id:'permission-principal', lesson:4, part:0, kind:'practice', short:'Which caller?', title:'Do not confuse a relay with its user',
    body:`<p>Imagine a request reaches Registry through contract A. At Registry, the immediate caller is A even if another actor first asked A to act.</p><p>The registry can enforce rules between contracts using that identity. A real intermediary still needs its own policy for who may request actions.</p>`,
    question:'What does abi::caller() identify in the nested call from A to Registry?',
    choices:[['contract','Contract A.'],['wallet','The wallet user behind A, automatically.'],['owner','The deployment owner of Registry.']], answer:'contract',
    success:'It identifies A. Wallet authorization and deployment ownership are different contexts.',
    error:'The immediate contract caller is A, not a derived wallet user or Registry’s deployment owner.'
  },
  {
    id:'permission-binding', lesson:4, part:1, kind:'guide', short:'Bind at creation', title:'Store the authenticated context, not a supplied owner',
    body:`<p>At creation, obtain the allowed caller from the VM and copy it into the new record. Later mutations can compare against that stored identity.</p><p>The owner field is ordinary public metadata. It describes which contract may act. Publishing the ID does not transfer that permission.</p>`,
    panelTitle:'Three different ownership ideas', panel:`<dl class="concept-list"><dt>Record owner</dt><dd>A contract ID stored with this registration.</dd><dt>Current caller</dt><dd>The immediate contract currently executing a call into Registry.</dd><dt>Deployment owner</dt><dd>A separate deployment-level identity, addressed by self_owner(). It is not the per-record creator or the current caller.</dd></dl><p>Do not add an owner parameter to register as a substitute for observing the VM.</p>`
  },
  {
    id:'permission-owner', lesson:4, part:1, kind:'code', check:'ownerBinding', scenario:'permissions-owner', short:'Store ownership', title:'Bind a new record to its actual caller',
    body:`<p>Add <code>owner: ContractId</code> to the private <code>Registration</code> struct. This is the record owner, not the contract’s deployment owner.</p>
    <p>Import <code>dusk_core::transfer::TRANSFER_CONTRACT</code>. At the start of <code>register</code>, obtain and validate the caller:</p>
    <pre class="example"><code>let owner = abi::caller()
    .filter(|caller| *caller != TRANSFER_CONTRACT)
    .expect("Contract caller required");</code></pre>
    <p><code>filter</code> turns a disallowed value into <code>None</code>. <code>expect</code> rejects None. This permits other calling contracts while rejecting direct queries and Transfer routing.</p>
    <p>Add <code>owner</code> to the <code>Registration { ... }</code> value you push. Expose a read that returns <code>Some(record.owner)</code> when found, otherwise None:</p>
    <pre class="example"><code>pub fn owner_of(&amp;self, id: u64) -&gt; Option&lt;ContractId&gt; {
    self.records.iter().find(|record| record.id == id)
        .map(|record| record.owner)
}</code></pre>`,
    task:'Save the VM-provided owner and add owner_of. Keep register(amount) and its existing return type. Do not add an owner parameter.',
    note:'The tests alternate A and B, reject unsupported creators, and check large missing IDs. Creation now records ownership. Cancellation is still unprotected until the next chapter.',
    hint:'The stored value becomes Registration { id, seats: amount, owner }. Keep positivity, capacity and ID allocation unchanged.',
    success:'A and B own their separate records. Unsupported creation was rejected without consuming IDs or seats.',
  },
  {
    id:'permission-policy', lesson:4, part:1, kind:'practice', short:'Supported callers', title:'Define the supported principal explicitly',
    body:`<p>This lesson supports records owned by ordinary calling contracts. It deliberately rejects creation from a direct query or the Transfer contract ID.</p><p>Transfer can appear as an immediate caller in transaction routing. Treating that one ID as every wallet’s owner would collapse distinct users into the same principal.</p>`,
    question:'Why is a record owned by Transfer not a wallet-specific authorization rule here?',
    choices:[['shared','Several users can route through it; its contract ID alone does not distinguish them.'],['secret','Its ID is a secret that every wallet shares.'],['evm','Every native Dusk call uses Ethereum wallet identity semantics.']], answer:'shared',
    success:'Routing context is not automatically the end-user identity. Native wallet and signed-intent authorization stay separate.',
    error:'A shared routing contract ID cannot by itself identify distinct users. No Ethereum-style wallet caller is substituted here.'
  },
  {
    id:'permission-cancel', lesson:4, part:1, kind:'code', check:'ownerCancel', scenario:'permissions-cancel', short:'Authorize cancel', title:'Check ownership before removing a record',
    body:`<p>Storing an owner does not enforce a permission. The mutation must compare it with the current caller.</p>
    <p>In <code>cancel</code>, find the record’s index as before. Before removing it, add:</p>
    <pre class="example"><code>assert!(Some(self.records[index].owner) == abi::caller(),
    "Not the record owner");</code></pre>
    <p>The left side wraps the stored ID in Some so it can be compared with the optional VM caller. A direct query returns None and fails this test. A different agency also fails it.</p>
    <p>Keep the missing-record rejection. Correct ownership does not make a removed record exist again.</p>
    <details class="try-it"><summary>A knows B’s record ID. Can A cancel it?</summary><p>No. IDs remain public lookup keys, not authorization tokens. Only B’s executing contract may cancel its record.</p></details>`,
    task:'Add the ownership assertion to cancel. Check wrong-owner, direct, repeated and valid cancellations.',
    hint:'Place the assertion after finding index and before records.remove(index). Keep subtracting the removed record’s actual seats.',
    note:'Public visibility is intentional. Authorization happens inside the entrypoint, not by hiding the method from a web page.',
    success:'Only the owning contract cancelled each record. Rejected attempts preserved records, totals and IDs.',
  },
  {
    id:'permission-guard', lesson:4, part:2, kind:'guide', short:'Share the guard', title:'Protect the new method as well as the old one',
    body:`<p>A guard in cancel protects only cancel. Adding resize creates another path that can change a record’s reserved seats.</p><p>Move the shared lookup and ownership comparison into owned_index. It returns the current vector position only after both checks pass. Each mutation then uses that checked position.</p>`,
    panelTitle:'One rule, two entrypoints', panel:`<pre class="example"><code>// Both cancel and resize begin with:
let index = self.owned_index(id);</code></pre><dl class="concept-list"><dt>Missing record</dt><dd>The helper rejects because there is no valid position to mutate.</dd><dt>Wrong owner</dt><dd>The helper rejects before the caller receives a checked position.</dd><dt>Authorized record</dt><dd>The entrypoint can perform its own operation-specific checks and update.</dd></dl><p>The helper is private because it is internal code, not because hiding it supplies authorization.</p>`
  },
  {
    id:'permission-resize', lesson:4, part:2, kind:'code', check:'ownerResize', scenario:'permissions-resize', short:'Guard every write', title:'Apply the same rule when a group changes size',
    body:`<p>Add <code>resize(&amp;mut self, id: u64, seats: u64)</code>. It must enforce the same ownership rule as cancellation.</p>
    <p>Move cancellation’s index lookup and ownership assertion into a private helper, <code>fn owned_index(&amp;self, id: u64) -&gt; usize</code>. End it with <code>index</code>. Do not mark it pub.</p>
    <p>Both cancel and resize can then begin with <code>let index = self.owned_index(id);</code>. For resizing, replace the old seat contribution, not the whole total:</p>
    <pre class="example"><code>assert!(seats &gt; 0);
self.count = self.count - self.records[index].seats + seats;
assert!(self.count &lt;= 10);
self.records[index].seats = seats;</code></pre>
    <p>The index, ID and owner stay the same. A rejected resize must preserve the old seat count as well as the total. Checked arithmetic is still enabled.</p>`,
    task:'Extract owned_index, keep cancel using it, and add the protected resize entrypoint.',
    hint:'Copy the existing lookup and ownership assertion into owned_index, then return index. A resize returns (), like cancel, without allocating a new ID.',
    note:'Tests include another owner, no caller, zero, overflow, missing IDs, exact capacity and recovery. A guard on cancel alone would leave resize unprotected.',
    success:'Authorized resizing preserved identities and capacity. Unauthorized and invalid changes left all stored fields unchanged.',
  },
  {
    id:'permission-review', lesson:4, part:2, kind:'practice', short:'Authorization scope', title:'Do not promote a test relay into a wallet service',
    body:`<p>The VM tests establish that A cannot mutate B’s records. They do not establish who may instruct A to send a call.</p><p>Our fixture deliberately lets tests invoke those relays. Deploying it unchanged would not provide production end-user authentication.</p>`,
    question:'What has this permissions lesson actually implemented?',
    choices:[['wallets','Authenticated wallet ownership, signature verification and replay protection.'],['contracts','Contract-owned records with checked immediate-caller permissions.'],['identity','Verified personal identity for every registration.']], answer:'contracts',
    success:'The permission boundary is between contracts. Wallet users, signatures and replay policy still need their own implementation.',
    error:'The tests use real contract callers, not authenticated wallet users. Do not claim signature or identity checks that were never added.'
  },
  {
    id:'permissions-learned', lesson:4, part:2, kind:'earned', short:'Learned', title:'Permission follows the stored contract owner',
    body:`<p>Each registration is bound to a VM-provided contract identity. Cancellation and resizing use the same authorization rule.</p>
    <p>This does <strong>not</strong> authenticate wallet users. Native Moonlight authorization needs the correct transaction sender and routing context. A calling intermediary is not automatically that sender. <code>self_owner()</code> concerns deployment ownership, not the current caller.</p>
    <p>Phoenix does not expose a stable wallet identity through this caller API. An owner field alone cannot authorize a signed request. Verification must bind the key to the intended contract, action, arguments and domain, with expiry and consumed nonces.</p>
    <p>Next, make successful changes observable and call another native contract.</p>`,
    note:'Ownership is public metadata, not encryption or proof of a person’s identity. Wallet and signed-intent authorization remain separate work.',
  },
  {
    id:'interactions', lesson:5, part:0, kind:'intro', short:'Receipts and calls', title:'Let other software observe and use the registry',
    body:`<p>A return value answers one call. An <strong>event</strong> records a named payload in an execution receipt so other software can observe what the contract reported.</p>
    <p>A <strong>cross-contract call</strong> executes another deployed contract inside the VM. It has its own caller identity, typed arguments, return value and possible failure.</p>
    <p>We’ll emit registration changes, ask a local venue for a quote, and confirm seats with that venue. Your existing file, permissions and validation stay in place.</p>`,
    task:'Emit actual receipt events, then read and update a separate venue contract.',
    note:'These are native dusk_core::abi APIs. The referenced duskevm-contracts repository also contains native L1 Rust contracts. These are not Solidity or EVM calls.',
  },
  {
    id:'event-observation', lesson:5, part:0, kind:'guide', short:'Receipt data', title:'Identify the source, topic and payload',
    body:`<p>An event is data emitted during execution. It is not a console message from the browser and does not replace a state getter.</p><p>A consumer needs to know which contract emitted it, what topic it used and how its typed bytes should be interpreted. Topic text alone is not enough.</p>`,
    panelTitle:'The registration event’s three pieces', panel:`<dl class="concept-list"><dt>Source</dt><dd>The Registry contract that emitted the event, not the calling agency.</dd><dt>Topic</dt><dd>registered: the chosen name of this kind of observation.</dd><dt>Payload</dt><dd>(id, seats): two u64 values in that order.</dd></dl><p>These lessons inspect raw local receipt bytes. A client event-decoding schema requires registered event types, which this lesson does not add. Keep personal information out of public events.</p>`
  },
  {
    id:'event-register', lesson:5, part:0, kind:'code', check:'eventRegister', scenario:'events-register', short:'Emit an event', title:'Report the ID and seats of a registration',
    body:`<p>After appending a successful registration, but before returning its ID, add:</p>
    <pre class="example"><code>abi::emit("registered", (id, amount));</code></pre>
    <p><code>registered</code> is the event topic. <code>(id, amount)</code> is a tuple: two typed values in a fixed order. Dusk serializes that payload, and the receipt records the emitting contract’s ID.</p>
    <p>Keep this after your guards. The tests check the topic, emitting contract, ID and seats in the VM receipt.</p>
    <p>Do not store personal information in a public event. Removing a record later will not erase previously published information.</p>`,
    task:'Emit one registered event for each successful registration. Keep returning the ID and preserving the existing state changes.',
    hint:'Insert abi::emit("registered", (id, amount)); after records.push(...) and before the final id expression.',
    note:'An event is not permission, a state getter, or proof of network finality. Its payload here contains two u64 values, not an owner’s wallet identity.',
    success:'Successful registrations emitted the correct topic, contract ID and typed ID/seat payload.',
  },
  {
    id:'event-payload', lesson:5, part:0, kind:'practice', short:'Payload meaning', title:'Give a change event an unambiguous meaning',
    body:`<p>The same pair of numbers can mean different things under different topics. Our resized topic reports the new size, not the number of seats added.</p><p>Document that meaning consistently so a consumer does not double-count changes.</p>`,
    question:'Registry emits resized with payload (2, 4). What does it report?',
    choices:[['new','Record 2 now has 4 seats.'],['delta','Four seats were added to record 2’s previous size.'],['owner','Wallet user 2 owns contract 4.']], answer:'new',
    success:'The second value is the replacement size. Source, topic and payload together define the observation.',
    error:'In this interface resized carries the new seat count, not a delta or an identity claim.'
  },
  {
    id:'event-changes', lesson:5, part:1, kind:'code', check:'eventChanges', scenario:'events-changes', short:'Change events', title:'Describe cancellations and the new group size',
    body:`<p>Events need consistent meanings. A cancellation reports the seats released. A resize reports the <em>new</em> seat count, not the delta.</p>
    <p>After cancellation updates the total, emit:</p>
    <pre class="example"><code>abi::emit("cancelled", (id, removed.seats));</code></pre>
    <p>After resize validates and stores the new size, emit:</p>
    <pre class="example"><code>abi::emit("resized", (id, seats));</code></pre>
    <p>A consumer must interpret the topic and payload together. A tuple <code>(2, 4)</code> under resized means record 2 now has 4 seats. It does not mean four seats were added.</p>`,
    task:'Add cancelled and resized events after the corresponding validated changes. Preserve the registered event.',
    hint:'Use the removed record’s seats for cancelled and the replacement seats argument for resized. These three event topics share an (id, seats) tuple format.',
    note:'These checks reject premature or extra events for the individual operations. Later, a failed outer operation will show why even events from successful inner work are not a commit guarantee.',
    success:'Registration, cancellation and resize receipts match their actual record changes. Rejected individual operations emitted none.',
  },
  {
    id:'call-boundary', lesson:5, part:1, kind:'guide', short:'Another contract', title:'Call another contract with typed arguments',
    body:`<p><code>abi::call</code> invokes another contract in DuskVM. It names the target, method, argument type and expected return type.</p><p>This is a nested VM call, not a JavaScript fetch or a wallet request. The callee executes before the Rust call returns its Result.</p>`,
    panelTitle:'Registry asks Venue for a quote', panel:`<dl class="concept-list"><dt>Target</dt><dd>The fixed local Venue ContractId supplied by the runner.</dd><dt>Input</dt><dd>A u64 number of seats, borrowed as &amp;seats.</dd><dt>Output</dt><dd>A u64 quote, decoded using the declared output type.</dd><dt>Failure</dt><dd>A Result error that the shown expect converts to a Registry panic.</dd></dl><p>The target and ABI must match. A successfully compiled caller alone cannot prove that a live callee implements the interface you assumed.</p>`
  },
  {
    id:'call-quote', lesson:5, part:1, kind:'code', check:'callQuote', scenario:'calls-quote', short:'Typed calls', title:'Ask the venue for a quote',
    body:`<p>The runner deploys a separate venue contract at a fixed <em>local test</em> ID. Add this constant inside the module, outside the impl:</p>
    <pre class="example"><code>const VENUE: ContractId = ContractId::from_bytes([0x44; 32]);</code></pre>
    <p>Add a read that forwards the requested seat count:</p>
    <pre class="example"><code>pub fn quote(&amp;self, seats: u64) -&gt; u64 {
    abi::call::&lt;_, u64&gt;(VENUE, "quote", &amp;seats)
        .expect("Venue unavailable")
}</code></pre>
    <p>The underscore lets Rust infer the input type. <code>u64</code> declares the expected output. The call returns a Result. <code>expect</code> propagates failure by panicking rather than inventing a price of zero.</p>
    <p>The fixture changes its rate from 3 to 4 test credits per seat, then goes offline and recovers. A fixed local multiplication cannot reproduce those reads correctly.</p>`,
    task:'Add VENUE and the typed quote call. Keep quotes read-only with respect to registry state.',
    hint:'Use the supplied seats argument, not the registry’s total. The venue method also takes u64 and returns u64.',
    note:'No tokens move. A real integration must select and verify the intended contract and ABI, budget gas, and handle failure. Do not use this fixture ID on a network.',
    success:'Quotes came from the separate venue, followed its changed rate, rejected unavailability and recovered without changing records.',
  },
  {
    id:'call-failure', lesson:5, part:1, kind:'practice', short:'Unavailable callee', title:'A failed quote is not a price of zero',
    body:`<p>The test venue changes its rate and can become unavailable. Registry must use its actual result, not a hard-coded multiplication or a reassuring default.</p><p>At this checkpoint the shown expect propagates an error by panicking. A subsequent valid quote must still work after the venue recovers.</p>`,
    question:'The venue cannot provide a quote. What should the taught Registry method do?',
    choices:[['fail','Fail the quote call rather than inventing a price.'],['zero','Return zero as if the seats were free.'],['cached','Report the old fixed rate as a fresh venue result.']], answer:'fail',
    success:'Failure stays distinguishable from a genuine quote. The later recovery call checks that the workflow still works.',
    error:'Neither zero nor a stale fixed price is a successful current quote. Propagate the callee failure in this implementation.'
  },
  {
    id:'call-coordination', lesson:5, part:2, kind:'guide', short:'Coordinate writes', title:'Keep the registry and venue in agreement',
    body:`<p>Confirmation links two pieces of state: Registry’s confirmed flag and Venue’s booked seats. Updating only one would produce contradictory records.</p><p>The worked entrypoint marks the record, calls Venue, then emits confirmed. It must propagate venue failure so the earlier registry write rolls back too.</p>`,
    panelTitle:'The nested caller changes at each boundary', panel:`<ol class="example-flow"><li><strong>A → Registry</strong><p>Registry checks that A owns the record and that it is still pending.</p></li><li><strong>Registry → Venue</strong><p>Venue sees Registry as its immediate caller, not A.</p></li><li><strong>Return or fail</strong><p>A successful call keeps both updates. Failure must reach the Registry frame to undo its change.</p></li></ol><p>Confirmed records are locked against resize/cancel in this small workflow. Undoing them would need a coordinated venue operation, which is not implemented.</p>`
  },
  {
    id:'call-confirm', lesson:5, part:2, kind:'code', check:'callConfirm', scenario:'calls-confirm', short:'Nested writes', title:'Confirm a record with the venue',
    body:`<p>Add <code>confirmed: bool</code> to Registration and initialize it to false in register. Add <code>is_confirmed(&amp;self, id: u64) -&gt; Option&lt;bool&gt;</code>, following owner_of’s lookup.</p>
    <p>In owned_index, after checking ownership, reject a confirmed record: <code>assert!(!self.records[index].confirmed, "Already confirmed");</code>. This also prevents cancellation or resizing after confirmation, which would otherwise disagree with the venue.</p>
    <p>Add <code>confirm(&amp;mut self, id: u64)</code> with:</p>
    <pre class="example"><code>let index = self.owned_index(id);
let seats = self.records[index].seats;
self.records[index].confirmed = true;
abi::call::&lt;_, ()&gt;(VENUE, "book", &amp;(id, seats))
    .expect("Venue unavailable");
abi::emit("confirmed", (id, seats));</code></pre>
    <p>The venue sees <em>Registry</em> as its caller, not agency A. Its book method accepts a tuple and returns unit. The confirmation flag is set before the external call. Failure must propagate so the registry’s change rolls back too.</p>`,
    task:'Add confirmation storage, getter and entrypoint. Extend the shared guard so confirmed records cannot be changed or confirmed twice.',
    hint:'The new record value includes confirmed: false. is_confirmed uses .map(|record| record.confirmed). Do not ignore the Result from the venue.',
    note:'This minimal workflow locks confirmed seats. Undoing confirmation would need a coordinated venue operation. An untrusted callee may call back into Registry. Review checks and state updates along every reentrant path before using this pattern in production.',
    success:'The venue and registry changed together. Venue failure restored both. Repeated, unauthorized and post-confirmation changes were rejected.',
  },
  {
    id:'call-receipts', lesson:5, part:2, kind:'practice', short:'Observation or commit?', title:'An event is not the whole operation’s outcome',
    body:`<p>An inner call can emit an event before a later outer failure. In this pinned local VM, the test relay can receive attempted-work events even when Registry state rolls back.</p><p>Check the actual operation result and both contracts’ state. A live transaction additionally needs execution and finality tracking.</p>`,
    question:'A raw receipt contains confirmed, but the enclosing Registry operation failed. Can the app declare committed success from that event alone?',
    choices:[['no','No. Check the operation result and state; the event may describe attempted inner work.'],['yes','Yes. Any confirmed topic proves successful final execution.'],['topic','Only if the topic is written in lowercase.']], answer:'no',
    success:'Events are observations. They do not override an enclosing failure or establish network finality.',
    error:'The topic does not establish a commit. The later atomic test makes this boundary visible in actual state and receipt data.'
  },
  {
    id:'interactions-learned', lesson:5, part:2, kind:'earned', short:'Learned', title:'Your registry emits events and calls the venue',
    body:`<p>Your registry emits typed change payloads, reads another contract and confirms seats through a nested write.</p>
    <p>Read the trace by emitting contract: Registry produces confirmed, while the venue produces venue_booked. Identical topic text from an unrelated contract would not establish the same fact.</p>
    <p>The tests inspect local execution, not submission, inclusion or finality on a network. A receipt event alone is not evidence that an entire transaction succeeded.</p>`,
  },
  {
    id:'testing', lesson:6, part:0, kind:'intro', short:'Test the workflow', title:'Check properties across a sequence of calls',
    body:`<p>A successful example is not enough. Tests should cover allowed operations, forbidden ones, boundaries and valid work after a failure.</p>
    <p>Your register has several <strong>invariants</strong> to check. The total equals active record seats, IDs stay stable and owners do not change. Confirmed seats must agree with the venue. Rejected registry calls must preserve both contracts’ state.</p>
    <p>We’ll expose an independent seat sum, confirm two records in one operation, then compile the same source into contract and data-driver artifacts.</p>`,
    task:'Test state relationships and nested rollback before building the final interface.',
    note:'A finite local test suite is not a security proof or a production audit. These are fixed trusted scenarios, not learner-supplied native tests or shell commands.',
  },
  {
    id:'test-oracle', lesson:6, part:0, kind:'guide', short:'Independent check', title:'Check the total against the stored records',
    body:`<p>An <strong>invariant</strong> is a relationship that should remain true across allowed operations. Here, stored count should equal the sum of active record seats.</p><p>If both getters simply return self.count, their agreement cannot detect a broken record total. The second view must read the records independently.</p>`,
    panelTitle:'A useful cross-check', panel:`<dl class="concept-list"><dt>get_count()</dt><dd>Reads the maintained total.</dd><dt>accounted_seats()</dt><dd>Computes a fresh sum from the records.</dd><dt>Actual record reads</dt><dd>Check individual IDs, seats, owners and confirmation flags too.</dd></dl><p>The test can then expose a cancellation that removes a record but forgets to adjust the total. A getter must report disagreement, not secretly repair it.</p>`
  },
  {
    id:'test-invariant', lesson:6, part:0, kind:'code', check:'testInvariant', scenario:'tests-invariant', short:'State invariant', title:'Compare the total with the seats actually stored',
    body:`<p>A separate view can sum the records rather than maintaining another mutable counter:</p>
    <pre class="example"><code>pub fn accounted_seats(&amp;self) -&gt; u64 {
    self.records.iter().map(|record| record.seats).sum()
}</code></pre>
    <p><code>iter</code> borrows records, <code>map</code> reads each seat count, and <code>sum</code> adds them. The return type tells Rust to sum u64 values.</p>
    <p>The runner compares actual record reads, count, ID allocation, ownership, confirmation and venue totals after each action. It adds more create/resize/cancel/confirm combinations rather than testing the getter only on an empty register.</p>
    <details class="try-it"><summary>Should confirmation remove seats from this sum?</summary><p>No. Confirmed records still reserve seats. They remain active and contribute to the ten-seat limit.</p></details>`,
    task:'Add accounted_seats. Run the longer sequence and inspect the records and venue totals, including after rejections.',
    hint:'Keep this a read. Do not repair state or overwrite self.count from inside the getter.',
    note:'There are at most ten active records, so this small linear sum is sufficient. Larger collections need an explicit storage and gas-cost design.',
    success:'Record reads and their seat sum matched the total through the mixed workflow, including all rejected calls.',
  },
  {
    id:'test-coverage', lesson:6, part:0, kind:'practice', short:'Test more than zero', title:'A matching empty state is not enough',
    body:`<p>A hard-coded zero can match an empty register. The sum check therefore runs after creates, resizes, cancellations, confirmations and rejected changes.</p><p>Confirmed records still hold seats and contribute to the total. Finite tests provide useful evidence, not a proof for every possible execution.</p>`,
    question:'Which implementation supplies an independent seat sum?',
    choices:[['sum','Iterate over the active records and sum each record’s seats.'],['count','Return self.count again under a new method name.'],['zero','Return zero because the constructor starts empty.']], answer:'sum',
    success:'The record sum can detect a discrepancy in the maintained count. Repeating the same value cannot.',
    error:'Read the stored records independently. Empty-only examples and duplicate getters can hide the same bug.'
  },
  {
    id:'test-transaction', lesson:6, part:1, kind:'guide', short:'One operation', title:'Choose the boundary that must be atomic',
    body:`<p>Two separate calls that happen one after another are not automatically one all-or-nothing operation. If the second fails, the first may already have succeeded.</p><p>confirm_pair makes the pair a single Registry entrypoint. Calling self.confirm twice is ordinary Rust inside that same frame, while each confirmation still makes a nested venue call.</p>`,
    panelTitle:'Separate requests versus one pair', panel:`<dl class="concept-list"><dt>Two independent confirmations</dt><dd>The first can remain successful even if the second later fails.</dd><dt>One confirm_pair operation</dt><dd>Failure must propagate through the pair’s Registry frame to restore both confirmations and nested venue writes.</dd><dt>Caller context</dt><dd>An ordinary self.confirm method call does not replace the agency caller with a new external caller.</dd></dl>`
  },
  {
    id:'test-atomic', lesson:6, part:1, kind:'code', check:'testAtomic', scenario:'tests-atomic', short:'Outer rollback', title:'Make two confirmations one operation',
    body:`<p>Two separate successful calls do not form one atomic operation. Add a single entrypoint that invokes both confirmations:</p>
    <pre class="example"><code>pub fn confirm_pair(&amp;mut self, first: u64, second: u64) {
    self.confirm(first);
    self.confirm(second);
}</code></pre>
    <p>These are ordinary Rust method calls within the same registry frame, so the agency caller remains the same. Each confirmation still calls the venue.</p>
    <p>Tests try a wrong owner, repeated ID and missing ID. They also lower the venue limit: the first booking succeeds, the second fails. Propagating that failure must restore <em>both</em> confirmation flags and the venue’s earlier write.</p>
    <p>Inspect the rejected pair’s raw receipt. In this pinned local VM, the test relay can receive events from attempted inner work even though the registry’s state rolled back. Never treat those events as committed success.</p>`,
    task:'Add confirm_pair and preserve error propagation. Check full rollback when the second nested booking fails, then successful recovery.',
    hint:'Reuse self.confirm twice. Do not skip the second failure or catch it and return success. Prechecking ownership is fine, but cannot replace handling callee failures.',
    note:'The test relay catches a registry error to report its kind. “Rejected” describes that registry operation, not a live transaction’s final status. Network gas and transaction-input consumption are separate.',
    success:'Failed pairs restored registry and venue state. A later valid pair confirmed both records exactly once.',
  },
  {
    id:'test-failure', lesson:6, part:1, kind:'guide', short:'Fail the second call', title:'Test rollback after work has already happened',
    body:`<p>A failure before the first write cannot show whether earlier work would roll back. The runner lowers Venue’s limit so the first booking fits and the second does not.</p><p>The test compares both confirmation flags and Venue’s booked total with their pre-pair values. It then restores the limit and tries valid work again.</p>`,
    panelTitle:'The important observations', panel:`<ol class="example-flow"><li><strong>Before the pair</strong><p>Record the existing flags and venue seats.</p></li><li><strong>Second booking fails</strong><p>Require the failed Registry operation to restore both contracts, including the first booking.</p></li><li><strong>Recovery</strong><p>A later valid pair succeeds exactly once.</p></li></ol><p>Prechecking owners can avoid some failed attempts, but cannot substitute for propagating a callee error that occurs during execution.</p>`
  },
  {
    id:'test-events', lesson:6, part:1, kind:'practice', short:'Check both states', title:'Use state to verify the rollback claim',
    body:`<p>The failed-pair trace can retain venue_booked and confirmed events for attempted first work. The test still requires both contracts to return to their pre-pair state.</p><p>An equivalent implementation may prevalidate some conditions and emit fewer attempted events. That difference is not permission to keep partial state.</p>`,
    question:'What establishes the required rollback in the local test?',
    choices:[['state','The failed operation result plus unchanged Registry and Venue state.'],['events','The presence of a confirmed event.'],['absence','Only the absence of events, without reading either contract.']], answer:'state',
    success:'Check the operation and both states. Neither presence nor absence of raw events alone demonstrates rollback.',
    error:'Receipt observations alone are insufficient. Compare the pre-operation and post-failure state in both contracts.'
  },
  {
    id:'build-artifacts', lesson:6, part:2, kind:'guide', short:'Two artifacts', title:'Build execution code and its matching interface',
    body:`<p>Forge produces different artifacts from the same source:</p>
    <p>A successful contract build does not prove that an older driver matches a new signature. Here register returns an ID, resize accepts two u64 values and get_registration returns an Option.</p>
    <p>In your own pinned Forge project, the normal development commands are:</p>
    <pre class="example"><code>dusk-forge check
dusk-forge test
dusk-forge build all</code></pre>
    <p>Those project commands are for a trusted local checkout. This website never accepts manifests, test executables or commands: it compiles your source against prepared dependencies in isolation.</p>`,
    panelTitle:'Execution and translation are different jobs', panel:`<dl class="concept-list"><dt>Contract WASM</dt><dd>Runs the contract’s logic and state operations in DuskVM.</dd><dt>Data-driver WASM</dt><dd>Translates typed inputs and outputs and exposes the method schema for a client such as Dusk Connect.</dd><dt>Deployment</dt><dd>A separate network operation. Producing either artifact does not perform it.</dd></dl>`,
    task:'Keep your current file. Continue to build both targets and check the generated method ABI with Dusk Connect.',
    note:'The tuple events in this lesson are inspected as raw receipt data. A client event-decoding interface also needs registered event types and a schema, which the method driver alone does not supply.',
  },
  {
    id:'build-abi', lesson:6, part:2, kind:'guide', short:'Match the interface', title:'Build the client interface from the same source',
    body:`<p>The contract WASM and method data-driver serve different consumers. A driver from an earlier version can have the right method name but the wrong argument or result type.</p><p>In native mode, the final check loads the newly built driver through Dusk Connect and tests its actual schema and encoded arguments. Browser mode instead compares your parsed public interface to a prebuilt reference driver and tests its real encoding. A hash identifies an artifact without proving deployment or correctness.</p>`,
    panelTitle:'Signatures that evolved in this file', panel:`<dl class="concept-list"><dt>register</dt><dd>Now takes one u64 amount and returns a u64 record ID.</dd><dt>get_registration</dt><dd>Now returns Option&lt;u64&gt;, not the earlier bare u64.</dd><dt>resize</dt><dd>Takes an (id, seats) tuple and returns unit.</dd></dl><p>The method driver is not automatically a registered event schema. Signing, network deployment and upgrades remain separate from this build check.</p>`
  },
  {
    id:'build-driver', lesson:6, part:2, kind:'code', check:'buildDriver', scenario:'build-driver', short:'Build and verify', title:'Check the built data-driver against this source',
    body:`<p>No new business method is needed. Run your current contract to repeat the full VM workflow, compile both targets and load the generated driver through the genuine Dusk Connect SDK.</p>
    <p>The isolated checker inspects the method schema and encodes real call arguments:</p>
    <pre class="example"><code>register(2)     → one u64
resize(2, 4)    → an (id, seats) tuple</code></pre>
    <p>It also decodes the largest u64 as an exact decimal string. A JavaScript Number cannot represent every u64 without losing precision.</p>
    <p>Open the build results to inspect artifact sizes, SHA-256 hashes and method signatures. These describe this run’s outputs, not a network deployment.</p>`,
    task:'Run the full build check. Fix any contract or data-driver compilation error, then inspect the actual artifact and schema results.',
    hint:'Keep all public method signatures from the preceding chapters. The private owned_index helper is not a public ABI method. Building alone is not a deployment or an upgrade.',
    note:'This check does not export a deployable project, sign a transaction or register an event schema. Reproduce release artifacts from a pinned Forge project before any reviewed deployment.',
    success:'The VM workflow passed. Both WASM targets built. The matching driver encoded typed arguments and preserved the exact largest u64.',
  },
  {
    id:'building-learned', lesson:6, part:2, kind:'earned', short:'Learned', title:'The register passes a cumulative build check',
    body:`<p>You built state, typed arguments, validation, stable records, contract ownership, receipt events and cross-contract operations in the same file.</p>
    <p>The final run checked state, rejection and recovery, atomic pairs and the method interface. Native mode builds both WASM targets; browser mode interprets the source and checks a prebuilt reference driver.</p>
    <p>This is still a local learning contract. End-user authentication, production event schemas, deployment and upgrade policy, gas budgets and independent review remain separate work.</p>`,
    note:'Your draft and earlier checkpoints are saved in this browser when storage is available. Use All paths to choose another specialization, or Back to review this one.',
  },
];

export const codeSteps = chapters.map((chapter, i) => chapter.kind === 'code' ? i : -1).filter(i => i >= 0);
export const stepsFor = lesson => chapters.map((chapter, i) => chapter.lesson === lesson ? i : -1).filter(i => i >= 0);
export const partSteps = step => stepsFor(chapters[step].lesson).filter(i => chapters[i].part === chapters[step].part);

export function unlocked(state, preview = false) {
  if (preview) return chapters.length - 1;
  if (!state.started) return 0;
  return codeSteps.find(step => !state.checks[chapters[step].check]) ?? chapters.length - 1;
}

export function markChecked(state, step, simulated = false) {
  const check = chapters[step]?.check;
  if (!check) return;
  const checks = simulated ? (state.simulated ??= {}) : state.checks;
  checks[check] = state.source;
  if (check === 'change' && !checks.initial) checks.initial = state.source;
}

const validCount = value => typeof value === 'string' && /^\d{1,20}$/.test(value);
const invalid = () => { throw Error('The local runner returned an invalid result. Run npm run setup:forge and try again.'); };

export function assess(step, result) {
  if (chapters[step]?.kind !== 'code') invalid();
  if (!result?.ok) return result?.phase === 'compile' ? `The ${result.target === 'data-driver' ? 'data-driver' : 'contract'} didn’t compile. Check the compiler details below.` : 'DuskVM couldn’t complete the run. Check the details below.';
  const scenario = chapters[step]?.scenario;
  if (!validCount(result.initial) || !validCount(result.fresh)) invalid();
  if (result.initial !== '0' || result.fresh !== '0') return `A new register starts at ${result.initial !== '0' ? result.initial : result.fresh}. Set count to 0 in new().`;
  if (scenario?.startsWith('records-')) return assessRecords(scenario, result);
  if (chapters[step]?.lesson >= 4) return assessAdvanced(scenario, result);
  if (scenario === 'state') {
    if (!Array.isArray(result.after) || result.after.length !== 3 || !result.after.every(validCount)) invalid();
    if (chapters[step].check === 'change' && result.after.join(',') !== '1,2,3') return `The count after each call was ${result.after.join(', ')}. Each register() call should add exactly one.`;
    return null;
  }
  const expected = scenario === 'arguments'
    ? [['2','accepted','2'],['3','accepted','5'],['1','accepted','6']]
    : scenario === 'validation'
      ? [['2','accepted','2'],['3','accepted','5'],['1','accepted','6'],['0','rejected','6'],['1','accepted','7']]
      : scenario === 'capacity'
        ? [['3','accepted','3'],['8','rejected','3'],['7','accepted','10'],['1','rejected','10'],['0','rejected','10'],['u64::MAX','rejected','10'],['8','accepted','8'],['2','accepted','10']]
        : null;
  if (!expected || result.scenario !== scenario || !Array.isArray(result.calls) || result.calls.length !== expected.length) invalid();
  let before = '0';
  for (const [i, [amount, status, after]] of expected.entries()) {
    const call = result.calls[i], fresh = scenario === 'capacity' && i === 6;
    if (!call || call.call !== `register(${amount})` || !['accepted','rejected'].includes(call.status) || call.fresh !== fresh || !validCount(call.before) || !validCount(call.after)) invalid();
    if (fresh) before = '0';
    if (call.before !== before) return 'The stored count changed between calls. get_count should only read self.count.';
    if (call.status !== status) {
      if (status === 'accepted') return `${call.call} was rejected${fresh ? ' in a fresh register' : ''}. It should change the count from ${before} to ${after}.`;
      return amount === '0' ? 'register(0) was accepted. Reject a zero amount inside the contract.' : `${call.call} was accepted at a starting count of ${before}. Reject calls that push the total above ten.`;
    }
    if (call.after !== after) return status === 'rejected' ? `The count changed to ${call.after} after a rejected call. It should stay at ${before}.` : `${call.call} left the count at ${call.after}. Expected ${after}. Add the supplied amount to self.count.`;
    before = after;
  }
  return null;
}

function assessRecords(scenario, result) {
  const phase = ['empty','ids','save','read','missing','cancel'].indexOf(scenario.slice(8));
  const want = [];
  const add = (call, value, after, size, next, fresh=false) => want.push({call, value:value === null ? null : String(value), after:String(after), size:String(size), next:next === null ? null : String(next), fresh, status:value === null ? 'rejected' : 'accepted'});
  if (phase === 0) {
    add('registration_count()',0,0,0,null);
    add('registration_count()',0,0,0,null,true);
  } else {
    add('next_id()',0,0,0,0);
    for (const row of [['register(2)',0,2,1,1], ['register(0)',null,2,1,1], ['register(3)',1,5,2,2], ['register(6)',null,5,2,2], ['register(5)',2,10,3,3], ['register(u64::MAX)',null,10,3,3]]) add(...row);
    if (phase >= 3) [2,3,5].forEach((seats,id) => add(`get_registration(${id})`,phase === 3 ? seats : `Some(${seats})`,10,3,3));
    if (phase >= 4) for (const id of ['4294967296','u64::MAX']) add(`get_registration(${id})`,'None',10,3,3);
    if (phase === 5) {
      for (const row of [['cancel(1)','()',7,2,3], ['get_registration(2)','Some(5)',7,2,3], ['get_registration(1)','None',7,2,3], ['cancel(1)',null,7,2,3], ['register(3)',3,10,3,4], ['cancel(u64::MAX)',null,10,3,4], ['cancel(0)','()',8,2,4], ['get_registration(3)','Some(3)',8,2,4], ['cancel(2)','()',3,1,4], ['cancel(3)','()',0,0,4], ['register(10)',4,10,1,5], ['get_registration(4)','Some(10)',10,1,5]]) add(...row);
      add('register(8)',0,8,1,1,true);
      add('get_registration(0)','Some(8)',8,1,1);
    } else if (phase === 4) add('get_registration(0)','None',0,0,0,true);
    else add('next_id()',0,0,0,0,true);
  }
  if (phase < 0 || result.scenario !== scenario || !Array.isArray(result.calls) || result.calls.length !== want.length) invalid();
  let before = '0';
  for (const [i, expected] of want.entries()) {
    const row = result.calls[i];
    if (!row || row.call !== expected.call || row.fresh !== expected.fresh || !['accepted','rejected'].includes(row.status) || ![row.before,row.after,row.size].every(validCount) || !(phase === 0 ? row.next === null : validCount(row.next)) || !(row.status === 'rejected' ? row.value === null : typeof row.value === 'string' && /^(?:\d{1,20}|Some\(\d{1,20}\)|None|\(\))$/.test(row.value))) invalid();
    if (row.fresh) before = '0';
    if (row.before !== before) return 'The stored count changed between calls. Getters must only read the register.';
    if (row.status !== expected.status) return expected.status === 'rejected' ? `${row.call} was accepted. Keep the registration guards and reject cancellation of a missing record.` : `${row.call} was rejected. Valid calls must succeed. A missing-record read should return None.`;
    if (row.after !== expected.after) return `${row.call} left ${row.after} reserved seats. Expected ${expected.after}. Preserve the count update, and release only the cancelled record’s seats.`;
    if (row.size !== expected.size && (phase !== 1 || i === 0 || row.fresh)) return `After ${row.call}, ${row.size} records were stored. Expected ${expected.size}. Start empty, append each successful registration and remove only the cancelled record.`;
    if (row.next !== expected.next) return `After ${row.call}, next_id was ${row.next}. Expected ${expected.next}. Allocate once per successful registration. Never decrement or reuse an ID.`;
    if (row.value !== expected.value) return `${row.call} returned ${row.value ?? 'no value'}. Expected ${expected.value}. Return the allocated ID from register, and look up records by their stable ID, not their vector position.`;
    before = expected.after;
  }
  return null;
}

// Fixed local fixture IDs, never network addresses or wallet identities.
export const contractIds = {Registry:'01'.repeat(32), A:'22'.repeat(32), B:'33'.repeat(32), Transfer:'01'+'00'.repeat(31), Venue:'44'.repeat(32)};

function assessAdvanced(scenario, result) {
  const phase = chapters.filter(c => c.lesson >= 4 && c.kind === 'code').findIndex(c => c.scenario === scenario);
  const max = 18446744073709551615n, ids = [0,1,2,3,4,5,6,7,4294967296,max].map(String);
  let records = new Map(), count = 0n, next = 0n, booked = 0n, rate = 3n, limit = 10n, offline = false;
  const want = [];
  const event = (topic,id,seats,source=contractIds.Registry) => {
    const bytes = new Uint8Array(16), view = new DataView(bytes.buffer);
    view.setBigUint64(0,BigInt(id),true); view.setBigUint64(8,BigInt(seats),true);
    return {source,topic,data:Array.from(bytes)};
  };
  const action = (actor,method,...args) => {
    const [a,b] = args.map(n => typeof n === 'boolean' ? n : BigInt(n));
    const before = String(count), r = records.get(String(a)), own = r && r.owner === contractIds[actor] && !r.confirmed;
    let value = '()', events = [];
    const confirm = id => {
      const record = records.get(String(id));
      if (!record || record.owner !== contractIds[actor] || record.confirmed || offline || booked + record.seats > limit) return false;
      record.confirmed = true; booked += record.seats;
      events.push(event('venue_booked',id,record.seats,contractIds.Venue),event('confirmed',id,record.seats));
      return true;
    };
    if (method === 'current_caller') value = contractIds[actor] || 'None';
    else if (method === 'register') {
      if (!['A','B'].includes(actor) || a === 0n || count + a > 10n) value = null;
      else {
        value = String(next); records.set(value,{seats:a,owner:contractIds[actor],confirmed:false}); count += a;
        if (phase >= 4) events.push(event('registered',next,a));
        next++;
      }
    } else if (method === 'cancel') {
      if (!own) value = null;
      else { count -= r.seats; records.delete(String(a)); if (phase >= 5) events.push(event('cancelled',a,r.seats)); }
    } else if (method === 'resize') {
      if (!own || b === 0n || count - r.seats + b > 10n) value = null;
      else { count = count - r.seats + b; r.seats = b; if (phase >= 5) events.push(event('resized',a,b)); }
    } else if (method === 'quote') value = offline ? null : String(a * rate);
    else if (method === 'set_rate') rate = a;
    else if (method === 'set_offline') offline = a;
    else if (method === 'set_limit') limit = a;
    else if (method === 'confirm') { if (!confirm(a)) value = null; }
    else if (method === 'confirm_pair') {
      const previous = structuredClone(records), oldBooked = booked;
      if (!confirm(a) || !confirm(b)) { records = previous; booked = oldBooked; value = null; events = null; }
    }
    const call = `${method}(${args.map(n => method === 'register' && n === max ? 'u64::MAX' : String(n)).join(', ')})`;
    want.push({actor,call,before,after:String(count),status:value === null ? 'rejected' : 'accepted',value,size:String(records.size),next:String(next),booked:String(booked),accounted:phase >= 8 ? String(count) : null,events,
      records:phase === 0 ? [] : ids.map(id => { const r=records.get(id); return {id,seats:r ? String(r.seats) : null,owner:r?.owner ?? null,confirmed:phase >= 7 ? r?.confirmed ?? null : null}; })});
  };
  for (const actor of ['Query','A','B','Transfer']) action(actor,'current_caller');
  if (phase >= 1) for (const [actor,n] of [['Query',2],['Transfer',2],['A',2],['B',3],['A',0],['A',6],['A',5],['A',max]]) action(actor,'register',n);
  if (phase >= 2) for (const [actor,method,n] of [['B','cancel',0],['Query','cancel',0],['Transfer','cancel',0],['A','cancel',1],['A','cancel',0],['A','cancel',0],['B','cancel',1],['A','register',2]]) action(actor,method,n);
  if (phase >= 3) for (const [actor,id,n] of [['B',2,4],['A',2,0],['A',2,9],['A',2,max],['A',2,4],['A',3,6],['A',3,2],['A',99,1],['Query',2,1]]) action(actor,'resize',id,n);
  if (phase >= 6) {
    action('Query','quote',2); action('Query','quote',7); action('Fixture','set_rate',4); action('Query','quote',5);
    action('Fixture','set_offline',true); action('Query','quote',1); action('Fixture','set_offline',false); action('Query','quote',1);
  }
  if (phase >= 7) {
    action('B','confirm',2); action('Fixture','set_offline',true); action('A','confirm',2); action('Fixture','set_offline',false);
    for (const args of [['A','confirm',2],['A','confirm',2],['A','resize',2,1],['A','cancel',2],['A','confirm',99],['Query','confirm',3]]) action(...args);
  }
  if (phase >= 8) for (const args of [['A','register',3],['B','cancel',4],['A','resize',4,4],['A','cancel',4],['A','register',1],['A','confirm',5],['A','cancel',5]]) action(...args);
  if (phase >= 9) {
    action('A','register',1); action('B','register',1);
    for (const [actor,a,b] of [['A',3,7],['A',3,3],['A',3,99],['B',3,7]]) action(actor,'confirm_pair',a,b);
    action('Fixture','set_limit',7); action('A','confirm_pair',3,6); action('Fixture','set_limit',10);
    action('A','confirm_pair',3,6); action('A','confirm_pair',3,6); action('B','confirm',7);
  }
  if (phase < 0 || result.scenario !== scenario || result.advanced !== true || !Array.isArray(result.calls) || result.calls.length !== want.length) invalid();
  const validId = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
  for (const [i, expected] of want.entries()) {
    const row = result.calls[i];
    if (!row || row.actor !== expected.actor || row.call !== expected.call || row.fresh !== false || !['accepted','rejected'].includes(row.status) || ![row.before,row.after,row.size,row.next,row.booked].every(validCount) || !(phase >= 8 ? validCount(row.accounted) : row.accounted === null) || !(row.status === 'rejected' ? row.value === null : typeof row.value === 'string' && /^(?:[0-9a-f]{64}|\d{1,20}|None|\(\))$/.test(row.value)) || !Array.isArray(row.records) || row.records.length !== expected.records.length || !Array.isArray(row.events) || row.events.length > 16) invalid();
    for (const [j,r] of row.records.entries()) if (!r || r.id !== expected.records[j].id || !(r.seats === null || validCount(r.seats)) || !(r.owner === null || validId(r.owner)) || !(r.confirmed === null || typeof r.confirmed === 'boolean')) invalid();
    for (const e of row.events) if (!e || !validId(e.source) || typeof e.topic !== 'string' || e.topic.length > 64 || !Array.isArray(e.data) || e.data.length > 256 || !e.data.every(n => Number.isInteger(n) && n >= 0 && n <= 255)) invalid();
    const label = `${row.actor}: ${row.call}`;
    if (row.before !== expected.before) return `${label}: the count changed between operations. Keep all getters read-only.`;
    if (row.status !== expected.status) return `${label} was ${row.status}. Expected ${expected.status}. Check the stored owner, positive seats, capacity and confirmation rules. Propagate failed venue calls.`;
    if (row.value !== expected.value) return `${label} returned ${row.value ?? 'no value'}. Expected ${expected.value}. Use the VM caller, allocated ID or actual venue result instead of a supplied or fixed substitute.`;
    for (const field of ['after','size','next','booked','accounted']) if (row[field] !== expected[field]) return `${label}: ${({after:'reserved seats',size:'record count',next:'next ID',booked:'venue seats',accounted:'summed record seats'})[field]} was ${row[field]}. Expected ${expected[field]}. Preserve state relationships and roll back both contracts on failure.`;
    for (const [j,r] of row.records.entries()) for (const field of ['seats','owner','confirmed']) if (r[field] !== expected.records[j][field]) return `${label}: record ${r.id} has the wrong ${field}. Bind ownership at creation, keep IDs stable and preserve every field on rejection. Missing records return None.`;
    // Prevalidating a pair may avoid attempted events. Either implementation is
    // valid if state rolls back; raw receipt events alone do not prove success.
    if (phase >= 4 && expected.events !== null) {
      const emitted = phase === 4 ? row.events.filter(e => e.topic === 'registered') : row.events;
      if (JSON.stringify(emitted.map(({source,topic,data}) => ({source,topic,data}))) !== JSON.stringify(expected.events)) return `${label}: receipt events did not match. Check the emitting contract, topic, (id, seats) payload and emission after guards.`;
    }
  }
  if (scenario === 'build-driver') {
    const b = result.build;
    if (!b || ![b.contract,b.driver].every(a => a && Number.isInteger(a.bytes) && a.bytes > 0 && a.bytes <= 1048576 && validId(a.sha256)) || !Array.isArray(b.functions) || b.functions.length > 40 || !b.functions.every(f => f && [f.name,f.input,f.output].every(s => typeof s === 'string' && s.length <= 160))) invalid();
    if (b.encodedRegister !== '0200000000000000' || b.encodedResize !== '02000000000000000400000000000000' || b.decodedMax !== '18446744073709551615' || !['register','resize','cancel','confirm','confirm_pair','accounted_seats','get_registration'].every(name => b.functions.some(f => f.name === name))) return 'The built method driver did not match the contract ABI or preserve exact u64 values. Rebuild both targets from the current source.';
  }
  return null;
}

// Numeric positions in the old curriculum; keep only this map, not old pages.
const legacyIds = ['begin','state','entrypoint','learned','groups','arguments','arguments-learned','rules','positive','capacity','validation-learned','records','record-storage','record-ids','record-save','record-read','record-missing','record-cancel','records-learned','permissions','permission-caller','permission-owner','permission-cancel','permission-resize','permissions-learned','interactions','event-register','event-changes','call-quote','call-confirm','interactions-learned','testing','test-invariant','test-atomic','build-artifacts','build-driver','building-learned'];

export function serialize(state) {
  return JSON.stringify({...state, version:3, step:chapters[state.step].id, active:chapters[state.active].id});
}

export function restore(raw, preview = false) {
  const fresh = {version:3, step:0, started:false, active:codeSteps[0], name:'', source:starter, checks:Object.fromEntries(codeSteps.map(step => [chapters[step].check, null])), answers:{}};
  try {
    if (!raw || raw.length > (codeSteps.length * 2 + 1) * 48000 + 10000) return fresh; // Both runtime histories plus current source, including JSON escaping.
    const value = JSON.parse(raw);
    if (![1,2,3].includes(value?.version)) return fresh;
    const position = saved => chapters.findIndex(c => c.id === (value.version === 3 ? (typeof saved === 'string' ? saved : null) : Number.isInteger(saved) ? legacyIds[saved] : null));
    const validSource = source => typeof source === 'string' && new TextEncoder().encode(source).length <= 8000;
    if (validSource(value.source)) fresh.source = value.source;
    if (typeof value.name === 'string') fresh.name = cleanName(value.name);
    fresh.started = value.started === true;
    // Successful checkpoints are a chain; ignore dangling or blank saved checks.
    for (const step of codeSteps) {
      const key = chapters[step].check, checked = value.checks?.[key];
      if (!validSource(checked) || !checked.trim()) break;
      fresh.checks[key] = checked;
      fresh.active = step;
      fresh.started = true;
    }
    if (value.version === 3) for (const i of codeSteps) {
      const check = chapters[i].check, source = value.simulated?.[check];
      if (validSource(source) && source.trim()) {
        (fresh.simulated ??= {})[check] = source; fresh.started = true;
        if (preview) fresh.active = Math.max(fresh.active, i);
      } else if (!fresh.checks[check]) break;
    }
    const limit = unlocked(fresh, preview), step = position(value.step), active = position(value.active);
    if (value.version !== 1 && codeSteps.includes(active) && active <= limit) fresh.active = Math.max(fresh.active, active);
    if (step >= 0 && step <= limit) fresh.step = step;
    if (chapters[fresh.step].kind === 'code') fresh.active = Math.max(fresh.active, fresh.step);
    if (value.version === 3) for (const chapter of chapters) {
      if (chapter.choices?.some(([answer]) => answer === value.answers?.[chapter.id])) fresh.answers[chapter.id] = value.answers[chapter.id];
    }
  } catch { /* Invalid or unavailable storage must not block the lessons. */ }
  return fresh;
}
