// The Circuits path: Secret stats. Checks and the proof lab run real PLONK proofs in a worker.
import {startPath} from './path-app.js';
import {lessons, chapters, statsOf, CAST, ARENA_CASES} from './stats-lessons.js';
import {loadKeeper} from './store.js';

// Each proof gets a fresh worker, stopped on navigation or after a minute.
function prove(source, samples, signal) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./circuit-worker.js', import.meta.url), {type: 'module'});
    const stop = error => { clearTimeout(timer); signal?.removeEventListener('abort', abort); worker.terminate(); if (error) reject(error); };
    const abort = () => stop(new DOMException('Cancelled.', 'AbortError'));
    const timer = setTimeout(() => stop(Error('Proving took too long. Check your circuit for very large ranges or loops.')), 60000);
    signal?.addEventListener('abort', abort, {once: true});
    worker.onmessage = ({data}) => { stop(); data.error ? reject(Error(data.error)) : resolve(data.result); };
    worker.onerror = e => stop(Error(e.message || 'The proof worker stopped.'));
    worker.postMessage({source, samples});
  });
}

function finale(c, ctx) {
  // Without a hatched Duskling, Wick stands in with the stats the lessons use.
  const keeper = loadKeeper(), dna = keeper.dna || CAST.wick.dna, name = keeper.dna ? keeper.name : 'Wick';
  const cast = who => ARENA_CASES.find(k => k.who === who && k.honest).stats;
  const [strength, agility, power] = keeper.dna ? Object.values(statsOf(dna)) : cast('wick');
  const arena = c.lab === 'arena', fake = arena ? (power === 60n ? 65n : 60n) : power + 10n;
  // The other Duskling shows the outcome yours doesn't: a refusal if yours passes, a pass if not.
  const other = power >= 50n ? {who: 'Rook', stats: [14n, 9n, 23n]} : {who: 'Fen', stats: cast('fen')};
  ctx.pane.innerHTML = `<div class="panel">
      <p class="kicker">Proof lab</p>
      <h2>${arena ? `${ctx.codeHtml(name)}'s arena pass` : `${ctx.codeHtml(name)}'s power`}</h2>
      <div class="cards">
        <div class="card-face mine"><small>strength</small><b>${strength}</b></div><span class="op">+</span>
        <div class="card-face mine"><small>agility</small><b>${agility}</b></div><span class="op">=</span>
        <div class="card-face ${arena ? 'mine' : 'public'}"><small>power</small><b>${power}</b></div>
      </div>
      <p class="muted">The proof won't reveal ${arena ? 'any of these numbers' : 'strength or agility'}. ${keeper.dna ? 'These stats are worked out from your Duskling\'s DNA.' : 'Hatch a Duskling in the Keeper\'s journey to use its stats. For now, these are Wick\'s.'}</p>
      <p class="muted">${ctx.own ? `Using the circuit you finished in “${ctx.lastTitle}”.` : `You haven't passed “${ctx.lastTitle}” yet, so this uses the reference circuit.`}</p>
      <div class="play-actions">
        <button class="primary" data-lab="mine">${arena ? 'Generate my arena pass' : 'Generate a proof'}</button>
        <button class="ghost" data-lab="lie">${arena ? `Pretend power is ${fake}` : `Claim power ${fake}`}</button>
        ${arena ? `<button class="ghost" data-lab="other">Try ${other.who}'s Duskling (power ${other.stats[2]})</button>` : ''}
      </div>
    </div>
    <div class="console play-log" id="lab-log" tabindex="0" role="status" aria-live="polite"><p class="muted">Each button runs the PLONK prover and verifier.</p></div>`;
  const log = (kind, text) => { ctx.pane.querySelector('#lab-log').insertAdjacentHTML('beforeend', `<p class="${kind}">${text}</p>`); };
  const cases = {
    mine: {stats: [strength, agility, power], who: name},
    lie: {stats: [strength, agility, fake], who: `${name}, lying`},
    other,
  };
  const scene = verdict => ctx.paintScene({tag: 'Proof lab', creatures: [{dna, owner: 'you', label: verdict ? `${name} ${verdict}` : name}]});
  scene();
  ctx.pane.querySelector('.play-actions').addEventListener('click', async e => {
    const b = e.target.closest('[data-lab]');
    if (!b) return;
    const k = cases[b.dataset.lab];
    b.disabled = true;
    log('log', `› proving for ${ctx.codeHtml(k.who)}…`);
    try {
      const [r] = (await prove(ctx.source, [[0n, 0n, 0n], k.stats], ctx.signal)).cases;
      if (r.verified) {
        log('ok', `✓ Proof verified. ${r.proof.length / 2} bytes, starting ${r.proof.slice(0, 24)}…`);
        log('log', r.publics.length ? `Public input: power ${k.stats[2]}. Checked with power ${k.stats[2] + 1n} instead → ${r.tamperedVerified ? '✓ still verifies?!' : '✗ rejected'}.` : 'No public inputs: the arena learns only that the rules hold.');
      } else log('refused', `✗ No valid proof can be made. ${arena && k === cases.mine ? `${ctx.codeHtml(name)}'s power is below 50, so the circuit is doing its job.` : 'The circuit\'s rules don\'t hold for these numbers.'}`);
      if (k === cases.mine) scene(r.verified ? '✓' : '✗');
      ctx.played();
    } catch (error) {
      if (error.name !== 'AbortError') log('bad', `✗ ${ctx.codeHtml(error.message)}`);
    } finally { b.disabled = false; }
  });
}

startPath({
  key: 'stats', lessons, chapters, language: 'rust', pathName: 'Secret stats',
  check: (c, source, signal) => c.check(source, samples => prove(source, samples, signal)),
  finale,
});
export {CAST};
