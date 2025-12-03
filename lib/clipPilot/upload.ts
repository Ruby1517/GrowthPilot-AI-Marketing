// lib/clippilot/upload.ts
import formidable from "formidable";
import fs from "fs";
import path from "path";
import { NextRequest } from "next/server";

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function parseVideoUpload(req: NextRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    const form = formidable({
      multiples: false,
      keepExtensions: true,
    });
    // formidable types don't surface uploadDir; set via cast
    (form as any).uploadDir = "/tmp";

    // @ts-expect-error – formidable expects a Node request
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);

      const file = files.video as any;
      if (!file || !file.filepath) {
        return reject(new Error("No video file uploaded"));
      }

      const tempPath = file.filepath as string;
      const ext = path.extname(file.originalFilename || ".mp4");
      const targetPath = path.join("/tmp", `clippilot-${Date.now()}${ext}`);

      fs.rename(tempPath, targetPath, (renameErr) => {
        if (renameErr) return reject(renameErr);
        resolve(targetPath);
      });
    });
  });
}
