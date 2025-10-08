// app/api/brandpilot/guide/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import BrandDoc from "@/models/BrandDoc";
import { s3, S3_BUCKET } from "@/lib/s3";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

/** Utility: fetch an S3 object as Uint8Array (or null if missing) */
async function getS3Bytes(key: string): Promise<Uint8Array | null> {
  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }));
    const buf = await res.Body?.transformToByteArray();
    return buf ?? null;
  } catch {
    return null;
  }
}

/** Utility: draw a text line (handles simple wrapping by width) */
function drawWrappedText(opts: {
  page: any;
  text: string;
  x: number;
  y: number;
  size: number;
  lineHeight?: number;
  maxWidth: number;
  font: any;
  color?: { r: number; g: number; b: number };
}) {
  const { page, text, x, y, size, lineHeight = size * 1.3, maxWidth, font, color = rgb(1, 1, 1) } = opts;
  const words = text.split(/\s+/);
  let line = "";
  let curY = y;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    const width = font.widthOfTextAtSize(test, size);
    if (width > maxWidth && line) {
      page.drawText(line, { x, y: curY, size, font, color });
      curY -= lineHeight;
      line = w;
    } else {
      line = test;
    }
  }
  if (line) {
    page.drawText(line, { x, y: curY, size, font, color });
  }
  return curY;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await dbConnect();
  const doc = await BrandDoc.findById(id);
  if (!doc) return NextResponse.json({ error: "not found" }, { status: 404 });

  // Create PDF
  const pdf = await PDFDocument.create();
  const helv = await pdf.embedFont(StandardFonts.Helvetica);
  const helvBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  // Colors
  const bg = rgb(0.06, 0.06, 0.09);
  const fg = rgb(1, 1, 1);
  const sub = rgb(0.75, 0.75, 0.8);
  const gold = rgb(0.83, 0.77, 0.45);

  // PAGE 1: Title + Palette
  {
    const page = pdf.addPage([612, 792]); // Letter portrait
    page.drawRectangle({ x: 0, y: 0, width: 612, height: 792, color: bg });

    page.drawText("Brand Style Guide", { x: 48, y: 740, size: 24, font: helvBold, color: fg });
    page.drawText(doc.company || "—", { x: 48, y: 708, size: 18, font: helv, color: gold });
    page.drawText(`Vibe: ${doc.vibe || "-"}`, { x: 48, y: 680, size: 12, font: helv, color: sub });

    // Palette
    page.drawText("Palette", { x: 48, y: 640, size: 16, font: helvBold, color: fg });

    const palette: string[] = Array.isArray(doc.palette) ? doc.palette : [];
    const sw = 84, sh = 84, gap = 14;
    let px = 48, py = 540;

    if (palette.length === 0) {
      page.drawText("No palette yet — generate the kit first.", { x: 48, y: 610, size: 12, font: helv, color: sub });
    } else {
      for (let i = 0; i < palette.length; i++) {
        if (i > 0 && i % 6 === 0) {
          px = 48;
          py -= sh + 40;
        }
        const hex = palette[i];
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        page.drawRectangle({ x: px, y: py, width: sw, height: sh, color: rgb(r || 0, g || 0, b || 0) });
        page.drawText(hex, { x: px, y: py - 14, size: 10, font: helv, color: sub });
        px += sw + gap;
      }
    }
  }

  // PAGE 2: Fonts + Voice
  {
    const page = pdf.addPage([612, 792]);
    page.drawRectangle({ x: 0, y: 0, width: 612, height: 792, color: bg });

    page.drawText("Typography", { x: 48, y: 740, size: 18, font: helvBold, color: fg });
    const fonts: string[] = Array.isArray(doc.fonts) ? doc.fonts : [];
    if (fonts.length === 0) {
      page.drawText("No font pairings yet — generate the kit first.", { x: 48, y: 712, size: 12, font: helv, color: sub });
    } else {
      let y = 712;
      for (const f of fonts) {
        page.drawText(`• ${f}`, { x: 48, y, size: 12, font: helv, color: fg });
        y -= 18;
      }
    }

    page.drawText("Voice & Tone", { x: 48, y: 660, size: 18, font: helvBold, color: fg });
    const voice: string[] = Array.isArray(doc.voice) ? doc.voice : [];
    if (voice.length === 0) {
      page.drawText("No voice/tone yet — generate the kit first.", { x: 48, y: 632, size: 12, font: helv, color: sub });
    } else {
      let y = 632;
      for (const v of voice) {
        const tailY = drawWrappedText({
          page,
          text: `• ${v}`,
          x: 48,
          y,
          size: 12,
          font: helv,
          maxWidth: 516,
          color: fg,
        });
        y = tailY - 14;
      }
    }
  }

  // PAGE 3: Social Presets (if any)
  {
    const imgs = (doc.images || []) as Array<{ type?: string; key?: string }>;
    if (imgs.length > 0) {
      const page = pdf.addPage([612, 792]);
      page.drawRectangle({ x: 0, y: 0, width: 612, height: 792, color: bg });
      page.drawText("Social Presets", { x: 48, y: 740, size: 18, font: helvBold, color: fg });

      let x = 48, y = 620;
      const maxW = 240, maxH = 240, gap = 24;

      for (const it of imgs) {
        if (!it?.key) continue;
        const bytes = await getS3Bytes(it.key);
        if (!bytes) continue;

        // Try PNG first, then JPEG
        let embedded;
        try {
          embedded = await pdf.embedPng(bytes);
        } catch {
          try {
            embedded = await pdf.embedJpg(bytes);
          } catch {
            embedded = null;
          }
        }
        if (!embedded) continue;

        const { width, height } = embedded.scale(1);
        const scale = Math.min(maxW / width, maxH / height);
        const w = width * scale;
        const h = height * scale;

        page.drawImage(embedded, { x, y, width: w, height: h });
        page.drawText(it.type || "", { x, y: y - 14, size: 12, font: helv, color: sub });

        x += maxW + gap;
        if (x + maxW > 612 - 48) {
          x = 48;
          y -= maxH + 80;
        }
      }
    }
  }

  const bytes = await pdf.save();
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${(doc.company || "brand")}-style-guide.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
