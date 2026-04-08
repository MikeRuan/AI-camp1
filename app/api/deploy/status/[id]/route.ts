import { NextRequest } from "next/server";
import { getStudent } from "@/lib/auth";
import { db } from "@/lib/db";
import { getDeploymentStatus } from "@/lib/vercel";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const student = await getStudent();
  if (!student) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const project = await db.project.findUnique({ where: { id: params.id } });
  if (!project || project.studentId !== student.id) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  if (!project.vercelProjectId) {
    return Response.json({ status: project.deployStatus, url: project.deployUrl });
  }

  try {
    const { status, url } = await getDeploymentStatus(project.vercelProjectId);

    // Update DB if status changed
    if (status !== project.deployStatus) {
      await db.project.update({
        where: { id: params.id },
        data: {
          deployStatus: status,
          ...(url ? { deployUrl: url } : {}),
        },
      });
    }

    return Response.json({ status, url: url ?? project.deployUrl });
  } catch {
    return Response.json({ status: project.deployStatus, url: project.deployUrl });
  }
}
