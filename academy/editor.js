// The code editor shared by every coding path: a textarea under a highlighted copy of its text.
const escapeHtml = s => String(s).replace(/[&<>]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;'}[c]));

const LANGUAGES = {
  rust: {
    token: /(\/\/[^\n]*)|("(?:[^"\\\n]|\\.)*")|(#!?\[[^\]\n]*\])|\b(pub|fn|impl|mod|struct|let|mut|self|Self|const|use|extern|crate|as|return|if|else|for|in|while|loop|match|true|false|Some|None|Ok|Err)\b|\b(u8|u16|u32|u64|u128|usize|bool|Vec|Option|Result|String|BlsPublicKey|BlsScalar|ContractId|Composer|Constraint|Circuit|Error|Witness)\b|\b(0x[\da-fA-F_]+(?:u\d+)?|\d[\d_]*(?:u\d+)?)\b|\b([a-z_]\w*)(?=!)|\b([a-z_]\w*)(?=\s*(?:\(|::<))/g,
    classes: [null, 't-com', 't-str', 't-attr', 't-kw', 't-ty', 't-num', 't-mac', 't-fn'],
  },
  js: {
    token: /(\/\/[^\n]*)|(`(?:[^`\\]|\\.)*`|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')|\b(import|export|from|const|let|var|async|await|function|return|if|else|for|of|in|new|throw|try|catch|finally|typeof|null|undefined|true|false)\b|\b(\d[\d_]*n?)\b|\b([A-Za-z_$][\w$]*)(?=\s*\()/g,
    classes: [null, 't-com', 't-str', 't-kw', 't-num', 't-fn'],
  },
};

export function highlight(source, language = 'rust') {
  const {token, classes} = LANGUAGES[language];
  let html = '', end = 0;
  for (const m of source.matchAll(token)) {
    const cls = classes[m.findIndex((g, i) => i > 0 && g !== undefined)];
    html += escapeHtml(source.slice(end, m.index)) + `<span class="${cls}">${escapeHtml(m[0])}</span>`;
    end = m.index + m[0].length;
  }
  return html + escapeHtml(source.slice(end));
}

// Wires #code, #highlight, #gutter and #error-line. `onRun` fires on Ctrl/⌘+Enter, `onChange` on edits.
export function createEditor({language = 'rust', onRun, onChange} = {}) {
  const $ = s => document.querySelector(s);
  const code = $('#code');
  const sync = () => {
    $('#highlight').style.transform = `translate(${-code.scrollLeft}px, ${-code.scrollTop}px)`;
    $('#gutter').scrollTop = code.scrollTop;
    const err = $('#error-line');
    if (!err.hidden) err.style.top = `${14 + (Number(err.dataset.line) - 1) * 22 - code.scrollTop}px`;
  };
  const paint = () => {
    $('#highlight').innerHTML = highlight(code.value, language) + '\n';
    $('#gutter').textContent = code.value.split('\n').map((_, i) => i + 1).join('\n');
    sync();
  };
  const markError = line => {
    const err = $('#error-line');
    err.hidden = !line;
    if (line) { err.dataset.line = line; sync(); }
  };
  code.addEventListener('input', () => { paint(); markError(null); onChange?.(code.value); });
  code.addEventListener('scroll', sync);
  code.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); onRun?.(); return; }
    const {selectionStart: a, selectionEnd: b, value} = code;
    if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); code.setRangeText(language === 'js' ? '  ' : '    ', a, b, 'end'); code.dispatchEvent(new Event('input')); }
    if (e.key === 'Enter' && !e.shiftKey) {
      const line = value.slice(value.lastIndexOf('\n', a - 1) + 1, a);
      const indent = line.match(/^\s*/)[0] + (/[{(\[]\s*$/.test(line) ? (language === 'js' ? '  ' : '    ') : '');
      e.preventDefault(); code.setRangeText('\n' + indent, a, b, 'end'); code.dispatchEvent(new Event('input'));
    }
  });
  return {
    get value() { return code.value; },
    set(value) { code.value = value; paint(); markError(null); code.scrollTop = 0; },
    // Replaces the text as if typed, so drafts are saved.
    replace(value) { code.value = value; code.dispatchEvent(new Event('input')); code.setSelectionRange(0, 0); code.focus({preventScroll: true}); code.scrollTop = 0; sync(); },
    markError,
  };
}

// A line diff between two texts, for "Show answer".
export function diff(a, b) {
  const x = a.split('\n'), y = b.split('\n'), n = x.length, m = y.length;
  const L = Array.from({length: n + 1}, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = x[i].trimEnd() === y[j].trimEnd() ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out = [];
  let i = 0, j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && x[i].trimEnd() === y[j].trimEnd()) { out.push(['same', y[j]]); i++; j++; }
    else if (j < m && (i === n || L[i][j + 1] >= L[i + 1][j])) out.push(['add', y[j++]]);
    else out.push(['del', x[i++]]);
  }
  return out;
}
export const diffHtml = (a, b) => diff(a, b).map(([k, l]) => `<span class="${k}">${k === 'add' ? '+ ' : k === 'del' ? '- ' : '  '}${escapeHtml(l) || ' '}</span>`).join('');
