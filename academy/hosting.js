// The execution service and its worker policy are supported only on loopback.
export const preview = !['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);

if (preview) {
  const notice = document.createElement('aside');
  notice.id = 'hosting-note'; notice.setAttribute('aria-label', 'Static preview');
  notice.innerHTML = '<strong>Static preview.</strong> Browse the coding lessons and try the knowledge questions. <a href="https://github.com/HDauven/dusk-academy#run-locally">Run locally</a> for code checks and wallet access. Reading does not earn coding skills. <a href="https://github.com/HDauven/dusk-academy#license">Source and licenses</a>.';
  document.querySelector('.masthead').after(notice);
  document.querySelector('#code-note').textContent = 'Edit here. Run checks locally.';
}

export function previewRecap(skill) {
  document.querySelector('#chapter-label').textContent = 'Lesson recap · static preview';
  document.querySelector('#lesson-title').textContent = `Review ${skill.toLowerCase()}`;
  const copy = document.querySelector('#story-copy');
  copy.innerHTML = `<p>Complete the coding checks in the local version to earn this skill. No code has been run in this preview.</p><details class="try-it"><summary>Expected results after completing the exercises</summary>${copy.innerHTML}</details>`;
  document.querySelector('#earned').hidden = true;
}
