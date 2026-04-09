import { redirect } from "next/navigation";
import { getTeacher } from "@/lib/auth";
import { db } from "@/lib/db";
import TeacherProjectActions from "@/components/TeacherProjectActions";
import ZyntriLogo from "@/components/ZyntriLogo";

const STATUS_BADGE: Record<string, string> = {
  IDLE: "bg-gray-100 text-gray-600",
  BUILDING: "bg-yellow-100 text-yellow-700",
  READY: "bg-green-100 text-green-700",
  ERROR: "bg-red-100 text-red-600",
};

export default async function TeacherProjectsPage() {
  const teacher = await getTeacher();
  if (!teacher) redirect("/teacher/login");

  const projects = await db.project.findMany({
    where: { student: { class: { teacherId: teacher.id } } },
    include: {
      student: {
        select: {
          displayName: true,
          class: { select: { name: true } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ZyntriLogo size="sm" />
          <span className="text-gray-300">|</span>
          <a href="/teacher/classes" className="text-gray-400 hover:text-gray-600 text-sm">
            ← Classes
          </a>
          <h1 className="font-bold text-gray-800">All Student Projects</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <p className="text-gray-500 mb-6">{projects.length} projects total</p>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600 font-semibold">Project</th>
                <th className="text-left px-4 py-3 text-gray-600 font-semibold">Student</th>
                <th className="text-left px-4 py-3 text-gray-600 font-semibold">Class</th>
                <th className="text-left px-4 py-3 text-gray-600 font-semibold">Status</th>
                <th className="text-left px-4 py-3 text-gray-600 font-semibold">Iterations</th>
                <th className="text-left px-4 py-3 text-gray-600 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {projects.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 font-medium text-gray-800">{p.name}</td>
                  <td className="px-4 py-3 text-gray-600">{p.student.displayName}</td>
                  <td className="px-4 py-3 text-gray-500">{p.student.class.name}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        STATUS_BADGE[p.deployStatus] ?? STATUS_BADGE.IDLE
                      }`}
                    >
                      {p.deployStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{p.iterationCount}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {p.deployUrl && (
                        <a
                          href={p.deployUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          View →
                        </a>
                      )}
                      <TeacherProjectActions projectId={p.id} projectName={p.name} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
