import { createClient } from '@supabase/supabase-js'

import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

// Cargar .env.local de forma segura si las variables no están ya en el entorno
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
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars')
  process.exit(1)
}
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const BUCKET = 'exercise-photos'
const HEADERS = { 'User-Agent': 'GymProgress/1.0', 'Accept': 'application/json' }
const RAW_BASE = 'https://raw.githubusercontent.com/RepDB/exercise-dataset/main/'

const MUSCLE_MAP = {
  abductors: 'gluteos',
  adductors: 'cuadriceps',
  anterior_deltoid: 'hombros',
  biceps_brachii: 'biceps',
  brachialis: 'biceps',
  brachioradialis: 'biceps',
  erector_spinae: 'core',
  forearm_extensors: 'biceps',
  forearm_flexors: 'biceps',
  forearms: 'biceps',
  gastrocnemius: 'gemelos',
  gluteus_maximus: 'gluteos',
  gluteus_medius: 'gluteos',
  hamstrings: 'isquiotibiales',
  hip_flexors: 'core',
  infraspinatus_teres_minor: 'hombros',
  lateral_deltoid: 'hombros',
  latissimus_dorsi: 'espalda',
  obliques: 'core',
  pectoralis_major: 'pecho',
  posterior_deltoid: 'hombros',
  quadratus_lumborum: 'core',
  quadriceps: 'cuadriceps',
  rectus_abdominis: 'core',
  rhomboids: 'espalda',
  serratus_anterior: 'pecho',
  soleus: 'gemelos',
  supraspinatus: 'hombros',
  tibialis_anterior: 'gemelos',
  transverse_abdominis: 'core',
  trapezius: 'espalda',
  triceps_brachii: 'triceps',
}

function mapMuscle(slug) {
  return MUSCLE_MAP[slug] || 'otro'
}

function toMuscleGroups(slugs) {
  const set = new Set((slugs || []).map(mapMuscle))
  return [...set]
}

// Load dataset
console.log('Fetching exercises.json...')
const res = await fetch('https://exercise-dataset.com/exercises.json', { headers: HEADERS })
if (!res.ok) { console.error('HTTP', res.status); process.exit(1) }
const data = await res.json()
const exercises = data.exercises
console.log('Total exercises in dataset:', exercises.length)

// Existing repdb rows
const { data: existingRows } = await supabase.from('exercises').select('id, external_id').eq('external_source', 'repdb')
const existingIds = new Set((existingRows || []).map(r => r.external_id))

const result = { imported: 0, withImage: 0, withPeak: 0, skipped: 0, repaired: 0, errors: 0, muscles: 0 }

for (let i = 0; i < exercises.length; i++) {
  const ex = exercises[i]
  const repdbId = ex.id
  const existingRow = (existingRows || []).find(r => r.external_id === repdbId)
  if (existingRow) {
    // Reparar imágenes faltantes sin duplicar
    const { data: cur } = await supabase.from('exercises').select('id, image_url, image_peak_url').eq('id', existingRow.id).single()
    const img = ex.images?.flat || {}
    let needRepair = !cur?.image_url || (img.peak && !cur?.image_peak_url)
    if (needRepair) {
      // download/upload missing
      if (!cur?.image_url) {
        const p = img.start || img.main
        if (p) {
          const url = RAW_BASE + p
          try {
            const imgRes = await fetch(url, { headers: HEADERS })
            if (imgRes.ok) {
              const buf = await imgRes.arrayBuffer()
              const bytes = new Uint8Array(buf)
              const suffix = img.start ? '-start' : '-main'
              const path = `global/repdb-${repdbId}${suffix}.webp`
              const contentType = imgRes.headers.get('content-type') || 'image/webp'
              const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, bytes, { contentType, upsert: true })
              if (!upErr) await supabase.from('exercises').update({ image_url: path }).eq('id', existingRow.id)
            }
          } catch (e) { console.error('repair img fail', repdbId, e?.message || e) }
        }
      }
      if (img.peak && !cur?.image_peak_url) {
        const url = RAW_BASE + img.peak
        try {
          const imgRes = await fetch(url, { headers: HEADERS })
          if (imgRes.ok) {
            const buf = await imgRes.arrayBuffer()
            const bytes = new Uint8Array(buf)
            const path = `global/repdb-${repdbId}-peak.webp`
            const contentType = imgRes.headers.get('content-type') || 'image/webp'
            const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, bytes, { contentType, upsert: true })
            if (!upErr) await supabase.from('exercises').update({ image_peak_url: path }).eq('id', existingRow.id)
          }
        } catch (e) { console.error('repair peak fail', repdbId, e?.message || e) }
      }
      result.repaired = (result.repaired || 0) + 1
    // Reparar relaciones musculares si faltan
    const { count: mCount } = await supabase.from('exercise_muscles').select('*', { count: 'exact', head: true }).eq('exercise_id', existingRow.id)
    if ((mCount || 0) === 0) {
      const primarySlugs = ex.primary_muscles || []
      const secondarySlugs = ex.secondary_muscles || []
      const primarySet2 = new Set(primarySlugs.map(mapMuscle))
      const rows = []
      const seen2 = new Set()
      for (const slug of primarySlugs) {
        const mg = mapMuscle(slug)
        if (seen2.has(mg)) continue
        seen2.add(mg)
        rows.push({ exercise_id: existingRow.id, muscle_slug: mg, is_primary: true })
      }
      for (const slug of secondarySlugs) {
        const mg = mapMuscle(slug)
        if (primarySet2.has(mg) || seen2.has(mg)) continue
        seen2.add(mg)
        rows.push({ exercise_id: existingRow.id, muscle_slug: mg, is_primary: false })
      }
      if (rows.length > 0) {
        const { error: iErr } = await supabase.from('exercise_muscles').insert(rows)
        if (!iErr) result.muscles += rows.length
      }
    }
    } else {
      result.skipped++
    }
    continue
  }

  const nameEs = ex.name_es
  const primarySlugs = ex.primary_muscles || []
  const secondarySlugs = ex.secondary_muscles || []
  const primaryGroups = toMuscleGroups(primarySlugs)
  const secondaryGroups = toMuscleGroups(secondarySlugs)
  const muscleGroup = primaryGroups[0] || 'otro'

  // Images
  const img = ex.images?.flat || {}
  let imageUrl, imagePeakUrl
  const startPath = img.start
  const peakPath = img.peak
  const mainPath = img.main

  async function downloadAndUpload(relPath, suffix) {
    if (!relPath) return null
    const url = RAW_BASE + relPath
    try {
      const imgRes = await fetch(url, { headers: HEADERS })
      if (!imgRes.ok) throw new Error(`HTTP ${imgRes.status}`)
      const buf = await imgRes.arrayBuffer()
      const bytes = new Uint8Array(buf)
      const ext = relPath.split('.').pop()?.toLowerCase() || 'webp'
      const path = `global/repdb-${repdbId}${suffix}.webp`
      const contentType = imgRes.headers.get('content-type') || 'image/webp'
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, bytes, { contentType, upsert: true })
      if (upErr) throw upErr
      return path
    } catch (e) {
      console.error('image fail', repdbId, relPath, e?.message || e)
      return null
    }
  }

  if (startPath) {
    imageUrl = await downloadAndUpload(startPath, '-start')
    if (imageUrl) result.withImage++
  } else if (mainPath) {
    imageUrl = await downloadAndUpload(mainPath, '-main')
    if (imageUrl) result.withImage++
  }
  if (peakPath) {
    imagePeakUrl = await downloadAndUpload(peakPath, '-peak')
    if (imagePeakUrl) result.withPeak++
  }

  const now = new Date().toISOString()
  const exerciseRow = {
    id: crypto.randomUUID(),
    user_id: null,
    name: nameEs,
    muscle_group: muscleGroup,
    equipment: ex.equipment || null,
    notes: null,
    image_url: imageUrl || null,
    image_peak_url: imagePeakUrl || null,
    is_global: true,
    external_source: 'repdb',
    external_id: repdbId,
    description: ex.description_es || null,
    instructions: ex.instructions_es || null,
    tips: ex.tips_es || null,
    category: ex.category || null,
    body_part: ex.body_part || null,
    force_type: ex.force_type || null,
    mechanic: ex.mechanic || null,
    difficulty: ex.difficulty || null,
    goals: ex.goals || null,
    tags: ex.tags || null,
    met: ex.met ?? null,
    is_unilateral: ex.is_unilateral ?? null,
    is_bodyweight: ex.is_bodyweight ?? null,
    variation_group: ex.variation_group || null,
    created_at: now,
    updated_at: now,
  }

  const { data: inserted, error: upsertError } = await supabase
    .from('exercises')
    .upsert(exerciseRow, { onConflict: 'external_source,external_id' })
    .select('id')
    .single()

  if (upsertError) {
    console.error('upsert fail', nameEs, upsertError?.message)
    result.errors++
    continue
  }

  const exerciseId = inserted?.id || exerciseRow.id

  // muscles
  const muscleRows = []
  const primarySet = new Set(primarySlugs.map(mapMuscle))
  for (const slug of primarySlugs) {
    muscleRows.push({ exercise_id: exerciseId, muscle_slug: mapMuscle(slug), is_primary: true })
  }
  for (const slug of secondarySlugs) {
    const mg = mapMuscle(slug)
    if (primarySet.has(mg)) continue
    muscleRows.push({ exercise_id: exerciseId, muscle_slug: mg, is_primary: false })
  }
  // dedup by slug only (primary takes precedence)
  const uniq = []
  const seen = new Set()
  for (const r of muscleRows) {
    if (seen.has(r.muscle_slug)) continue
    seen.add(r.muscle_slug)
    uniq.push(r)
  }
  if (uniq.length > 0) {
    const { error: mErr } = await supabase.from('exercise_muscles').upsert(uniq, { onConflict: 'exercise_id,muscle_slug' })
    if (mErr) {
      // upsert on composite PK? constraint is unique(exercise_id,muscle_slug). If is_primary differs, conflict. Use delete+insert.
      await supabase.from('exercise_muscles').delete().eq('exercise_id', exerciseId)
      const { error: iErr } = await supabase.from('exercise_muscles').insert(uniq)
      if (iErr) console.error('muscles insert fail', nameEs, iErr?.message)
      else result.muscles += uniq.length
    } else {
      result.muscles += uniq.length
    }
  }

  result.imported++
  existingIds.add(repdbId)
  if ((i + 1) % 50 === 0) console.log('progress', i + 1, '/', exercises.length, result)
}

console.log('FINAL', result)
