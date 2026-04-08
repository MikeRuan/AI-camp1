import { NextRequest } from "next/server";
import { getStudent, getTeacher } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  // Teachers see all projects; students see their own
  const teacher = await getTeacher();
  if (teacher) {
    const projects = await db.project.findMany({
      where: { student: { class: { teacherId: teacher.id } } },
      include: { student: { select: { displayName: true, class: { select: { name: true } } } } },
      orderBy: { updatedAt: "desc" },
    });
    return Response.json(projects);
  }

  const student = await getStudent();
  if (!student) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const projects = await db.project.findMany({
    where: { studentId: student.id },
    orderBy: { updatedAt: "desc" },
  });
  return Response.json(projects);
}

export async function POST(req: NextRequest) {
  const student = await getStudent();
  if (!student) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await req.json();
  if (!name) return Response.json({ error: "Project name required" }, { status: 400 });

  const project = await db.project.create({
    data: { name: name.trim().slice(0, 50), studentId: student.id },
  });

  return Response.json(project, { status: 201 });
}
