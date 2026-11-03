<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'
import { formatDate, isoDate } from '../blog'

const { frontmatter } = useData()
const iso = computed(() => (frontmatter.value.date ? isoDate(frontmatter.value.date) : ''))
</script>

<template>
  <p v-if="iso"><em>Published: <time :datetime="iso">{{ formatDate(iso) }}</time></em></p>
</template>
