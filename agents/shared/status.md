# Reporting live status to the hub

The hub (Ben's Agent Hub in Claude Code, and the GitHub issue list for Luke) reads one **status issue per agent**: an open issue labelled `agent-status` titled `Agent status: <agent-id>`.

The issue body holds a JSON block in the hub's existing contract. Replace the whole body each time you update it:

````
```agent-status
{
  "id": "ux-tester",
  "status": "running",
  "task": "Golf H2H: testing turn switching on Augusta 1-3",
  "progress": 0.35,
  "updatedAt": 1795800000000,
  "runId": "2026-11-28-0713"
}
```
````

- `status`: one of `running`, `needs-approval`, `waiting`, `blocked`, `done`.
- `progress`: 0 to 1. Update it at each real milestone (roughly every 10 to 15 minutes, or each phase of your plan). Don't fake smooth progress.
- `updatedAt`: milliseconds since epoch (`date +%s000`).
- Use `needs-approval` only if you finished and your output is waiting on Ben or Luke. Use `blocked` with the reason in `task` if you couldn't continue.

Comments on the status issue are the agent's activity feed (the hub shows the latest few). Post one comment when the run starts (your plan in 2-4 lines), at most a few at milestones, and one summary comment at the end.

```bash
R=repos/ben-p-laws/football-quiz
N=$(gh api "$R/issues?state=open&labels=agent-status&per_page=50" --jq '.[] | select(.title=="Agent status: ux-tester") | .number')
gh api -X PATCH "$R/issues/$N" -F body=@status.md
gh api "$R/issues/$N/comments" -f body='Starting: ...'
```
