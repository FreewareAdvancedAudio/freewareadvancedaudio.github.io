/** Shared blog helpers: one place for date formatting (UTC so SSR and client agree). */
export function isoDate(value: string | Date): string {
  return new Date(value).toISOString().slice(0, 10)
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC'
  })
}

export interface BlogPost {
  title: string
  description: string
  url: string
  date: string
}

/** Shared by the blog index data loader and the RSS feed so both see the same posts. */
export const postLoaderOptions = {
  transform(raw: { frontmatter: Record<string, any>; url: string }[]): BlogPost[] {
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
}
