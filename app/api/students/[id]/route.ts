import { getTeacher } from "@/lib/auth";
import { db } from "@/lib/db";

async function resolveStudent(studentId: string, teacherId: string) {
  return db.student.findFirst({
    where: { id: studentId, class: { teacherId } },
  });
}

// PATCH /api/students/[id] — { suspended: boolean }
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const teacher = await getTeacher();
  if (!teacher) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const student = await resolveStudent(params.id, teacher.id);
  if (!student) return Response.json({ error: "Not found" }, { status: 404 });

  const { suspended } = await req.json();
  if (typeof suspended !== "boolean") {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  await db.student.update({
    where: { id: params.id },
    data: {
      suspended,
      // Clear session token so a suspended student is immediately logged out
      ...(suspended ? { sessionToken: null } : {}),
    },
  });

  return Response.json({ ok: true });
}

// DELETE /api/students/[id] — remove student + their projects
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const teacher = await getTeacher();
  if (!teacher) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const student = await resolveStudent(params.id, teacher.id);
  if (!student) return Response.json({ error: "Not found" }, { status: 404 });

  await db.project.deleteMany({ where: { studentId: params.id } });
  await db.student.delete({ where: { id: params.id } });

  return Response.json({ ok: true });
}
