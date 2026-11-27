export type AgentStatus = 'running' | 'needs-approval' | 'waiting' | 'blocked' | 'done'

export type ChatLine = { who: 'you' | 'agent' | 'tool'; text: string; at: number }

// For the TopBins team, an approval is a backlog issue waiting on Ben or Luke:
// id = issue number, action = issue title, detail = labels summary.
export type Approval = { id: string; action: string; detail: string }

export type Agent = {
  id: string
  name: string
  role: string
  status: AgentStatus
  task: string
  progress: number
  updatedAt: number
  approvals: Approval[]
  chat: ChatLine[]
}

// Where each agent lives outside the hub: its GitHub status issue and its routine.
export type AgentLink = { statusIssue: number | null; routineId: string | null }

export type HubInfo = { syncedAt: number; error: string | null; repoDir: string | null }

declare module 'claude-code' {
  interface PluginState {
    'agent-deck': {
      agents: Shaped<Agent[]>
      selected: string | null
      links: Record<string, AgentLink>
      info: HubInfo
    }
  }
}
