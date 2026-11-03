<script setup lang="ts">
import { computed } from 'vue'
import { useData, withBase } from 'vitepress'
import { data as posts } from '../blog.data'

const { page, frontmatter } = useData()

// Only dated blog posts get navigation; /blog/ itself and docs pages have no `date`.
const index = computed(() => {
  if (!frontmatter.value.date) return -1
  const url = `/${page.value.relativePath.replace(/\.md$/, '')}`
  return posts.findIndex((post) => post.url.replace(/(\.html)?$/, '') === url)
})
const newer = computed(() => (index.value > 0 ? posts[index.value - 1] : undefined))
const older = computed(() => (index.value >= 0 ? posts[index.value + 1] : undefined))
</script>

<template>
  <nav v-if="index >= 0" class="post-nav" aria-label="Blog navigation">
    <div class="post-nav__pair">
      <a v-if="newer" :href="withBase(newer.url)" class="post-nav__card post-nav__card--newer" rel="prev">
        <span class="post-nav__label"><i class="fa-solid fa-arrow-left" aria-hidden="true"></i> Newer post</span>
        <span class="post-nav__title">{{ newer.title }}</span>
      </a>
      <a v-if="older" :href="withBase(older.url)" class="post-nav__card post-nav__card--older" rel="next">
        <span class="post-nav__label">Older post <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></span>
        <span class="post-nav__title">{{ older.title }}</span>
      </a>
    </div>
    <a :href="withBase('/blog/')" class="post-nav__all"><i class="fa-solid fa-newspaper" aria-hidden="true"></i> All posts</a>
  </nav>
</template>

<style scoped>
.post-nav { margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid var(--vp-c-divider); display: flex; flex-direction: column; align-items: center; gap: 1rem; }
.post-nav__pair { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; width: 100%; }
.post-nav__card { display: flex; flex-direction: column; gap: 4px; padding: 14px 18px; border: 1px solid var(--vp-c-divider); border-radius: 12px; background: var(--vp-c-bg-soft); text-decoration: none; transition: border-color .2s, transform .2s; }
.post-nav__card--newer { text-align: left; }
.post-nav__card--older { text-align: right; grid-column: 2; }
.post-nav__card:only-child.post-nav__card--older { grid-column: 1 / -1; }
.post-nav__card:hover { border-color: var(--vp-c-brand-1); transform: translateY(-2px); }
.post-nav__card:focus-visible, .post-nav__all:focus-visible { outline: 2px solid var(--vp-c-brand-1); outline-offset: 2px; }
.post-nav__label { font-size: .75rem; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; color: var(--vp-c-brand-1); }
.post-nav__title { font-size: .95rem; font-weight: 600; line-height: 1.4; color: var(--vp-c-text-1); }
.post-nav__all { font-size: .9rem; font-weight: 600; text-decoration: none; color: var(--vp-c-brand-1); }
.post-nav__all:hover { text-decoration: underline; }
@media (max-width: 560px) { .post-nav__card--older { grid-column: auto; } }
@media (prefers-reduced-motion: reduce) { .post-nav__card { transition: none; } .post-nav__card:hover { transform: none; } }
</style>
