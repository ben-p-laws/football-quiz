import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function main() {
  const { error } = await supabase
    .from('minimise_scores')
    .delete()
    .ilike('username', 'anonymous')
  if (error) console.error(error.message)
  else console.log('Deleted all Anonymous entries')
}
main()
