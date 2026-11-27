# The TopBins agent team

Six AI agents (Claude Code cloud routines) that test, review, design and build TopBins. Ben and Luke approve everything; nothing reaches `main` without a human merging it.

| Agent | What it does | When |
|---|---|---|
| UX Tester | Plays the games like a real player (two browsers for H2H), files bugs and friction with evidence, re-tests fixes | Mon, Wed, Fri |
| UI Reviewer | Owns the design system; audits every page and writes redesign specs | Tue |
| Game Designer | Pitches 3-5 original game ideas | Thu |
| Project Manager | Dedupes and orders the backlog, daily update, weekly report | Daily, plus Sunday report |
| Builder | The only one that writes code. Implements approved issues as PRs | When an issue is approved |
| Social Video | 30s golf hole video for Instagram/TikTok, for approval (not live yet) | Every 2 days |

Cadences, time limits and caps: [`config.json`](config.json). Shared rules: [`shared/rules.md`](shared/rules.md). Each agent's brief: `agents/<agent>/prompt.md`.

## Approving work (Ben or Luke)
Everything waiting on you is a GitHub issue labelled `status:proposed`. [See the queue](https://github.com/ben-p-laws/football-quiz/issues?q=is%3Aissue+is%3Aopen+label%3Astatus%3Aproposed).

- **Approve:** add the label `status:approved` (works in the GitHub phone app). The Builder starts on it.
- **Reject:** add `status:rejected` and leave a comment saying why. The agents read the reason and won't raise it again without new evidence.
- **Merge:** the Builder opens a PR that says `Closes #n`. Review it (screenshots for mobile and desktop are in the PR), then merge. That marks the issue done.

Only `ben-p-laws` and `lukelaws01` can approve or reject; the `agents-labels` workflow removes those labels if anyone else adds them. Ben can also approve from the **Agent Hub** in Claude Code (`/agent-deck`).

**Daily email:** at 6:00 Adelaide time, if anything is waiting, the `agents-digest` workflow @mentions both of you on the [Daily digest](https://github.com/ben-p-laws/football-quiz/issues?q=is%3Aissue+label%3Adigest) issue and GitHub emails you. Nothing waiting means no email. Make sure GitHub's email notifications for mentions are on.

## Running an agent now
- **Agent Hub** (Claude Code, `/agent-deck`): press **Run now** on the agent's card.
- **Anywhere else:** ask Claude Code "run the UX Tester now", or press **Run now** on the routine at claude.ai/code/routines.

## Following what agents are doing
- Agent Hub: live status, progress, approvals and each agent's feed.
- GitHub: each agent has an `Agent status: <id>` issue (label `agent-status`). Its comments are the run log. Comment there to give an agent a note for its next run.
- Full run reports, findings and evidence (screenshots, videos): the `agent-logs` branch, `agents/<agent>/`.

## Protected areas
Golf hole calibration and Population Circle scoring are locked: see [`protected.md`](protected.md). Automated checks fail any PR that changes them.

## Test environment
Agents run the site inside their own cloud machine against a separate **test** Supabase project, never production. See [`shared/environment.md`](shared/environment.md).

## Adding a new agent
1. Create `agents/<id>/prompt.md` (copy an existing one; keep the shared start/end-of-run steps).
2. Add it to `config.json` with name, role, cron, `maxRunMinutes` and `maxNewTasks`.
3. Create the label `agent:<id>` and an open issue titled `Agent status: <id>` with label `agent-status` (copy the body from an existing status issue).
4. Ask Claude Code to "create the routine for the <id> agent". It creates a paused routine whose prompt is "You are the <Name> agent. Read agents/shared/rules.md and agents/<id>/prompt.md and follow them", then writes the routine id into `config.json`.
5. The hub picks it up on its next refresh.

To change a cadence: edit `config.json`, then ask Claude Code to "sync agent routines".
