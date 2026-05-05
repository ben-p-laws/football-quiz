import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const newEntries = [
  { username: 'Liam',    score: 117 },
  { username: 'James',   score: 128 },
  { username: 'Ethan',   score: 135 },
  { username: 'Mason',   score: 142 },
  { username: 'Logan',   score: 119 },
  { username: 'Lucas',   score: 153 },
  { username: 'Archie',  score: 138 },
  { username: 'Finn',    score: 126 },
  { username: 'Rory',    score: 161 },
  { username: 'Dylan',   score: 147 },
]

async function main() {
  // Delete remaining anonymous entries
  const { error: delErr } = await supabase
    .from('minimise_scores')
    .delete()
    .ilike('username', 'anonymous')
  if (delErr) console.error('Delete error:', delErr.message)
  else console.log('✓ Deleted anonymous entries')

  // Insert new entries
  for (const e of newEntries) {
    const { error } = await supabase
      .from('minimise_scores')
      .insert({ username: e.username, score: e.score, player_slots: [] })
    if (error) console.error(`Failed ${e.username}:`, error.message)
    else console.log(`✓ ${e.username} — ${e.score}`)
  }
}
main()
