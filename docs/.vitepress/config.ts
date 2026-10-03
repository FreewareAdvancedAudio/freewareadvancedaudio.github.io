import { defineConfig } from 'vitepress'

const base = `/${(process.env.SITE_BASE_PATH || '/').replace(/^\/+|\/+$/g, '')}/`.replace(/^\/\/$/, '/')
const origin = process.env.SITE_ORIGIN || 'https://freewareadvancedaudio.github.io'

export default defineConfig({
  base,
  title: 'Freeware Advanced Audio',
  description: 'Official documentation and interactive online audio converter for FAAC (LGPL v2.1+ AAC Encoder) and FAAD (AAC Decoder). Fast, compact open-source AAC encoder and decoder libraries in C.',
  cleanUrls: true,
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
        return opening + (icon && /^[a-z-]+$/.test(icon)
          ? `<i class="fa-solid fa-${icon} section-icon" aria-hidden="true"></i> `
          : '')
      }
    }
  },
  appearance: 'force-dark',
  sitemap: {
    hostname: `${origin.replace(/\/$/, '')}${base}`
  },
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: `${base}logo.svg` }],
    ['link', { rel: 'stylesheet', href: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css' }],
    ['meta', { name: 'theme-color', content: '#0f172a' }],
    ['meta', { property: 'og:site_name', content: 'Freeware Advanced Audio' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }]
  ],
  themeConfig: {
    logo: '/logo.svg',
    siteTitle: 'Freeware Advanced Audio',
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Documentation', link: '/docs/faac' },
      { text: 'Try FAAC', link: '/playground' },
      { text: 'Choose an Implementation', link: '/docs/comparison' },
      {
        text: 'Downloads',
        items: [
          { text: 'FAAC Encoder Releases', link: 'https://github.com/FreewareAdvancedAudio/faac/releases' },
          { text: 'FAAD Decoder Releases', link: 'https://github.com/FreewareAdvancedAudio/faad2/releases' }
        ]
      },
      { text: 'Blog', link: '/blog/' }
    ],
    sidebar: [
      {
        text: 'Getting Started',
        items: [
          { text: 'Installation Guide', link: '/docs/install' },
          { text: 'FAAC AAC Encoder', link: '/docs/faac' },
          { text: 'FAAD AAC Decoder', link: '/docs/faad' }
        ]
      },
      {
        text: 'CLI Manuals',
        items: [
          { text: 'FAAC CLI Manpage', link: '/docs/faac-cli' },
          { text: 'FAAD CLI Manpage', link: '/docs/faad-cli' }
        ]
      },
      {
        text: 'Compare & Evaluate',
        items: [
          { text: 'Choose an Encoder or Decoder', link: '/docs/comparison' },
          { text: 'AAC Benchmark Results', link: '/docs/optimization' },
          { text: 'Listening-Test Guide', link: '/docs/listening' }
        ]
      }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/FreewareAdvancedAudio' }
    ],
    footer: {
      message: 'Documentation & website content licensed under CC-BY-SA 4.0. WebAssembly component code licensed under AGPL-3.0.',
      copyright: 'Copyright © 2026 Freeware Advanced Audio Organization'
    }
  }
})
