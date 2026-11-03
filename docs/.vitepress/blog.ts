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
