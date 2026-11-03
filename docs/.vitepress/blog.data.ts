import { createContentLoader } from 'vitepress'
import { postLoaderOptions, type BlogPost } from './blog'

export type { BlogPost }

declare const data: BlogPost[]
export { data }

export default createContentLoader('blog/*.md', postLoaderOptions)
