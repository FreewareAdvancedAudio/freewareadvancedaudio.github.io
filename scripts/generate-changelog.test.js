import { describe, it, expect } from 'vitest';
import { parseChangeLog, renderMarkdown, escapeVueHtml } from '../scripts/generate-changelog.js';
import fs from 'node:fs';
import path from 'node:path';

describe('ChangeLog Generator', () => {
  it('correctly escapes Vue HTML special characters outside code backticks', () => {
    expect(escapeVueHtml('faac --drc <profile>')).toBe('faac --drc &lt;profile&gt;');
    expect(escapeVueHtml('`faac <tag>` is fine')).toBe('`faac <tag>` is fine');
    expect(escapeVueHtml(null)).toBe('');
  });

  it('parses standard version headers, authors, and bullet items', () => {
    const sample = `
Unreleased

\t[ Nils Schimmelmann ]
\t* New libraries and tools: libfaad
\t* HE-AAC v2 encoding

2.2 (Sep 29, 2026)

\t[ Robert Kausch ]
\t* build: honor an explicit b_lto=false

\t[ Nils Schimmelmann ]
\t* Bump the ABI to 2
`;
    const versions = parseChangeLog(sample);
    expect(versions).toHaveLength(2);

    expect(versions[0].title).toBe('Unreleased');
    expect(versions[0].date).toBe('');
    expect(versions[0].year).toBe('Upcoming');
    expect(versions[0].authors).toHaveLength(1);
    expect(versions[0].authors[0].name).toBe('Nils Schimmelmann');
    expect(versions[0].authors[0].items).toHaveLength(2);

    expect(versions[1].title).toBe('2.2');
    expect(versions[1].date).toBe('Sep 29, 2026');
    expect(versions[1].year).toBe('2026');
    expect(versions[1].authors).toHaveLength(2);
    expect(versions[1].authors[0].name).toBe('Robert Kausch');
    expect(versions[1].authors[1].name).toBe('Nils Schimmelmann');
  });

  it('handles variations and typos gracefully (different dashes, prefixes, sub-bullets, missing dates)', () => {
    const loose = `
v2.0 - 2026-07-20

\t[ Orbis Security AI ]
\t* filtbank: Fix buffer copies
\t  + Remove BwpInfo from struct
\t  + Remove nextSampleBuff from struct

1.29.6 (Aug 18, 2017)

\t- quality related bug fixed
\t- second fix

1.28

\t* Prevent out of range scalefactors
`;
    const versions = parseChangeLog(loose);
    expect(versions).toHaveLength(3);

    // Check v2.0
    expect(versions[0].title).toBe('2.0');
    expect(versions[0].year).toBe('2026');
    expect(versions[0].authors[0].items[0].text).toContain('filtbank: Fix buffer copies');
    expect(versions[0].authors[0].items[0].subItems).toHaveLength(2);
    expect(versions[0].authors[0].items[0].subItems[0]).toBe('Remove BwpInfo from struct');

    // Check 1.29.6 top items without authors
    expect(versions[1].title).toBe('1.29.6');
    expect(versions[1].year).toBe('2017');
    expect(versions[1].items).toHaveLength(2);

    // Check 1.28 without date
    expect(versions[2].title).toBe('1.28');
    expect(versions[2].date).toBe('');
    expect(versions[2].items).toHaveLength(1);
  });

  it('renders markdown with details blocks and HR between different years', () => {
    const sample = `
2.2 (Sep 29, 2026)

\t* Feature A

1.31 (Feb 28, 2025)

\t* Feature B

1.30 (Oct 16, 2019)

\t* Feature C
`;
    const versions = parseChangeLog(sample);
    const md = renderMarkdown(versions);

    // Expand / Collapse controls
    expect(md).toContain('Expand All');
    expect(md).toContain('Collapse All');

    // Outlines are handled by VitePress headers
    expect(md).toContain('## 2.2 (Sep 29, 2026) {#2-2}');
    expect(md).toContain('## 1.31 (Feb 28, 2025) {#1-31}');

    // Details blocks
    expect(md).toContain('<details class="changelog-details" open>');
    expect(md).toContain('<details class="changelog-details">');

    // Verify Horizontal Rule between 2026 -> 2025 and 2025 -> 2019
    const hrCount = (md.match(/\n---\n/g) || []).length;
    // 1 frontmatter end + 2 year breaks = 3
    expect(hrCount).toBe(3);
  });

  it('successfully parses the actual vendor/faac/ChangeLog file', () => {
    const raw = fs.readFileSync(path.resolve(process.cwd(), 'vendor/faac/ChangeLog'), 'utf8');
    const versions = parseChangeLog(raw);
    expect(versions.length).toBeGreaterThanOrEqual(20);
    expect(versions[0].title).toBe('Unreleased');
    expect(versions[1].title).toBe('2.2');
  });
});
