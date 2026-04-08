import { NextRequest } from "next/server";
import { getStudent, getTeacher } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const student = await getStudent();
  const teacher = await getTeacher();

  const project = await db.project.findUnique({
    where: { id: params.id },
    include: { student: { select: { displayName: true } } },
  });

  if (!project) return Response.json({ error: "Not found" }, { status: 404 });

  // Students can only see their own projects
  if (student && project.studentId !== student.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!student && !teacher) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return Response.json(project);
}
