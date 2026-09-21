// The execution service and its worker policy are supported only on loopback.
export const preview = !['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
export const browserContracts = preview || new URLSearchParams(location.search).get('runtime') === 'simulator';

if (browserContracts) {
  const notice = document.createElement('aside');
  notice.id = 'hosting-note'; notice.setAttribute('aria-label', 'Browser learning');
  notice.innerHTML = '<strong>Browser learning.</strong> The first contract lesson runs in a bounded simulator, not DuskVM. Other coding lessons are reading previews. <a href="https://github.com/HDauven/dusk-academy#run-locally">Native setup</a> is optional for the first lesson and required for later execution. Reading alone earns no skills. <a href="https://github.com/HDauven/dusk-academy#license">Source and licenses</a>.';
  document.querySelector('.masthead').after(notice);
  document.querySelector('#code-note').textContent = 'Edit here. Native checks require local setup.';
}

export function previewRecap(skill) {
  document.querySelector('#chapter-label').textContent = 'Lesson recap · static preview';
  document.querySelector('#lesson-title').textContent = `Review ${skill.toLowerCase()}`;
  const copy = document.querySelector('#story-copy');
  copy.innerHTML = `<p>This recap describes expected results, not a successful run of your current code. Complete this lesson’s supported simulator checks or use the native setup.</p><details class="try-it"><summary>Expected results after completing the exercises</summary>${copy.innerHTML}</details>`;
  document.querySelector('#earned').hidden = true;
}
