import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Agent, AgentLink, AgentStatus, Approval, ChatLine, HubInfo } from '../types'

// Agent Hub for the TopBins agent team (fork of agent-deck 0.1.0).
// Same Agent contract and UI; the data now comes from GitHub instead of a demo seed:
//   - agents/config.json      → which agents exist, names, roles, routine ids
//   - "Agent status: <id>"    → one open issue per agent (label agent-status) whose body
//                               holds an ```agent-status JSON block; its comments are the feed
//   - status:proposed issues  → approvals, grouped by their agent:<id> label
// Approve/Reject add status:approved / status:rejected (the agents-labels workflow does the rest).

const PANE = 'agent-deck'
const TITLE = 'Agents'
const POLL_MS = 60_000
const FALLBACK_REPO_DIR = '/Users/benlaws/Documents/top-bins'
const GH_CANDIDATES = ['/Users/benlaws/.local/bin/gh', '/opt/homebrew/bin/gh', '/usr/local/bin/gh', 'gh']

// Bump the shape tag when Agent's fields change: it drops what an older version stored (the demo agents).
const agents = atom({ plugin: 'agent-deck', key: 'agents' } as const, [] as Agent[], { shape: 'agents-topbins-1' })
const selected = atom({ plugin: 'agent-deck', key: 'selected' } as const, null as string | null)
const links = atom({ plugin: 'agent-deck', key: 'links' } as const, {} as Record<string, AgentLink>)
const info = atom({ plugin: 'agent-deck', key: 'info' } as const, { syncedAt: 0, error: null, repoDir: null } as HubInfo)

const STATUS: Record<AgentStatus, { label: string; color: string; dot: string }> = {
  running: { label: 'Running', color: 'success', dot: '●' },
  'needs-approval': { label: 'Needs approval', color: 'warning', dot: '▲' },
  waiting: { label: 'Waiting', color: 'suggestion', dot: '◐' },
  blocked: { label: 'Blocked', color: 'error', dot: '■' },
  done: { label: 'Done', color: 'inactive', dot: '✓' },
}

const ago = (at: number, now: number) => {
  if (!at) return 'never'
  const s = Math.max(0, Math.round((now - at) / 1000))
  if (s < 10) return 'just now'
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.round(s / 60)}m ago`
  if (s < 86400 * 2) return `${Math.round(s / 3600)}h ago`
  return `${Math.round(s / 86400)}d ago`
}

type Config = {
  repo: string
  approvers: { github: string }[]
  agents: Record<string, { name: string; role: string; routineId: string | null; enabled?: boolean }>
}
type GhComment = { author: { login: string } | null; body: string; createdAt: string }
type GhIssue = { number: number; title: string; body?: string; updatedAt?: string; labels?: { name: string }[]; comments?: GhComment[] }

const STATUS_BLOCK = /```agent-status\s*([\s\S]*?)```/

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type $T = any

let ghPath: string | null = null

async function gh($: $T, repoDir: string, args: string[]): Promise<string> {
  const tries = ghPath ? [ghPath] : GH_CANDIDATES
  let lastErr = 'gh not found'
  for (const bin of tries) {
    try {
      const r = await $.process.run([bin, ...args], { cwd: repoDir, timeoutMs: 30_000 })
      if (r.exitCode === 0) { ghPath = bin; return r.stdout }
      lastErr = (r.stderr || r.stdout || `gh exited ${r.exitCode}`).trim().split('\n')[0]
      if (ghPath) break
    } catch (err) {
      lastErr = String(err)
    }
  }
  throw new Error(lastErr)
}

async function findRepoDir($: $T, cwd: string | undefined): Promise<string> {
  for (const dir of [cwd, FALLBACK_REPO_DIR].filter(Boolean) as string[]) {
    try { await $.fs.read(`${dir}/agents/config.json`); return dir } catch { /* try next */ }
  }
  throw new Error('agents/config.json not found (open Claude Code in the top-bins repo)')
}

async function sync($: $T, cwd?: string) {
  try {
    const repoDir = (await read($, info)).repoDir ?? (await findRepoDir($, cwd))
    const config = JSON.parse(await $.fs.read(`${repoDir}/agents/config.json`)) as Config
    const approvers = new Set(config.approvers.map(a => a.github))

    const statusIssues = JSON.parse(await gh($, repoDir, ['issue', 'list', '--repo', config.repo, '--label', 'agent-status', '--state', 'open',
      '--json', 'number,title,body,updatedAt,comments', '--limit', '30'])) as GhIssue[]
    const proposed = JSON.parse(await gh($, repoDir, ['issue', 'list', '--repo', config.repo, '--label', 'status:proposed', '--state', 'open',
      '--json', 'number,title,labels', '--limit', '200'])) as GhIssue[]

    const nextLinks: Record<string, AgentLink> = {}
    const list: Agent[] = Object.entries(config.agents)
      .filter(([, a]) => a.enabled !== false)
      .map(([id, a]) => {
        const issue = statusIssues.find(i => i.title.trim() === `Agent status: ${id}`)
        nextLinks[id] = { statusIssue: issue?.number ?? null, routineId: a.routineId }

        let status: AgentStatus = 'waiting'
        let task = a.routineId ? 'Not run yet' : 'Routine not created yet'
        let progress = 0
        let updatedAt = 0
        const m = issue?.body?.match(STATUS_BLOCK)
        if (m) {
          try {
            const s = JSON.parse(m[1] ?? '{}')
            if (s.status in STATUS) status = s.status
            task = String(s.task ?? task)
            progress = Math.max(0, Math.min(1, Number(s.progress) || 0))
            updatedAt = Number(s.updatedAt) || 0
          } catch { task = 'Status block unreadable' }
        }

        const approvals: Approval[] = proposed
          .filter(p => p.labels?.some(l => l.name === `agent:${id}`))
          .map(p => {
            const lbl = (p.labels ?? []).map(l => l.name)
            const pick = (prefix: string) => lbl.find(l => l.startsWith(prefix))?.slice(prefix.length)
            const sev = lbl.find(l => /^P[0-3]$/.test(l))
            const detail = [`#${p.number}`, sev, pick('type:'), pick('area:')].filter(Boolean).join(' · ')
            return { id: String(p.number), action: p.title, detail }
          })
        if (approvals.length > 0 && (status === 'done' || status === 'waiting')) status = 'needs-approval'

        const chat: ChatLine[] = (issue?.comments ?? []).slice(-8).map(c => ({
          who: c.author && approvers.has(c.author.login) ? 'you' : 'agent',
          text: c.body.length > 400 ? `${c.body.slice(0, 400)}…` : c.body,
          at: Date.parse(c.createdAt) || 0,
        }))
        if (!updatedAt) updatedAt = chat[chat.length - 1]?.at ?? 0

        return { id, name: a.name, role: a.role, status, task, progress, updatedAt, approvals, chat }
      })

    await update($, agents, () => list)
    await update($, links, () => nextLinks)
    await update($, info, () => ({ syncedAt: Date.now(), error: null, repoDir }))
  } catch (err) {
    await update($, info, i => ({ ...i, syncedAt: Date.now(), error: String(err instanceof Error ? err.message : err) }))
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'agent-deck', description: 'Open the TopBins agent hub' })
    // Start minimised as the corner widget; /agent-deck opens it full size.
    void $.ui.open({ id: PANE, title: TITLE, placement: 'widget' })
    void sync($, e.cwd)
    $.clock.every(POLL_MS, () => sync($))
    return next(e)
  })

  on('command.run', { command: 'agent-deck' }, async $ => {
    void sync($)
    await $.ui.open({ id: PANE, title: TITLE })
    return { text: 'Agent hub opened.' }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button, Progress, Input } = $.ui.resolve(e) as $T
    const list = await read($, agents)
    const sel = await read($, selected)
    const lnk = await read($, links)
    const hub = await read($, info)
    const now = Date.now()
    const needs = list.reduce((n, a) => n + a.approvals.length, 0)
    const running = list.filter(a => a.status === 'running').length
    const blocked = list.filter(a => a.status === 'blocked').length

    // ---------- Minimised: a glanceable widget ----------
    if (e.props.placement === 'widget') {
      return (
        <Box flexDirection="column" gap={0}>
          <Text weight="semibold">{list.length} agents</Text>
          <Box flexDirection="row" gap={1}>
            {list.map(a => (
              <Text color={STATUS[a.status].color}>{STATUS[a.status].dot}</Text>
            ))}
          </Box>
          {hub.error ? (
            <Text color="error" size="footnote" maxLines={1}>Sync failed</Text>
          ) : needs > 0 ? (
            <Text color="warning" size="footnote">{needs} approval{needs > 1 ? 's' : ''} waiting</Text>
          ) : blocked > 0 ? (
            <Text color="error" size="footnote">{blocked} blocked</Text>
          ) : (
            <Text dimColor size="footnote">{running} running</Text>
          )}
        </Box>
      )
    }

    const repoDir = hub.repoDir ?? FALLBACK_REPO_DIR
    const repoArgs = async () => {
      const cfg = JSON.parse(await $.fs.read(`${repoDir}/agents/config.json`)) as Config
      return ['--repo', cfg.repo]
    }
    const setLabel = async (agentId: string, approvalId: string, label: 'status:approved' | 'status:rejected') => {
      const t = Date.now()
      const ap = (await read($, agents)).find(a => a.id === agentId)?.approvals.find(x => x.id === approvalId)
      try {
        await gh($, repoDir, ['issue', 'edit', approvalId, ...(await repoArgs()), '--add-label', label])
        await update($, agents, all => all.map(a => a.id !== agentId ? a : {
          ...a,
          approvals: a.approvals.filter(x => x.id !== approvalId),
          updatedAt: t,
          chat: [...a.chat, { who: 'you', text: `${label === 'status:approved' ? 'Approved' : 'Rejected'}: #${approvalId} ${ap?.action ?? ''}`, at: t }],
        }))
        $.ui.toast(`#${approvalId} ${label === 'status:approved' ? 'approved' : 'rejected'}`)
        // Approving starts the Builder straight away (Luke's GitHub approvals are picked up by its daily run).
        const builderRoutine = (await read($, links))['builder']?.routineId
        if (label === 'status:approved' && builderRoutine) {
          await $.prompt.submit({ text: `Issue #${approvalId} was just approved. Start the Builder: call RemoteTrigger with action "run" and trigger_id "${builderRoutine}", then confirm in one line.` })
        }
      } catch (err) {
        $.ui.toast(`Couldn't update #${approvalId}: ${String(err instanceof Error ? err.message : err)}`)
      }
    }
    const approve = (agentId: string, approvalId: string) => setLabel(agentId, approvalId, 'status:approved')
    const deny = (agentId: string, approvalId: string) => setLabel(agentId, approvalId, 'status:rejected')

    const runNow = async (a: Agent) => {
      const routineId = lnk[a.id]?.routineId
      if (!routineId) { $.ui.toast(`${a.name} has no routine yet`); return }
      await $.prompt.submit({ text: `Run the ${a.name} agent now: call RemoteTrigger with action "run" and trigger_id "${routineId}", then confirm in one line that it started.` })
      $.ui.toast(`Asked Claude to start ${a.name}`)
    }

    // A message goes on the agent's status issue; the agent reads it at the start of its next run.
    const send = async (agentId: string, text: string) => {
      if (!text.trim()) return
      const issue = lnk[agentId]?.statusIssue
      if (!issue) { $.ui.toast('No status issue for this agent yet'); return }
      try {
        await gh($, repoDir, ['issue', 'comment', String(issue), ...(await repoArgs()), '--body', text])
        const t = Date.now()
        await update($, agents, all => all.map(a => a.id !== agentId ? a : { ...a, updatedAt: t, chat: [...a.chat, { who: 'you', text, at: t }] }))
      } catch (err) {
        $.ui.toast(`Couldn't post: ${String(err instanceof Error ? err.message : err)}`)
      }
    }

    const approvalRows = (a: Agent) => (
      <Box flexDirection="column" gap={1}>
        {a.approvals.map(ap => (
          <Box flexDirection="column" gap={0} padding={1} borderStyle="round" borderColor="warning">
            <Text color="warning" weight="semibold" size="footnote">▲ {ap.action}</Text>
            <Text mono size="footnote">{ap.detail}</Text>
            <Box flexDirection="row" gap={1} marginTop={1}>
              <Button key={`ok-${a.id}-${ap.id}`} variant="primary" onPress={() => approve(a.id, ap.id)}>Approve</Button>
              <Button key={`no-${a.id}-${ap.id}`} onPress={() => deny(a.id, ap.id)}>Reject</Button>
            </Box>
          </Box>
        ))}
      </Box>
    )

    const footer = (
      <Box flexDirection="row" gap={2} alignItems="center">
        <Button key="refresh" plain dimColor onPress={() => sync($)}>Refresh</Button>
        {hub.error
          ? <Text color="error" size="caption" maxLines={2}>Sync failed: {hub.error}</Text>
          : <Text dimColor size="caption">Synced {ago(hub.syncedAt, now)}</Text>}
      </Box>
    )

    // ---------- Detail: one agent's feed ----------
    const agent = list.find(a => a.id === sel)
    if (agent) {
      const st = STATUS[agent.status]
      return (
        <Box flexDirection="column" gap={1} padding={1}>
          <Box flexDirection="row" justifyContent="space-between" alignItems="center">
            <Button key="back" plain dimColor onPress={() => update($, selected, () => null)}>← All agents</Button>
            <Text color={st.color} size="footnote">{st.dot} {st.label}</Text>
          </Box>
          <Box flexDirection="column" gap={0}>
            <Text size="heading" weight="semibold">{agent.name} <Text dimColor>· {agent.role}</Text></Text>
            <Text dimColor size="footnote">{agent.task}</Text>
          </Box>
          <Progress label={`${agent.name} progress`} value={agent.progress} max={1} valueText={`${Math.round(agent.progress * 100)}%`} color={st.color} />
          <Box flexDirection="row" gap={1}>
            <Button key={`run-${agent.id}`} onPress={() => runNow(agent)}>Run now</Button>
          </Box>
          {agent.approvals.length > 0 && approvalRows(agent)}
          <Box flexDirection="column" gap={1} borderStyle="single" borderDimColor padding={1}>
            {agent.chat.length === 0 && <Text dimColor size="footnote">No activity yet.</Text>}
            {agent.chat.map(c => (
              <Box flexDirection="column" gap={0}>
                <Text size="caption" weight="semibold" color={c.who === 'you' ? 'suggestion' : 'claude'}>
                  {c.who === 'you' ? 'You' : agent.name} <Text dimColor weight="regular">{ago(c.at, now)}</Text>
                </Text>
                <Text>{c.text}</Text>
              </Box>
            ))}
          </Box>
          <Input key={`msg-${agent.id}`} placeholder={`Note for ${agent.name}'s next run…`} submitLabel="Send" onSubmit={(v: string) => send(agent.id, v)} />
          {footer}
        </Box>
      )
    }

    // ---------- Overview: every agent at a glance ----------
    return (
      <Box flexDirection="column" gap={1} padding={1}>
        <Box flexDirection="row" gap={2}>
          <Text size="footnote" color="success">● {running} running</Text>
          <Text size="footnote" color="warning">▲ {needs} to approve</Text>
          <Text size="footnote" color="error">■ {blocked} blocked</Text>
        </Box>
        {list.length === 0 && <Text dimColor size="footnote">{hub.error ? 'Could not load agents.' : 'Loading agents…'}</Text>}
        {list.map(a => {
          const st = STATUS[a.status]
          return (
            <Box
              key={`card-${a.id}`}
              flexDirection="column"
              gap={1}
              padding={1}
              borderStyle="round"
              borderColor={a.status === 'needs-approval' ? 'warning' : a.status === 'blocked' ? 'error' : undefined}
              borderDimColor={a.status !== 'needs-approval' && a.status !== 'blocked'}
            >
              <Box flexDirection="row" justifyContent="space-between" alignItems="center">
                <Button key={`open-${a.id}`} plain onPress={() => update($, selected, () => a.id)}>
                  {a.name} <Text dimColor>· {a.role}  ›</Text>
                </Button>
                <Text color={st.color} size="footnote">{st.dot} {st.label}</Text>
              </Box>
              <Text size="footnote" maxLines={2}>{a.task}</Text>
              <Progress label={`${a.name} progress`} value={a.progress} max={1} valueText={`${Math.round(a.progress * 100)}%`} color={st.color} />
              <Box flexDirection="row" justifyContent="space-between" alignItems="center">
                <Text dimColor size="caption" maxLines={1}>
                  {a.chat[a.chat.length - 1]?.text.split('\n')[0] ?? 'No runs yet'} · {ago(a.updatedAt, now)}
                </Text>
                <Button key={`runcard-${a.id}`} plain dimColor onPress={() => runNow(a)}>Run now</Button>
              </Box>
              {a.approvals.length > 0 && approvalRows(a)}
            </Box>
          )
        })}
        {footer}
      </Box>
    )
  })
}
