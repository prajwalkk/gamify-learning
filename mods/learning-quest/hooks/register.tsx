import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { QuestToday, QuestView } from '../types'

// Today's Learning Quest beside every Claude Code session: a pane on desktop, a band in
// the terminal, and a status chip (🔥 streak · L level · minutes/cap). It only reads
// Learning/.quest/today.json, which the learning-quest MCP server writes whenever the
// quest changes and each time a session starts. Changes go through Claude (/quest).

const PANE = 'learning-quest'
const TITLE = "Today's quest"
const START = "Start today's Learning Quest session."
const BOARD = 'Show my Learning Quest board, briefly.'
const SETUP = 'Set up Learning Quest for me (/quest setup).'

// Bump the tag when QuestView's fields change: values an older version stored are dropped.
const view = atom({ plugin: 'learning-quest', key: 'view' } as const, null, { shape: 'view-1' })

function localDay(ms: number): string {
  const d = new Date(ms)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function prettyDay(day: string): string {
  const [y = 1970, m = 1, d = 1] = day.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

/** The same folder in Windows and WSL spellings. */
function spellings(p: string): string[] {
  const out = [p]
  const win = p.match(/^([A-Za-z]):[\\/](.*)$/)
  if (win) out.push(`/mnt/${(win[1] ?? '').toLowerCase()}/${(win[2] ?? '').replace(/\\/g, '/')}`)
  const wsl = p.match(/^\/mnt\/([a-z])\/(.*)$/i)
  if (wsl) out.push(`${(wsl[1] ?? '').toUpperCase()}:\\${(wsl[2] ?? '').replace(/\//g, '\\')}`)
  return out
}

function join(base: string, ...parts: string[]): string {
  const sep = base.includes('\\') && !base.includes('/') ? '\\' : '/'
  return [base.replace(/[\\/]+$/, ''), ...parts].join(sep)
}

/** Same order as the server: LEARNING_QUEST_DIR, then ~/.config/learning-quest/config.json, then ~/LearningQuest. */
async function findFolder($: EngineInterface): Promise<string | undefined> {
  const home = (await $.env.get('USERPROFILE')) || (await $.env.get('HOME')) || ''
  let folder = (await $.env.get('LEARNING_QUEST_DIR')) || ''
  if (!folder) {
    try {
      const cfg = JSON.parse(await $.fs.read(join(home, '.config', 'learning-quest', 'config.json'))) as { notesFolder?: string }
      folder = cfg.notesFolder ?? ''
    } catch {
      folder = join(home, 'LearningQuest')
    }
  }
  for (const f of spellings(folder)) if (await $.fs.exists(f)) return f
  return undefined
}

function chip(d: QuestToday): string {
  const dot = d.overCap || d.minutesToday >= d.cap ? '🟢' : d.minutesToday > 0 ? '🟡' : '⚪'
  return `${dot} 🔥${d.streak} · L${d.level} · ${d.minutesToday}/${d.cap}`
}

async function load($: EngineInterface): Promise<void> {
  const today = localDay(await $.clock.now())
  let next: QuestView
  try {
    const folder = await findFolder($)
    if (!folder) {
      next = { status: 'nofolder', today }
    } else {
      const file = join(folder, 'Learning', '.quest', 'today.json')
      if (!(await $.fs.exists(file))) {
        next = { status: 'setup', today, folder }
      } else {
        const data = JSON.parse(await $.fs.read(file)) as QuestToday
        next = { status: data.onboarded ? 'ok' : 'setup', today, data, folder }
      }
    }
  } catch (err) {
    next = { status: 'setup', today, error: err instanceof Error ? err.message : String(err) }
  }
  $.ui.status(next.status === 'ok' && next.data ? chip(next.data) : undefined)
  await update($, view, () => next)
}

function openPane($: EngineInterface) {
  return $.ui.open({ id: PANE, title: TITLE })
}

function ask($: EngineInterface, text: string) {
  void $.prompt.submit({ text })
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'quest-pane', description: "Show today's Learning Quest pane" })
    await load($)
    // The server writes today.json at session start and after every change; Obsidian edits too
    $.clock.every(60_000, () => void load($))
    void openPane($)
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    void load($)
    return next(e)
  })

  on('command.run', { command: 'quest-pane' }, async $ => {
    await load($)
    await openPane($)
    return { text: "Today's quest pane opened." }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button, Link, Progress } = $.ui.resolve(e)
    const v = await read($, view)
    const d = v?.data

    if (!v || v.status !== 'ok' || !d) {
      const why =
        v?.status === 'nofolder'
          ? "Learning Quest can't find your notes folder yet."
          : v?.error
            ? `Couldn't read today's quest: ${v.error}`
            : "Learning Quest isn't set up yet."
      return (
        <Box flexDirection="column" gap={1}>
          <Text dimColor>{why}</Text>
          <Button key="setup" variant="primary" label="Set up Learning Quest" onPress={() => ask($, SETUP)} />
        </Box>
      )
    }

    const stale = d.date !== v.today
    if (e.props.placement === 'widget') {
      return (
        <Box flexDirection="column">
          <Text bold>{chip(d)}</Text>
          {d.reading && !d.readingDone ? <Link href={d.reading.url} label={`📖 ${d.reading.title}`} /> : <Text dimColor>{d.message ?? 'Reading done ✓'}</Text>}
        </Box>
      )
    }

    return (
      <Box flexDirection="column" gap={1}>
        <Box flexDirection="column">
          <Text bold>
            {prettyDay(d.date)}
            {d.trackLabel ? ` · ${d.trackLabel} day` : ''}
          </Text>
          <Text dimColor>
            L{d.level} {d.title} · {d.xp} XP · 🔥 {d.streak}
          </Text>
          {stale && <Text color="warning">From {prettyDay(d.date)}: start a session to refresh it.</Text>}
        </Box>
        {d.isStudyDay && <Progress label="Today" value={Math.min(d.minutesToday, d.cap)} max={d.cap} valueText={`${d.minutesToday}/${d.cap} min`} />}
        {d.message && <Text dimColor>{d.message}</Text>}
        {d.isStudyDay && (
          <Box flexDirection="column">
            <Text bold>📖 Reading · {d.readingBlock} min{d.readingDone ? ' ✓' : ''}</Text>
            {d.reading ? (
              <Box flexDirection="column">
                <Link href={d.reading.url} label={d.reading.title} />
                <Text dimColor>{d.reading.source}</Text>
              </Box>
            ) : (
              <Text dimColor>None picked yet: start the session to fetch today's news.</Text>
            )}
          </Box>
        )}
        {d.goal && (
          <Box flexDirection="column">
            <Text bold>🎯 {d.goal.title} · {d.goal.minutes} min</Text>
            {d.goal.items.map((i, n) =>
              i.url ? <Link key={`unit-${n}`} href={i.url} label={`${i.unit} (${i.minutes} min)`} /> : <Text key={`unit-${n}`}>{`${i.unit} (${i.minutes} min)`}</Text>,
            )}
          </Box>
        )}
        {d.risk.map((r, n) => (
          <Text key={`risk-${n}`} color="warning">
            ⚠️ {r.goal}: {r.option}
          </Text>
        ))}
        {d.headlines.length > 0 && (
          <Box flexDirection="column">
            <Text dimColor>Headlines</Text>
            {d.headlines.slice(0, 2).map((item, n) => (
              <Link key={`news-${n}`} href={item.url} label={item.title} />
            ))}
          </Box>
        )}
        {!d.isStudyDay && d.next && (
          <Text dimColor>
            Next: {prettyDay(d.next.date)}
            {d.next.track ? ` · ${d.next.track}` : ''}
            {d.next.unit ? ` · ${d.next.unit}` : ''}
          </Text>
        )}
        <Box gap={1}>
          {d.isStudyDay && !d.overCap && <Button key="start" variant="primary" label="Start session" onPress={() => ask($, START)} />}
          <Button key="board" label="Board" onPress={() => ask($, BOARD)} />
          <Button key="refresh" label="Refresh" onPress={() => load($)} />
        </Box>
      </Box>
    )
  })

  // Terminal: one line above the prompt (a pane opens by itself only on wide terminals)
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.surface !== 'terminal' || e.props.hasSurvey) return next(e)
    const v = await read($, view)
    const d = v?.data
    if (!v || v.status !== 'ok' || !d || !d.isStudyDay) return next(e)
    const { Box, Text, Button, Link } = $.ui.resolve(e)
    const unit = d.goal?.items[0]
    return (
      <Box gap={1}>
        <Text>{chip(d)}</Text>
        {d.reading && !d.readingDone && <Link href={d.reading.url} label={`📖 ${d.reading.title.slice(0, 48)}`} />}
        {unit && <Text dimColor>🎯 {unit.unit.slice(0, 36)}</Text>}
        <Button key="open" plain label="(open)" onPress={() => void openPane($)} />
      </Box>
    )
  })
}
