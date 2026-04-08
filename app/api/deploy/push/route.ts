import { NextRequest } from "next/server";
import { getStudent } from "@/lib/auth";
import { db } from "@/lib/db";
import { pushCode } from "@/lib/github";

export async function POST(req: NextRequest) {
  const student = await getStudent();
  if (!student) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, code } = await req.json();
  if (!projectId || !code) {
    return Response.json({ error: "projectId and code required" }, { status: 400 });
  }

  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project || project.studentId !== student.id) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  if (!project.githubRepo) {
    return Response.json({ error: "Project not initialized" }, { status: 400 });
  }

  try {
    await pushCode(project.githubRepo, code);

    await db.project.update({
      where: { id: projectId },
      data: {
        currentCode: code,
        deployStatus: "BUILDING",
        iterationCount: { increment: 1 },
      },
    });

    return Response.json({ ok: true });
  } catch (err) {
    await db.project.update({ where: { id: projectId }, data: { deployStatus: "ERROR" } });
    const message = err instanceof Error ? err.message : "Push failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
