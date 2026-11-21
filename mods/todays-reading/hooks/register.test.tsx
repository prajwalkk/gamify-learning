import { expect, test } from 'claude-code/testing'

// A tiny in-memory vault: the test stands for the engine's file system.
const HOME = '/home/t'
const DIR = '/v/Daily Notes'
const NOW = new Date(2026, 10, 20, 9, 30).getTime() // Fri Nov 20, local time

const note = (body: string) => `# Day\n\n---\n\n## 🏋️ Gym\nstuff\n\n---\n\n${body}\n\n---\n\n## 📝 End-of-Day Reflection\n`
const TODAY = note(
  "## 📚 Today's Reading\n*Picked by gamify-learning*\n\n" +
    '- [x] [Fix Your Timestep](https://gafferongames.com/post/fix_your_timestep/) — Gaffer On Games\n' +
    '- [ ] [Godot Showreel 2026](https://godotengine.org/article/godot-showreel-2026/) — Godot Engine',
)
const YESTERDAY = note(
  "## 📚 Today's Reading\n\n" +
    '- [x] [Read one](https://example.com/one) — Ex\n' +
    '- [ ] [Still unread](https://example.com/two) — Ex',
)

const PANE = {
  plugin: 'todays-reading',
  component: 'Pane',
  requestId: 'todays-reading',
  props: {
    title: "Today's reading",
    isFocused: false,
    bodyColumns: 60,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 30 },
    view: {},
  },
} as const

function engine(on: any, files: Record<string, string>, writes: Record<string, string>) {
  on('env.get', (_: unknown, e: { name: string }) => ({ value: e.name === 'HOME' ? HOME : undefined }))
  on('clock.now', () => ({ value: NOW }))
  on('clock.every', () => ({ value: undefined }))
  on('command.register', () => ({ value: { command: 'reading' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.toast', () => ({ value: undefined }))
  on('session.start', (_: unknown, e: { cwd: string }) => ({ cwd: e.cwd }))
  on('fs.exists', (_: unknown, e: { path: string }) => ({ value: e.path === DIR || e.path in files }))
  on('fs.list', () => ({
    value: Object.keys(files)
      .filter(p => p.startsWith(DIR + '/'))
      .map(p => ({ name: p.slice(DIR.length + 1), kind: 'file', size: 1, mtimeMs: 0, isLink: false })),
  }))
  on('fs.read', (_: unknown, e: { path: string }) => {
    if (!(e.path in files)) throw new Error(`ENOENT ${e.path}`)
    return { value: files[e.path] }
  })
  on('fs.write', (_: unknown, e: { path: string; text: string }) => {
    files[e.path] = e.text
    writes[e.path] = e.text
    return { value: undefined }
  })
}

const pointer = { [`${HOME}/.claude/gamify-learning.json`]: JSON.stringify({ vaultPath: '/v', dailyNotesFolder: 'Daily Notes' }) }

test("shows today's list from the daily note, and ticking writes the note", async ($, on) => {
  const files: Record<string, string> = {}
  const writes: Record<string, string> = {}
  engine(on, files, writes)
  for (const surface of ['terminal', 'desktop'] as const) {
    for (const k of Object.keys(files)) delete files[k]
    Object.assign(files, pointer, { [`${DIR}/2026-11-19.md`]: YESTERDAY, [`${DIR}/2026-11-20.md`]: TODAY })
    await $.session.start({ cwd: '/', surface, isInteractive: true })

    const ui = await $.ui.mount({ ...PANE, surface })
    expect((await ui.find({ type: 'Text', text: /1\/2 read/ }))?.text).toContain('Fri, Nov 20')
    expect(await ui.find({ type: 'Text', text: /Carried over/ })).toBeUndefined()

    await ui.press({ key: 'tick-1' })
    expect(writes[`${DIR}/2026-11-20.md`]).toContain('- [x] [Godot Showreel 2026]')
    // The rest of the note is untouched
    expect(writes[`${DIR}/2026-11-20.md`]).toContain('## 📝 End-of-Day Reflection')
    expect((await ui.find({ type: 'Text', text: /2\/2 read/ }))).toBeDefined()
    await ui.unmount()
  }
})

test("no list today: yesterday's unread links carry over", async ($, on) => {
  const files: Record<string, string> = { ...pointer, [`${DIR}/2026-11-19.md`]: YESTERDAY, [`${DIR}/2026-11-20.md`]: note('## 💼 Deep Work\n- ') }
  engine(on, files, {})
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect((await ui.find({ type: 'Text', text: /0\/1 read/ }))).toBeDefined()
  expect((await ui.find({ type: 'Text', text: /Carried over from Thu, Nov 19/ }))).toBeDefined()
  await ui.unmount()
})

test('no vault found: says where it looked', async ($, on) => {
  engine(on, {}, {})
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect((await ui.find({ type: 'Text', text: /Couldn't find your vault/ }))?.text).toContain('gamify-learning.json')
  await ui.unmount()
})
