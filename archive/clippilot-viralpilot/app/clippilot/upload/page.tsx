// // app/clips/upload/page.tsx
// 'use client';

// import { useState } from 'react';

// type PresignResp = {
//   url?: string;            // some backends use `url`
//   uploadUrl?: string;      // others use `uploadUrl`
//   key: string;
//   bucket: string;
//   region: string;
// };

// export default function ClipUploadPage() {
//   const [file, setFile] = useState<File | null>(null);
//   const [busy, setBusy] = useState(false);
//   const [msg, setMsg] = useState<string | null>(null);
//   const [jobId, setJobId] = useState<string | null>(null);

//   async function getPresign(f: File): Promise<PresignResp> {
//     const r = await fetch('/api/upload/s3', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({
//         // must match your server validator (Zod) keys:
//         filename: f.name,
//         size: f.size,
//         // optional but recommended:
//         contentType: f.type,
//         folder: 'video', // keeps keys under .../video/...
//       }),
//     });
//     if (!r.ok) throw new Error(await r.text());
//     return r.json();
//   }

//   async function handleUpload() {
//     if (!file) return;
//     setBusy(true);
//     setMsg('Requesting upload URL…');

//     try {
//       const prep = await getPresign(file);
//       const putUrl = (prep.url ?? prep.uploadUrl)!;

//       setMsg('Uploading to S3…');
//       const put = await fetch(putUrl, {
//         method: 'PUT',
//         // IMPORTANT: only include headers that were used when presigning.
//         // If your presign included Content-Type, keep this header here.
//         headers: { 'Content-Type': file.type },
//         body: file,
//       });
//       if (!put.ok) throw new Error('S3 upload failed');

//       setMsg('Creating ClipPilot job…');
//       const create = await fetch('/api/clippilot/create', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           bucket: prep.bucket,
//           region: prep.region,
//           key: prep.key,
//           contentType: file.type,
//           // optional tuning:
//           // maxClips: 6, minClipSec: 20, maxClipSec: 60,
//         }),
//       });
//       if (!create.ok) throw new Error(await create.text());
//       const { id } = await create.json();
//       setJobId(id);
//       setMsg('Job created! Go to Clips to track progress.');
//     } catch (e: any) {
//       console.error(e);
//       setMsg(e?.message ?? 'Upload failed');
//     } finally {
//       setBusy(false);
//     }
//   }

//   return (
//     <section className="relative overflow-hidden">
//       <div className="card p-8 md:p-12">
//         <span className="badge mb-4">ClipPilot</span>
//         <h1 className="text-3xl md:text-4xl font-semibold leading-tight">
//           Upload a long video <span className="text-[color:var(--gold,theme(colors.brand.gold))]">to auto-clip</span>
//         </h1>
//         <p className="mt-3 max-w-2xl text-brand-muted">
//           We’ll transcribe, detect highlights, create subtitles, and produce 9:16 & 1:1 clips with burned captions.
//         </p>

//         <div className="mt-6 grid gap-3 md:grid-cols-[1fr_auto]">
//           <input
//             type="file"
//             accept="video/*"
//             onChange={(e) => setFile(e.target.files?.[0] || null)}
//             className="h-11 px-3 rounded-md border w-full outline-none focus:ring"
//           />
//           <button className="btn-gold" onClick={handleUpload} disabled={!file || busy}>
//             {busy ? 'Uploading…' : 'Start Job'}
//           </button>
//         </div>

//         {msg && <div className="mt-4 rounded-md border px-3 py-2 text-sm bg-black-50">{msg}</div>}

//         <div className="mt-6 flex gap-3">
//           <a href="/clippilot" className="btn-ghost">View All Jobs</a>
//           {jobId && <a href={`/clippilot?focus=${jobId}`} className="btn-ghost">Open This Job</a>}
//         </div>
//       </div>
//     </section>
//   );
// }


// app/upload/page.tsx
'use client';

import { useState } from 'react';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setErr(null); setUrl(null);
    // Replace with your S3 signed-upload flow
    const form = new FormData();
    form.set('file', file);
    const r = await fetch('/api/upload', { method: 'POST', body: form });
    const j = await r.json();
    if (!r.ok) setErr(j?.error || 'Upload failed');
    else setUrl(j.url);
  }

  return (
    <section className="p-6 space-y-4 max-w-2xl">
      <h1 className="text-2xl font-semibold">Upload</h1>
      <form onSubmit={onUpload} className="card p-6 space-y-3">
        <input type="file" onChange={(e)=>setFile(e.target.files?.[0] || null)} />
        <button className="btn-gold">Upload</button>
      </form>
      {url && <div className="text-sm">Uploaded: <a className="underline" href={url} target="_blank">{url}</a></div>}
      {err && <div className="text-sm text-red-400">{err}</div>}
    </section>
  );
}
