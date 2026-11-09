import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return
  const content = readFileSync(filePath, 'utf-8')
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const val = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '')
    if (key && process.env[key] === undefined) process.env[key] = val
  }
}
loadEnvFile(resolve(process.cwd(), '.env.local'))

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (in .env.local)')
  process.exit(1)
}
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const BUCKET = 'exercise-photos'

// Listar archivos en la carpeta global con prefijo wger-
async function listAll(prefix) {
  const out = []
  let offset = 0
  while (true) {
    const { data, error } = await supabase.storage.from(BUCKET).list(prefix, { limit: 1000, offset })
    if (error) { console.error('list error', error); break }
    if (!data || data.length === 0) break
    out.push(...data)
    if (data.length < 1000) break
    offset += data.length
  }
  return out
}

const files = await listAll('global')
const wgerFiles = files.filter(f => f.name.startsWith('wger-')).map(f => 'global/' + f.name)
console.log('Archivos wger encontrados en Storage:', wgerFiles.length)

if (wgerFiles.length === 0) {
  console.log('Nada que borrar.')
  process.exit(0)
}

// Borrar en lotes de 100
let deleted = 0
for (let i = 0; i < wgerFiles.length; i += 100) {
  const batch = wgerFiles.slice(i, i + 100)
  const { error } = await supabase.storage.from(BUCKET).remove(batch)
  if (error) { console.error('remove error', error); break }
  deleted += batch.length
}
console.log('Archivos borrados:', deleted)
