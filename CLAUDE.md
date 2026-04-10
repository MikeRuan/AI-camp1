# AI Builder Camp — Platform

## Project overview

A web application for an after-school coding program (grades 5–8). Students use text prompts to generate and publish websites/games via AI. The platform handles all CI/CD invisibly — students only see a prompt input and a live URL.

**Core user flow:**
1. Student joins a class with a code + display name (no email, no password)
2. Student creates a project and types a prompt describing what they want to build
3. Platform calls Claude API → generates a single HTML file
4. Platform pushes the file to GitHub (for history) and deploys directly to Vercel via API → student gets a live URL (~30s)
5. Student can iterate: type follow-up prompts to modify the existing project

**Two user types:**
- **Students** — join via class code, build projects, see their live URL
- **Teachers** — create classes, monitor all student projects

---

## Tech stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS (no shadcn/ui — plain Tailwind throughout)
- **Database:** MySQL (TiDB Cloud) via Prisma ORM
- **Auth:** Custom session-based (cookie), no NextAuth — custom HMAC-signed tokens, no iron-session
- **AI:** Anthropic Claude API (`claude-sonnet-4-6`), streaming responses
- **Code hosting:** GitHub API — one repo per student project, under a shared GitHub Organization (`MikeRuan`)
- **Deployment:** Vercel direct file deployment API (`/v13/deployments`) — files sent in request body, no GitHub webhook needed
- **Platform hosting:** Vercel

---

## Project structure

```
app/
  join/                 # Student entry — class code + name form
  dashboard/            # Student project list
  project/[id]/         # Single project: prompt input, iframe preview, deploy status, live URL
  teacher/
    login/              # Teacher sign in / register
    classes/            # Class list + create class
    classes/[id]/       # Class detail — students + their project statuses
    projects/           # All student projects overview table
  api/
    auth/
      join/             # Student join: create record + session cookie
      logout/           # Clear session cookie
      teacher/login/    # Teacher email + password auth
      teacher/register/ # Teacher registration (invite code gated)
    generate/           # Claude API call — streams HTML back to client
    deploy/
      init/             # First deploy: create GitHub repo + push code + create Vercel project
      push/             # Subsequent deploys: push to GitHub + deploy to Vercel
      status/[id]/      # Poll Vercel deployment status, update DB
    classes/            # Class CRUD (list + create)
    projects/           # Project CRUD (list + create)
    projects/[id]/      # Single project (get + update)
    projects/[id]/reset/ # Reset deployment status to IDLE
    health/             # DB connectivity check

components/
  PromptEditor.tsx      # Main editor: prompt textarea + iframe preview + build button
  DeployStatus.tsx      # Polling component — BUILDING / READY / ERROR states
  ProjectCard.tsx       # Project summary card (name, status, iterations)
  NewProjectButton.tsx  # Modal to create a new project
  CreateClassButton.tsx # Modal to create a new class

lib/
  claude.ts             # Claude API wrapper + system prompt (streaming + non-streaming)
  github.ts             # GitHub API wrapper (create repo, push/update file)
  vercel.ts             # Vercel API wrapper (create project, deploy files, poll status)
  db.ts                 # Prisma client singleton
  auth.ts               # Session helpers (HMAC token, cookie read/write)

prisma/
  schema.prisma

scripts/
  vercel-deploy.mjs     # One-time manual setup script (not used at runtime)
```

---

## Database schema

MySQL (TiDB Cloud). Note the `@db.Text` / `@db.LongText` annotations required for long string columns.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model Teacher {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String
  classes      Class[]
  createdAt    DateTime @default(now())
}

model Class {
  id        String    @id @default(uuid())
  teacherId String
  teacher   Teacher   @relation(fields: [teacherId], references: [id])
  name      String
  joinCode  String    @unique   // 6-char code students use to join
  active    Boolean   @default(true)
  students  Student[]
  createdAt DateTime  @default(now())
}

model Student {
  id           String    @id @default(uuid())
  classId      String
  class        Class     @relation(fields: [classId], references: [id])
  displayName  String
  sessionToken String?   @db.Text   // expanded to TEXT — tokens exceed VARCHAR(191)
  projects     Project[]
  createdAt    DateTime  @default(now())
}

model Project {
  id              String   @id @default(uuid())
  studentId       String
  student         Student  @relation(fields: [studentId], references: [id])
  name            String
  currentPrompt   String?  @db.Text
  currentCode     String?  @db.LongText  // full HTML file — can be large
  deployUrl       String?
  deployStatus    String   @default("IDLE")  // IDLE | BUILDING | READY | ERROR
  githubRepo      String?   // repo name within the org (e.g. "alice-myproject")
  vercelProjectId String?
  iterationCount  Int      @default(0)
  updatedAt       DateTime @updatedAt
  createdAt       DateTime @default(now())
}
```

---

## Key implementation details

### Claude API — code generation (`lib/claude.ts`)

Two exported functions:
- `generateCode(prompt, existingCode?)` — returns a `ReadableStream` for real-time streaming to the client
- `generateCodeFull(prompt, existingCode?)` — non-streaming, returns the full HTML string

The system prompt enforces:
- Always return a **single self-contained HTML file** (HTML + CSS + JS inline)
- No external dependencies, no npm packages, no CDN links
- Must work when opened directly in a browser
- Visually polished and mobile-friendly
- Add comments throughout for student learning
- On iteration: receive previous code in context, modify it, preserve existing functionality unless told otherwise
- Output raw HTML only — no markdown fences, no explanation text

Model: `claude-sonnet-4-6`. `max_tokens: 8000`.

### GitHub automation (`lib/github.ts`)

- Org: `MikeRuan` (personal account used as org via `/user/repos` endpoint)
- On first deploy: create repo with `auto_init: true` (required before pushing files)
- On each iteration: fetch current `index.html` SHA before updating (required by GitHub API)
- Repo naming: `{slugified-student-name}-{slugified-project-name}`
- Repos are public
- Used for code history/storage; does **not** trigger Vercel deployments

### Vercel automation (`lib/vercel.ts`)

Deployments use the **direct file API** — no GitHub webhook integration.

- `deployToVercel(projectName, htmlContent)`:
  1. `POST /v10/projects` — create Vercel project (or retrieve existing)
  2. `POST /v13/deployments` — deploy with `files` array (base64-encoded `index.html`)
  3. Returns `{ projectId, deployUrl, deploymentId }`
- `getDeploymentStatus(projectId)`:
  - Polls `GET /v6/deployments?projectId=...&limit=1`
  - State mapping: `QUEUED / INITIALIZING / BUILDING → "BUILDING"`, `READY → "READY"`, `ERROR / CANCELED → "ERROR"`
  - Returns `{ status, url }`

Frontend polls `/api/deploy/status/[id]` every 3 seconds until `READY` or `ERROR`.

### Auth (`lib/auth.ts`)

Custom implementation — no NextAuth, iron-session is installed but not used.

- Token format: `base64url(JSON payload) + "." + HMAC-SHA256 signature` (signed with `SESSION_SECRET`)
- `createSessionToken(id, role)` — signs and returns token string
- `parseSessionToken(token)` — verifies signature, returns `{ id, role }` or null
- `getSession()` — reads cookie, returns parsed token
- `getStudent()` / `getTeacher()` — loads full record from DB
- `setSessionCookie(token)` — httpOnly, secure, 7-day expiry
- `clearSessionCookie()` — deletes session cookie
- Teachers: email + bcrypt password
- Students: class join code + display name → create student record → set session
- Teacher registration gated by `TEACHER_INVITE_CODE` env var

---

## Environment variables

```
# AI
ANTHROPIC_API_KEY=

# GitHub
GITHUB_TOKEN=           # PAT with repo scope (personal account used as org)
GITHUB_ORG=             # e.g. MikeRuan

# Vercel
VERCEL_TOKEN=           # Vercel API token
# VERCEL_TEAM_ID=       # Not needed — using personal account, not a team

# Database
DATABASE_URL=           # MySQL/TiDB connection string

# Auth
SESSION_SECRET=         # Random 32-char string for HMAC signing
TEACHER_INVITE_CODE=    # Simple gate for teacher registration
```

---

## Problem-solving principle — always fix systemically

**When a bug is found, fix the system, not the symptom.**

This platform serves many students building many different games. Any bug that appears once will appear again for a different student with a different prompt. Never patch a specific project's code directly — always find and fix the root cause in the platform code so all future students benefit automatically.

Ask yourself before every fix:
- Will this fix prevent the same problem for *every* student, or only this one?
- Is the root cause in `lib/claude.ts`, an API route, a component, or somewhere else in the platform?
- If I fix the generated HTML directly, I am treating the symptom — what platform change prevents this HTML from ever being generated or deployed broken?

**Examples of wrong vs right approach:**
| Wrong (symptom) | Right (systemic) |
|---|---|
| Inject a click handler into one student's stored code | Fix `generateCodeValidated()` to detect and retry missing handlers |
| Manually redeploy one project after truncation | Raise `max_tokens`, add completeness check with retry |
| Edit one game's HTML to fix a button | Update the system prompt or validation logic |

---

## Code style

- TypeScript throughout, strict mode
- Async/await, no callbacks
- All API routes return `Response.json(...)` (Next.js 14 style)
- Error responses: `{ error: string }` with appropriate HTTP status
- Prisma for all DB access — no raw SQL
- Keep components focused — one responsibility per file
- Auth checks at the top of every API route and server component

---

## What this platform is NOT

- Not a code editor — students never see or touch code
- Not a multi-file project builder — always a single `index.html`
- Not a real-time collaboration tool — one student per project
- Not trying to teach syntax — teaching how to use AI as a tool

---

## Implementation status

All Phase 1 MVP items are complete and working:

- [x] Project scaffolding + Prisma schema + DB connection (MySQL/TiDB)
- [x] Auth flows (teacher registration/login, student class join)
- [x] `lib/claude.ts` — streaming + non-streaming code generation
- [x] `lib/github.ts` — create repo, push/update `index.html`
- [x] `lib/vercel.ts` — direct file deployment, status polling
- [x] API routes: `/api/generate`, `/api/deploy/init`, `/api/deploy/push`, `/api/deploy/status/[id]`
- [x] API utilities: `/api/health`, `/api/projects/[id]/reset`
- [x] Frontend: PromptEditor (with inline iframe preview) + DeployStatus
- [x] Teacher dashboard: class list, class detail (students + projects), all-projects table
- [x] Error handling throughout

**Not implemented (deferred):**
- Standalone `CodePreview.tsx` — iframe preview is inline inside `PromptEditor.tsx`
- shadcn/ui component library — using plain Tailwind instead
