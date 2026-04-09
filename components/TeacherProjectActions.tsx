"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface TeacherProjectActionsProps {
  projectId: string;
  projectName: string;
}

export default function TeacherProjectActions({ projectId, projectName }: TeacherProjectActionsProps) {
  const router = useRouter();
  const [showDelete, setShowDelete] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
    setLoading(false);
    setShowDelete(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowDelete(true)}
        className="text-red-400 hover:text-red-600 text-xs font-medium transition"
        title="Delete project"
      >
        Delete
      </button>

      {showDelete && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setShowDelete(false)}
        >
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-gray-800 mb-2">Delete Project?</h3>
            <p className="text-gray-500 text-sm mb-5">
              <span className="font-semibold text-gray-700">{projectName}</span> will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2 rounded-xl disabled:opacity-50 transition"
              >
                {loading ? "Deleting..." : "Delete"}
              </button>
              <button
                type="button"
                onClick={() => setShowDelete(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 rounded-xl transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
