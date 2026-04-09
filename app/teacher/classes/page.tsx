import { redirect } from "next/navigation";
import { getTeacher } from "@/lib/auth";
import { db } from "@/lib/db";
import CreateClassButton from "@/components/CreateClassButton";
import ZyntriLogo from "@/components/ZyntriLogo";

export default async function TeacherClassesPage() {
  const teacher = await getTeacher();
  if (!teacher) redirect("/teacher/login");

  const classes = await db.class.findMany({
    where: { teacherId: teacher.id },
    include: { _count: { select: { students: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ZyntriLogo />
          <div>
            <h1 className="font-bold text-gray-800">AI Builder Camp</h1>
            <p className="text-sm text-gray-500">{teacher.email}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <a
            href="/teacher/projects"
            className="text-sm text-blue-600 hover:underline"
          >
            All Projects
          </a>
          <form action="/api/auth/logout" method="POST">
            <button type="submit" className="text-sm text-gray-400 hover:text-gray-600">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">My Classes</h2>
          <CreateClassButton />
        </div>

        {classes.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <div className="text-5xl mb-4">📚</div>
            <p className="text-lg">No classes yet. Create your first one!</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {classes.map((cls) => (
              <div
                key={cls.id}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center justify-between"
              >
                <div>
                  <h3 className="font-bold text-lg text-gray-800">{cls.name}</h3>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                    <span>
                      Join code:{" "}
                      <span className="font-mono font-bold text-blue-600 text-base">
                        {cls.joinCode}
                      </span>
                    </span>
                    <span>{cls._count.students} students</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        cls.active
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {cls.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
                <a
                  href={`/teacher/classes/${cls.id}`}
                  className="text-blue-600 hover:underline text-sm"
                >
                  View →
                </a>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
