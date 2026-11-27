# The backlog: GitHub Issues on ben-p-laws/football-quiz

One shared backlog. Every task, idea and video is a GitHub issue. Use the `gh` CLI (authenticated through `GH_TOKEN`).

## Labels
| Group | Labels |
|---|---|
| Status (exactly one) | `status:proposed` `status:approved` `status:in-progress` `status:in-review` `status:verified` `status:done` `status:rejected` |
| Source agent | `agent:ux-tester` `agent:ui-reviewer` `agent:game-designer` `agent:builder` `agent:pm` `agent:social-video` |
| Type | `type:bug` `type:ux` `type:ui` `type:new-game` `type:tech` `type:video` |
| Severity | `P0` (broken, blocks play) `P1` (major friction) `P2` (noticeable) `P3` (polish) |
| Area | `area:golf-h2h` `area:golf-solo` `area:golf-lobby` `area:golf-daily` `area:landing` `area:geo` `area:other-games` `area:site` |

Other labels: `agent-status` (one status issue per agent), `digest` (the daily digest issue). The `agents-labels` workflow keeps exactly one status label on each issue, records who approved, and closes issues marked done or rejected.

## Who moves an issue
- Agents create issues as `status:proposed`.
- Ben or Luke set `status:approved` or `status:rejected`. Agents never approve.
- Builder: `approved` to `in-progress` (when it starts) to `in-review` (PR open).
- UX Tester or UI Reviewer: `in-review` to `verified` after re-testing the PR, or back to `approved` with a comment if it failed.
- `done` is set when the PR is merged (the PR body says `Closes #n`).

## Issue format
Title: short, specific, starts with the area. Example: `Golf H2H: no visual change between your shot and opponent's shot`

Body:
```
**Source:** UX Tester · run 2026-11-28-0713
**Area / game:** golf-h2h
**Type:** ux · **Severity:** P1
**Owner:** Builder (once approved)

### Evidence
- Repro steps (numbered, from a cold start)
- Screenshots / video: links to files on the `agent-logs` branch (agents/<you>/evidence/...)
- Viewport(s): mobile 390x844, desktop 1440x900

### Proposed change
What to change, where (`path:line` if known), and why it improves the experience.

### Acceptance check
How the verifier will know it's fixed.

<!-- agent-meta: {"source":"ux-tester","area":"golf-h2h","type":"ux","severity":"P1"} -->
```
`approved_by` is recorded automatically as a comment when someone approves. The linked PR appears on the issue when the Builder opens it.

## Commands
In cloud runs only the REST API works (`gh api ...`). `gh issue list/create/edit` use GraphQL and fail.
```bash
R=repos/ben-p-laws/football-quiz
# open backlog for an area
gh api "$R/issues?state=open&labels=area:golf-h2h&per_page=100" --paginate --jq '.[] | select(.pull_request|not) | [.number,.title,([.labels[].name]|join(","))] | @tsv'
# closed (done/rejected) for an area: don't re-raise these
gh api "$R/issues?state=closed&labels=area:golf-h2h&per_page=100" --paginate --jq '.[] | select(.pull_request|not) | [.number,.title] | @tsv'
# search before creating
gh api -X GET search/issues -f q='repo:ben-p-laws/football-quiz is:issue "turn indicator" in:title' --jq '.items[] | [.number,.state,.title] | @tsv'
# create (body from a file)
gh api "$R/issues" -f title='...' -F body=@body.md -f 'labels[]=status:proposed' -f 'labels[]=agent:ux-tester' -f 'labels[]=type:ux' -f 'labels[]=P1' -f 'labels[]=area:golf-h2h'
# change status: add the new label (the agents-labels workflow removes the old one)
gh api "$R/issues/123/labels" -f 'labels[]=status:in-progress'
# comment
gh api "$R/issues/123/comments" -F body=@evidence.md
# open a PR (Builder)
gh api "$R/pulls" -f title='...' -f head='claude/123-slug' -f base=main -F body=@pr.md
```

## Evidence files
Commit screenshots and videos to `agents/<you>/evidence/<run-id>/` on the `agent-logs` branch and link them with the full GitHub URL, e.g. `https://github.com/ben-p-laws/football-quiz/blob/agent-logs/agents/ux-tester/evidence/2026-11-28-0713/turn-state.png`. Keep videos short (under 20 MB each).
