
import Link from 'next/link';
import { getBaseUrl } from "@/lib/base-url";
import { cookies } from 'next/headers';


async function getDoc(id: string) {
  const base = getBaseUrl();
  const cookieHeader = cookies().toString();
  const r = await fetch(`${base}/api/blogpilot/${id}`, {
    cache: 'no-store',
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });
  if (!r.ok) return null;
  return r.json();
}
export default async function BlogView({ params }: { params: { id: string } }) {
  const data = await getDoc(params.id);
  if (!data) return <div className="card p-6">Not found</div>;

  return (
    <section className="relative overflow-hidden">
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">{data.meta?.title || '(untitled)'}</h1>
          <Link href="/blogpilot" className="btn-ghost">Back</Link>
        </div>
        <div className="mt-2 text-brand-muted text-sm">{new Date(data.createdAt).toLocaleString()}</div>

        <div className="mt-6">
          <h2 className="text-lg font-semibold">Draft (Markdown)</h2>
          <pre className="mt-2 whitespace-pre-wrap text-sm">{data.draft}</pre>
        </div>

        <div className="mt-6 grid md:grid-cols-2 gap-4">
          <div className="card p-4">
            <h3 className="font-semibold">Outline</h3>
            <ul className="mt-2 list-disc pl-6 text-sm">
              {data.outline?.map((o: string, i: number) => <li key={i}>{o}</li>)}
            </ul>
          </div>
          <div className="card p-4">
            <h3 className="font-semibold">Meta</h3>
            <div className="mt-2 text-sm"><span className="text-brand-muted">Title:</span> {data.meta?.title}</div>
            <div className="mt-1 text-sm"><span className="text-brand-muted">Description:</span> {data.meta?.description}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
