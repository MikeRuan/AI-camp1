import { redirect } from "next/navigation";
import { getStudent } from "@/lib/auth";
import { db } from "@/lib/db";
import PromptEditor from "@/components/PromptEditor";

export default async function ProjectPage({
  params,
}: {
  params: { id: string };
}) {
  const student = await getStudent();
  if (!student) redirect("/join");

  const project = await db.project.findUnique({ where: { id: params.id } });
  if (!project || project.studentId !== student.id) redirect("/dashboard");

  return (
    <div className="min-h-screen flex flex-col bg-gray-900">
      <header className="bg-gray-800 px-4 py-3 flex items-center gap-3 border-b border-gray-700">
        <a href="/dashboard" className="text-gray-400 hover:text-white text-sm">
          ← Back
        </a>
        <span className="text-gray-600">|</span>
        <h1 className="text-white font-semibold">{project.name}</h1>
        {project.deployUrl && (
          <a
            href={project.deployUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1 rounded-lg transition"
          >
            View Live Site 🌐
          </a>
        )}
      </header>

      <PromptEditor
        projectId={project.id}
        initialCode={project.currentCode ?? ""}
        initialStatus={project.deployStatus}
        deployUrl={project.deployUrl ?? ""}
        iterationCount={project.iterationCount}
      />
    </div>
  );
}
