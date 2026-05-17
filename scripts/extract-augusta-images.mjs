// Run: node scripts/extract-augusta-images.mjs path/to/augustanationalgc.json
// Saves hole images to public/holes/augusta/hole_01.jpg ... hole_18.jpg

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const jsonPath = process.argv[2]
if (!jsonPath) { console.error('Usage: node extract-augusta-images.mjs <json-file>'); process.exit(1) }

const outDir = path.join(__dirname, '..', 'public', 'holes', 'augusta')
fs.mkdirSync(outDir, { recursive: true })

const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
for (const hole of data.holes) {
  const raw = hole.image_url.replace(/^data:image\/\w+;base64,/, '')
  const buf = Buffer.from(raw, 'base64')
  const ext = hole.image_url.startsWith('data:image/png') ? 'png' : 'jpg'
  const filename = `hole_${String(hole.hole).padStart(2, '0')}.${ext}`
  fs.writeFileSync(path.join(outDir, filename), buf)
  console.log(`Saved ${filename}`)
}
console.log('Done.')
