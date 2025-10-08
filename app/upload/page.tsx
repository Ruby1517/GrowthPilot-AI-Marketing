'use client'
import Uploader from '@/components/Uploader'

export default function UploadPage() {
  return (
    <div className="p-6">
      <div className="card p-6 max-w-2xl">
        <h1 className="text-xl font-semibold">Upload a file</h1>
        <p className="text-sm text-brand-muted mt-1">
          Images, videos, audio, or docs. Max {process.env.UPLOAD_MAX_MB ?? '100'}MB (dev).
        </p>
        <div className="mt-4">
          <Uploader />
        </div>
      </div>
    </div>
  )
}
