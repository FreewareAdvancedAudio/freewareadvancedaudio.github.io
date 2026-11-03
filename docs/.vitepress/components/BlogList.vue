<script setup lang="ts">
import { computed } from 'vue'
import { withBase } from 'vitepress'
import { data as posts } from '../blog.data'
import { formatDate } from '../blog'

const props = defineProps<{ limit?: number }>()
const shown = computed(() => (props.limit ? posts.slice(0, props.limit) : posts))
const featured = computed(() => (!props.limit && shown.value.length > 1 ? shown.value[0] : null))
const level = computed(() => (props.limit ? 'h3' : 'h2'))
const rest = computed(() => (featured.value ? shown.value.slice(1) : shown.value))
</script>

<template>
  <div class="blog-cards">
    <a v-if="featured" :href="withBase(featured.url)" class="blog-card blog-card--featured">
      <span class="blog-card__tag"><i class="fa-solid fa-star" aria-hidden="true"></i> Latest</span>
      <time :datetime="featured.date">{{ formatDate(featured.date) }}</time>
      <component :is="level" class="blog-card__title">{{ featured.title }}</component>
      <p v-if="featured.description">{{ featured.description }}</p>
      <span class="blog-card__more">Read the post <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></span>
    </a>
    <a v-for="post in rest" :key="post.url" :href="withBase(post.url)" class="blog-card" :class="{ 'blog-card--wide': featured && rest.length < 2 }">
      <time :datetime="post.date">{{ formatDate(post.date) }}</time>
      <component :is="level" class="blog-card__title">{{ post.title }}</component>
      <p v-if="post.description">{{ post.description }}</p>
      <span class="blog-card__more">Read the post <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></span>
    </a>
  </div>
</template>

<style scoped>
.blog-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; margin: 24px 0; }
.blog-card { display: flex; flex-direction: column; gap: 8px; padding: 20px; border: 1px solid var(--vp-c-divider); border-radius: 12px; background: var(--vp-c-bg-soft); text-decoration: none; color: var(--vp-c-text-1); transition: border-color .2s, transform .2s; }
.blog-card:focus-visible { outline: 2px solid var(--vp-c-brand-1); outline-offset: 2px; }
.blog-card:hover { border-color: var(--vp-c-brand-1); transform: translateY(-2px); }
.blog-card--wide { grid-column: 1 / -1; }
.blog-card--featured { grid-column: 1 / -1; padding: 28px; background: linear-gradient(135deg, var(--vp-c-brand-soft), var(--vp-c-bg-soft)); }
.blog-card--featured .blog-card__title { font-size: 1.5rem; }
.blog-card time { font-size: .8rem; color: var(--vp-c-text-2); }
.blog-card__title { margin: 0; padding: 0; border: 0; font-size: 1.1rem; line-height: 1.35; }
.blog-card p { margin: 0; color: var(--vp-c-text-2); font-size: .9rem; line-height: 1.55; }
.blog-card__tag { align-self: flex-start; font-size: .75rem; font-weight: 600; color: var(--vp-c-brand-1); background: var(--vp-c-brand-soft); padding: 2px 10px; border-radius: 999px; }
.blog-card__more { margin-top: auto; padding-top: 8px; font-size: .85rem; font-weight: 600; color: var(--vp-c-brand-1); }
@media (prefers-reduced-motion: reduce) { .blog-card { transition: none; } .blog-card:focus-visible { outline: 2px solid var(--vp-c-brand-1); outline-offset: 2px; }
.blog-card:hover { transform: none; } }
</style>
