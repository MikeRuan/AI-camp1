const GITHUB_TOKEN = process.env.GITHUB_TOKEN!;
const GITHUB_ORG = process.env.GITHUB_ORG!;
const API = "https://api.github.com";

const headers = {
  Authorization: `Bearer ${GITHUB_TOKEN}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "Content-Type": "application/json",
};

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export function buildRepoName(studentName: string, projectName: string): string {
  return `${slugify(studentName)}-${slugify(projectName)}`;
}

export async function createStudentRepo(repoName: string): Promise<string> {
  // Use /user/repos for personal accounts, /orgs/{org}/repos for organizations
  const res = await fetch(`${API}/user/repos`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: repoName,
      private: false,
      auto_init: true,
      description: "AI Builder Camp project",
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`GitHub create repo failed: ${err.message}`);
  }

  const data = await res.json();
  return data.html_url as string;
}

export async function pushCode(repoName: string, htmlContent: string): Promise<void> {
  const fileContent = Buffer.from(htmlContent).toString("base64");

  // Get current file SHA (needed for updates)
  const getRes = await fetch(
    `${API}/repos/${GITHUB_ORG}/${repoName}/contents/index.html`,
    { headers }
  );

  let sha: string | undefined;
  if (getRes.ok) {
    const data = await getRes.json();
    sha = data.sha as string;
  }

  const body: Record<string, unknown> = {
    message: "Update project via AI Builder Camp",
    content: fileContent,
  };
  if (sha) body.sha = sha;

  const putRes = await fetch(
    `${API}/repos/${GITHUB_ORG}/${repoName}/contents/index.html`,
    { method: "PUT", headers, body: JSON.stringify(body) }
  );

  if (!putRes.ok) {
    const err = await putRes.json();
    throw new Error(`GitHub push failed: ${err.message}`);
  }
}

export async function repoExists(repoName: string): Promise<boolean> {
  const res = await fetch(`${API}/repos/${GITHUB_ORG}/${repoName}`, { headers });
  return res.ok;
}

export async function deleteRepo(repoName: string): Promise<void> {
  await fetch(`${API}/repos/${GITHUB_ORG}/${repoName}`, {
    method: "DELETE",
    headers,
  });
  // Ignore errors — repo may not exist if project was never deployed
}
