/** The parts of Learning/.quest/today.json the mod draws (written by the learning-quest MCP server). */
export type QuestToday = {
  date: string
  weekday: string
  onboarded: boolean
  isStudyDay: boolean
  leave?: { from: string; to: string; reason?: string }
  trackLabel?: string
  cap: number
  readingBlock: number
  minutesToday: number
  minutesLeft: number
  overCap: boolean
  message?: string
  reading?: { title: string; url: string; source: string }
  readingDone: boolean
  goal?: { title: string; minutes: number; items: { unit: string; minutes: number; url?: string }[] }
  risk: { goal: string; option: string }[]
  headlines: { title: string; url: string; source: string }[]
  streak: number
  level: number
  title: string
  xp: number
  next?: { date: string; track?: string; unit?: string }
}

export type QuestView = {
  /** ok: a snapshot to draw; setup: no quest in the folder yet; nofolder: notes folder not found */
  status: 'ok' | 'setup' | 'nofolder'
  today: string
  data?: QuestToday
  folder?: string
  error?: string
}

declare module 'claude-code' {
  interface PluginState {
    'learning-quest': { view: Shaped<QuestView | null> }
  }
}
