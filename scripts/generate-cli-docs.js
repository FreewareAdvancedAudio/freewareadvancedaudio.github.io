import fs from 'fs';
import path from 'path';

function unescapeRoff(str) {
  if (!str) return '';
  let res = str;
  // Font escape sequences
  res = res.replace(/\\f[BIPR]/g, '');
  res = res.replace(/\\f\[[A-Za-z0-9]+\]/g, '');
  // Hyphen and special character unescaping
  res = res.replace(/\\-\^\-/g, '--');
  res = res.replace(/\\-\^?/g, '-');
  res = res.replace(/\\\^\-/g, '-');
  res = res.replace(/\\\^/g, '');
  res = res.replace(/\\\(hy/g, '-');
  res = res.replace(/\\hy\(/g, '-');
  res = res.replace(/\\\(em/g, '—');
  res = res.replace(/\\ /g, ' ');
  res = res.replace(/\\e/g, '\\');
  res = res.replace(/\\~/g, ' ');
  res = res.replace(/\\</g, '<');
  res = res.replace(/\\>/g, '>');
  res = res.replace(/\\hy/g, '');
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
    if (char === '"') {
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

function formatAlternatingArgs(args) {
  let res = '';
  args.forEach((arg, idx) => {
    let cleanArg = unescapeRoff(arg);
    if (!cleanArg) return;
    if (idx > 0) {
      if (!/^\s*[\.,;:\)\]\>]/.test(cleanArg) && !/\s$/.test(res) && !/^\s/.test(cleanArg)) {
        res += ' ';
      }
    }
    res += cleanArg;
  });
  return res.replace(/\s+,/g, ',').replace(/\s+/g, ' ').trim();
}

function parseManpageToMarkdown(manContent) {
  const lines = manContent.split(/\r?\n/);
  let md = [];
  let inTP = false;
  let tpTerm = '';
  let tpDesc = [];
  let rsLevel = 0;

  function flushTP() {
    if (inTP) {
      if (tpTerm) {
        let cleanTerm = unescapeRoff(tpTerm).replace(/\s+/g, ' ').trim();
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
    let line = lines[i].trim();
    if (!line) {
      if (inTP) {
        tpDesc.push('\n');
      } else {
        md.push('');
      }
      continue;
    }

    if (line.startsWith('.')) {
      const tokens = parseMacroArgs(line);
      const macro = tokens[0];

      if (macro === '.TH') {
        continue;
      } else if (macro === '.SH') {
        flushTP();
        const sectionName = tokens.slice(1).join(' ').replace(/^"(.*)"$/, '$1');
        md.push(`\n### ${unescapeRoff(sectionName)}\n`);
      } else if (macro === '.SS') {
        flushTP();
        const subSec = tokens.slice(1).join(' ').replace(/^"(.*)"$/, '$1');
        md.push(`\n#### ${unescapeRoff(subSec)}\n`);
      } else if (macro === '.TP') {
        flushTP();
        inTP = true;
      } else if (macro === '.PP' || macro === '.P') {
        if (inTP) {
          tpDesc.push('\n');
        } else {
          flushTP();
          md.push('');
        }
      } else if (macro === '.br') {
        if (inTP) {
          tpDesc.push('\n');
        } else {
          md.push('');
        }
      } else if (macro === '.RS') {
        rsLevel++;
        if (inTP) tpDesc.push('\n');
      } else if (macro === '.RE') {
        if (rsLevel > 0) rsLevel--;
        if (inTP) tpDesc.push('\n');
      } else if (macro === '.BR' || macro === '.BI' || macro === '.B' || macro === '.I' || macro === '.RI') {
        const rawArgs = tokens.slice(1);
        let formatted = formatAlternatingArgs(rawArgs);

        if (inTP && !tpTerm) {
          tpTerm = formatted;
        } else if (inTP) {
          tpDesc.push(formatted);
        } else {
          md.push(escapeVueHtml(formatted));
        }
      } else if (macro === '.nh') {
        // ignore hyphenation macro
      } else {
        const rest = unescapeRoff(tokens.slice(1).join(' '));
        if (rest && !/^\d+$/.test(rest)) {
          if (inTP) tpDesc.push(rest);
          else md.push(escapeVueHtml(rest));
        }
      }
    } else {
      const cleanLine = unescapeRoff(line);
      if (inTP) {
        if (!tpTerm) {
          tpTerm = cleanLine;
        } else {
          tpDesc.push(cleanLine);
        }
      } else {
        if (rsLevel > 0 && /^\d+:\s+/.test(cleanLine)) {
          const match = cleanLine.match(/^(\d+):\s+(.*)$/);
          md.push(`- **${match[1]}**: ${escapeVueHtml(match[2])}`);
        } else {
          md.push(escapeVueHtml(cleanLine));
        }
      }
    }
  }

  flushTP();

  return md.join('\n').replace(/\n{3,}/g, '\n\n');
}

// Generate FAAC CLI markdown snippet
const faacManPath = path.join(process.cwd(), 'vendor/faac/docs/faac.1');
if (fs.existsSync(faacManPath)) {
  const faacMan = fs.readFileSync(faacManPath, 'utf8');
  const faacMd = parseManpageToMarkdown(faacMan);
  fs.writeFileSync(path.join(process.cwd(), 'docs/docs/faac-cli-gen.md'), faacMd);
  console.log('Generated docs/docs/faac-cli-gen.md');
}

// Generate FAAD CLI markdown snippet
const faadManPath = path.join(process.cwd(), 'vendor/faad2/frontend/faad.man');
if (fs.existsSync(faadManPath)) {
  const faadMan = fs.readFileSync(faadManPath, 'utf8');
  const faadMd = parseManpageToMarkdown(faadMan);
  fs.writeFileSync(path.join(process.cwd(), 'docs/docs/faad-cli-gen.md'), faadMd);
  console.log('Generated docs/docs/faad-cli-gen.md');
}
