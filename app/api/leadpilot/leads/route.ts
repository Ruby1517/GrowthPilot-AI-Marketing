import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import Lead from "@/models/Lead";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const u = new mongoose.Types.ObjectId((session.user as any).id);
  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format");

  await dbConnect();
  const items = await Lead.find({ userId: u }).sort({ createdAt: -1 }).lean();

  if (format === "csv") {
    const header = ["createdAt","playbook","site","name","email","company","phone","preferredTime","message","confidence"];
    const rows = items.map((x:any)=>[
      x.createdAt?.toISOString?.() || x.createdAt,
      x.playbook || "",
      x.site || "",
      (x.name||"").replace(/"/g,'""'),
      (x.email||"").replace(/"/g,'""'),
      (x.company||"").replace(/"/g,'""'),
      (x.phone||"").replace(/"/g,'""'),
      (x.preferredTime||"").replace(/"/g,'""'),
      (x.message||"").replace(/"/g,'""'),
      x.confidence ?? ""
    ]);
    const csv = [header.join(","), ...rows.map(r=>r.map(v=>`"${String(v)}"`).join(","))].join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="leads.csv"`,
      },
    });
  }

  return NextResponse.json({ items });
}
