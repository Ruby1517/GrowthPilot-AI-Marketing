'use client'
import { useState } from 'react'

type UploadComplete = {
  key: string
  url?: string
  assetId?: string
}
export default function Uploader({ 
  projectId,
  onComplete,
 }: { 
  projectId?: string,
  onComplete?: (v: UploadComplete) => void
 }) {
  const [progress, setProgress] = useState(0)
  const [err, setErr] = useState<string | null>(null)

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    setErr(null)
    const file = e.target.files?.[0]
    if (!file) return

    // 1) Ask server for a presigned URL
    const presignRes = await fetch('/api/upload/s3', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        filename: file.name,
        size: file.size,
        projectId,
        kind:
          file.type.startsWith('image/') ? 'image' :
          file.type.startsWith('video/') ? 'video' :
          file.type.startsWith('audio/') ? 'audio' : 'doc',
        contentType: file.type,
      }),
    })

    if (!presignRes.ok) {
      setErr(`Presign failed: ${await presignRes.text()}`)
      return
    }
    const { url, key, requiredHeaders, assetId } = await presignRes.json()

    // ✅ Guard: ensure we got a full S3 URL
    if (typeof url !== 'string' || !url.startsWith('http')) {
      setErr('Invalid presigned URL returned by server.')
      return
    }
    console.debug('Presigned URL:', url)

    // 2) Upload directly to S3 with fetch (no navigation)
    const putRes = await fetch(url, {
      method: 'PUT',
      body: file,
      headers: requiredHeaders,
    })
    if (!putRes.ok) {
      const text = await putRes.text().catch(() => '')
      setErr(`S3 PUT failed: ${putRes.status} ${text.slice(0, 200)}`)
      return key
    }

    // 3) Mark uploaded in your API (optional)
    await fetch('/api/assets/complete', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ assetId, key }),
    })

    onComplete?.({ key, url, assetId });

    setProgress(100)
    alert('Uploaded!')
  }

  return (
    <div className="space-y-3">
      <input type="file" onChange={onFile} />
      {progress > 0 && <div className="text-sm">Uploading… {progress}%</div>}
      {err && <div className="text-sm text-red-400">{err}</div>}
    </div>
  )
}
