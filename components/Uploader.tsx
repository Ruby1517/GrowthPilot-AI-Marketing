'use client'
import { useRef, useState } from 'react'

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
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  async function handleFile(file: File) {
    setErr(null)
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
      body: JSON.stringify({ assetId, key, status: 'ready' }),
    })

    onComplete?.({ key, url, assetId });

    setProgress(100)
    alert('Uploaded!')
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    await handleFile(file)
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      void handleFile(file)
    }
  }

  return (
    <div className="space-y-3">
      <div
        className={`rounded-md border p-6 text-sm text-center cursor-pointer select-none transition ${
          dragActive ? 'bg-black/5 dark:bg-white/5' : 'hover:bg-black/5 dark:hover:bg-white/5'
        }`}
        onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); }}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); }}
        onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); }}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
      >
        <div className="mb-2 font-medium">Drag and drop to upload</div>
        <div className="text-xs text-brand-muted">or click to select a video file</div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={onFile}
      />

      {progress > 0 && <div className="text-sm">Uploading… {progress}%</div>}
      {err && <div className="text-sm text-red-400">{err}</div>}
    </div>
  )
}
