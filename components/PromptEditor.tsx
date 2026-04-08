"use client";

import { useState, useRef } from "react";
import DeployStatus from "./DeployStatus";

interface PromptEditorProps {
  projectId: string;
  initialCode: string;
  initialStatus: string;
  deployUrl: string;
  iterationCount: number;
}

export default function PromptEditor({
  projectId,
  initialCode,
  initialStatus,
  deployUrl,
  iterationCount,
}: PromptEditorProps) {
  const [prompt, setPrompt] = useState("");
  const [code, setCode] = useState(initialCode);
  const [status, setStatus] = useState(initialStatus);
  const [liveUrl, setLiveUrl] = useState(deployUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isFirst] = useState(iterationCount === 0);
  const codeRef = useRef(code);
  codeRef.current = code;

  const PLACEHOLDER = isFirst
    ? "Describe what you want to build... e.g. 'Make a colorful quiz game about animals with 5 questions and a score counter!'"
    : "Describe a change... e.g. 'Add a high score board' or 'Change the colors to be more blue'";

  async function handleBuild() {
    if (!prompt.trim()) return;
    setLoading(true);
    setError("");
    setStatus("BUILDING");

    try {
      // Step 1: Stream code from Claude
      const genRes = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, prompt }),
      });

      if (!genRes.ok) {
        const err = await genRes.json();
        throw new Error(err.error ?? "Generation failed");
      }

      const reader = genRes.body!.getReader();
      const decoder = new TextDecoder();
      let generatedCode = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        generatedCode += decoder.decode(value, { stream: true });
        setCode(generatedCode);
      }

      // Step 2: Deploy to GitHub / Vercel
      const isFirstDeploy = iterationCount === 0 && !liveUrl;
      const deployEndpoint = isFirstDeploy ? "/api/deploy/init" : "/api/deploy/push";

      const deployRes = await fetch(deployEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, code: generatedCode }),
      });

      if (!deployRes.ok) {
        const err = await deployRes.json();
        throw new Error(err.error ?? "Deploy failed");
      }

      const deployData = await deployRes.json();
      if (deployData.deployUrl) setLiveUrl(deployData.deployUrl);

      setStatus("BUILDING");
      setPrompt("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus("ERROR");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col flex-1">
      {/* Code preview area */}
      <div className="flex-1 overflow-auto bg-gray-950 p-4">
        {code ? (
          <iframe
            srcDoc={code}
            className="w-full h-full min-h-[400px] rounded-xl border border-gray-700 bg-white"
            sandbox="allow-scripts"
            title="Preview"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-600 text-center">
            <div>
              <div className="text-5xl mb-4">✨</div>
              <p className="text-lg">Your project will appear here</p>
              <p className="text-sm mt-1">Type a prompt below to get started!</p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="bg-gray-800 border-t border-gray-700 p-4">
        {/* Status row */}
        <div className="flex items-center justify-between mb-3 min-h-[28px]">
          <DeployStatus
            projectId={projectId}
            initialStatus={status}
            initialUrl={liveUrl}
            onReady={(url) => { setLiveUrl(url); setStatus("READY"); }}
          />
          {error && (
            <span className="text-red-400 text-sm">{error}</span>
          )}
        </div>

        {/* Prompt input */}
        <div className="flex gap-3">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleBuild();
            }}
            placeholder={PLACEHOLDER}
            rows={2}
            disabled={loading}
            className="flex-1 bg-gray-700 text-white placeholder-gray-400 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            onClick={handleBuild}
            disabled={loading || !prompt.trim()}
            className="bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold px-6 rounded-xl hover:opacity-90 transition disabled:opacity-40 flex items-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3V4a10 10 0 100 20v-2a8 8 0 01-8-8z" />
                </svg>
                Building...
              </>
            ) : (
              <>Build ✨</>
            )}
          </button>
        </div>
        <p className="text-gray-500 text-xs mt-2">Tip: Press Ctrl+Enter to build</p>
      </div>
    </div>
  );
}
