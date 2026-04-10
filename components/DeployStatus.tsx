"use client";

import { useEffect, useRef, useState } from "react";

interface DeployStatusProps {
  projectId: string;
  initialStatus: string;
  initialUrl: string;
  onReady?: (url: string) => void;
}

export default function DeployStatus({
  projectId,
  initialStatus,
  initialUrl,
  onReady,
}: DeployStatusProps) {
  const [status, setStatus] = useState(initialStatus);
  const [url, setUrl] = useState(initialUrl);

  // Keep a ref to the latest onReady callback so the polling closure is never stale.
  const onReadyRef = useRef(onReady);
  useEffect(() => { onReadyRef.current = onReady; }, [onReady]);

  useEffect(() => {
    if (status !== "BUILDING") return;

    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`/api/deploy/status/${projectId}`);
        if (!res.ok) return false;
        const data = await res.json();
        if (cancelled) return true; // component unmounted, stop
        setStatus(data.status);
        if (data.url) setUrl(data.url);
        if (data.status !== "BUILDING") {
          if (data.status === "READY" && onReadyRef.current) {
            onReadyRef.current(data.url ?? initialUrl);
          }
          return true; // done
        }
      } catch {
        // silently retry
      }
      return false;
    }

    // Poll immediately (catches already-READY state on page refresh)
    poll();
    const interval = setInterval(async () => {
      const done = await poll();
      if (done) clearInterval(interval);
    }, 3000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [status, projectId, initialUrl]);

  if (status === "IDLE") return null;

  if (status === "BUILDING") {
    return (
      <div className="flex items-center gap-2 text-yellow-400 text-sm">
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3V4a10 10 0 100 20v-2a8 8 0 01-8-8z" />
        </svg>
        Publishing... this takes about 30 seconds
      </div>
    );
  }

  if (status === "READY" && url) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-green-400 text-sm font-semibold">✓ Live!</span>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-1.5 rounded-lg transition font-semibold"
        >
          Open Site 🌐
        </a>
      </div>
    );
  }

  if (status === "ERROR") {
    return (
      <span className="text-red-400 text-sm">Deploy failed — try again</span>
    );
  }

  return null;
}
