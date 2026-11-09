import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const WGER_BASE = 'https://wger.de/api/v2/exerciseinfo/'
const PAGE_SIZE = 100
const BUCKET = 'exercise-photos'
const HEADERS = { 'User-Agent': 'GymProgress/1.0', 'Accept': 'application/json' }

const MUSCLE_MAP: Record<string, string> = {
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

function mapMuscle(muscleEn: string, category: string): string {
  const m = (muscleEn || '').toLowerCase()
  for (const key of Object.keys(MUSCLE_MAP)) {
    if (m.includes(key)) return MUSCLE_MAP[key]
  }
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

function normalizeName(name: string): string {
  return name.trim().toLowerCase()
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  const { data: existingRows } = await supabase
    .from('exercises')
    .select('id, name, external_source, external_id')
    .eq('is_global', true)

  const existingWgerIds = new Set(
    (existingRows || [])
      .filter((r: any) => r.external_source === 'wger')
      .map((r: any) => String(r.external_id)),
  )
  const existingNames = new Set(
    (existingRows || []).map((r: any) => normalizeName(String(r.name))),
  )

  const result = { imported: 0, withImage: 0, withoutImage: 0, skipped: 0, errors: 0 }

  let nextUrl: string | null = `${WGER_BASE}?limit=${PAGE_SIZE}`

  while (nextUrl) {
    let json: any
    try {
      const res = await fetch(nextUrl, { headers: HEADERS })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      json = await res.json()
    } catch (e) {
      console.error('wger fetch error', e)
      result.errors++
      break
    }

    const items = json.results || []
    for (const ex of items) {
      const translations = ex.translations || []
      const esTrans = translations.find((t: any) => t.language === 4)
      const name = (esTrans?.name as string | undefined)?.trim()
      if (!name) {
        result.skipped++
        continue
      }
      const wgerId = String(ex.id)
      if (existingWgerIds.has(wgerId)) {
        result.skipped++
        continue
      }
      const norm = normalizeName(name)
      if (existingNames.has(norm)) {
        result.skipped++
        continue
      }

      const muscles = ex.muscles || []
      const muscle = muscles[0]
      const muscleEn = (muscle?.name_en as string) || ''
      const category = (ex.category?.name as string) || ''
      const muscleGroup = mapMuscle(muscleEn, category)

      let imageUrl: string | undefined
      const images = ex.images || []
      const img = images.find((i: any) => i.is_main) || images[0]
      const imgUrl = img?.image as string | undefined
      if (imgUrl) {
        try {
          const imgRes = await fetch(imgUrl, { headers: HEADERS })
          if (!imgRes.ok) throw new Error(`HTTP ${imgRes.status}`)
          const buf = await imgRes.arrayBuffer()
          const bytes = new Uint8Array(buf)
          const ext = imgUrl.split('.').pop()?.toLowerCase() || 'webp'
          const safeExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'webp'
          const path = `global/wger-${wgerId}.${safeExt}`
          const contentType = imgRes.headers.get('content-type') || 'image/webp'
          const { error: uploadError } = await supabase.storage
            .from(BUCKET)
            .upload(path, bytes, { contentType, upsert: true })
          if (uploadError) throw uploadError
          imageUrl = path
          result.withImage++
        } catch (e) {
          console.error('image upload failed', wgerId, e)
          result.withoutImage++
        }
      } else {
        result.withoutImage++
      }

      const exerciseId = crypto.randomUUID()
      const now = new Date().toISOString()
      const { error: upsertError } = await supabase
        .from('exercises')
        .upsert(
          {
            id: exerciseId,
            user_id: null,
            name,
            muscle_group: muscleGroup,
            image_url: imageUrl,
            is_global: true,
            external_source: 'wger',
            external_id: wgerId,
            created_at: now,
            updated_at: now,
          },
          { onConflict: 'external_source,external_id' },
        )

      if (upsertError) {
        const msg = upsertError?.message || ''
        if (msg.includes('duplicate key') || msg.includes('unique')) {
          result.skipped++
          continue
        }
        console.error('upsert error', name, msg)
        result.errors++
        continue
      }

      result.imported++
      existingWgerIds.add(wgerId)
      existingNames.add(norm)
    }

    nextUrl = json.next || null
  }

  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' },
  })
})
