import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function escapeVueHtml(str) {
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

export function parseChangeLog(text) {
  const lines = text.split(/\r?\n/);
  const versions = [];
  let currentVersion = null;
  let currentAuthor = null;
  let currentItem = null;
  let currentSubItem = null;

  function flushSubItem() {
    if (currentSubItem && currentItem) {
      currentItem.subItems.push(currentSubItem.join(' ').trim());
      currentSubItem = null;
    }
  }

  function flushItem() {
    flushSubItem();
    if (currentItem) {
      const itemRecord = {
        text: currentItem.text.trim()
      };
      if (currentItem.subItems.length > 0) {
        itemRecord.subItems = currentItem.subItems;
      }
      if (currentAuthor) {
        currentAuthor.items.push(itemRecord);
      } else if (currentVersion) {
        currentVersion.items.push(itemRecord);
      }
      currentItem = null;
    }
  }

  function flushAuthor() {
    flushItem();
    if (currentAuthor && currentVersion) {
      currentVersion.authors.push(currentAuthor);
      currentAuthor = null;
    }
  }

  function flushVersion() {
    flushAuthor();
    if (currentVersion) {
      versions.push(currentVersion);
      currentVersion = null;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // Check version header:
    // "Unreleased" or "2.2 (Sep 29, 2026)" or "1.29 (Jul 4, 2017)" or "v2.0 - 2026-07-20"
    const verMatch = trimmed.match(/^(?:v\.?|version\s+)?([0-9]+(?:\.[0-9]+)+|[0-9]+|Unreleased)(?:[\s:–—-]+(?:\((.*?)\)|([0-9]{4}[^)]*)|([A-Za-z]{3}\s+[0-9]{1,2},?\s+[0-9]{4})))?$/i);
    const isIndented = /^\s{2,}|\t/.test(rawLine);
    const startsWithBullet = /^[\*\-\+]/.test(trimmed);

    if (verMatch && (!isIndented || verMatch[1].toLowerCase() === 'unreleased') && !startsWithBullet) {
      flushVersion();
      const rawTitle = verMatch[1];
      const title = rawTitle.toLowerCase() === 'unreleased' ? 'Unreleased' : rawTitle;
      const rawDate = (verMatch[2] || verMatch[3] || verMatch[4] || '').trim();

      const yearMatch = rawDate.match(/\b(19\d\d|20\d\d)\b/);
      const year = yearMatch ? yearMatch[1] : (title === 'Unreleased' ? 'Upcoming' : undefined);

      const anchor = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

      currentVersion = {
        title,
        anchor: anchor || 'version',
        date: rawDate,
        year,
        authors: [],
        items: []
      };
      continue;
    }

    // Check author header: e.g. "[ Nils Schimmelmann ]"
    const authorBracketMatch = trimmed.match(/^\[\s*(.+?)\s*\]$/);
    if (authorBracketMatch) {
      flushAuthor();
      currentAuthor = {
        name: authorBracketMatch[1].trim(),
        items: []
      };
      continue;
    }

    // Check nested sub-item: e.g. "+ Remove BwpInfo..." or "  - nested"
    const subBulletMatch = rawLine.match(/^\s*(?:\+|\s{2,}[-*])\s+(.*)$/);
    if (subBulletMatch && currentItem) {
      flushSubItem();
      currentSubItem = [subBulletMatch[1].trim()];
      continue;
    }

    // Check main bullet item: e.g. "* New libraries...", "- quality related..."
    const bulletMatch = trimmed.match(/^(\*|-)\s+(.*)$/);
    if (bulletMatch) {
      flushItem();
      currentItem = {
        text: bulletMatch[2].trim(),
        subItems: []
      };
      continue;
    }

    // Continuation line
    if (currentSubItem) {
      currentSubItem.push(trimmed);
    } else if (currentItem) {
      currentItem.text += ' ' + trimmed;
    } else {
      // Loose line without bullet
      currentItem = {
        text: trimmed,
        subItems: []
      };
    }
  }

  flushVersion();
  return versions;
}

export function renderMarkdown(versions) {
  const lines = [];

  // Frontmatter
  lines.push('---');
  lines.push('title: FAAC & FAAD ChangeLog & Release History');
  lines.push('description: Full changelog and release history for FAAC, FAAD, FAAM, and FAAR across all versions.');
  lines.push('---');
  lines.push('');
  lines.push('# Release History & ChangeLog');
  lines.push('');
  lines.push('Review the complete version history, library ABI updates, feature additions, and bug fixes for **FAAC**, **FAAD**, **FAAM**, and **FAAR**.');
  lines.push('');

  // UX Controls Toolbar: Search filter + Expand / Collapse all
  lines.push('<div class="changelog-toolbar">');
  lines.push('  <div class="changelog-search-wrap">');
  lines.push('    <i class="fa-solid fa-magnifying-glass search-icon" aria-hidden="true"></i>');
  lines.push('    <input type="text" class="changelog-search-input" placeholder="Filter changes (e.g. SBR, ABI, Win32, MP4)..." oninput="');
  lines.push('      const q = this.value.toLowerCase().trim();');
  lines.push('      document.querySelectorAll(\'.changelog-details\').forEach(d => {');
  lines.push('        const match = !q || d.innerText.toLowerCase().includes(q);');
  lines.push('        d.style.display = match ? \'\' : \'none\';');
  lines.push('        if (q && match) d.open = true;');
  lines.push('      });');
  lines.push('    ">');
  lines.push('  </div>');
  lines.push('  <div class="changelog-actions">');
  lines.push('    <button type="button" class="changelog-btn" onclick="document.querySelectorAll(\'.changelog-details\').forEach(d => d.open = true)"><i class="fa-solid fa-angles-down" aria-hidden="true"></i> Expand All</button>');
  lines.push('    <button type="button" class="changelog-btn" onclick="document.querySelectorAll(\'.changelog-details\').forEach(d => d.open = false)"><i class="fa-solid fa-angles-up" aria-hidden="true"></i> Collapse All</button>');
  lines.push('  </div>');
  lines.push('</div>');
  lines.push('');

  let previousYear = undefined;

  for (let idx = 0; idx < versions.length; idx++) {
    const ver = versions[idx];

    // Insert Horizontal Rule between different calendar years
    if (ver.year && previousYear && ver.year !== previousYear) {
      lines.push('---');
      lines.push('');
    }
    previousYear = ver.year;

    // Count total changes in this release
    let totalChanges = ver.items.length;
    for (const a of ver.authors) totalChanges += a.items.length;

    // Open by default for the first 2 releases (Unreleased + latest stable)
    const isOpen = idx < 2 ? ' open' : '';
    const isUnreleased = ver.title.toLowerCase() === 'unreleased';
    const tag = isUnreleased
      ? '<span class="status-tag unreleased"><i class="fa-solid fa-clock-rotate-left"></i> Pending</span>'
      : '<span class="status-tag released"><i class="fa-solid fa-check"></i> Released</span>';

    // Section anchor for direct URL navigation & VitePress TOC
    lines.push(`## ${ver.title}${ver.date ? ` (${ver.date})` : ''} {#${ver.anchor}}`);
    lines.push('');
    lines.push(`<details class="changelog-details"${isOpen}>`);
    lines.push('  <summary class="changelog-summary">');
    lines.push('    <span class="changelog-summary-left">');
    lines.push(`      <span class="version-name">${escapeVueHtml(ver.title)}</span>`);
    if (ver.date) {
      lines.push(`      <span class="version-date">${escapeVueHtml(ver.date)}</span>`);
    }
    lines.push(`      <span class="version-count-pill">${totalChanges} change${totalChanges === 1 ? '' : 's'}</span>`);
    lines.push('    </span>');
    lines.push(`    <span class="changelog-summary-right">${tag}</span>`);
    lines.push('  </summary>');
    lines.push('');
    lines.push('<div class="changelog-body">');
    lines.push('');

    // If there are top-level items without authors
    if (ver.items.length > 0) {
      for (const item of ver.items) {
        lines.push(`- ${escapeVueHtml(item.text)}`);
        if (item.subItems && item.subItems.length > 0) {
          for (const sub of item.subItems) {
            lines.push(`  - ${escapeVueHtml(sub)}`);
          }
        }
      }
      lines.push('');
    }

    // If there are contributors
    if (ver.authors.length > 0) {
      for (const author of ver.authors) {
        lines.push(`<div class="changelog-author"><i class="fa-solid fa-user-pen" aria-hidden="true"></i> <strong>${escapeVueHtml(author.name)}</strong></div>`);
        lines.push('');
        for (const item of author.items) {
          lines.push(`- ${escapeVueHtml(item.text)}`);
          if (item.subItems && item.subItems.length > 0) {
            for (const sub of item.subItems) {
              lines.push(`  - ${escapeVueHtml(sub)}`);
            }
          }
        }
        lines.push('');
      }
    }

    lines.push('</div>');
    lines.push('');
    lines.push('</details>');
    lines.push('');
  }

  return lines.join('\n');
}

export function generateChangelog(
  inputPath = path.join(ROOT, 'vendor/faac/ChangeLog'),
  outputPath = path.join(ROOT, 'docs/docs/changes.md')
) {
  if (!fs.existsSync(inputPath)) {
    console.error(`generate-changelog: ${inputPath} not found.`);
    return;
  }
  const text = fs.readFileSync(inputPath, 'utf8');
  const versions = parseChangeLog(text);
  const markdown = renderMarkdown(versions);
  fs.writeFileSync(outputPath, markdown, 'utf8');
  console.log(`Generated ${outputPath} from ${inputPath} (${versions.length} versions parsed)`);
}

// Run directly if invoked from command line
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  generateChangelog();
}
