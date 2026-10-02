import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Freeware Advanced Audio',
  description: 'Official website for FAAC (LGPL v2.1+ AAC Encoder) and FAAD2 (GPL v2+ AAC Decoder). High-performance, open-source audio compression software.',
  cleanUrls: true,
  appearance: 'force-dark',
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }],
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
      { text: 'Blog', link: '/blog/' },
      { text: 'GitHub', link: 'https://github.com/FreewareAdvancedAudio' }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/FreewareAdvancedAudio' }
    ],
    footer: {
      message: 'Freeware Advanced Audio Organization — FAAC (LGPL v2.1+) & FAAD2 (GPL v2+)',
      copyright: 'Copyright © 2026 Freeware Advanced Audio'
    }
  }
})
