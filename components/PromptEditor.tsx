"use client";

import { useState, useRef } from "react";
import DeployStatus from "./DeployStatus";

// Injects a visible error overlay into generated HTML so JS errors
// show up in the preview instead of silently failing.
const ERROR_SCRIPT = `<script>
(function() {
  function getBar() {
    var el = document.getElementById('__dbg__');
    if (!el) {
      el = document.createElement('div');
      el.id = '__dbg__';
      el.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:#1a1a2e;color:#fff;padding:6px 10px;font:12px monospace;z-index:999999;white-space:pre-wrap;max-height:35vh;overflow:auto;border-top:2px solid #444';
      document.body.appendChild(el);
    }
    return el;
  }
  window.addEventListener('error', function(e) {
    getBar().textContent += '❌ ' + (e.message||e.error) + ' (line '+e.lineno+')\\n';
  });
  window.addEventListener('unhandledrejection', function(e) {
    getBar().textContent += '❌ Unhandled: ' + e.reason + '\\n';
  });
  document.addEventListener('click', function(e) {
    var t = e.target;
    var info = t.tagName + (t.id ? '#'+t.id : '') + (t.className ? '.'+String(t.className).trim().split(' ')[0] : '');
    var style = window.getComputedStyle(t);
    getBar().textContent += '🖱 clicked: ' + info + ' | z:' + style.zIndex + ' pe:' + style.pointerEvents + '\\n';
  }, true);
})();
<\/script>`;

function injectErrorOverlay(html: string): string {
  const headEnd = html.indexOf("</head>");
  if (headEnd !== -1) return html.slice(0, headEnd) + ERROR_SCRIPT + html.slice(headEnd);
  // Fallback: prepend before <body> or at the start
  const bodyStart = html.indexOf("<body");
  if (bodyStart !== -1) return html.slice(0, bodyStart) + ERROR_SCRIPT + html.slice(bodyStart);
  return ERROR_SCRIPT + html;
}

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
  const [imageUrls, setImageUrls] = useState<string[]>([""]);
  const [showImages, setShowImages] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          // Strip the data URL prefix (e.g. "data:image/png;base64,")
          const result = (reader.result as string).split(",")[1];
          resolve(result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentBase64: base64 }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Upload failed");
      }

      const { url } = await res.json();
      // Add URL to the list (replace first empty slot or append)
      setImageUrls((prev) => {
        const emptyIdx = prev.findIndex((u) => !u.trim());
        if (emptyIdx !== -1) {
          const next = [...prev];
          next[emptyIdx] = url;
          return next;
        }
        return prev.length < 4 ? [...prev, url] : prev;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      // Reset so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleBuild() {
    if (!prompt.trim()) return;
    setLoading(true);
    setError("");
    setStatus("BUILDING");

    try {
      // Build prompt with optional image context
      const validUrls = imageUrls.filter((u) => u.trim());
      const fullPrompt = validUrls.length > 0
        ? `${prompt}\n\nInclude these images in the website (use them as <img> tags): ${validUrls.join(", ")}`
        : prompt;

      // Step 1: Stream code from Claude
      const genRes = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, prompt: fullPrompt }),
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

      // Save generated code immediately so it survives a page reload
      // even if the deploy step fails
      await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentCode: generatedCode }),
      });

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
            srcDoc={injectErrorOverlay(code)}
            className="w-full h-full min-h-[400px] rounded-xl border border-gray-700 bg-white"
            sandbox="allow-scripts allow-forms"
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
          <div className="flex items-center gap-3">
            {error && <span className="text-red-400 text-sm">{error}</span>}
            {status === "ERROR" && (
              <button
                type="button"
                onClick={async () => {
                  await fetch(`/api/projects/${projectId}/reset`, { method: "POST" });
                  setStatus("IDLE");
                  setError("");
                }}
                className="text-xs text-gray-400 hover:text-white underline"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Image URLs panel */}
        <div className="mb-3">
          <button
            type="button"
            onClick={() => setShowImages(!showImages)}
            className="text-xs text-gray-400 hover:text-gray-200 flex items-center gap-1 transition"
          >
            <span>{showImages ? "▼" : "▶"}</span>
            Add images to your website
          </button>
          {showImages && (
            <div className="mt-2 space-y-2">
              {imageUrls.map((url, i) => (
                <div key={i} className="flex gap-2 items-center">
                  {url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={url} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0 border border-gray-600" />
                  ) : (
                    <div className="w-8 h-8 rounded bg-gray-700 flex-shrink-0" />
                  )}
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => {
                      const next = [...imageUrls];
                      next[i] = e.target.value;
                      setImageUrls(next);
                    }}
                    placeholder="Paste an image URL, or upload below"
                    className="flex-1 bg-gray-700 text-white placeholder-gray-500 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  {imageUrls.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setImageUrls(imageUrls.filter((_, j) => j !== i))}
                      className="text-gray-500 hover:text-red-400 text-xs px-1"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <div className="flex items-center gap-3 pt-1">
                {imageUrls.length < 4 && (
                  <button
                    type="button"
                    onClick={() => setImageUrls([...imageUrls, ""])}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    + Add URL
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || imageUrls.length >= 4}
                  className="text-xs bg-gray-600 hover:bg-gray-500 text-white px-3 py-1 rounded-lg disabled:opacity-40 transition flex items-center gap-1"
                >
                  {uploading ? (
                    <>
                      <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3V4a10 10 0 100 20v-2a8 8 0 01-8-8z" />
                      </svg>
                      Uploading...
                    </>
                  ) : (
                    <>📁 Upload from computer</>
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  title="Upload image from computer"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>
            </div>
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
            type="button"
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
