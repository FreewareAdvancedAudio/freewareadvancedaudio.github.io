import { defineConfig } from 'vitepress'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const base = `/${(process.env.SITE_BASE_PATH || '/').replace(/^\/+|\/+$/g, '')}/`.replace(/^\/\/$/, '/')
const origin = process.env.SITE_ORIGIN || 'https://freewareadvancedaudio.github.io'

const docsSidebar = [
  {
    text: 'Getting Started',
    items: [
      { text: 'Installation Guide', link: '/docs/install' },
      { text: 'FAAC AAC Encoder', link: '/docs/faac' },
      { text: 'FAAD AAC Decoder', link: '/docs/faad' },
      { text: 'FAAM MP4 Muxer/Demuxer', link: '/docs/faam' },
      { text: 'FAAR Sample Rate Converter', link: '/docs/faar' }
    ]
  },
  {
    text: 'CLI Manuals',
    items: [
      { text: 'FAAC CLI Manpage', link: '/docs/faac-cli' },
      { text: 'FAAD CLI Manpage', link: '/docs/faad-cli' },
      { text: 'FAAM CLI Manpage', link: '/docs/faam-cli' },
      { text: 'FAAR CLI Manpage', link: '/docs/faar-cli' }
    ]
  },
  {
    text: 'C Library APIs',
    items: [
      { text: 'libfaac C API', link: '/docs/libfaac' },
      { text: 'libfaad C API', link: '/docs/libfaad' },
      { text: 'libfaam C API', link: '/docs/libfaam' },
      { text: 'libfaar C API', link: '/docs/libfaar' }
    ]
  },
  {
    text: 'Compare & Evaluate',
    items: [
      { text: 'Choose an Encoder or Decoder', link: '/docs/comparison' },
      { text: 'AAC Benchmark Results', link: '/docs/aac-benchmark' },
      { text: 'AAC on ESP32', link: '/docs/esp32-aac' },
      { text: 'Listening-Test Guide', link: '/docs/listening' }
    ]
  }
]

// Builds FAQPage structured data from a "## Quick questions" or "## Common questions" section:
// each "### question" followed by its answer paragraphs, with markdown reduced to plain text.
function faqFromMarkdown(file: string) {
  const src = readFileSync(file, 'utf8').replace(/<[^>]+>/g, '')
  const section = src.split(/^## (?:Quick|Common) questions.*$/m)[1]?.split(/^## /m)[0]
  if (!section) return null
  const plain = (t: string) => t.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[*`]/g, '').replace(/\s+/g, ' ').trim()
  const items = section.split(/^### /m).slice(1).map(block => {
    const [q, ...rest] = block.split('\n')
    return { '@type': 'Question', name: plain(q), acceptedAnswer: { '@type': 'Answer', text: plain(rest.join(' ')) } }
  }).filter(i => i.name && i.acceptedAnswer.text)
  return items.length ? { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: items } : null
}

export default defineConfig({
  base,
  title: 'Freeware Advanced Audio',
  description: 'FAAC is an LGPL-licensed, dependency-free AAC encoder and decoder suite with a resampler and MP4 muxer, configurable at build time for fast media pipelines and embedded devices such as the ESP32.',
  titleTemplate: ':title | Freeware Advanced Audio',
  cleanUrls: true,
  vite: {
    server: {
      watch: {
        usePolling: process.env.VITEPRESS_POLLING === '1',
        interval: 500
      }
    }
  },
  markdown: {
    config(md) {
      // Add decoration at render time so anchors and outline labels stay plain text.
      const renderHeading = md.renderer.rules.heading_open
      md.renderer.rules.heading_open = (tokens, idx, options, env, self) => {
        const children = tokens[idx + 1]?.children || []
        const title = children
          .filter(token => ['text', 'code_inline', 'emoji'].includes(token.type) && !token.meta?.isPermalinkSymbol)
          .map(token => token.content).join('').trim()
        const anchor = children.find(token => token.type === 'link_open' && token.attrGet('class') === 'header-anchor')
        anchor?.attrSet('aria-label', `Permalink to "${title}"`)
        const opening = renderHeading
          ? renderHeading(tokens, idx, options, env, self)
          : self.renderToken(tokens, idx, options)
        const icon = tokens[idx].attrGet('data-icon')
        const iconStyle = ['apple', 'linux', 'windows'].includes(icon) ? 'fa-brands' : 'fa-solid'
        return opening + (icon && /^[a-z-]+$/.test(icon)
          ? `<i class="${iconStyle} fa-${icon} section-icon" aria-hidden="true"></i> `
          : '')
      }
    }
  },
  appearance: 'force-dark',
  sitemap: {
    hostname: `${origin.replace(/\/$/, '')}${base}`,
    // Redirect stubs are not indexable destinations; keep only the canonical URL in the sitemap.
    transformItems: items => items.filter(item => !/docs\/(optimization|tested-versions)$/.test(item.url))
  },
  // Generated include fragments and the WASM README are not pages.
  srcExclude: ['**/*-gen.md', 'public/**'],
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: `${base}logo.svg` }],
    ['link', { rel: 'stylesheet', href: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css' }],
    ['meta', { name: 'theme-color', content: '#0f172a' }],
    ['meta', { property: 'og:site_name', content: 'Freeware Advanced Audio' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }]
  ],
  transformPageData(pageData, { siteConfig }) {
    const site = siteConfig.site
    const root = `${origin.replace(/\/$/, '')}${base}`
    const path = pageData.relativePath.replace(/(^|\/)index\.md$/, '$1').replace(/\.md$/, '')
    // Pages renamed under GitHub Pages (no server redirects) set `redirect:` to the new path.
    const redirect = pageData.frontmatter.redirect ? String(pageData.frontmatter.redirect).replace(/^\/+/, '') : ''
    const url = `${root}${redirect || path}`
    const canonicalUrl = url.split('#')[0]
    const isHome = pageData.relativePath === 'index.md'
    const title = String(pageData.frontmatter.title || pageData.title || site.title)
    const fullTitle = isHome || title === site.title ? title : `${title} | ${site.title}`
    const description = String(pageData.frontmatter.description || pageData.description || site.description)
    const image = `${root}og.jpg`

    const head: [string, Record<string, string>, string?][] = [
      ['link', { rel: 'canonical', href: canonicalUrl }],
      ['meta', { property: 'og:title', content: fullTitle }],
      ['meta', { property: 'og:description', content: description }],
      ['meta', { property: 'og:url', content: canonicalUrl }],
      ['meta', { property: 'og:image', content: image }],
      ['meta', { property: 'og:image:type', content: 'image/jpeg' }],
      ['meta', { property: 'og:image:width', content: '1200' }],
      ['meta', { property: 'og:image:height', content: '630' }],
      ['meta', { property: 'og:image:alt', content: 'FAAC and FAAD: dependency-free AAC encoder, decoder, resampler and MP4 muxer' }],
      ['meta', { name: 'twitter:title', content: fullTitle }],
      ['meta', { name: 'twitter:description', content: description }],
      ['meta', { name: 'twitter:image', content: image }]
    ]

    if (redirect) head.push(['meta', { 'http-equiv': 'refresh', content: `0; url=${url}` }])

    const faq = ['index.md', 'docs/esp32-aac.md'].includes(pageData.relativePath) && !redirect
      ? faqFromMarkdown(join(siteConfig.srcDir, pageData.relativePath))
      : null
    if (faq) head.push(['script', { type: 'application/ld+json' }, JSON.stringify(faq)])

    if (path.startsWith('docs/') && !redirect) {
      const group = docsSidebar.find(g => g.items.some(i => i.link === `/${path}`))
      const crumbs = [{ name: 'Home', item: root }]
      if (group) crumbs.push({ name: group.text, item: `${root}${group.items[0].link.replace(/^\//, '')}` })
      if (!group || group.items[0].link !== `/${path}`) crumbs.push({ name: title, item: canonicalUrl })
      head.push(['script', { type: 'application/ld+json' }, JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, ...c }))
      })])
    }

    if (isHome) {
      head.push(['script', { type: 'application/ld+json' }, JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'WebSite',
            '@id': `${root}#website`,
            url: root,
            name: site.title,
            alternateName: ['FAAC', 'FAAD', 'FAAC and FAAD'],
            description: site.description,
            inLanguage: 'en'
          },
          {
            '@type': 'SoftwareSourceCode',
            '@id': `${root}#software`,
            name: 'FAAC',
            alternateName: ['FAAD', 'FAAM', 'FAAR'],
            description: 'LGPL-licensed, dependency-free AAC encoder and decoder suite with a resampler and MP4 muxer.',
            programmingLanguage: 'C',
            license: 'https://www.gnu.org/licenses/old-licenses/lgpl-2.1.html',
            codeRepository: 'https://github.com/FreewareAdvancedAudio',
            url: root
          },
          {
            '@type': 'Organization',
            '@id': `${root}#organization`,
            name: 'Freeware Advanced Audio Organization',
            url: root,
            logo: `${root}logo.svg`,
            sameAs: ['https://github.com/FreewareAdvancedAudio']
          }
        ]
      })])
    }

    if (pageData.frontmatter.date && path.startsWith('blog/')) {
      const published = new Date(pageData.frontmatter.date).toISOString()
      head.push(['meta', { property: 'article:published_time', content: published }])
      head.push(['script', { type: 'application/ld+json' }, JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: title,
        description,
        datePublished: published,
        mainEntityOfPage: url,
        image,
        publisher: { '@id': `${root}#organization` }
      })])
    }

    pageData.frontmatter.head = [...(pageData.frontmatter.head || []), ...head]
  },
  themeConfig: {
    logo: '/logo.svg',
    siteTitle: 'Freeware Advanced Audio',
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Try FAAC', link: '/playground' },
      { text: 'Download', link: '/docs/install' },
      { text: 'Documentation', link: '/docs/faac' },
      { text: 'Choose an Implementation', link: '/docs/comparison' },
      { text: 'Blog', link: '/blog/' }
    ],
    // The docs sidebar covers docs pages and the playground only. Blog pages get their navigation from PostNav (doc-after slot), driven by blog.data.ts.
    sidebar: {
      '/docs/': docsSidebar,
      '/playground': docsSidebar
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/FreewareAdvancedAudio' }
    ],
    footer: {
      message: 'Documentation & website content licensed under CC-BY-SA 4.0. WebAssembly component code licensed under AGPL-3.0.',
      copyright: 'Copyright © 2026 Freeware Advanced Audio Organization'
    }
  }
})
