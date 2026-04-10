import { NextRequest } from "next/server";
import { getStudent } from "@/lib/auth";

export const maxDuration = 60;
import { db } from "@/lib/db";
import { buildRepoName, createStudentRepo, pushCode } from "@/lib/github";
import { deployToVercel } from "@/lib/vercel";

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

  // Use existing repo name if a previous attempt already created it
  const repoName = project.githubRepo ?? buildRepoName(student.displayName, project.name);

  try {
    // 1. Create GitHub repo (idempotent — returns existing URL if already exists)
    await createStudentRepo(repoName);
    await new Promise((r) => setTimeout(r, 2000)); // wait for GitHub init
    await pushCode(repoName, code);

    // 2. Deploy directly to Vercel (no GitHub integration needed)
    const { projectId: vercelProjectId, deployUrl, deploymentId } =
      await deployToVercel(repoName, code);

    // 3. Save to DB
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

    return Response.json({ ok: true, deployUrl, vercelProjectId, deploymentId });
  } catch (err) {
    await db.project.update({ where: { id: projectId }, data: { deployStatus: "ERROR" } });
    const message = err instanceof Error ? err.message : "Deploy failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
