import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import BrandDoc from "@/models/BrandDoc";
import User from "@/models/User";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { params: { id: string } };

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth().catch(() => null);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  await dbConnect();
  const me = await User.findOne({ email: session.user.email }).lean().catch(() => null);
  const orgId = (me as any)?.orgId;

  const doc = (await BrandDoc.findById(params.id).lean().catch(() => null)) as
    | (Record<string, any> & { orgId?: string; userId?: string })
    | null;
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const canDelete =
    (orgId && doc.orgId && String(doc.orgId) === String(orgId)) ||
    (doc.userId && String(doc.userId) === String(userId));
  if (!canDelete) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await BrandDoc.deleteOne({ _id: params.id });
  return NextResponse.json({ ok: true });
}
