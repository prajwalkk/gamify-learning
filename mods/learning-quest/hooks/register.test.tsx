import { expect, test } from 'claude-code/testing'

// The test stands for the engine: a home folder with the shared config and a notes folder
// holding the snapshot the MCP server writes.
const HOME = '/home/t'
const NOTES = '/notes'
const SNAP = `${NOTES}/Learning/.quest/today.json`
const NOW = new Date(2026, 10, 16, 8, 35).getTime() // Mon Nov 16, local

const TODAY = {
  date: '2026-11-16',
  weekday: 'Monday',
  onboarded: true,
  isStudyDay: true,
  trackLabel: 'Machine learning',
  cap: 60,
  readingBlock: 10,
  minutesToday: 25,
  minutesLeft: 35,
  overCap: false,
  reading: { title: 'Scaling laws, carefully', url: 'https://lilianweng.github.io/posts/scaling/', source: "Lil'Log" },
  readingDone: false,
  goal: { title: 'Zero to Hero', minutes: 50, items: [{ unit: '1 · micrograd', minutes: 50, url: 'https://karpathy.ai/zero-to-hero.html' }] },
  risk: [],
  headlines: [{ title: 'A headline', url: 'https://news/1', source: 'HN' }],
  streak: 3,
  level: 2,
  title: 'Novice',
  xp: 120,
}

const PANE = {
  plugin: 'learning-quest',
  component: 'Pane',
  requestId: 'learning-quest',
  props: { title: "Today's quest", isFocused: false, bodyColumns: 60, placement: 'dock', scroll: { offset: 0, bodyRows: 30 }, view: {} },
} as const

function engine(on: any, files: Record<string, string>, status: (string | undefined)[], prompts: string[]) {
  on('env.get', (_: unknown, e: { name: string }) => ({ value: e.name === 'HOME' ? HOME : undefined }))
  on('clock.now', () => ({ value: NOW }))
  on('clock.every', () => ({ value: undefined }))
  on('command.register', () => ({ value: { command: 'quest-pane' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.status', (_: unknown, e: { text?: string }) => {
    status.push(e.text)
    return { value: undefined }
  })
  on('prompt.submit', (_: unknown, e: { text: string }) => {
    prompts.push(e.text)
    return { text: e.text }
  })
  on('session.start', (_: unknown, e: { cwd: string }) => ({ cwd: e.cwd }))
  on('fs.exists', (_: unknown, e: { path: string }) => ({ value: e.path === NOTES || e.path in files }))
  on('fs.read', (_: unknown, e: { path: string }) => {
    if (!(e.path in files)) throw new Error(`ENOENT ${e.path}`)
    return { value: files[e.path] }
  })
}

const config = { [`${HOME}/.config/learning-quest/config.json`]: JSON.stringify({ notesFolder: NOTES }) }

test("shows today's quest, sets the status chip, and Start asks Claude to run the session", async ($, on) => {
  const status: (string | undefined)[] = []
  const prompts: string[] = []
  engine(on, { ...config, [SNAP]: JSON.stringify(TODAY) }, status, prompts)
  for (const surface of ['terminal', 'desktop'] as const) {
    await $.session.start({ cwd: '/', surface, isInteractive: true })
    const ui = await $.ui.mount({ ...PANE, surface })
    expect(await ui.find({ type: 'Text', text: /Mon, Nov 16 · Machine learning day/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /L2 Novice · 120 XP · 🔥 3/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /Zero to Hero · 50 min/ })).toBeDefined()
    await ui.press({ key: 'start' })
    await ui.unmount()
  }
  expect(status.at(-1)).toBe('🟡 🔥3 · L2 · 25/60')
  expect(prompts).toContain("Start today's Learning Quest session.")
})

test('a rest day says so and shows the next study day, without a Start button', async ($, on) => {
  const rest = { ...TODAY, isStudyDay: false, message: 'Rest day. The streak waits for you.', goal: undefined, reading: undefined, next: { date: '2026-11-17', track: 'System design', unit: 'DDIA · Ch 1' } }
  engine(on, { ...config, [SNAP]: JSON.stringify(rest) }, [], [])
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await ui.find({ type: 'Text', text: /Rest day/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Next: Tue, Nov 17 · System design · DDIA · Ch 1/ })).toBeDefined()
  expect(await ui.find({ key: 'start' })).toBeUndefined()
  await ui.unmount()
})

test('not set up yet: offers setup', async ($, on) => {
  const prompts: string[] = []
  engine(on, { ...config }, [], prompts)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await ui.find({ type: 'Text', text: /isn't set up yet/ })).toBeDefined()
  await ui.press({ key: 'setup' })
  expect(prompts[0]).toMatch(/Set up Learning Quest/)
  await ui.unmount()
})
