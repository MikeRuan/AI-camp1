const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  IDLE: { label: "Not started", color: "text-gray-400", icon: "○" },
  BUILDING: { label: "Building...", color: "text-yellow-500", icon: "⟳" },
  READY: { label: "Live!", color: "text-green-500", icon: "●" },
  ERROR: { label: "Error", color: "text-red-500", icon: "✕" },
};

interface Project {
  id: string;
  name: string;
  deployStatus: string;
  iterationCount: number;
  updatedAt: Date;
  deployUrl?: string | null;
}

export default function ProjectCard({ project }: { project: Project }) {
  const status = STATUS_CONFIG[project.deployStatus] ?? STATUS_CONFIG.IDLE;

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 transition cursor-pointer group">
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-bold text-gray-800 group-hover:text-blue-600 transition line-clamp-1">
          {project.name}
        </h3>
        <span className={`text-xs font-semibold ${status.color} flex items-center gap-1`}>
          <span>{status.icon}</span>
          {status.label}
        </span>
      </div>

      <div className="text-xs text-gray-400">
        {project.iterationCount > 0 ? (
          <span>{project.iterationCount} iteration{project.iterationCount !== 1 ? "s" : ""}</span>
        ) : (
          <span>No prompts yet</span>
        )}
      </div>

      {project.deployStatus === "READY" && (
        <div className="mt-3 pt-3 border-t border-gray-50">
          <span className="text-xs text-green-600 font-medium">✓ Published and live</span>
        </div>
      )}
    </div>
  );
}
