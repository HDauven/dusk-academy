// Independent paths with cumulative exercises, worked examples and optional practice.
export const courses = {
  dusk: {
    title:'Start with Dusk', language:null,
    lessons:[{title:'Dusk, privacy and policy', skill:'Privacy and policy', start:'begin', end:'learned', check:'policy'}],
    parts:['A shared record','Public and private information','Credentials and policy'],
    chapters:[
      {id:'begin', part:0, kind:'intro', short:'Start here', title:'Understand what Dusk does',
       body:`<p><strong>Dusk is a blockchain network designed for financial applications.</strong> A blockchain is a shared record maintained by a network of computers, rather than just one website’s database.</p><p>You do not need to know Rust, own cryptocurrency or connect a wallet for this introduction. We’ll explain the pieces before asking you to use their names.</p><p>We’ll follow a workshop that takes registrations through a website and at its front desk. Both need to agree on the same count. Later, the workshop will need to check who may enter without publishing their identity documents.</p><p>First we’ll look at shared records and transactions, then privacy, then credentials and service rules.</p>`,
       note:'15 short chapters. Worked examples and optional practice prepare you for three checkpoint questions. Nothing here sends a transaction or checks a real identity.'},
      {id:'why-dusk', part:0, kind:'guide', short:'Why Dusk?', title:'Why put a record on a blockchain?',
       body:`<p>One business can often use an ordinary database. A blockchain becomes useful when independent participants need a common record and rules they can verify without relying only on one participant’s private system.</p><p>Dusk supports issuing digital assets, recording ownership and applying transfer rules. A digital token can represent an asset, but software alone does not establish the legal rights behind it.</p><p>Those workflows may need both confidentiality and oversight. Publishing every balance or identity document is not the only way to check whether an action follows the rules.</p><p>Updates are grouped into <strong>blocks</strong>. The network uses <strong>consensus</strong> rules to agree on that shared history. <strong>Finality</strong> is when the network treats a block as settled under those rules, rather than still allowing it to be replaced.</p>`,
       panelTitle:'One example, two levels', panel:`<ol class="example-flow"><li><strong>Our teaching example</strong><p>A website and a front desk read one workshop registration count.</p></li><li><strong>A financial application</strong><p>An issuer, trading venue and asset holder coordinate records and eligibility rules.</p></li><li><strong>The limit</strong><p>A shared record cannot tell whether an off-chain statement is true without a trustworthy source.</p></li></ol><details class="try-it"><summary>Does every workshop need a blockchain?</summary><p>No. A single operator may be better served by a database. The workshop is a small example for learning how shared contract state works.</p></details>`},
      {id:'shared-state', part:0, kind:'practice', short:'Shared state', title:'Separate the record from its display',
       body:`<p><strong>State</strong> means the information a system currently stores. Our register’s state might be a count of 4.</p><p>An app reads that count and displays it. Changing the text on a web page does not change the contract’s stored value. A second app can read the same contract independently.</p><p>Apps can also show stale, cached information. When comparing their results, make sure they read the same finalized state rather than different moments in the network’s history.</p>`,
       question:'The stored count becomes 5. Two apps make fresh reads of that same finalized state. What should they read?',
       choices:[['same','Both read 5, even though their interfaces can look different.'],['separate','Each app keeps its own independent contract count.'],['screen','Whichever number was last typed into either website.']], answer:'same',
       success:'Both read the same stored value. The interface displays the contract’s state without defining it.',
       error:'The apps are reading one shared record. A local display or an old cache is not a separate contract state.'},
      {id:'wallets', part:0, kind:'guide', short:'Wallets', title:'What does a wallet actually do?',
       body:`<p>A <strong>wallet</strong> manages the keys used to authorize actions. A private key can produce a digital signature that the network can check without receiving the key.</p><p>An address identifies an account or destination in the relevant transaction model. A signature proves control of a key, not someone’s legal identity or permission to use every service.</p><p>The wallet asks you to approve an action. Your app should not ask for a recovery phrase or private key. The network records balances and contract state. The wallet displays them.</p>`,
       panelTitle:'Keep these separate', panel:`<dl class="concept-list"><dt>Address</dt><dd>An identifier used to receive or refer to funds or an account.</dd><dt>Private key</dt><dd>A secret used to authorize actions. Never paste it into this course or a dApp.</dd><dt>Signature</dt><dd>Evidence that a key authorized particular data. It does not prove a person’s identity.</dd><dt>Wallet approval</dt><dd>A user decision about a specific request, not permanent permission for every future action.</dd></dl>`,
       note:'No wallet is needed in this path. The dApp path later offers optional discovery of an installed Dusk wallet.'},
      {id:'transaction-flow', part:0, kind:'practice', short:'A transaction', title:'A request is not yet a completed change',
       body:`<p>A <strong>transaction</strong> is a request for a network action, such as transferring value or calling a contract to add a registration.</p><p>The user authorizes the request, it is submitted to a node, and the network may admit and execute it. The app must check whether execution succeeded and whether its block is finalized. A node is a computer participating in the network. It is separate from the wallet.</p><p><strong>Gas</strong> measures execution work. Network transactions can incur fees in DUSK, the network’s native token, even when a contract call transfers no tokens. A failed execution can still pay gas. Our local lessons do not charge network fees.</p>`,
       question:'The app has a transaction hash after submission. Can it promise that the registration is final?',
       choices:[['final','Yes. Having a hash proves successful, final execution.'],['wait','No. It must check execution success and block finality.'],['balance','Yes, as long as the wallet displayed a balance.']], answer:'wait',
       success:'A hash identifies a transaction. It is not proof that the contract succeeded or that the block is final.',
       error:'Submission, successful execution and finality are different events. The app must not treat a hash as final success.'},
      {id:'contracts', part:1, kind:'guide', short:'Contracts', title:'Put shared rules in a contract',
       body:`<p>A <strong>smart contract</strong> is a program whose rules govern its on-chain state. Our register might allow an addition only when the new count is at most 10.</p><p>The website can check this before asking for approval, but the contract must enforce it too. Other callers do not have to use our website.</p><p><strong>DuskVM</strong> executes native Dusk contracts. Developers write Rust, and the program is compiled to WebAssembly, a format the VM can run. <strong>Dusk Forge</strong> is the development tooling that helps build these contracts and their interfaces.</p><p>DuskEVM is a separate, Ethereum-compatible execution environment. This academy’s development paths use DuskVM.</p>`,
       panelTitle:'Read or request a change?', panel:`<ol class="example-flow"><li><strong>Read</strong><p>“What is the current count?” The app asks for the stored value.</p></li><li><strong>Request a change</strong><p>“Add three registrations.” The user authorizes a transaction and the contract checks its rules.</p></li><li><strong>Observe the result</strong><p>A rejected call must not be displayed as three confirmed new registrations.</p></li></ol>`},
      {id:'public-record', part:1, kind:'practice', short:'Public data', title:'A hidden field is not private data',
       body:`<p><strong>On-chain</strong> means recorded or processed by the blockchain. <strong>Off-chain</strong> means outside it, such as on a user’s device or in a service’s database.</p><p>If you publish a visitor’s name in ordinary public contract data, removing the name from the website does not remove copies of that information from the world.</p><p>Privacy is about what observers can learn from state, inputs, events and other metadata. Hiding a field in CSS or marking it private in Rust does not encrypt it.</p>`,
       question:'A developer hides a visitor’s already-public name in the website. What has changed?',
       choices:[['secret','The name is now confidential on-chain.'],['display','Only that interface changed. The published information is still available.'],['deleted','The chain automatically deletes the old value and all copies.']], answer:'display',
       success:'The display changed, not the disclosure. Decide what must remain private before publishing it.',
       error:'Interface visibility is not confidentiality. Already-published data cannot be made secret retroactively.'},
      {id:'transactions', part:1, kind:'quiz', short:'Two models', title:'Public and shielded transfers',
       body:`<p>Dusk has two transaction models, Moonlight and Phoenix.</p><p><strong>Moonlight</strong> uses public accounts with visible balances and transfer details. <strong>Phoenix</strong> uses shielded notes and zero-knowledge proofs to protect transfer details. A note represents value that its owner can spend, rather than a visible account balance.</p><p>Neither name means that every application field becomes confidential. A contract must deliberately choose its private data, public data and verification rules.</p>`,
       question:'Which statement should the workshop’s developer rely on?',
       choices:[['automatic','Every Dusk transaction and contract field is private.'],['explicit','Moonlight is public. Phoenix supports shielded transfers. Contract privacy needs its own design.'],['evm','Only an EVM contract can use privacy on Dusk.']], answer:'explicit',
       success:'Moonlight is public and Phoenix supports shielded transfers. The application still controls what its own data reveals.',
       error:'Moonlight is public. Phoenix protects shielded transfers, while contract privacy depends on the application.'},
      {id:'proof-basics', part:1, kind:'guide', short:'Proofs', title:'Check a statement without seeing every input',
       body:`<p>A <strong>zero-knowledge proof</strong> lets a prover demonstrate that a defined statement is satisfied without revealing its private inputs through the proof.</p><p>For a small arithmetic example, the prover knows two numbers whose sum is 9. The verifier checks a proof about that sum, rather than receiving both numbers. The statement, public inputs and verification rules must all be specified.</p><p>This is different from simply hashing data or encrypting a file. It is also not proof that those numbers came from a real bank balance. A connection to trusted records requires additional design.</p>`,
       panelTitle:'The sum example', panel:`<dl class="concept-list"><dt>Private inputs</dt><dd>The two numbers known to the prover.</dd><dt>Public statement</dt><dd>“These inputs satisfy the sum relation for total 9.”</dd><dt>Proof</dt><dd>Cryptographic evidence checked under the intended circuit’s rules.</dd><dt>What it does not establish</dt><dd>The origin of the numbers, the prover’s identity or permission to enter a service.</dd></dl>`,
       note:'The circuit path builds and verifies this small example with real PLONK tooling. This page is an explanation, not a live proof.'},
      {id:'disclosure', part:1, kind:'quiz', short:'Data choices', title:'Keep the credential off-chain',
       body:`<p>The workshop wants to admit eligible visitors. Its public registration count does not need to contain everyone’s identity document.</p><p>Keep sensitive attributes off-chain. Where the chosen protocol supports it, verify the required claim and disclose only what the service needs. Off-chain storage still needs access controls and a retention policy.</p><p>Choose this boundary before publishing. A later privacy feature cannot make previously public personal information secret.</p>`,
       question:'Which design avoids publishing the visitor’s identity document?',
       choices:[['document','Store the document in a contract and hide it in the website.'],['later','Publish it now and add privacy to the contract later.'],['proof','Keep it off-chain and verify the required claim with an appropriate credential/proof flow.']], answer:'proof',
       success:'The service can verify a supported claim without publishing the underlying document. Its off-chain handling still matters.',
       error:'Hiding a field in the interface does not remove it from the chain. Keep sensitive data off-chain from the start.'},
      {id:'credentials', part:2, kind:'guide', short:'Credentials', title:'Who vouches for an eligibility claim?',
       body:`<p>A visitor typing “I am eligible” is only making a claim. A <strong>credential</strong> connects a claim to an issuer that the service is prepared to trust.</p><p><strong>Citadel 2</strong> is Dusk’s private credential protocol. A license provider checks a user off-chain, signs relevant attributes and registers a license. The user can prove possession of a registered provider-signed license without publishing personal attributes or identifying the exact license used.</p><p>The service then decides whether to accept the session. Cryptographic validity and service permission are separate decisions.</p>`,
       panelTitle:'Three roles in the flow', panel:`<ol class="example-flow"><li><strong>License provider</strong><p>Performs the relevant checks and issues a signed license.</p></li><li><strong>User</strong><p>Holds the license and produces evidence through the protocol.</p></li><li><strong>Service provider</strong><p>Checks the session and applies its own trust and access policy.</p></li></ol>`,
       note:'This is a conceptual walkthrough. The academy neither issues licenses nor asks you to submit identity documents.'},
      {id:'selective-disclosure', part:2, kind:'practice', short:'Reveal less', title:'Ask for the evidence the service needs',
       body:`<p><strong>Selective disclosure</strong> means revealing only particular information, or proving a supported condition, instead of sharing an entire record.</p><p>Suppose the workshop’s rule is possession of an accepted license. It should not collect a passport image merely because such an image exists elsewhere in the process.</p><p>The exact proof and disclosure options depend on the protocol. Publishing a proof can still reveal public inputs or linkable metadata. An application must consider those too.</p>`,
       question:'What should this workshop ask the visitor to provide?',
       choices:[['minimum','The supported evidence required by its license policy, not the whole identity document.'],['everything','All identity attributes, because more data always means better compliance.'],['nothing','Nothing. A wallet connection proves eligibility.']], answer:'minimum',
       success:'Minimize the disclosure while still enforcing the actual rule. A wallet connection is not a credential check.',
       error:'Ask for evidence of the required claim. Neither collecting every attribute nor accepting a wallet connection substitutes for that policy.'},
      {id:'session-rules', part:2, kind:'practice', short:'Session rules', title:'A valid session is not unlimited access',
       body:`<p>A proof or signature does not choose which issuers the workshop trusts. It also does not, by itself, decide how long access lasts or whether evidence may be reused.</p><p>The application needs appropriate scope, expiry, revocation and replay handling. For example, evidence intended for a different service or an already-used one-time session should not silently grant fresh access here.</p><p>These checks need actual mechanisms in the chosen protocol and service. Writing a policy sentence is not the same as enforcing it.</p>`,
       question:'A session is cryptographically valid, but the service’s policy says it is expired. Should the service grant access?',
       choices:[['grant','Yes. Cryptographic validity overrides the policy.'],['reject','No. It must also satisfy the service’s current access policy.'],['public','Only if the user publishes their full identity record.']], answer:'reject',
       success:'A valid proof can establish only its defined statement. The service must still enforce its current access rules.',
       error:'The service must enforce expiry and its other policy checks, not treat mathematical validity as unconditional authorization.'},
      {id:'policy', part:2, kind:'quiz', short:'Compliance', title:'Combine privacy with enforceable policy',
       body:`<p>We can now distinguish a wallet signature, a public state change and a private credential proof. None is a universal compliance verdict.</p><p>Citadel 2 supports private credential workflows. <strong>XSC</strong> is a confidential security-contract standard for tokenized securities, including asset-specific eligibility and transfer rules. Their roles are related, but they are not interchangeable features.</p><p>A real application still needs appropriate issuers, implemented rules, operational controls and legal assessment for its use case. Deploying it on Dusk does not supply those decisions automatically.</p>`,
       note:'This lesson explains credential policy without calling a credential API. Check the current Citadel documentation before choosing implementation tools.',
       question:'A credential proof verifies. What must the workshop still check?',
       choices:[['accept','Accept every mathematically valid proof.'],['policy','Trusted issuer, required claim, expiry/revocation and the session’s scope and replay rules.'],['collect','Publish all identity attributes so anyone can decide.']], answer:'policy',
       success:'Proof verification establishes a defined statement. Trusted sources and enforced policy determine whether the service should act on it.',
       error:'Verification alone does not choose a trusted issuer, grant permission or prevent replay. The application must enforce its policy.'},
      {id:'learned', part:2, kind:'earned', short:'Choose a path', title:'Choose what you want to build',
       body:`<p>A shared record is different from its website. A wallet authorizes requests. The app must still check execution success and finality. Privacy depends on what a protocol and application reveal.</p><p>You’ve checked the boundaries between public transfers, shielded transfers and application privacy, and between a valid credential proof and a service’s policy.</p><p>Choose <strong>Contracts</strong> to write the register’s rules, <strong>dApps</strong> to read it from a browser, or <strong>Circuits</strong> to build a provable relation. These are independent specializations, not a mandatory order.</p>`},
    ],
  },
  dapps: {
    title:'DuskVM dApp development', language:'javascript',
    lessons:[
      {title:'Read and prepare a contract call', skill:'Dusk Connect client', start:'begin', end:'learned', check:'wallet'},
      {title:'Explore registration records', skill:'Read-only registry client', start:'explorer', end:'explorer-learned', check:'explorer-recovery'},
    ],
    parts:['Read the register','Prepare typed arguments','Wallets and outcomes','Look up records','Interpret the response'],
    starter:`const { createDuskApp } = await import(
    new URL("/academy/vendor/dusk-connect.js", location.origin).href
);

export function createApp(nodeUrl, contractId) {
    return createDuskApp({
        pinnedNodeUrl: nodeUrl,
        autoConnect: false,
        wallet: { waitForProvider: false, rememberLastUsedProvider: false },
        contracts: {
            registry: {
                contractId,
                driverUrl: new URL("/api/registry-driver", nodeUrl).href,
            },
        },
    });
}

export async function readCount(dusk) {
    return 0;
}

export async function prepareRegistration(dusk, amount) {
    return null;
}
`,
    chapters:[
      {id:'begin', part:0, kind:'intro', short:'The app', title:'Read the register from a dApp',
       body:`<p>The workshop’s count belongs to a contract, not to a browser tab. A <strong>dApp</strong> is the application interface that lets a user read that state and request actions.</p><p>You’ll use <strong>Dusk Connect</strong>, the official browser SDK (software development kit). It supplies reusable code for working with nodes, contract interfaces and wallets. The setup is supplied, so you can concentrate on returning a read result and preparing one typed call.</p><p>We’ll first separate the app, node, wallet and contract. Then you’ll extend two functions in the same JavaScript file, inspect their results and learn where wallet approval and finality fit.</p>`,
       note:'15 short chapters. The real SDK reads two supplied fixtures, using DuskVM in native mode or simulated transport in browser mode. No wallet, tokens or completed contract lesson is required. No transaction will be sent.'},
      {id:'components', part:0, kind:'guide', short:'Four pieces', title:'Know which component does the work',
       body:`<p>The <strong>app</strong> displays information and asks for actions. A <strong>node</strong> provides access to network data. The <strong>contract</strong> defines the stored state and rules.</p><p>The <strong>wallet</strong> manages authorization. A public read does not need a signature, whereas a live write requires a transaction flow with user approval.</p><p>Dusk Connect joins these pieces through an API. It does not move the contract into the browser or give the website access to the wallet’s private keys.</p>`,
       panelTitle:'The read you will implement', panel:`<ol class="example-flow"><li><strong>Your function</strong><p>Asks Dusk Connect to read <code>get_count</code>.</p></li><li><strong>Node / local adapter</strong><p>Returns the contract’s encoded result. Native mode uses local DuskVM; browser mode uses simulated fixture bytes.</p></li><li><strong>Data-driver</strong><p>Decodes the bytes into a value the app can use.</p></li><li><strong>Interface</strong><p>Displays that returned count without inventing its own state.</p></li></ol>`},
      {id:'address', part:0, kind:'guide', short:'Which contract?', title:'Choose a contract and a read endpoint',
       body:`<p>A contract ID identifies the contract being called. A node URL identifies where the app sends its read request. Neither is the user’s wallet address.</p><p>The supplied <code>createApp(nodeUrl, contractId)</code> creates a <code>registry</code> preset with the correct contract and its generated data-driver URL.</p><p><code>pinnedNodeUrl</code> keeps reads on the supplied endpoint, instead of allowing wallet metadata to change it. A deployed app must separately check the network on which the wallet will send a transaction.</p>`,
       panelTitle:'The supplied preset', panel:`<pre class="example"><code>contracts: {
    registry: {
        contractId,
        driverUrl: new URL(
            "/api/registry-driver", nodeUrl
        ).href,
    },
}</code></pre><p><code>registry</code> is your local preset name. <code>get_count</code> will be the actual method name.</p><p>The two fixture IDs are local adapter aliases, not deployed network addresses.</p>`},
      {id:'await', part:0, kind:'practice', short:'Wait for a read', title:'A read result arrives asynchronously',
       body:`<p>A request takes time. JavaScript represents the pending result with a <strong>Promise</strong>. An <code>async</code> function can use <code>await</code> to obtain the resolved value.</p><pre class="example"><code>const count = await dusk.readContract({
    contract: "registry",
    functionName: "get_count",
});</code></pre><p>Our exercise calls your <code>readCount</code> function and awaits what it returns. Return the result, rather than only assigning it to a local variable. Returning the read Promise directly from an async function is also valid.</p>`,
       question:'Without await, what does dusk.readContract(...) immediately return?',
       choices:[['number','The final count is always available immediately.'],['promise','A Promise for the read result.'],['signature','A wallet transaction signature.']], answer:'promise',
       success:'Await resolves the Promise. The caller still needs your function to return its result.',
       error:'A contract read is asynchronous. The immediate return is a Promise, not a wallet signature or an already-resolved count.'},
      {id:'read', part:0, kind:'code', scenario:'read', short:'Read state', title:'Load the count with Dusk Connect',
       body:`<p>The <code>registry</code> preset selects the contract and driver. The <code>functionName</code> selects its getter:</p><pre class="example"><code>await dusk.readContract({
    contract: "registry",
    functionName: "get_count",
});</code></pre><p>The getter has no argument, so this call does not need <code>args</code>. Connect obtains the encoded response and uses the driver to decode it.</p><p>The two test registers hold different values: 2 and 7. Returning a fixed value cannot correctly read both.</p>`,
       task:'Replace return 0 in readCount with the awaited readContract result. Both test registers should show their own count.',
       hint:'Return await dusk.readContract({ contract: "registry", functionName: "get_count" });',
       note:'These are actual local reads, not wallet transactions. Keep the supplied client setup unchanged.'},
      {id:'precision', part:1, kind:'practice', short:'Exact values', title:'Keep the returned count exact',
       body:`<p>The register’s <code>u64</code> can hold integers larger than JavaScript’s <code>Number</code> can represent exactly. Small examples such as 2 and 7 do not reveal that problem.</p><p>The supplied data-driver returns the count as a decimal string. Displaying that string preserves its digits. Avoid blindly converting every returned integer with <code>Number(...)</code>.</p><p>For integer arithmetic, <code>BigInt</code> can preserve precision, but arguments still need the serialization expected by the SDK and driver. A display value and an encoded call argument are different things.</p>`,
       question:'How should an app display the returned string "18446744073709551615" without losing digits?',
       choices:[['number','Convert it to Number and then back to text.'],['string','Display the returned decimal string.'],['round','Round it because blockchain counts are approximate.']], answer:'string',
       success:'Keep the decimal string for display. Number cannot represent every u64 exactly.',
       error:'Converting a large u64 to Number can round it. Preserve the returned string for an exact display.'},
      {id:'driver', part:1, kind:'guide', short:'The data-driver', title:'Let the generated driver handle the ABI',
       body:`<p>The contract accepts typed bytes, not arbitrary JavaScript objects. Its <strong>ABI</strong> is the agreement about method names and how arguments and results are represented.</p><p>Forge generates a WebAssembly <strong>data-driver</strong> for that interface. Connect uses it to encode inputs and decode outputs. The driver translates data without executing the contract.</p><p>Use a driver built for the contract you intend to call. A mismatched driver or method signature is not fixed by guessing a different byte layout in the app.</p>`,
       panelTitle:'One encoding from this contract', panel:`<dl class="concept-list"><dt>Method</dt><dd><code>register(amount: u64)</code></dd><dt>Input</dt><dd>The registration count <code>2</code>.</dd><dt>Generated bytes</dt><dd><code>02 00 00 00 00 00 00 00</code> for this pinned driver.</dd><dt>State change?</dt><dd>None. Encoding arguments is not calling the contract.</dd></dl><details class="try-it"><summary>Should you construct these bytes by hand?</summary><p>No. Let the matching generated driver handle the ABI, including when the contract interface changes.</p></details>`},
      {id:'value', part:1, kind:'practice', short:'Count or payment?', title:'Separate the argument from token value',
       body:`<p>Our method calls its parameter <code>amount</code>, but it counts registrations, not tokens. In Connect, <code>args</code> carries that method input.</p><p>The prepared transaction’s separate <code>amount</code> and <code>deposit</code> fields describe token values in Lux, the base unit of DUSK. Our exercise sets both to <code>"0"</code>.</p><p>Zero attached tokens does not promise a free live transaction. Gas fees are separate from the registration argument and attached value.</p>`,
       question:'To prepare three registrations with no attached tokens, what should you set?',
       choices:[['args','args: 3, amount: "0", deposit: "0".'],['tokens','args: 0, amount: "3", deposit: "0".'],['gas','Only increase the gas limit. The count is inferred from it.']], answer:'args',
       success:'args supplies register’s input. Attached token values and gas are separate concerns.',
       error:'The registration count belongs in args. The transaction amount is a token value, not the contract parameter just because both use the word amount.'},
      {id:'prepare', part:1, kind:'code', scenario:'prepare', short:'Prepare a call', title:'Encode a registration request',
       body:`<p><code>prepareContractCall</code> uses the driver to encode the argument and returns parameters for a future wallet request:</p><pre class="example"><code>await dusk.prepareContractCall({
    contract: "registry",
    functionName: "register",
    args: amount,
    privacy: "public",
    amount: "0",
    deposit: "0",
});</code></pre><p>Use the function’s supplied <code>amount</code> parameter as <code>args</code>, so the same function can prepare different registration counts.</p><p>Keep your working <code>readCount</code>. The tests still read both registers before checking the prepared arguments.</p>`,
       task:'Return the awaited prepared call from prepareRegistration. Use its amount parameter as args.',
       hint:'Replace return null with the prepareContractCall expression shown above, prefixed by return.',
       note:'Preparation neither signs nor sends. The counts stay unchanged. The tests decode the prepared bytes with the actual data-driver.'},
      {id:'review-call', part:1, kind:'practice', short:'Review the call', title:'Check the request, not just its caption',
       body:`<p>A prepared call describes an intended action. Before a user approves a real transaction, the app should make the target network, contract, method, arguments and values clear.</p><p>A friendly site label is not evidence that the encoded request matches it. The request data and the wallet’s approval view matter.</p><p>Our local fixture IDs must not be copied into a live wallet request as though they were deployed addresses. A deployed app needs the correct contract and driver for the chosen network.</p>`,
       question:'What is the useful review before approving a real registration transaction?',
       choices:[['caption','Only the website’s “Register” button label.'],['details','The intended network, contract, method, arguments and token values.'],['connected','Whether the site has been connected once before.']], answer:'details',
       success:'Check the actual intended request. A prior connection or a friendly label does not authorize every call.',
       error:'Review the request details. Neither a button caption nor a previous connection establishes what this transaction will do.'},
      {id:'discovery', part:2, kind:'guide', short:'Discover a wallet', title:'Discovery is not permission to transact',
       body:`<p>Several compatible wallet extensions may be installed. Dusk Connect can discover their providers and let the user choose one.</p><p><code>createDuskWallet()</code> or <code>dusk.wallet</code> exposes the wallet connection. <code>ready()</code> waits for initial discovery and refresh. It does not request transaction approval.</p><p><code>connect()</code> requests profile access. Transaction approval is a separate step, and the user can decline it. An app must also respond if the selected wallet, profile or network changes.</p>`,
       panelTitle:'Three different questions', panel:`<ol class="example-flow"><li><strong>Discovery</strong><p>Which compatible wallet providers are available?</p></li><li><strong>Connection</strong><p>Which profiles has the user allowed this site to access?</p></li><li><strong>Transaction approval</strong><p>Does the user authorize this specific action?</p></li></ol>`,
       note:'The next checkpoint offers optional real wallet discovery. It remains separate from the editable code and never submits this exercise’s calls.'},
      {id:'wallet', part:2, kind:'quiz', wallet:true, short:'Wallet approval', title:'Ask before sending a transaction',
       body:`<p>You have read state and prepared arguments without requesting a signature. Preparation creates data without changing the contract.</p><p>A deployed app would request a user-approved transaction through the selected wallet. Profile access alone is not permission for that write.</p><p>After submission, the app still has to establish the execution outcome and finality. We’ll examine that distinction next without sending any transaction here.</p>`,
       note:'Optional discovery below uses the actual SDK. Editable code runs in a worker without access to your injected wallet.',
       question:'Does preparing register(2) increase the on-chain count?',
       choices:[['yes','Yes, encoding the arguments executes the method.'],['approval','No. A wallet must approve and send a transaction, which must then execute successfully.'],['connect','Connecting the wallet automatically sends the prepared call.']], answer:'approval',
       success:'The prepared call remains unsigned data. Connection, approval, submission and successful execution are separate steps.',
       error:'A prepared call is unsigned data. Connection, transaction approval, submission and successful execution are separate steps.'},
      {id:'receipt', part:2, kind:'practice', short:'Track the outcome', title:'Do not turn a transaction hash into success',
       body:`<p>A returned hash identifies a transaction without proving that the contract ran successfully. On Dusk L1, admission to a node’s mempool is also different from block execution.</p><p>The official lifecycle distinguishes execution success from block finality. Even an executed transaction can have an error, and an accepted block can still be reverted before finalization.</p><p>A live app must check the execution result and the block’s finalized status before claiming final success. It should then read the relevant state, rather than permanently assuming an optimistic count.</p>`,
       question:'An executed transaction has a non-null error. Should the UI show a successful registration?',
       choices:[['hash','Yes, because a hash exists.'],['failed','No. Report the failed execution without counting a new registration.'],['mempool','Yes, if it once entered a mempool.']], answer:'failed',
       success:'Execution can fail even after submission and admission. Failed execution can still consume a nonce or notes and pay gas.',
       error:'A non-null execution error is not success. A hash or earlier mempool admission does not override that result.',
       note:'This is a lifecycle example, not a live transaction watcher. These notes concern native Dusk L1 transactions. DuskEVM has its own lifecycle.'},
      {id:'recovery', part:2, kind:'practice', short:'Handle failure', title:'An unavailable read is not a count of zero',
       body:`<p>The node can be unavailable, a driver can be wrong, or a user can decline a wallet request. The app needs to show which action failed and what the user can do next.</p><p>If a read fails, returning a fabricated zero makes “could not load” look like “loaded an empty register.” Keep the last known value clearly marked as stale, or show an unavailable state.</p><p>For writes, do not blindly retry when the outcome is uncertain. First establish what happened, so a retry does not accidentally request the action twice.</p>`,
       question:'The app cannot reach its read endpoint. What should it display?',
       choices:[['zero','A confirmed count of zero.'],['unavailable','An unavailable or clearly stale value, with an explicit retry option.'],['new','A new successful registration to reassure the user.']], answer:'unavailable',
       success:'Separate missing information from a real zero. Recovery should not invent state or silently duplicate a write.',
       error:'A failed request is not a successful read of zero. Show the error or stale state and give the user a clear recovery action.'},
      {id:'learned', part:2, kind:'earned', short:'Dusk Connect client', title:'Your app can read and prepare calls',
       body:`<p>Your JavaScript reads the supplied fixture state and prepares typed arguments with the generated data-driver. The same file works for both supplied registers.</p><p>You’ve separated the application, node and wallet, preserved exact values, and distinguished preparation from approval and final execution.</p><p>No transaction was sent. Signed writes and receipt tracking are not implemented in this lesson.</p><p>Next, extend this file into a read-only registration explorer. Its supplied registry does not depend on your contract-course save.</p>`},
      {id:'explorer', part:3, kind:'intro', short:'Registry explorer', title:'Look up an individual registration',
       body:`<p>A count tells you how many seats are reserved. A <strong>record</strong> gives you one reservation’s seat count, owning contract and confirmation flag.</p><p>Keep your existing JavaScript. Over eight chapters you’ll add a record lookup, handle missing records, read the other fields and recover from an unavailable endpoint.</p><p>A separate, supplied registry has three records. Their IDs are <code>0</code>, <code>2</code> and <code>9007199254740993</code>. IDs are stable identifiers, not array positions. Gaps do not make later records invalid.</p><p>This fixture is a read-only teaching snapshot, not a deployed service. You do not need to build it or complete the contract path. Its owner fields identify contracts, not wallet users.</p>`,
       note:'Native setup builds the fixture and driver. Browser mode bundles the real driver with simulated reads. No signing, writes, event decoding or live deployment is added.'},
      {id:'explorer-read', part:3, kind:'code', scenario:'explorer-read', short:'Read a record', title:'Give the getter a record ID',
       body:`<p>The counter and record registry have different interfaces. Extend your factory without breaking its existing two-argument callers:</p><pre class="example"><code>export function createApp(nodeUrl, contractId,
    driverPath = "/api/registry-driver") {
    // Keep the options. Change driverUrl to:
    // new URL(driverPath, nodeUrl).href
}</code></pre><p>The runner supplies <code>"/api/explorer-driver"</code> as the third argument for the record registry. Keep your existing read and preparation functions.</p><p>Append this function. The first samples use small IDs, so a checked conversion to Number is sufficient for now:</p><pre class="example"><code>export async function readRegistration(dusk, id) {
    const args = Number(id);
    if (!Number.isSafeInteger(args) || args &lt; 0)
        throw new Error("Invalid record ID");
    const seats = await dusk.readContract({
        contract: "registry",
        functionName: "get_registration",
        args,
    });
    return { id, seats };
}</code></pre><p>The driver returns <code>Option&lt;u64&gt;</code> as a small Number here, or <code>null</code> when absent. The counter’s standalone u64 result was a string instead. This fixture bounds seats to ten. Nested large u64 values would need a lossless output design.</p>`,
       task:'Add the optional driverPath to createApp and append readRegistration. Read IDs 0 and 2 through the new driver.',
       hint:'Replace only the literal path in driverUrl with driverPath. Leave the default path, readCount and prepareRegistration intact.',
       note:'The runner still checks both original counter reads and prepared calls. Results must come from actual requests, not a lookup table in your JavaScript.'},
      {id:'explorer-missing', part:3, kind:'code', scenario:'explorer-missing', short:'Missing records', title:'Absence is a successful answer',
       body:`<p>The registry has no record with ID <code>1</code>. Its getter returns Rust <code>None</code>, which this driver decodes to JavaScript <code>null</code>. The HTTP read still succeeds.</p><p>Represent that absence explicitly, before constructing the record object:</p><pre class="example"><code>if (seats === null) return null;
return { id, seats };</code></pre><p>Use an exact null check, not a general “falsy” check. A later Boolean field can legitimately be <code>false</code>.</p><p>Do not turn absence into zero seats or a guessed record. A missing record is also different from a request that could not reach the registry.</p>`,
       task:'Return null from readRegistration when get_registration returns null. Keep the actual lookup for every supplied ID.',
       hint:'Insert if (seats === null) return null; after the awaited read and before returning the object.'},
      {id:'explorer-owner', part:3, kind:'code', scenario:'explorer-owner', short:'Contract owner', title:'Read ownership without inventing a login',
       body:`<p>For an existing record, call a second getter with the same <code>args</code>:</p><pre class="example"><code>const owner = await dusk.readContract({
    contract: "registry",
    functionName: "owner_of",
    args,
});
return { id, seats, owner };</code></pre><p>Place this after the missing-record return. This generated driver decodes <code>Some(ContractId)</code> to a 64-character hexadecimal string without a <code>0x</code> prefix. Missing owners decode to null.</p><p>The supplied records belong to contract A (<code>22…22</code>) or B (<code>33…33</code>). Reading that ID does not prove the visitor controls the contract. It is not a wallet address, identity credential or secret authorization token.</p>`,
       task:'Read owner_of for each existing record and include owner in the returned object.',
       hint:'Reuse args. Keep the early null return, so a missing record needs no further field reads.',
       note:'The fixture stores public contract-owner metadata. No wallet connection or signature is requested.'},
      {id:'explorer-confirmed', part:4, kind:'code', scenario:'explorer-confirmed', short:'Confirmation', title:'False is data, not missing information',
       body:`<p>Add one more read after the owner lookup:</p><pre class="example"><code>const confirmed = await dusk.readContract({
    contract: "registry",
    functionName: "is_confirmed",
    args,
});
return { id, seats, owner, confirmed };</code></pre><p>The driver decodes <code>Some(false)</code> to <code>false</code>, <code>Some(true)</code> to <code>true</code>, and <code>None</code> to <code>null</code>. Record 0 is pending and record 2 is confirmed.</p><p>This is a stored <strong>application flag</strong>, not network finality or proof that a wallet transaction was submitted. The test snapshot never changes between reads.</p><p>On a live, changing registry, separate getter calls can observe different moments. Use a combined getter or a supported common-state query to read related fields from the same state. Sequential reads alone do not guarantee this.</p>`,
       task:'Include the actual Boolean confirmation flag in each returned record. Preserve false rather than replacing it with null.',
       hint:'Use functionName: "is_confirmed", then return the confirmed variable unchanged.'},
      {id:'explorer-precision', part:4, kind:'code', scenario:'explorer-precision', short:'Large IDs', title:'Keep every digit of the record ID',
       body:`<p><code>Number("9007199254740993")</code> rounds to a different ID. Our checked conversion rejects it, but this registry really contains that record. Keep the supplied ID as a decimal string.</p><p>This pinned Forge driver expects a JSON number for its u64 input. Connect serializes ordinary strings and BigInts as JSON strings, which that driver rejects. Use native <code>JSON.rawJSON</code> to preserve a validated integer’s digits through serialization:</p><pre class="example"><code>if (typeof id !== "string" ||
    !/^(0|[1-9][0-9]{0,19})$/.test(id) ||
    BigInt(id) &gt; 18446744073709551615n)
    throw new Error("Invalid record ID");
const args = JSON.rawJSON(id);</code></pre><p>Replace the old Number conversion and safe-integer guard with this block. All three getters already reuse <code>args</code>. Keep the string <code>id</code> in the returned object.</p><p>The tests distinguish the real large ID from its absent neighbor and check the largest u64. Negative, fractional, noncanonical and out-of-range IDs must fail before any request.</p>`,
       task:'Validate the decimal u64 string and encode it losslessly with JSON.rawJSON. Do not convert the ID through Number.',
       hint:'Replace the first three lines inside readRegistration. Use BigInt for validation only. Set args to the raw JSON value.',
       note:'Use a current browser with JSON.rawJSON support. If it is unavailable, update the browser. Do not fall back to Number. This input fix does not make every nested u64 output lossless.'},
      {id:'explorer-recovery', part:4, kind:'code', scenario:'explorer-recovery', short:'Failed reads', title:'Separate found, missing and unavailable',
       body:`<p>Your lookup returns a record or null. It throws if validation, loading the driver or a read fails. A display should distinguish those outcomes.</p><p>Append a wrapper that awaits the lookup inside try, so rejected read Promises reach catch:</p><pre class="example"><code>export async function loadRegistration(dusk, id) {
    try {
        const record = await readRegistration(dusk, id);
        return record === null
            ? { status: "missing" }
            : { status: "found", record };
    } catch {
        // ponytail: split input/service errors in a deployed UI.
        return { status: "unavailable" };
    }
}</code></pre><p>One test endpoint returns HTTP 503. The runner then tries the working endpoint to check recovery.</p><p>This wrapper groups failures under unavailable. A deployed UI should distinguish invalid input from service failure and offer an explicit retry. Never invent zero or label an old value as fresh.</p>`,
       task:'Add loadRegistration. Preserve found and missing results, catch failed reads as unavailable, and allow a later read to recover.',
       hint:'Await readRegistration inside try. Do not put a return null fallback inside readRegistration. A failed request is not a missing record.',
       note:'Only reads are retried in this test. Signed writes remain deferred, and uncertain write outcomes must not be blindly retried.'},
      {id:'explorer-learned', part:4, kind:'earned', short:'Registry client', title:'Your explorer reports what it actually read',
       body:`<p>The same JavaScript file still reads counters and prepares unsigned calls. It now looks up a supplied registry’s seats, contract ownership and confirmation flags through its matching driver.</p><p>You’ve preserved large IDs, rejected invalid input and separated found, missing and unavailable results. A later working read recovers without fabricating a record.</p><p>These are public reads of a fixed teaching fixture, not a live network. The runtime label distinguishes native DuskVM from simulated transport. Wallet signing, live transaction tracking and registered event decoding have not been implemented.</p>`},
    ],
  },
  circuits: {
    title:'DuskVM circuit development', language:'rust',
    lessons:[{title:'Prove a private sum', skill:'Circuit constraints', start:'begin', end:'learned', check:'public'}],
    parts:['State the relation','Constrain and disclose','Understand verification'],
    starter:`use dusk_plonk::prelude::*;

#[derive(Default)]
pub struct SumCircuit {
    pub a: BlsScalar,
    pub b: BlsScalar,
    pub total: BlsScalar,
}

impl Circuit for SumCircuit {
    fn circuit(&self, composer: &mut Composer) -> Result<(), Error> {
        let a = composer.append_witness(self.a);
        let b = composer.append_witness(self.b);
        let total = composer.append_witness(self.total);
        let sum = composer.gate_add(
            Constraint::new().left(1).right(1).a(a).b(b)
        );
        // Bind sum to total.
        Ok(())
    }
}
`,
    chapters:[
      {id:'begin', part:0, kind:'intro', short:'The statement', title:'Prove a sum without publishing its inputs',
       body:`<p>A prover knows two numbers. A verifier wants evidence that they satisfy a sum relation, without receiving the individual numbers through the proof.</p><p>A <strong>circuit</strong> describes mathematical constraints for the proof system to check. The Rust code builds those constraints.</p><p>You’ll use the supplied <strong>dusk-plonk</strong> project. First understand witnesses and an addition gate, then add an equality constraint and a public total. Finally, check what the proof establishes and where its guarantees stop.</p>`,
       note:'12 short chapters. Proving and verification run as real browser WASM. Each run uses fresh demonstration setup parameters, not a production ceremony. No proof is sent to a contract.'},
      {id:'roles', part:0, kind:'guide', short:'Who sees what?', title:'Separate the prover from the verifier',
       body:`<p>The <strong>prover</strong> knows the values used to satisfy the circuit. These are called a <strong>witness</strong>, or witness values. The <strong>verifier</strong> checks the proof against the intended circuit and its public inputs.</p><p>For our example, think of 4 and 5 as the prover’s inputs, and 9 as the total to check. The lesson displays all test values so you can follow the arithmetic. They are not real private user data.</p><p>Zero knowledge does not hide information the application separately publishes. Public inputs and the consequences of a statement can reveal information, even when the proof does not reveal individual witnesses.</p>`,
       panelTitle:'A verifier should receive', panel:`<dl class="concept-list"><dt>The intended verification rules</dt><dd>A verification key associated with the circuit it expects.</dd><dt>The proof</dt><dd>Evidence generated from values satisfying that circuit.</dd><dt>The public inputs</dt><dd>The values the application has deliberately exposed, such as a claimed total.</dd><dt>Not the private witnesses</dt><dd>The original values should remain with the prover in a real private flow.</dd></dl>`},
      {id:'witnesses', part:0, kind:'practice', short:'Witnesses', title:'A value needs a relation that constrains it',
       body:`<p><code>BlsScalar</code> represents a value in the scalar field used by this circuit. We’ll discuss the difference from bounded integers later.</p><p><code>composer.append_witness(self.a)</code> adds a witness and returns a handle that other constraints can refer to. Allocating a value does not automatically connect it to every other value.</p><p>The starter allocates <code>a</code>, <code>b</code> and <code>total</code>. It must explicitly state how these values are related.</p>`,
       question:'Does allocating a witness named total automatically prove that it equals a + b?',
       choices:[['name','Yes, the variable name tells the prover what it means.'],['relation','No. The circuit must constrain that relationship explicitly.'],['pub','Only if the Rust field is marked pub.']], answer:'relation',
       success:'Names and Rust visibility do not create proof constraints. The mathematical relationship must be encoded.',
       error:'A witness name does not impose a rule. Add constraints connecting the values.'},
      {id:'addition', part:0, kind:'guide', short:'Addition gate', title:'Read the supplied addition gate',
       body:`<p>A <strong>gate</strong> expresses a relationship between witness values. The supplied addition gate uses coefficients 1 and 1, so its result is <code>a + b</code>.</p><pre class="example"><code>let sum = composer.gate_add(
    Constraint::new().left(1).right(1).a(a).b(b)
);</code></pre><p><code>sum</code> is a handle for the constrained result, not the same witness as the separately allocated <code>total</code>.</p><p>For inputs 4 and 5, the addition gives 9. Without another relation, the claim stored in <code>total</code> can still be 8.</p>`,
       panelTitle:'The missing connection', panel:`<ol class="example-flow"><li><strong>Already constrained</strong><p><code>a + b = sum</code></p></li><li><strong>Still independent</strong><p>The separately allocated <code>total</code>.</p></li><li><strong>Your next edit</strong><p>Require <code>sum = total</code> inside the circuit.</p></li></ol>`},
      {id:'constraint', part:1, kind:'code', scenario:'constraint', short:'Constrain the sum', title:'Bind the computed sum to the claim',
       body:`<p>The addition gate already computes and constrains <code>sum</code>. Now connect it to the claimed <code>total</code>:</p><pre class="example"><code>composer.assert_equal(sum, total);</code></pre><p>This adds an equality relation to the proof system. <code>Ok(())</code> reports successful circuit construction, not witness validity.</p><p>Run the starter first if you want to see the missing constraint: it can accept the wrong claim <code>4 + 5 = 8</code>. After your edit, that case must not produce an accepted proof.</p>`,
       task:'Replace the comment with the equality constraint. Valid sums should pass. The claim 4 + 5 = 8 should fail.',
       hint:'Insert composer.assert_equal(sum, total); immediately before Ok(()).',
       note:'The pinned prover can reject an unsatisfied witness before producing a proof. The results distinguish that from verification of an existing proof.'},
      {id:'negative-cases', part:1, kind:'practice', short:'Counterexamples', title:'Test a relation with an incorrect claim',
       body:`<p>A circuit that verifies one correct sample may still be missing a constraint. The starter computed a sum without binding the claim to it.</p><p>We therefore check both correct sums and a false claim. The valid cases must keep working. Crashing on every input is not validation.</p><p>These are finite educational tests, not a general proof that every possible circuit is correct. A production circuit needs a much broader review of its constraints and assumptions.</p>`,
       question:'Which test most directly detects a missing connection between sum and total?',
       choices:[['false-total','Keep a = 4 and b = 5, but claim total = 8.'],['same','Repeat only the valid 4 + 5 = 9 case.'],['label','Rename the Rust struct without changing the circuit.']], answer:'false-total',
       success:'An incorrect claim tests the missing relation. Correct cases alone would not expose the original bug.',
       error:'Use a witness with an incorrect claimed total. Repeating only valid samples cannot show that this relation is enforced.'},
      {id:'rust-checks', part:1, kind:'guide', short:'Rust or circuit?', title:'A Rust assertion is not a circuit constraint',
       body:`<p>Rust executes while the prover constructs its circuit. A normal <code>assert!</code> can stop that program, but it does not add a relation to the proof that a verifier checks.</p><p><code>composer.assert_equal</code> is different: it records an equality in the constraint system. Keep the circuit’s structure independent of secret-dependent control flow.</p><p>Our harness rejects an ordinary Rust guard or panic as a substitute for the relation. A timeout also does not count as rejecting an invalid witness.</p>`,
       panelTitle:'Similar words, different effects', panel:`<pre class="example"><code>// A check in the prover's Rust program:
assert!(self.a + self.b == self.total);

// A relation in the proof system:
composer.assert_equal(sum, total);</code></pre><p>The verifier must check the intended relation, not trust that an untrusted prover ran an ordinary program check.</p>`},
      {id:'public', part:1, kind:'code', scenario:'public', short:'Public input', title:'Let the verifier check the total',
       body:`<p>The equality is now constrained, but <code>total</code> is still a private witness. The proof does not yet expose a particular total for the verifier to compare with the application’s claim.</p><p>Replace only its allocation:</p><pre class="example"><code>let total = composer.append_public(self.total);</code></pre><p>Keep <code>a</code> and <code>b</code> as private witnesses. Rust’s <code>pub</code> controls field access in the program, not what the proof reveals.</p><p>Keep your equality constraint too. Merely making a value public does not connect it to the sum.</p>`,
       task:'Make total public and run again. Each valid proof should have one public input and reject a changed total.',
       hint:'Change only append_witness(self.total) to append_public(self.total). Keep the equality constraint.',
       note:'A public total still reveals information. Choose public inputs deliberately. This arithmetic proof does not establish identity or authorization.'},
      {id:'verification', part:2, kind:'guide', short:'Verification', title:'Bind the proof to the intended statement',
       body:`<p>A verifier checks the proof with the intended verification key and ordered public inputs. A proof for total 9 must not also verify when the supplied total is changed to 10.</p><p>The exercise really performs that changed-input verification. It also regenerates a verifier from your edited circuit for each experiment.</p><p>A production service must instead know which circuit and key it accepts. Accepting arbitrary prover-supplied rules would let the prover choose a different statement from the one the service intended.</p>`,
       panelTitle:'Two checks on the same proof', panel:`<dl class="concept-list"><dt>Public total 9</dt><dd>The valid sum proof should verify.</dd><dt>Changed public total 10</dt><dd>The same proof must fail verification.</dd><dt>Different circuit</dt><dd>A different set of rules is not automatically an acceptable replacement.</dd></dl>`,
       note:'This browser exercise does not deploy a verifier or submit a proof to DuskVM. The verification-key and contract integration steps remain separate work.'},
      {id:'ranges', part:2, kind:'practice', short:'Integer bounds', title:'Field arithmetic is not bounded integer arithmetic',
       body:`<p>These gates operate in a <strong>finite field</strong>. Arithmetic wraps modulo the field’s modulus. That is different from saying that every value is an ordinary non-negative integer below a business limit.</p><p>A balance or age circuit needs additional range constraints if the policy depends on those bounds. An addition relation alone does not prove “both values are between 0 and 100.”</p><p>Likewise, the contract lesson’s checked Rust <code>u64</code> addition is not a replacement for constraints inside a PLONK circuit.</p>`,
       question:'Does this sum circuit already prove that both private values are between 0 and 100?',
       choices:[['yes','Yes. Using small test values creates that range constraint.'],['range','No. Those bounds need additional constraints.'],['rust','Yes. The Rust field name automatically enforces the range.']], answer:'range',
       success:'The examples are small, but the circuit has no such range rule. Encode bounds explicitly when the statement needs them.',
       error:'Sample values do not limit every possible witness. The circuit needs explicit constraints for the required range.'},
      {id:'trusted-inputs', part:2, kind:'practice', short:'Trusted inputs', title:'A valid sum does not authenticate a balance',
       body:`<p>Anyone can choose two field values that add to a chosen total. Zero and the total itself would work.</p><p>It does not show that the numbers came from bank records, an issued credential or an authorized account. Such claims need appropriate bindings to trusted data, plus the application’s context and replay policy.</p><p>Production setup parameters and verifier integration also need their own design. Fresh demonstration parameters are not a multi-party setup ceremony.</p>`,
       question:'Can a service treat this sum proof alone as evidence of a real bank balance?',
       choices:[['balance','Yes. Every mathematically valid proof authenticates its inputs.'],['binding','No. The inputs are not bound to trusted balance records.'],['larger','Only if the prover chooses larger numbers.']], answer:'binding',
       success:'A proof establishes its specified relation. It cannot add trust or real-world meaning that the circuit and application never encoded.',
       error:'This proves only a sum relation. It does not establish the origin or authorization of the values.'},
      {id:'learned', part:2, kind:'earned', short:'Circuit constraints', title:'The proof is bound to a public total',
       body:`<p>Your circuit connects two private witnesses to a public total. Valid sums produced verified proofs. A wrong sum was rejected, and a changed public total failed verification.</p><p>You’ve separated witness allocation from constraints, ordinary Rust checks from proof rules, and a mathematically valid statement from an authenticated real-world claim.</p><p>Range constraints, production parameters and a DuskVM verifier are further implementation steps. None is implied by this local skill award.</p>`},
    ],
  },
};

export const courseKey = id => `dusk-academy-${id}-v1`;
export const lastPathKey = 'dusk-academy-last-path';
export const exerciseSteps = course => course.chapters.map((c,i)=>['code','quiz'].includes(c.kind)?i:-1).filter(i=>i>=0);
export const partSteps = (course,step) => course.chapters.map((c,i)=>c.part===course.chapters[step].part?i:-1).filter(i=>i>=0);
export function courseLimit(course, state, preview = false) {
  if (preview && course.language) return course.chapters.length - 1;
  if (!state.started) return 0;
  return exerciseSteps(course).find(i=>!state.checks[i]) ?? course.chapters.length-1;
}
export const courseComplete = (course,state) => exerciseSteps(course).every(i=>Boolean(state.checks[i]));
export const courseLesson = (course,step) => course.lessons.find(lesson=>step<=course.chapters.findIndex(c=>c.id===lesson.end));
export const lessonComplete = (course,state,lesson) => Boolean(state.checks[course.chapters.findIndex(c=>c.id===lesson.check)]);

// Runtime positions stay numeric; persisted positions/checks use stable chapter IDs.
// This is the only positional map needed for the original version-1 records.
const legacyIds = {
  dusk:['begin','transactions','disclosure','policy','learned'],
  dapps:['begin','read','prepare','wallet','learned'],
  circuits:['begin','constraint','public','learned'],
};
export function serializeCourse(course,state) {
  const keyed = values => Object.fromEntries(Object.entries(values).map(([i,value])=>[course.chapters[i].id,value]));
  return JSON.stringify({...state,version:2,step:course.chapters[state.step].id,active:course.chapters[state.active]?.id??null,checks:keyed(state.checks),answers:keyed(state.answers),...(state.simulated?{simulated:keyed(state.simulated)}:{})});
}
export function restoreCourse(id, raw, preview = false) {
  const course=courses[id], code=course.chapters.findIndex(c=>c.kind==='code');
  const state={version:2,step:0,active:code,started:false,source:course.starter||'',checks:{},answers:{}};
  const validSource=s=>typeof s==='string'&&new TextEncoder().encode(s).length<=8000;
  try {
    if (!raw || raw.length>(exerciseSteps(course).filter(i=>course.chapters[i].kind==='code').length*2+1)*48000+16000) return state;
    const value=JSON.parse(raw);
    if(![1,2].includes(value?.version)) return state;
    const key = c => value.version===1?legacyIds[id].indexOf(c.id):c.id;
    const position = saved => {
      const name=value.version===1&&Number.isInteger(saved)?legacyIds[id][saved]:value.version===2&&typeof saved==='string'?saved:null;
      return course.chapters.findIndex(c=>c.id===name);
    };
    state.started=value.started===true;
    if(validSource(value.source)) state.source=value.source;
    course.chapters.forEach((c,i)=>{
      if(value.version===1&&key(c)<0) return;
      if(c.choices?.some(([answer])=>answer===value.answers?.[key(c)])) state.answers[i]=value.answers[key(c)];
    });
    for(const i of exerciseSteps(course)) {
      const c=course.chapters[i], check=value.checks?.[key(c)];
      if(c.kind==='quiz' ? check!==c.answer : !validSource(check)||!check.trim()) break;
      state.checks[i]=check;state.started=true;
      if(c.kind==='code') state.active=i;
    }
    if(value.version===2&&course.language) for(const i of exerciseSteps(course)) {
      const c=course.chapters[i], check=value.simulated?.[c.id];
      if(c.kind==='quiz' ? check===c.answer : validSource(check)&&check.trim()) {
        (state.simulated??={})[i]=check;state.started=true;
        if(preview&&c.kind==='code')state.active=Math.max(state.active,i);
      } else if(!state.checks[i]) break;
    }
    const limit=courseLimit(course,state,preview), step=position(value.step), active=position(value.active);
    if(step>=0&&step<=limit) state.step=step;
    if(active>=0&&active<=limit&&course.chapters[active].kind==='code') state.active=Math.max(state.active,active);
    if(course.chapters[state.step].kind==='code') state.active=Math.max(state.active,state.step);
  } catch { /* A broken save must not block the lesson. */ }
  return state;
}

export const explorerScenarios = ['explorer-read','explorer-missing','explorer-owner','explorer-confirmed','explorer-precision','explorer-recovery'];
export const explorerIds = phase => phase<1?['0','2']:phase<4?['0','2','1']:['0','2','1','9007199254740993','9007199254740992','18446744073709551615'];
export const invalidRecordIds = ['', '-1', '1.5', '01', '1e3', '18446744073709551616', '999999999999999999999', 2];

function assessExplorer(phase,result,invalid) {
  const samples=explorerIds(phase).map(id=>({id,offline:false}));
  if(phase===5) samples.push({id:'0',offline:true},{id:'0',offline:false});
  const requestsValid=reads=>Array.isArray(reads)&&reads.length<=24&&reads.every(r=>r&&typeof r.path==='string'&&r.path.length<150&&typeof r.input==='string'&&/^[0-9a-f]{0,256}$/.test(r.input)&&Number.isInteger(r.status)&&r.status>=100&&r.status<=599);
  if(!Array.isArray(result.records)||result.records.length!==samples.length) invalid();
  for(const [i,{id,offline}] of samples.entries()) {
    const row=result.records[i];
    if(!row||row.id!==id||row.offline!==offline||!requestsValid(row.requests)) invalid();
    const seats=({'0':2,'2':3,'9007199254740993':5})[id]??null;
    const input=BigInt(id).toString(16).padStart(16,'0').match(/../g).reverse().join('');
    const requested=(method,status)=>row.requests.some(r=>r.path===`/on/contracts:${(offline?'66':'55').repeat(32)}/${method}`&&r.input===input&&r.status===status);
    if(!requested('get_registration',offline?503:200)) return `Read ID ${id} from the supplied registry with its exact encoded argument. Do not replace a failed request or a large ID with guessed data.`;
    let record=row.record;
    if(phase===5) {
      const status=offline?'unavailable':seats===null?'missing':'found';
      if(record?.status!==status) return `ID ${id}: report ${status}. A failed read is not a missing record, and a working retry must recover.`;
      if(status!=='found') {
        if(record.record!==undefined&&record.record!==null) return 'Do not attach a fabricated or stale record to a missing or unavailable result.';
        continue;
      }
      record=record.record;
    }
    if(seats===null) {
      if(record!==null) return `ID ${id} is absent. Return null, not a record with zero or null seats.`;
      continue;
    }
    if(!record||record.id!==id||record.seats!==seats) return `Return the supplied ID string and the decoded seat count for record ${id}.`;
    if(phase>=2&&(record.owner!==(id==='2'?'33':'22').repeat(32)||!requested('owner_of',200))) return `Read owner_of for record ${id}. Return its contract ID, not a wallet identity or a fixed owner.`;
    if(phase>=3&&(record.confirmed!==(id==='2')||!requested('is_confirmed',200))) return `Read is_confirmed for record ${id}. Keep the Boolean false for a pending record. Null means absent.`;
  }
  if(phase>=4) {
    if(!Array.isArray(result.invalidIds)||result.invalidIds.length!==invalidRecordIds.length) invalid();
    for(const [i,row] of result.invalidIds.entries()) {
      if(!row||row.id!==invalidRecordIds[i]||typeof row.rejected!=='boolean'||!requestsValid(row.requests)) invalid();
      if(!row.rejected||row.requests.length) return 'Reject invalid record IDs before any request. Require a canonical decimal string in the u64 range.';
    }
  }
  return null;
}

export function assessCourse(id, scenario, result) {
  const invalid=()=>{throw Error('The runner returned an invalid result. Try again.');};
  if(id==='dapps') {
    const phase=explorerScenarios.indexOf(scenario);
    if(!['read','prepare'].includes(scenario)&&phase<0) invalid();
    if(!Array.isArray(result?.counts)||result.counts.length!==2||!Array.isArray(result.calls)||!Array.isArray(result.writes)) invalid();
    if(result.counts.some((value,i)=>String(value)!==String([2,7][i]))) return 'Read each register with readContract. Its stored count should be 2 or 7.';
    if([2,7].some(n=>!result.calls.includes(`/on/contracts:${n.toString(16).padStart(2,'0').repeat(32)}/get_count`))) return 'Use the local contract reads instead of returning a fixed number.';
    if(scenario==='prepare'||phase>=0) {
      if(result.writes.length!==2) invalid();
      for(const [i,n] of [2,7].entries()) {
        const write=result.writes[i];
        if(!write||write.contractId!=='0x'+n.toString(16).padStart(2,'0').repeat(32)||write.functionName!=='register'||String(write.amount)!==String(n)||write.privacy!=='public') return 'Prepare register with args set to the supplied amount and privacy set to public.';
        if(String(write.value??0)!=='0'||String(write.deposit??0)!=='0') return 'Attach no tokens in this exercise. Set transaction amount and deposit to "0". Use args for the registration count.';
        if(!Array.isArray(write.encoded)||write.encoded.length!==8||write.encoded.some((b,j)=>b!==(j===0?n:0))) invalid();
      }
    }
    if(phase>=0) return assessExplorer(phase,result,invalid);
    return null;
  }
  if(id==='circuits') {
    if(!['constraint','public'].includes(scenario)) invalid();
    if(!Array.isArray(result?.cases)||result.cases.length!==3||typeof result.proof!=='string'||! /^[0-9a-f]{2016}$/.test(result.proof)) invalid();
    for(const [i,values] of [[4,5,9],[2,3,5],[4,5,8]].entries()) {
      const c=result.cases[i];
      if(!c||[c.a,c.b,c.total].some((v,j)=>v!==values[j])||typeof c.verified!=='boolean'||typeof c.proverRejected!=='boolean') invalid();
      if(c.verified!==(i<2)) return i===2?'The circuit accepted 4 + 5 = 8. Bind sum to total with an equality constraint.':'A valid sum did not verify. Keep the addition gate and bind its result to total.';
      if(i<2) {
        if(c.proofBytes!==1008||c.proverRejected||!Number.isInteger(c.publicCount)||typeof c.publicMatches!=='boolean'||typeof c.changedTotalVerified!=='boolean') invalid();
        if(scenario==='public'&&(c.publicCount!==1||!c.publicMatches)) return 'Expose total with append_public. Keep a and b as private witnesses.';
        if(scenario==='public'&&c.changedTotalVerified) return 'The proof accepted a different public total. Keep total connected to sum.';
      } else if(c.proverRejected ? c.proofBytes!==0 : c.proofBytes!==1008) invalid();
    }
    return null;
  }
  invalid();
}
