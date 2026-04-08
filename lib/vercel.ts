const VERCEL_TOKEN = process.env.VERCEL_TOKEN!;
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;
const GITHUB_ORG = process.env.GITHUB_ORG!;
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

export async function createVercelProject(
  repoName: string
): Promise<{ projectId: string; deployUrl: string }> {
  const res = await fetch(`${API}/v10/projects${teamParam()}`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: repoName,
      framework: null,
      gitRepository: {
        type: "github",
        repo: `${GITHUB_ORG}/${repoName}`,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Vercel create project failed: ${JSON.stringify(err)}`);
  }

  const data = await res.json();
  return {
    projectId: data.id as string,
    deployUrl: `https://${repoName}.vercel.app`,
  };
}

type VercelDeployState = "QUEUED" | "INITIALIZING" | "BUILDING" | "READY" | "ERROR" | "CANCELED";
type DeployStatus = "BUILDING" | "READY" | "ERROR";

function mapState(state: VercelDeployState): DeployStatus {
  if (state === "READY") return "READY";
  if (state === "ERROR" || state === "CANCELED") return "ERROR";
  return "BUILDING";
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
