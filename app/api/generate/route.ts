import { NextRequest } from "next/server";
import { getStudent } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateCode } from "@/lib/claude";

// Allow up to 5 minutes — Claude generation for complex games takes 2+ minutes
export const maxDuration = 300;

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

  try {
    // Don't pass truncated existing code as context — Claude can't meaningfully
    // modify broken HTML and will produce broken output again.
    const existingCode = project.currentCode ?? undefined;
    const isExistingComplete = existingCode
      ? existingCode.toLowerCase().includes("</html>") && existingCode.includes("</script>")
      : true;
    const stream = await generateCode(prompt, isExistingComplete ? existingCode : undefined);
    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "X-Project-Id": projectId,
      },
    });
  } catch (err) {
    await db.project.update({ where: { id: projectId }, data: { deployStatus: "ERROR" } });
    const message = err instanceof Error ? err.message : "Code generation failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
