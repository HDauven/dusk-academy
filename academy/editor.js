// Shared, escaped highlight overlay for the two lesson controllers.
const $ = selector => document.querySelector(selector);
const escape = text => text.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function syncScroll() {
  $('#highlight').scrollTop = $('#code').scrollTop;
  $('#highlight').scrollLeft = $('#code').scrollLeft;
  $('#line-numbers').style.transform = `translateY(${-$('#code').scrollTop}px)`;
}
export function highlight() {
  const source = $('#code').value;
  const tokens = /\/\/[^\n]*|#\!?\[[^\n]+\]|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(?:pub|fn|impl|mod|struct|let|mut|self|Self|const|export|async|await|function|return|use|extern|crate|for|in|if|else|as)\b|\b\d+\b|\b(?:new|get_count|register)\b/g;
  let html = '', end = 0;
  for (const token of source.matchAll(tokens)) {
    const value = token[0];
    const type = value.startsWith('//') ? 'comment' : value.startsWith('#') ? 'attribute' : /^["']/.test(value) ? 'string' : /^\d/.test(value) ? 'number' : /^(new|get_count|register)$/.test(value) ? 'function' : 'keyword';
    html += escape(source.slice(end, token.index)) + `<span class="syntax-${type}">${escape(value)}</span>`;
    end = token.index + value.length;
  }
  $('#highlight').innerHTML = html + escape(source.slice(end)) + '\n';
  $('#line-numbers').textContent = source.split('\n').map((_, i) => i + 1).join('\n');
  syncScroll();
}
