'use client'

import imageCompression from 'browser-image-compression'
import { createClient } from '@/lib/supabase/client'

const COMPRESSION_OPTIONS = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  fileType: 'image/webp' as const,
}

export async function compressAndUploadImage(
  file: File,
  userId: string,
  tradeId: string
): Promise<string> {
  const compressed = await imageCompression(file, COMPRESSION_OPTIONS)

  const ext = 'webp'
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const path = `${userId}/${tradeId}/${filename}`

  const supabase = createClient()
  const { error } = await supabase.storage
    .from('trade-screenshots')
    .upload(path, compressed, { contentType: 'image/webp', upsert: false })

  if (error) throw new Error(`העלאת תמונה נכשלה: ${error.message}`)

  const { data } = supabase.storage.from('trade-screenshots').getPublicUrl(path)
  return data.publicUrl
}

export async function deleteUploadedImage(url: string): Promise<void> {
  const supabase = createClient()
  // Extract storage path from public URL: everything after /trade-screenshots/
  const marker = '/trade-screenshots/'
  const idx = url.indexOf(marker)
  if (idx === -1) return
  const path = url.slice(idx + marker.length)
  await supabase.storage.from('trade-screenshots').remove([path])
}
