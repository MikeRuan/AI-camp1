import { redirect } from "next/navigation";
import Link from "next/link";
import { getStudent } from "@/lib/auth";
import { db } from "@/lib/db";
import ProjectCard from "@/components/ProjectCard";
import NewProjectButton from "@/components/NewProjectButton";
import ProjectActions from "@/components/ProjectActions";
import ZyntriLogo from "@/components/ZyntriLogo";

export default async function DashboardPage() {
  const student = await getStudent();
  if (!student) redirect("/join");

  const projects = await db.project.findMany({
    where: { studentId: student.id },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <header className="bg-white shadow-sm px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ZyntriLogo />
          <div>
            <h1 className="font-bold text-gray-800 text-lg">AI Builder Camp</h1>
            <p className="text-sm text-gray-500">
              Hey <span className="font-semibold text-blue-600">{student.displayName}</span>! 👋
            </p>
          </div>
        </div>
        <form action="/api/auth/logout" method="POST">
          <button type="submit" className="text-sm text-gray-400 hover:text-gray-600">Leave</button>
        </form>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">My Projects</h2>
          <NewProjectButton />
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">✨</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No projects yet!
            </h3>
            <p className="text-gray-500 mb-6">
              Create your first project and build something amazing with AI.
            </p>
            <NewProjectButton large />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <div key={project.id} className="relative group">
                <Link href={`/project/${project.id}`}>
                  <ProjectCard project={project} />
                </Link>
                <div className="absolute top-3 right-3">
                  <ProjectActions projectId={project.id} projectName={project.name} />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
