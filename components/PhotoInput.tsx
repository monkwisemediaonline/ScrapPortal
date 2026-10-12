'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PHOTO_BUCKET } from '@/lib/config'

/** Uploads images straight to Supabase Storage and submits their public URLs as hidden inputs. */
export default function PhotoInput({
  name = 'photos',
  label,
  uploadingLabel,
  max = 6,
}: {
  name?: string
  label: string
  uploadingLabel: string
  max?: number
}) {
  const [urls, setUrls] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function onFiles(files: FileList | null) {
    if (!files?.length) return
    setBusy(true)
    setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setBusy(false)
      return
    }
    const added: string[] = []
    for (const file of Array.from(files).slice(0, max - urls.length)) {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`
      const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, file, { contentType: file.type })
      if (error) {
        setError(error.message)
        continue
      }
      added.push(supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl)
    }
    setUrls((u) => [...u, ...added])
    setBusy(false)
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {urls.map((u) => (
          <div key={u} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={u} alt="" className="size-20 rounded-lg object-cover border border-line" />
            <button
              type="button"
              aria-label="Remove photo"
              onClick={() => setUrls((x) => x.filter((v) => v !== u))}
              className="absolute -top-2 -right-2 size-6 rounded-full bg-steel text-white text-xs"
            >
              ×
            </button>
            <input type="hidden" name={name} value={u} />
          </div>
        ))}
        {urls.length < max && (
          <label className="size-20 rounded-lg border border-dashed border-line grid place-items-center text-xs text-muted text-center cursor-pointer hover:bg-white p-1">
            {busy ? uploadingLabel : `+ ${label}`}
            <input type="file" accept="image/*" multiple className="sr-only" disabled={busy} onChange={(e) => onFiles(e.target.files)} />
          </label>
        )}
      </div>
      {error && <p className="text-sm text-down mt-1">{error}</p>}
    </div>
  )
}
