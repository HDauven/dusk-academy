// The same browser runtime runs on every host, including localhost.
const notice = document.createElement('aside');
notice.id = 'hosting-note'; notice.setAttribute('aria-label', 'Browser learning');
notice.innerHTML = '<strong>Browser learning.</strong> Every coding path runs here without a backend or RPC node. Contracts use a Rust-subset simulator; dApps use real JavaScript and Connect with simulated reads; circuits use interpreted builders and real PLONK proofs. No edited Rust is compiled. <a href="https://github.com/HDauven/dusk-academy#browser-runtime">Runtime limits</a> · <a href="https://github.com/HDauven/dusk-academy#license">Licenses</a>.';
document.querySelector('.masthead').after(notice);
export function uncheckedRecap(skill) {
  document.querySelector('#chapter-label').textContent = 'Lesson recap · not yet checked';
  document.querySelector('#lesson-title').textContent = `Review ${skill.toLowerCase()}`;
  const copy = document.querySelector('#story-copy');
  copy.innerHTML = `<p>Complete this lesson’s coding checks to earn the skill. Browsing alone does not check your code.</p><details class="try-it"><summary>Expected results after completing the exercises</summary>${copy.innerHTML}</details>`;
  document.querySelector('#earned').hidden = true;
}
