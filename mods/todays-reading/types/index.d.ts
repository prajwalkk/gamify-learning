export type ReadingItem = {
  done: boolean
  title: string
  url: string
  source?: string
  /** The daily note this line lives in (ticking writes there) */
  file: string
}

export type Reading = {
  /** "ok": a list to show; "none": no list in recent notes; "novault": vault not found */
  status: 'ok' | 'none' | 'novault'
  /** Local day shown, YYYY-MM-DD */
  day: string
  /** Set when today has no list and these are the previous day's unread links */
  carriedFrom?: string
  items: ReadingItem[]
  /** Where we looked, for the empty states */
  where?: string
  error?: string
}

declare module 'claude-code' {
  interface PluginState {
    'todays-reading': { reading: Shaped<Reading | null> }
  }
}
