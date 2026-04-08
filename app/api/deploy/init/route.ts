import { NextRequest } from "next/server";
import { getStudent } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildRepoName, createStudentRepo, pushCode } from "@/lib/github";
import { createVercelProject } from "@/lib/vercel";

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

  const repoName = buildRepoName(student.displayName, project.name);

  try {
    // 1. Create GitHub repo
    await createStudentRepo(repoName);

    // 2. Small delay to let GitHub initialize the repo
    await new Promise((r) => setTimeout(r, 2000));

    // 3. Push index.html
    await pushCode(repoName, code);

    // 4. Create Vercel project linked to GitHub repo
    const { projectId: vercelProjectId, deployUrl } = await createVercelProject(repoName);

    // 5. Save to DB
    await db.project.update({
      where: { id: projectId },
      data: {
        currentCode: code,
        deployStatus: "BUILDING",
        githubRepo: repoName,
        vercelProjectId,
        deployUrl,
        iterationCount: 1,
      },
    });

    return Response.json({ ok: true, deployUrl, vercelProjectId });
  } catch (err) {
    await db.project.update({ where: { id: projectId }, data: { deployStatus: "ERROR" } });
    const message = err instanceof Error ? err.message : "Deploy failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
