import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Reading, ReadingItem } from '../types'

// Today's reading list, read straight from the Obsidian daily note that the
// gamify-learning MCP server plans into ("## 📚 Today's Reading"). Obsidian is the
// source of truth: this mod only reads it, and flips a checkbox when you tick one.
// If today has no list yet, the latest earlier list's unread links carry over.

const PANE = 'todays-reading'
const TITLE = "Today's reading"
const HEADING = "## 📚 Today's Reading"
const ITEM = /^(\s*[-*] )\[( |x|X)\]( \[(.+?)\]\((\S+?)\)(?:\s+[—–-]\s+(.*))?)\s*$/
const DAY_FILE = /^(\d{4}-\d{2}-\d{2})\.md$/
const PLAN_PROMPT = "Plan today's reading list (use the gamify-learning plan_today tool) and show it to me briefly."

// Bump the shape tag when Reading's fields change: values from an older version are dropped.
const reading = atom({ plugin: 'todays-reading', key: 'reading' } as const, null, { shape: 'reading-1' })

type Options = { vaultPath?: string; dailyNotesFolder?: string }

const localDay = (ms: number) => {
  const d = new Date(ms)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

const prettyDay = (day: string) => {
  const [y = 1970, m = 1, d = 1] = day.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

/** The same folder in Windows and WSL spellings: E:\x\y <-> /mnt/e/x/y */
function spellings(p: string): string[] {
  const out = [p]
  const win = p.match(/^([A-Za-z]):[\\/](.*)$/)
  if (win) out.push(`/mnt/${(win[1] ?? '').toLowerCase()}/${(win[2] ?? '').replace(/\\/g, '/')}`)
  const wsl = p.match(/^\/mnt\/([a-z])\/(.*)$/i)
  if (wsl) out.push(`${(wsl[1] ?? '').toUpperCase()}:\\${(wsl[2] ?? '').replace(/\//g, '\\')}`)
  return out
}

const join = (base: string, ...parts: string[]) => {
  const sep = base.includes('\\') && !base.includes('/') ? '\\' : '/'
  return [base.replace(/[\\/]+$/, ''), ...parts].join(sep)
}

/** Lines of our section: [start, end) after the heading, up to the next "## " or "---". */
function sectionRange(lines: string[]): [number, number] | undefined {
  const start = lines.findIndex(l => l.trim() === HEADING)
  if (start < 0) return undefined
  let end = start + 1
  while (end < lines.length && !/^## /.test(lines[end] ?? '') && (lines[end] ?? '').trim() !== '---') end++
  return [start + 1, end]
}

function parse(text: string, file: string): ReadingItem[] | undefined {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const range = sectionRange(lines)
  if (!range) return undefined
  const items: ReadingItem[] = []
  for (const line of lines.slice(range[0], range[1])) {
    const m = line.match(ITEM)
    if (m && m[4] && m[5]) items.push({ done: m[2] !== ' ', title: m[4], url: m[5], source: m[6]?.trim() || undefined, file })
  }
  return items
}

// Set from register's options; read by load()
let settings: Options = {}

/** Where the vault and its daily notes are: the mod's setting, else gamify-learning's pointer file. */
async function locate($: EngineInterface, opts: Options): Promise<{ dir?: string; where: string }> {
  let vault = opts.vaultPath?.trim() || ''
  let folder = opts.dailyNotesFolder?.trim() || ''
  let where = 'the todays-reading vaultPath setting'
  if (!vault) {
    const home = (await $.env.get('USERPROFILE')) || (await $.env.get('HOME')) || ''
    const pointer = join(home, '.claude', 'gamify-learning.json')
    where = pointer
    try {
      const p = JSON.parse(await $.fs.read(pointer)) as { vaultPath?: string; dailyNotesFolder?: string }
      vault = p.vaultPath ?? ''
      folder = folder || p.dailyNotesFolder || ''
    } catch {
      return { where }
    }
  }
  for (const v of spellings(vault)) {
    const dir = join(v, folder || 'Daily Notes')
    if (await $.fs.exists(dir)) return { dir, where }
  }
  return { where: `${where} → ${vault}` }
}

async function load($: EngineInterface): Promise<void> {
  const today = localDay(await $.clock.now())
  let next: Reading
  try {
    const { dir, where } = await locate($, settings)
    if (!dir) {
      next = { status: 'novault', day: today, items: [], where }
    } else {
      const days = (await $.fs.list(dir))
        .map(f => f.name.match(DAY_FILE)?.[1])
        .filter((d): d is string => !!d && d <= today)
        .sort()
        .reverse()
        .slice(0, 30)
      next = { status: 'none', day: today, items: [], where: dir }
      for (const day of days) {
        const file = join(dir, `${day}.md`)
        const items = parse(await $.fs.read(file), file)
        if (!items) continue
        if (day === today) {
          next = { status: 'ok', day, items }
        } else {
          const open = items.filter(i => !i.done)
          if (open.length) next = { status: 'ok', day: today, items: open, carriedFrom: day }
        }
        break
      }
    }
  } catch (err) {
    next = { status: 'none', day: today, items: [], error: err instanceof Error ? err.message : String(err) }
  }
  await update($, reading, () => next)
}

/** Flip one checkbox in the note the item came from, then re-read. */
async function toggle($: EngineInterface, item: ReadingItem) {
  const text = await $.fs.read(item.file)
  const eol = text.includes('\r\n') ? '\r\n' : '\n'
  const lines = text.split(/\r?\n/)
  const range = sectionRange(lines)
  if (!range) return load($)
  for (let i = range[0]; i < range[1]; i++) {
    const m = (lines[i] ?? '').match(ITEM)
    if (m && m[5] === item.url) {
      lines[i] = `${m[1]}[${m[2] === ' ' ? 'x' : ' '}]${m[3]}`
      await $.fs.write(item.file, lines.join(eol))
      if (m[2] === ' ') $.ui.toast(`Read: ${item.title.slice(0, 60)} (+5 XP on next sync)`)
      break
    }
  }
  return load($)
}

function openPane($: EngineInterface) {
  return $.ui.open({ id: PANE, title: TITLE })
}

export const register: Register = (on, options) => {
  settings = (options ?? {}) as Options

  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'reading', description: "Show today's reading list from Obsidian" })
    await load($)
    // Obsidian (or Claude planning the day) changes the note outside this session
    $.clock.every(60_000, () => void load($))
    void openPane($)
    return next(e)
  })

  // Claude may have just planned or ticked something
  on('turn.complete', async ($, e, next) => {
    void load($)
    return next(e)
  })

  on('command.run', { command: 'reading' }, async $ => {
    await load($)
    await openPane($)
    const r = await read($, reading)
    const n = r?.items.length ?? 0
    return { text: n ? `Today's reading: ${r!.items.filter(i => i.done).length}/${n} read.` : "No reading list for today yet." }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button, Link, Progress } = $.ui.resolve(e)
    const r = await read($, reading)
    const plan = () => void $.prompt.submit({ text: PLAN_PROMPT })
    const refresh = () => load($)

    if (!r || r.status !== 'ok') {
      const why =
        r?.status === 'novault'
          ? `Couldn't find your vault (looked at ${r.where}). Start a session with the gamify-learning server once, or set the vault in this mod's settings.`
          : r?.error
            ? `Couldn't read the daily notes: ${r.error}`
            : 'No reading list in your recent daily notes yet.'
      return (
        <Box flexDirection="column" gap={1}>
          <Text dimColor>{why}</Text>
          <Box gap={1}>
            {r?.status !== 'novault' && <Button key="plan" variant="primary" label="Plan today's reading" onPress={plan} />}
            <Button key="refresh" label="Refresh" onPress={refresh} />
          </Box>
        </Box>
      )
    }

    const done = r.items.filter(i => i.done).length
    const total = r.items.length
    const nextUp = r.items.find(i => !i.done)

    if (e.props.placement === 'widget') {
      return (
        <Box flexDirection="column">
          <Text bold>📚 {done}/{total} read</Text>
          {nextUp ? <Link href={nextUp.url} label={nextUp.title} /> : <Text dimColor>All done today ✓</Text>}
        </Box>
      )
    }

    const width = Math.max(20, (e.props.bodyColumns ?? 60) - 6)
    return (
      <Box flexDirection="column" gap={1}>
        <Box flexDirection="column">
          <Text bold>
            📚 {prettyDay(r.day)} · {done}/{total} read
          </Text>
          {r.carriedFrom && <Text dimColor>Carried over from {prettyDay(r.carriedFrom)}: not finished yet</Text>}
        </Box>
        <Progress label="Read" value={done} max={total} />
        <Box flexDirection="column" gap={1}>
          {r.items.map((item, i) => (
            <Box key={`row-${i}`} flexDirection="row" gap={1}>
              <Button key={`tick-${i}`} plain label={item.done ? '☑' : '☐'} onPress={() => toggle($, item)} />
              <Box flexDirection="column" width={width}>
                <Link href={item.url} label={item.title} />
                {item.source && <Text dimColor wrap="truncate-end">{item.source}</Text>}
              </Box>
            </Box>
          ))}
        </Box>
        <Box gap={1}>
          {done === total && <Button key="plan" variant="primary" label="Plan more" onPress={plan} />}
          <Button key="refresh" label="Refresh" onPress={refresh} />
        </Box>
      </Box>
    )
  })

  // Terminal: a one-line band above the prompt, since a pane only opens by itself on wide terminals
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.surface !== 'terminal' || e.props.hasSurvey) return next(e)
    const r = await read($, reading)
    if (!r || r.status !== 'ok' || r.items.length === 0) return next(e)
    const { Box, Text, Button, Link } = $.ui.resolve(e)
    const done = r.items.filter(i => i.done).length
    const nextUp = r.items.find(i => !i.done)
    return (
      <Box gap={1}>
        <Text>
          📚 {done}/{r.items.length}
        </Text>
        {nextUp ? <Link href={nextUp.url} label={nextUp.title.slice(0, 60)} /> : <Text dimColor>all read today ✓</Text>}
        <Button key="open" plain label="(open)" onPress={() => void openPane($)} />
      </Box>
    )
  })
}
