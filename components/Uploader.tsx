'use client'
import { useRef, useState } from 'react'

type UploadComplete = {
  key: string
  url?: string        // public GET url (if available)
  assetId?: string
  publicUrl?: string  // explicitly expose for callers that need it
}

export default function Uploader({
  projectId,
  onComplete,
}: {
  projectId?: string
  onComplete?: (v: UploadComplete) => void
}) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [progress, setProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [fileName, setFileName] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function handleFile(file: File) {
    setErr(null)
    setMessage(null)
    setProgress(0)
    setUploading(true)
    setFileName(file.name)
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
      setUploading(false)
      return
    }
    const { url: uploadUrl, key, requiredHeaders, assetId, publicUrl } = await presignRes.json()

    if (typeof uploadUrl !== 'string' || !uploadUrl.startsWith('http')) {
      setErr('Invalid presigned URL returned by server.')
      setUploading(false)
      return
    }

    try {
      await uploadToS3(uploadUrl, file, requiredHeaders || {}, (pct) => setProgress(pct))
    } catch (e: any) {
      setErr(e?.message || 'Upload failed')
      setUploading(false)
      return
    }

    // 3) Mark uploaded in your API
    const completeRes = await fetch('/api/assets/complete', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ assetId, key, status: 'ready' }),
    })
    if (!completeRes.ok) {
      setErr(`Complete failed: ${await completeRes.text()}`)
      setUploading(false)
      return
    }

    setProgress(100)
    setUploading(false)
    setMessage('Upload complete')
    onComplete?.({
      key,
      url: publicUrl,
      publicUrl,
      assetId,
    })
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    await handleFile(file)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        className="btn-gold"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? 'Uploading…' : 'Upload video'}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={onFile}
      />

      {fileName && (
        <div className="text-xs text-brand-muted">
          {fileName}
        </div>
      )}

      {uploading && (
        <div className="w-full rounded-md bg-white/10 h-2 overflow-hidden">
          <div
            className="h-2 bg-green-500 transition-all duration-200"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      )}
      {!uploading && progress === 100 && message && (
        <div className="text-xs text-green-400">{message}</div>
      )}
      {err && <div className="text-sm text-red-400">{err}</div>}
    </div>
  )
}

async function uploadToS3(
  url: string,
  file: File,
  headers: Record<string, string>,
  onProgress: (pct: number) => void,
) {
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    Object.entries(headers || {}).forEach(([k, v]) => xhr.setRequestHeader(k, v))
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return
      const pct = Math.round((event.loaded / event.total) * 100)
      onProgress(pct)
    }
    xhr.onerror = () => reject(new Error('Network error while uploading to storage'))
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve()
      } else {
        reject(new Error(`S3 PUT failed: ${xhr.status}`))
      }
    }
    xhr.send(file)
  })
}
