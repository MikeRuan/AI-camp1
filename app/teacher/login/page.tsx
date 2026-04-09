"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TeacherLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [inviteCode, setInviteCode] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const endpoint =
      mode === "login"
        ? "/api/auth/teacher/login"
        : "/api/auth/teacher/register";

    const body =
      mode === "login"
        ? { email, password }
        : { email, password, inviteCode };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      return;
    }

    router.push("/teacher/classes");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Zyntri" className="w-12 h-12 rounded-xl object-contain" />
          </div>
          <p className="text-xs font-bold tracking-widest text-blue-600 uppercase mb-1">Zyntri</p>
          <h1 className="text-2xl font-bold text-gray-800">Teacher Portal</h1>
        </div>

        <div className="flex rounded-xl overflow-hidden border border-gray-200 mb-6">
          {(["login", "register"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-2 text-sm font-semibold transition ${
                mode === m
                  ? "bg-blue-600 text-white"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              {m === "login" ? "Sign In" : "Register"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none"
            required
          />
          {mode === "register" && (
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Teacher invite code"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none"
              required
            />
          )}

          {error && (
            <div className="bg-red-50 text-red-600 rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? "..." : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-4">
          <a href="/join" className="hover:underline">
            Student? Join here
          </a>
        </p>
      </div>
    </div>
  );
}
