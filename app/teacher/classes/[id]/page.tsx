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

export default async function ClassDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const teacher = await getTeacher();
  if (!teacher) redirect("/teacher/login");

  const cls = await db.class.findUnique({
    where: { id: params.id },
    include: {
      students: {
        include: {
          projects: {
            orderBy: { updatedAt: "desc" },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!cls || cls.teacherId !== teacher.id) redirect("/teacher/classes");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ZyntriLogo size="sm" />
          <span className="text-gray-300">|</span>
          <a href="/teacher/classes" className="text-gray-400 hover:text-gray-600 text-sm">
            ← Classes
          </a>
          <span className="text-gray-300">|</span>
          <h1 className="font-bold text-gray-800">{cls.name}</h1>
          <span className="font-mono text-blue-600 font-bold bg-blue-50 px-3 py-1 rounded-lg text-sm">
            {cls.joinCode}
          </span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <p className="text-gray-500 mb-6">
          {cls.students.length} student{cls.students.length !== 1 ? "s" : ""}
        </p>

        {cls.students.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-5xl mb-4">👋</div>
            <p className="text-lg">No students yet.</p>
            <p className="text-sm mt-1">
              Share the join code <span className="font-mono font-bold text-blue-600">{cls.joinCode}</span> with your class.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {cls.students.map((student) => (
              <div key={student.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-gray-800">{student.displayName}</h3>
                  <span className="text-sm text-gray-400">
                    {student.projects.length} project{student.projects.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {student.projects.length === 0 ? (
                  <p className="text-sm text-gray-400">No projects yet</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {student.projects.map((p) => (
                      <div key={p.id} className="border border-gray-100 rounded-xl p-3 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm text-gray-700">{p.name}</p>
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              STATUS_BADGE[p.deployStatus] ?? STATUS_BADGE.IDLE
                            }`}
                          >
                            {p.deployStatus}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 ml-2">
                          {p.deployUrl && (
                            <a
                              href={p.deployUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-xs"
                            >
                              View →
                            </a>
                          )}
                          <TeacherProjectActions projectId={p.id} projectName={p.name} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
