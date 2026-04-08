import { NextRequest } from "next/server";
import { getStudent } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const student = await getStudent();
  if (!student) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const project = await db.project.findUnique({ where: { id: params.id } });
  if (!project || project.studentId !== student.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  await db.project.update({
    where: { id: params.id },
    data: { deployStatus: "IDLE" },
  });

  return Response.json({ ok: true });
}
