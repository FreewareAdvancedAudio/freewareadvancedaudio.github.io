import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createContentLoader, type SiteConfig } from 'vitepress'
import { postLoaderOptions } from './blog'

const escapeXml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Renders an RSS 2.0 feed of the blog (title + summary per post). */
export async function renderBlogFeed(siteTitle: string, root: string) {
  const items = await createContentLoader('blog/*.md', postLoaderOptions).load()
  const rss = (u: string) => `${root}${u.replace(/^\//, '')}`
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(siteTitle)} Blog</title>
    <link>${rss('blog/')}</link>
    <description>Release notes and project news for FAAC, FAAD, FAAM and FAAR.</description>
    <language>en</language>
    <atom:link href="${rss('feed.xml')}" rel="self" type="application/rss+xml"/>
${items.map(p => `    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${rss(p.url)}</link>
      <guid isPermaLink="true">${rss(p.url)}</guid>
      <pubDate>${new Date(p.date).toUTCString()}</pubDate>
      <description>${escapeXml(p.description)}</description>
    </item>`).join('\n')}
  </channel>
</rss>
`
  return xml
}

/** Writes feed.xml into the build output. */
export async function writeBlogFeed(config: SiteConfig, root: string) {
  writeFileSync(join(config.outDir, 'feed.xml'), await renderBlogFeed(config.site.title, root))
}
