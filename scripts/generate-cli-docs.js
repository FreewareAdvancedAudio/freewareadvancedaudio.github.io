import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const FONT_MACROS = {
  '.B': 'B', '.I': 'I', '.SB': 'B', '.SM': 'R',
  '.BR': 'BR', '.BI': 'BI', '.RB': 'RB', '.IR': 'IR', '.RI': 'RI', '.IB': 'IB'
};
const IGNORED_MACROS = new Set(['.nh', '.hy', '.ad', '.na', '.fi', '.in', '.ne', '.ll', '.ta']);

const SPECIAL_CHARS = {
  hy: '-', '-': '-', em: '—', en: '–', bu: '•', co: '©', aq: "'", lq: '“', rq: '”',
  oq: '‘', cq: '’', dq: '"', rs: '\\', ti: '~', ha: '^', 'ga': '`', 'aa': '´', '->': '→', '<-': '←'
};

/* Convert roff escapes to text. Font escapes become Markdown emphasis unless
 * `plain` is set (used for option terms and code, where they must vanish). */
function unescapeRoff(str, plain = false) {
  if (!str) return '';
  let res = str.replace(/\\".*$/, '');
  res = res.replace(/\\&|\\c|\\\||\\\^/g, '');
  res = res.replace(/\\ |\\~/g, ' ');
  res = res.replace(/\\\((..)/g, (m, n) => SPECIAL_CHARS[n] ?? m);
  res = res.replace(/\\\[u([0-9A-Fa-f]{4,6})\]/g, (m, h) => String.fromCodePoint(parseInt(h, 16)));
  res = res.replace(/\\\[([^\]]+)\]/g, (m, n) => (/^[BIPR]$|^CR$/.test(n) ? m : SPECIAL_CHARS[n] ?? m));
  res = res.replace(/\\(-|<|>)/g, '$1');

  // Fonts: \fB bold, \fI italic, \fR/\fP back to roman.
  let font = 'R';
  res = res.replace(/\\f(?:\[([A-Z]+)\]|(.))/g, (m, long, short) => {
    const next = long || short;
    const prev = font;
    font = next === 'P' ? 'R' : next;
    if (plain) return '';
    const mark = f => (f === 'B' ? '**' : f === 'I' ? '*' : '');
    return mark(prev) + mark(font);
  });
  if (!plain && (font === 'B' || font === 'I')) res += font === 'B' ? '**' : '*';

  res = res.replace(/\\e/g, '\\');
  return res;
}

function escapeVueHtml(str) {
  if (!str) return '';
  let result = '';
  let inBacktick = false;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === '`') {
      inBacktick = !inBacktick;
      result += char;
    } else if (!inBacktick && char === '<') {
      result += '&lt;';
    } else if (!inBacktick && char === '>') {
      result += '&gt;';
    } else {
      result += char;
    }
  }
  return result;
}

function parseMacroArgs(line) {
  const tokens = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '\\' && line[i + 1] === ' ') {
      // Roff uses an escaped space to keep words together in macro arguments.
      // Preserve it here; unescapeRoff() converts it to a literal space later.
      current += '\\ ';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ' ' && !inQuotes) {
      if (current.length > 0) {
        tokens.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }
  if (current.length > 0) {
    tokens.push(current);
  }
  return tokens;
}

/* Join the arguments of a font-alternating macro (.BR, .IR, .B, ...).
 * `fonts` holds one font letter per alternating position. With `styled`, bold
 * and italic words become Markdown emphasis; otherwise the text stays plain. */
function formatAlternatingArgs(args, fonts = 'R', styled = false) {
  if (styled && fonts.length === 1 && (fonts === 'B' || fonts === 'I')) {
    // One font for the whole macro: a single emphasis span, not one per word.
    const text = formatAlternatingArgs(args, 'R', false);
    const mark = fonts === 'B' ? '**' : '*';
    return text ? `${mark}${text}${mark}` : '';
  }
  let res = '';
  args.forEach((arg, idx) => {
    let cleanArg = unescapeRoff(arg, !styled);
    if (!cleanArg) return;
    const font = fonts[idx % fonts.length];
    if (styled && cleanArg.trim()) {
      const mark = font === 'B' ? '**' : font === 'I' ? '*' : '';
      if (mark && !cleanArg.includes(mark)) cleanArg = cleanArg.replace(/^(\s*)(.*?)(\s*)$/, `$1${mark}$2${mark}$3`);
    }
    if (idx > 0) {
      if (!/^\s*[\.,;:\)\]\>]/.test(cleanArg) && !/[\s\[({<]$/.test(res) && !/^\s/.test(cleanArg)) {
        res += ' ';
      }
    }
    res += cleanArg;
  });
  return res.replace(/\s+,/g, ',').replace(/\s+/g, ' ').trim();
}

function splitTblRow(raw, columns) {
  let parts = raw.includes('\t') ? raw.split('\t') : raw.split(/\s{2,}/);
  if (parts.length < columns) parts = raw.trim().split(/\s{2,}/);
  while (parts.length < columns) parts.push('');
  return parts.slice(0, columns);
}

function tblCell(value) {
  return escapeVueHtml(unescapeRoff((value || '').trim(), true)).replace(/\|/g, '\\|');
}

/* Convert a tbl(1) table (.TS/.TE) into a GFM table. Handles the simple
 * tab-separated form used by the manpages: option lines ending in ';',
 * one or more format lines ending in '.', a '_' header rule, and rows. */
function parseTblTable(lines, start) {
  let i = start + 1;
  const formats = [];

  for (; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (line === '.TE') return { markdown: [], next: i + 1 };
    if (line.endsWith(';')) continue;
    if (line.startsWith('.')) break;

    const closed = line.endsWith('.');
    const spec = closed ? line.slice(0, -1).trim() : line;
    formats.push(spec.split(/\s+/).filter(Boolean));
    if (closed) {
      i++;
      break;
    }
  }

  if (!formats.length) return { markdown: [], next: i };

  const columns = formats[formats.length - 1];
  const rows = [];
  let header = null;

  for (; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '.TE') {
      i++;
      break;
    }
    if (!line) continue;
    if (line === '_' || line === '=') {
      if (rows.length) header = rows.pop();
      continue;
    }
    if (line.startsWith('.')) continue;
    rows.push(splitTblRow(lines[i], columns.length));
  }

  const alignments = columns.map(column => {
    const align = column[0];
    return align === 'r' ? '---:' : align === 'c' ? ':---:' : ':---';
  });
  const render = cells => `| ${columns.map((_, index) => tblCell(cells[index])).join(' | ')} |`;
  const markdown = [
    render(header || columns.map(() => '')),
    `| ${alignments.join(' | ')} |`,
    ...rows.map(render)
  ];
  return { markdown, next: i };
}

/* Markdown needs a blank line between a list and the paragraph around it,
 * or the paragraph is absorbed into the last list item. */
function separateLists(lines) {
  const out = [];
  let fenced = false;
  for (const line of lines) {
    const prev = out[out.length - 1];
    if (/^\s*```/.test(line)) fenced = !fenced;
    if (!fenced && prev !== undefined && prev.trim() && line.trim()) {
      const prevInList = /^(- |\s{2,}\S)/.test(prev);
      const lineInList = /^(- |\s{2,}\S)/.test(line);
      if (prevInList !== lineInList) out.push('');
    }
    out.push(line);
  }
  return out;
}

function parseManpageToMarkdown(manContent) {
  const lines = manContent.split(/\r?\n/);
  let md = [];
  let inTP = false;
  let tpTerm = '';
  let tpDesc = [];
  let rsLevel = 0;
  let section = '';
  let exampleEligible = false;
  let exampleLines = [];
  let inNofill = false;
  let nofillLines = [];
  let listItem = null; // null, or { started } while inside an .IP list item
  const warned = new Set();

  /* Emit a prose line, folding it into the open list item if there is one. */
  function emit(text) {
    if (listItem) {
      md.push((listItem.started ? '  ' : listItem.marker + ' ') + text);
      listItem.started = true;
    } else {
      md.push(text);
    }
  }

  function flushExample() {
    if (!exampleLines.length) return;
    md.push('', '```sh', ...exampleLines, '```', '');
    exampleLines = [];
    exampleEligible = false;
  }

  function flushTP() {
    if (inTP) {
      if (tpTerm) {
        let cleanTerm = unescapeRoff(tpTerm, true).replace(/\s+/g, ' ').trim();
        cleanTerm = cleanTerm.replace(/\s+,/g, ',');

        // Check if term is a bullet item like "* Portable" or "- Fast"
        if (/^[\*\-\+]\s+/.test(cleanTerm)) {
          const itemText = cleanTerm.replace(/^[\*\-\+]\s+/, '');
          md.push(`- **${itemText}**`);
        } else {
          md.push(`- **\`${cleanTerm}\`**`);
        }

        if (tpDesc.length > 0) {
          let descLines = [];
          let currentLine = [];

          tpDesc.forEach(item => {
            if (item === '\n') {
              if (currentLine.length > 0) {
                descLines.push(currentLine.join(' '));
                currentLine = [];
              }
            } else {
              currentLine.push(item);
            }
          });
          if (currentLine.length > 0) {
            descLines.push(currentLine.join(' '));
          }

          descLines.forEach(lineText => {
            let cleanLine = unescapeRoff(lineText).replace(/\s+/g, ' ').trim();
            if (!cleanLine) return;

            // Check if line looks like a sub-list item (e.g. "1: 16-bit PCM...")
            if (/^\d+:\s+/.test(cleanLine)) {
              const match = cleanLine.match(/^(\d+):\s+(.*)$/);
              md.push(`  - **${match[1]}**: ${escapeVueHtml(match[2])}`);
            } else {
              md.push(`  ${escapeVueHtml(cleanLine)}`);
            }
          });
        }
      }
      inTP = false;
      tpTerm = '';
      tpDesc = [];
    }
  }

  for (let i = 0; i < lines.length; i++) {
    if (inNofill) {
      if (/^\.fi\b/.test(lines[i].trim())) {
        inNofill = false;
        md.push('', '```', ...nofillLines, '```', '');
        nofillLines = [];
      } else if (!lines[i].startsWith('.')) {
        nofillLines.push(unescapeRoff(lines[i], true));
      }
      continue;
    }

    let line = lines[i].trim();
    if (!line) {
      if (inTP) {
        tpDesc.push('\n');
      } else {
        md.push('');
      }
      continue;
    }

    // Roff comments (e.g. the `'\" t` tbl preprocessor hint) are not content.
    if (line.startsWith('\'\\"') || line.startsWith('.\\"')) continue;

    if (line.startsWith('.')) {
      const tokens = parseMacroArgs(line);
      const macro = tokens[0];

      if (['.SH', '.SS', '.PP', '.P', '.TP', '.TS', '.IP', '.nf'].includes(macro)) listItem = null;

      if (macro === '.TH') {
        continue;
      } else if (macro === '.SH') {
        flushTP();
        flushExample();
        const sectionName = tokens.slice(1).join(' ').replace(/^"(.*)"$/, '$1');
        section = unescapeRoff(sectionName, true).trim().toUpperCase();
        md.push(`\n### ${unescapeRoff(sectionName, true)}\n`);
      } else if (macro === '.SS') {
        flushTP();
        const subSec = tokens.slice(1).join(' ').replace(/^"(.*)"$/, '$1');
        md.push(`\n#### ${unescapeRoff(subSec, true)}\n`);
      } else if (macro === '.TS') {
        flushTP();
        const table = parseTblTable(lines, i);
        if (table.markdown.length) md.push('', ...table.markdown, '');
        i = table.next - 1;
      } else if (macro === '.TP') {
        flushTP();
        inTP = true;
      } else if (macro === '.PP' || macro === '.P') {
        // In roff, .PP ends a .TP entry and returns to the left margin.
        flushTP();
        flushExample();
        md.push('');
        if (section === 'EXAMPLES') exampleEligible = true;
      } else if (macro === '.IP') {
        if (inTP) {
          tpDesc.push('\n');
          if (/^(•|-|\*)$/.test(unescapeRoff(tokens[1] || '', true).trim())) tpDesc.push('-');
        } else if (section === 'EXAMPLES') {
          flushExample();
          exampleEligible = true;
        } else if (tokens[1]) {
          const tag = unescapeRoff(tokens[1], true).trim();
          if (/^(•|-|\*)$/.test(tag)) listItem = { marker: '-', started: false };
          else if (/^\d+[.)]$/.test(tag)) listItem = { marker: tag, started: false };
          else listItem = { marker: `- **${escapeVueHtml(tag)}**`, started: false };
        }
      } else if (macro === '.br') {
        if (inTP) {
          tpDesc.push('\n');
        } else if (!(section === 'EXAMPLES' && exampleLines.length)) {
          md.push('');
        }
      } else if (macro === '.RS') {
        rsLevel++;
        if (inTP) tpDesc.push('\n');
      } else if (macro === '.RE') {
        if (rsLevel > 0) rsLevel--;
        if (inTP) tpDesc.push('\n');
      } else if (FONT_MACROS[macro]) {
        const inExample = section === 'EXAMPLES' && (exampleEligible || exampleLines.length);
        const inTerm = inTP && !tpTerm;
        const formatted = formatAlternatingArgs(tokens.slice(1), FONT_MACROS[macro], !inExample && !inTerm);

        if (inExample) {
          if (formatted) exampleLines.push(formatted);
        } else if (inTerm) {
          tpTerm = formatted;
        } else if (inTP) {
          tpDesc.push(formatted);
        } else {
          emit(escapeVueHtml(formatted));
        }
      } else if (macro === '.nf') {
        flushTP();
        flushExample();
        inNofill = true;
      } else if (macro === '.sp') {
        md.push('');
      } else if (IGNORED_MACROS.has(macro)) {
        // layout-only macros with no Markdown equivalent
      } else {
        if (!warned.has(macro)) {
          warned.add(macro);
          console.warn(`generate-cli-docs: unsupported macro ${macro} (line ${i + 1}); treating arguments as text`);
        }
        const rest = unescapeRoff(tokens.slice(1).join(' '));
        if (rest && !/^\d+$/.test(rest)) {
          if (inTP) tpDesc.push(rest);
          else emit(escapeVueHtml(rest));
        }
      }
    } else {
      const cleanLine = unescapeRoff(line);
      if (inTP) {
        if (!tpTerm) {
          tpTerm = unescapeRoff(line, true);
        } else {
          tpDesc.push(cleanLine);
        }
      } else {
        if (section === 'EXAMPLES' && (exampleEligible || exampleLines.length)) {
          flushExample();
          exampleEligible = false;
        }
        if (rsLevel > 0 && /^\d+:\s+/.test(cleanLine)) {
          const match = cleanLine.match(/^(\d+):\s+(.*)$/);
          md.push(`- **${match[1]}**: ${escapeVueHtml(match[2])}`);
        } else {
          emit(escapeVueHtml(cleanLine));
        }
      }
    }
  }

  flushTP();
  flushExample();

  return separateLists(md.join('\n').split('\n')).join('\n').replace(/\n{3,}/g, '\n\n');
}

const docsDir = path.join(ROOT, 'vendor/faac/docs');
if (!fs.existsSync(docsDir)) {
  console.error('generate-cli-docs: vendor/faac/docs not found; run `git submodule update --init`');
  process.exit(1);
}

for (const name of ['faac', 'faad', 'faam', 'faar']) {
  const manPath = path.join(ROOT, 'vendor/faac/docs', `${name}.1`);
  if (fs.existsSync(manPath)) {
    const man = fs.readFileSync(manPath, 'utf8');
    const md = parseManpageToMarkdown(man);
    fs.writeFileSync(path.join(ROOT, 'docs/docs', `${name}-cli-gen.md`), md);
    console.log(`Generated docs/docs/${name}-cli-gen.md`);
  }
}

for (const name of ['libfaac', 'libfaad', 'libfaam', 'libfaar']) {
  const source = path.join(ROOT, 'vendor/faac/docs', `${name}.md`);
  if (fs.existsSync(source)) {
    fs.writeFileSync(path.join(ROOT, 'docs/docs', `${name}-api-gen.md`), fs.readFileSync(source, 'utf8'));
    console.log(`Generated docs/docs/${name}-api-gen.md`);
  }
}
