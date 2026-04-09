import { NextRequest } from "next/server";
import { getStudent, getTeacher } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteRepo } from "@/lib/github";
import { deleteVercelProject } from "@/lib/vercel";

async function resolveAccess(projectId: string) {
  const student = await getStudent();
  const teacher = await getTeacher();
  if (!student && !teacher) return { project: null, authorized: false };

  const project = await db.project.findUnique({
    where: { id: projectId },
    include: { student: { include: { class: true } } },
  });
  if (!project) return { project: null, authorized: false };

  if (student) {
    return { project, authorized: project.studentId === student.id };
  }
  // teacher: must own the class
  return { project, authorized: project.student.class.teacherId === teacher!.id };
}

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

  if (student && project.studentId !== student.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!student && !teacher) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return Response.json(project);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { project, authorized } = await resolveAccess(params.id);
  if (!project) return Response.json({ error: "Not found" }, { status: 404 });
  if (!authorized) return Response.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();

  // Build only the fields that were actually provided
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) {
    if (!body.name?.trim()) return Response.json({ error: "Name required" }, { status: 400 });
    data.name = body.name.trim().slice(0, 50);
  }
  if (body.currentCode !== undefined) data.currentCode = body.currentCode;

  if (Object.keys(data).length === 0) {
    return Response.json({ error: "Nothing to update" }, { status: 400 });
  }

  const updated = await db.project.update({ where: { id: params.id }, data });
  return Response.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { project, authorized } = await resolveAccess(params.id);
  if (!project) return Response.json({ error: "Not found" }, { status: 404 });
  if (!authorized) return Response.json({ error: "Forbidden" }, { status: 403 });

  // Clean up GitHub repo and Vercel project before removing DB record
  await Promise.all([
    project.githubRepo ? deleteRepo(project.githubRepo) : Promise.resolve(),
    project.vercelProjectId ? deleteVercelProject(project.vercelProjectId) : Promise.resolve(),
  ]);

  await db.project.delete({ where: { id: params.id } });
  return Response.json({ ok: true });
}
