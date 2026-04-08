import { NextRequest } from "next/server";
import { getStudent } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateCode } from "@/lib/claude";

export async function POST(req: NextRequest) {
  const student = await getStudent();
  if (!student) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, prompt } = await req.json();
  if (!projectId || !prompt) {
    return Response.json({ error: "projectId and prompt required" }, { status: 400 });
  }

  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project || project.studentId !== student.id) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  // Update status to building
  await db.project.update({
    where: { id: projectId },
    data: { deployStatus: "BUILDING", currentPrompt: prompt },
  });

  const stream = await generateCode(prompt, project.currentCode ?? undefined);
  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "X-Project-Id": projectId,
    },
  });
}
