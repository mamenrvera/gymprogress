import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const WGER_BASE = 'https://wger.de/api/v2/exerciseinfo/'
const PAGE_SIZE = 100
const BUCKET = 'exercise-photos'

const MUSCLE_MAP = {
  shoulder: 'hombros', deltoid: 'hombros',
  bicep: 'biceps',
  tricep: 'triceps',
  chest: 'pecho', pectoral: 'pecho',
  lat: 'espalda', back: 'espalda', trap: 'espalda',
  quad: 'cuadriceps',
  hamstring: 'isquiotibiales',
  glute: 'gluteos',
  calf: 'gemelos', soleus: 'gemelos', gastroc: 'gemelos',
  abs: 'core', oblique: 'core',
}

function mapMuscle(muscleEn, category) {
  const m = (muscleEn || '').toLowerCase()
  for (const key of Object.keys(MUSCLE_MAP)) if (m.includes(key)) return MUSCLE_MAP[key]
  const c = (category || '').toLowerCase()
  if (c.includes('abs')) return 'core'
  if (c.includes('arm')) return 'biceps'
  if (c.includes('back')) return 'espalda'
  if (c.includes('calv')) return 'gemelos'
  if (c.includes('chest')) return 'pecho'
  if (c.includes('leg')) return 'cuadriceps'
  if (c.includes('shoulder')) return 'hombros'
  return 'otro'
}

function normalizeName(name) { return name.trim().toLowerCase() }

const { data: existingRows } = await supabase.from('exercises').select('id,name,external_source,external_id').eq('is_global', true)
const existingWgerIds = new Set((existingRows || []).filter(r => r.external_source === 'wger').map(r => String(r.external_id)))
const existingNames = new Set((existingRows || []).map(r => normalizeName(String(r.name))))

const result = { imported: 0, withImage: 0, withoutImage: 0, skipped: 0, errors: 0 }
let nextUrl = `${WGER_BASE}?limit=${PAGE_SIZE}`

while (nextUrl) {
  const res = await fetch(nextUrl)
  if (!res.ok) { console.error('HTTP', res.status); break }
  const json = await res.json()
  for (const ex of json.results || []) {
    const esTrans = (ex.translations || []).find(t => t.language === 4)
    const name = esTrans?.name?.trim()
    if (!name) { result.skipped++; continue }
    const wgerId = String(ex.id)
    if (existingWgerIds.has(wgerId)) { result.skipped++; continue }
    const norm = normalizeName(name)
    if (existingNames.has(norm)) { result.skipped++; continue }

    const muscle = (ex.muscles || [])[0]
    const muscleEn = muscle?.name_en || ''
    const category = ex.category?.name || ''
    const muscleGroup = mapMuscle(muscleEn, category)

    let imageUrl
    const img = (ex.images || []).find(i => i.is_main) || (ex.images || [])[0]
    const imgUrl = img?.image
    if (imgUrl) {
      try {
        const blobRes = await fetch(imgUrl)
        if (!blobRes.ok) throw new Error(`HTTP ${blobRes.status}`)
        const blob = await blobRes.blob()
        const ext = imgUrl.split('.').pop()?.toLowerCase() || 'webp'
        const safeExt = ['jpg','jpeg','png','webp'].includes(ext) ? ext : 'webp'
        const path = `global/wger-${wgerId}.${safeExt}`
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: blob.type || 'image/webp', upsert: true })
        if (upErr) throw upErr
        imageUrl = path
        result.withImage++
      } catch (e) {
        console.error('image fail', wgerId, e?.message || e)
        result.withoutImage++
      }
    } else {
      result.withoutImage++
    }

    const now = new Date().toISOString()
    const { error: upsertError } = await supabase.from('exercises').upsert({
      id: crypto.randomUUID(),
      user_id: null,
      name,
      muscle_group: muscleGroup,
      image_url: imageUrl,
      is_global: true,
      external_source: 'wger',
      external_id: wgerId,
      created_at: now,
      updated_at: now,
    }, { onConflict: 'external_source,external_id' })

    if (upsertError) {
      const msg = upsertError?.message || ''
      if (msg.includes('duplicate key') || msg.includes('unique')) { result.skipped++; continue }
      console.error('upsert fail', name, msg)
      result.errors++
      continue
    }
    result.imported++
    existingWgerIds.add(wgerId)
    existingNames.add(norm)
  }
  nextUrl = json.next || null
  console.log('progress', result)
}

console.log('FINAL', result)
