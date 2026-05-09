import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function main() {
  const { data } = await supabase
    .from('minimise_scores')
    .select('id, username, score')
    .order('score', { ascending: true })
    .limit(10)
  console.log(JSON.stringify(data, null, 2))
}
main()
