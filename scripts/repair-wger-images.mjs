import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars')
  process.exit(1)
}
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const BUCKET = 'exercise-photos'
const HEADERS = { 'User-Agent': 'GymProgress/1.0', 'Accept': 'application/json' }

const { data: exercises, error: fetchError } = await supabase
  .from('exercises')
  .select('id, external_id, image_url')
  .eq('is_global', true)
  .eq('external_source', 'wger')

if (fetchError) { console.error(fetchError); process.exit(1) }

const result = { total: exercises?.length || 0, repaired: 0, alreadyOk: 0, noImage: 0, errors: 0 }

for (const ex of exercises || []) {
  const wgerId = ex.external_id
  if (!wgerId) { result.errors++; continue }

  if (ex.image_url) {
    const { data, error } = await supabase.storage.from(BUCKET).download(ex.image_url)
    if (!error && data) { result.alreadyOk++; continue }
  }

  let wgerEx
  try {
    const res = await fetch(`https://wger.de/api/v2/exerciseinfo/${wgerId}/`, { headers: HEADERS })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    wgerEx = await res.json()
  } catch (e) {
    console.error('wger fetch failed', wgerId, e?.message || e)
    result.errors++
    continue
  }

  const images = wgerEx?.images || []
  const img = images.find(i => i.is_main) || images[0]
  const imgUrl = img?.image
  if (!imgUrl) {
    await supabase.from('exercises').update({ image_url: null }).eq('id', ex.id)
    result.noImage++
    continue
  }

  try {
    const imgRes = await fetch(imgUrl, { headers: HEADERS })
    if (!imgRes.ok) throw new Error(`HTTP ${imgRes.status}`)
    const buf = await imgRes.arrayBuffer()
    const bytes = new Uint8Array(buf)
    const ext = imgUrl.split('.').pop()?.toLowerCase() || 'webp'
    const safeExt = ['jpg','jpeg','png','webp'].includes(ext) ? ext : 'webp'
    const path = `global/wger-${wgerId}.${safeExt}`
    const contentType = imgRes.headers.get('content-type') || 'image/webp'
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, bytes, { contentType, upsert: true })
    if (upErr) throw upErr
    const { error: updErr } = await supabase.from('exercises').update({ image_url: path }).eq('id', ex.id)
    if (updErr) throw updErr
    result.repaired++
  } catch (e) {
    console.error('repair failed', wgerId, e?.message || e)
    result.errors++
  }
  console.log('progress', result)
}

console.log('FINAL', result)
