import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const BUCKET = 'exercise-photos'
const HEADERS = { 'User-Agent': 'GymProgress/1.0', 'Accept': 'application/json' }

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })

  const { data: exercises, error: fetchError } = await supabase
    .from('exercises')
    .select('id, external_id, image_url')
    .eq('is_global', true)
    .eq('external_source', 'wger')

  if (fetchError) {
    return new Response(JSON.stringify({ error: fetchError.message }), { status: 500 })
  }

  const result = { total: exercises?.length || 0, repaired: 0, alreadyOk: 0, noImage: 0, errors: 0 }

  for (const ex of exercises || []) {
    const wgerId = ex.external_id
    if (!wgerId) { result.errors++; continue }

    // Check if current image file exists in storage
    if (ex.image_url) {
      const { data: fileData, error: fileError } = await supabase.storage
        .from(BUCKET)
        .download(ex.image_url)
      if (!fileError && fileData) {
        result.alreadyOk++
        continue
      }
    }

    // Fetch wger exercise
    let wgerEx: any
    try {
      const res = await fetch(`https://wger.de/api/v2/exerciseinfo/${wgerId}/`, { headers: HEADERS })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      wgerEx = await res.json()
    } catch (e) {
      console.error('wger fetch failed', wgerId, e)
      result.errors++
      continue
    }

    const images = wgerEx?.images || []
    const img = images.find((i: any) => i.is_main) || images[0]
    const imgUrl = img?.image as string | undefined
    if (!imgUrl) {
      // No image available: clear stale path
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
      const safeExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'webp'
      const path = `global/wger-${wgerId}.${safeExt}`
      const contentType = imgRes.headers.get('content-type') || 'image/webp'
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, bytes, { contentType, upsert: true })
      if (uploadError) throw uploadError
      const { error: updateError } = await supabase
        .from('exercises')
        .update({ image_url: path })
        .eq('id', ex.id)
      if (updateError) throw updateError
      result.repaired++
    } catch (e) {
      console.error('repair failed', wgerId, e)
      result.errors++
    }
  }

  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' },
  })
})
