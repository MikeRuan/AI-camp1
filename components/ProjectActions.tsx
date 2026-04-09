"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ProjectActionsProps {
  projectId: string;
  projectName: string;
}

export default function ProjectActions({ projectId, projectName }: ProjectActionsProps) {
  const router = useRouter();
  const [showRename, setShowRename] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [newName, setNewName] = useState(projectName);
  const [loading, setLoading] = useState(false);

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || newName.trim() === projectName) {
      setShowRename(false);
      return;
    }
    setLoading(true);
    await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
    setLoading(false);
    setShowRename(false);
    router.refresh();
  }

  async function handleDelete() {
    setLoading(true);
    await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
    setLoading(false);
    setShowDelete(false);
    router.refresh();
  }

  return (
    <>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); setNewName(projectName); setShowRename(true); }}
          className="p-1 text-gray-400 hover:text-blue-500 transition"
          title="Rename"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); setShowDelete(true); }}
          className="p-1 text-gray-400 hover:text-red-500 transition"
          title="Delete"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Rename modal */}
      {showRename && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setShowRename(false)}
        >
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-gray-800 mb-4">Rename Project</h3>
            <form onSubmit={handleRename} className="space-y-4">
              <input
                autoFocus
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                maxLength={50}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 focus:border-blue-500 focus:outline-none"
              />
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading || !newName.trim()}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 rounded-xl disabled:opacity-50 transition"
                >
                  {loading ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowRename(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 rounded-xl transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
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
