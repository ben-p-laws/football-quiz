# Test environment

All browser testing runs against a copy of the site started inside your run, connected to the **test** Supabase project. Never production.

## Start the site
```bash
npm ci
npx playwright install --with-deps chromium   # if not already installed
# required env (set on the routine): TEST_SUPABASE_URL, TEST_SUPABASE_ANON_KEY, PROD_SUPABASE_HOST (for the safety check only)
NEXT_PUBLIC_SUPABASE_URL="$TEST_SUPABASE_URL" \
NEXT_PUBLIC_SUPABASE_ANON_KEY="$TEST_SUPABASE_ANON_KEY" \
NEXT_PUBLIC_AGENT_TEST=1 \
npx next build && npx next start -p 3100 &
```
Then browse `http://localhost:3100`.

**Hard stop:** if `TEST_SUPABASE_URL` is missing, or contains `PROD_SUPABASE_HOST`, do not start the site. Set your status to `blocked` ("test environment not configured") and finish. Do not fall back to production.

Vercel Analytics doesn't record from a local server, so test runs never touch site analytics.

## Test players
H2H has no accounts. A player is a browser context with its own `localStorage` (`golf_device_id` and a username). Use two separate browser contexts:

| Player | `golf_device_id` | Name |
|---|---|---|
| A (host) | `agent-test-host-0001` | Test Ben |
| B (guest) | `agent-test-guest-0002` | Test Luke |

Set them with `context.addInitScript` before loading the page.

## Viewports
Mobile 390x844 first, then desktop 1440x900. Record video with Playwright's `recordVideo` for anything involving motion or turn changes.

## Status: being built
Until the Builder has finished the environment bootstrap task (test Supabase project, seed data, `NEXT_PUBLIC_AGENT_TEST` hooks, analytics guard), these instructions may not fully work. If they don't, report exactly what was missing in your summary and stop rather than improvising against production.
