"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface TeacherStudentActionsProps {
  studentId: string;
  studentName: string;
  suspended: boolean;
}

export default function TeacherStudentActions({
  studentId,
  studentName,
  suspended,
}: TeacherStudentActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<"suspend" | "remove" | null>(null);
  const [showRemove, setShowRemove] = useState(false);

  async function handleSuspendToggle() {
    setLoading("suspend");
    await fetch(`/api/students/${studentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suspended: !suspended }),
    });
    setLoading(null);
    router.refresh();
  }

  async function handleRemove() {
    setLoading("remove");
    await fetch(`/api/students/${studentId}`, { method: "DELETE" });
    setLoading(null);
    setShowRemove(false);
    router.refresh();
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSuspendToggle}
          disabled={loading !== null}
          className={`text-xs font-medium transition disabled:opacity-50 ${
            suspended
              ? "text-green-600 hover:text-green-800"
              : "text-yellow-600 hover:text-yellow-800"
          }`}
        >
          {loading === "suspend"
            ? "..."
            : suspended
            ? "Unsuspend"
            : "Suspend"}
        </button>
        <span className="text-gray-200">|</span>
        <button
          type="button"
          onClick={() => setShowRemove(true)}
          disabled={loading !== null}
          className="text-xs font-medium text-red-400 hover:text-red-600 transition disabled:opacity-50"
        >
          Remove
        </button>
      </div>

      {showRemove && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setShowRemove(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-gray-800 mb-2">Remove Student?</h3>
            <p className="text-gray-500 text-sm mb-5">
              <span className="font-semibold text-gray-700">{studentName}</span>{" "}
              and all their projects will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleRemove}
                disabled={loading === "remove"}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2 rounded-xl disabled:opacity-50 transition"
              >
                {loading === "remove" ? "Removing..." : "Remove"}
              </button>
              <button
                type="button"
                onClick={() => setShowRemove(false)}
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
