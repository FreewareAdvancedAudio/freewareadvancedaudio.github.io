import { createContentLoader } from 'vitepress'
import { isoDate } from './blog'

export interface BlogPost {
  title: string
  description: string
  url: string
  date: string
}

declare const data: BlogPost[]
export { data }

export default createContentLoader('blog/*.md', {
  transform(raw): BlogPost[] {
    return raw
      .filter((page) => page.frontmatter.date)
      .map((page) => ({
        title: page.frontmatter.title,
        description: page.frontmatter.description ?? '',
        url: page.url,
        date: isoDate(page.frontmatter.date)
      }))
      .sort((a, b) => b.date.localeCompare(a.date))
  }
})
