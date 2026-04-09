const VERCEL_TOKEN = process.env.VERCEL_TOKEN!;
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;
const API = "https://api.vercel.com";

function teamParam(): string {
  return VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : "";
}

function teamParamAmpersand(): string {
  return VERCEL_TEAM_ID ? `&teamId=${VERCEL_TEAM_ID}` : "";
}

const headers = {
  Authorization: `Bearer ${VERCEL_TOKEN}`,
  "Content-Type": "application/json",
};

// Deploy HTML file directly to Vercel — no GitHub integration needed
export async function deployToVercel(
  projectName: string,
  htmlContent: string
): Promise<{ projectId: string; deployUrl: string; deploymentId: string }> {
  // 1. Create or get the project (framework: null = static site)
  const projectRes = await fetch(`${API}/v10/projects${teamParam()}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ name: projectName, framework: null }),
  });

  let projectId: string;
  if (projectRes.ok) {
    const p = await projectRes.json();
    projectId = p.id;
  } else {
    const err = await projectRes.json();
    // If project already exists, fetch it
    if (err.error?.code === "project_already_exists" || projectRes.status === 409) {
      const existing = await fetch(`${API}/v9/projects/${projectName}${teamParam()}`, { headers });
      if (!existing.ok) throw new Error(`Vercel project fetch failed: ${JSON.stringify(await existing.json())}`);
      const p = await existing.json();
      projectId = p.id;
    } else {
      throw new Error(`Vercel create project failed: ${JSON.stringify(err)}`);
    }
  }

  // 2. Deploy files directly (no git needed)
  const deployRes = await fetch(`${API}/v13/deployments${teamParam()}`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: projectName,
      project: projectId,
      files: [
        {
          file: "index.html",
          data: Buffer.from(htmlContent).toString("base64"),
          encoding: "base64",
        },
      ],
      projectSettings: { framework: null },
      target: "production",
    }),
  });

  if (!deployRes.ok) {
    const err = await deployRes.json();
    throw new Error(`Vercel deploy failed: ${JSON.stringify(err)}`);
  }

  const deploy = await deployRes.json();
  return {
    projectId,
    deploymentId: deploy.id,
    deployUrl: `https://${deploy.url}`,
  };
}

type VercelDeployState = "QUEUED" | "INITIALIZING" | "BUILDING" | "READY" | "ERROR" | "CANCELED";
type DeployStatus = "BUILDING" | "READY" | "ERROR";

function mapState(state: VercelDeployState): DeployStatus {
  if (state === "READY") return "READY";
  if (state === "ERROR" || state === "CANCELED") return "ERROR";
  return "BUILDING";
}

export async function deleteVercelProject(projectId: string): Promise<void> {
  await fetch(`${API}/v9/projects/${projectId}${teamParam()}`, {
    method: "DELETE",
    headers,
  });
  // Ignore errors — project may not exist if deploy never completed
}

export async function getDeploymentStatus(
  projectId: string
): Promise<{ status: DeployStatus; url?: string }> {
  const res = await fetch(
    `${API}/v6/deployments?projectId=${projectId}&limit=1${teamParamAmpersand()}`,
    { headers }
  );

  if (!res.ok) throw new Error("Failed to fetch deployment status");

  const data = await res.json();
  const deployment = data.deployments?.[0];
  if (!deployment) return { status: "BUILDING" };

  return {
    status: mapState(deployment.state),
    url: deployment.url ? `https://${deployment.url}` : undefined,
  };
}
