import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const entries = [
  { username: 'Jack',    score: 208 },
  { username: 'Oliver',  score: 224 },
  { username: 'Harry',   score: 231 },
  { username: 'Charlie', score: 247 },
  { username: 'George',  score: 215 },
  { username: 'Noah',    score: 253 },
  { username: 'Alfie',   score: 238 },
  { username: 'Freddie', score: 219 },
  { username: 'Theo',    score: 244 },
  { username: 'Oscar',   score: 258 },
]

async function seed() {
  for (const e of entries) {
    const { error } = await supabase
      .from('minimise_scores')
      .insert({ username: e.username, score: e.score, player_slots: [] })
    if (error) console.error(`Failed ${e.username}:`, error.message)
    else console.log(`✓ ${e.username} — ${e.score}`)
  }
}

seed()
