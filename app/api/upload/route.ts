import { NextRequest } from "next/server";
import { getStudent, getTeacher } from "@/lib/auth";
import { uploadAsset } from "@/lib/github";
import { randomUUID } from "crypto";

// Max 4 MB
const MAX_BYTES = 4 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const student = await getStudent();
  const teacher = await getTeacher();
  if (!student && !teacher) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { filename, contentBase64 } = await req.json();
  if (!filename || !contentBase64) {
    return Response.json({ error: "filename and contentBase64 required" }, { status: 400 });
  }

  // Rough size check (base64 is ~4/3 of original)
  if (contentBase64.length > MAX_BYTES * 1.4) {
    return Response.json({ error: "File too large (max 4 MB)" }, { status: 413 });
  }

  // Sanitise filename and make it unique
  const ext = filename.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ?? "bin";
  const safeName = `${randomUUID()}.${ext}`;

  const url = await uploadAsset(safeName, contentBase64);
  return Response.json({ url });
}
