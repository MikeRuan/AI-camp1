"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewProjectButton({ large }: { large?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);

    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    const data = await res.json();
    setLoading(false);
    if (res.ok) router.push(`/project/${data.id}`);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold rounded-xl hover:opacity-90 transition ${
          large ? "px-8 py-3 text-lg" : "px-4 py-2 text-sm"
        }`}
      >
        + New Project
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h2 className="text-xl font-bold text-gray-800 mb-4">New Project</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <input
                autoFocus
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="What are you building? e.g. 'My Quiz Game'"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none"
                maxLength={50}
                required
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 border border-gray-200 rounded-xl py-2 text-gray-600 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white font-bold rounded-xl py-2 hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {loading ? "Creating..." : "Create 🚀"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
