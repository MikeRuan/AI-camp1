# AI Builder Camp — Platform

## Project overview

A web application for an after-school coding program (grades 5–8). Students use text prompts to generate and publish websites/games via AI. The platform handles all CI/CD invisibly — students only see a prompt input and a live URL.

**Core user flow:**
1. Student joins a class with a code + display name (no email, no password)
2. Student creates a project and types a prompt describing what they want to build
3. Platform calls Claude API → generates a single HTML file
4. Platform commits the file to a GitHub repo → Vercel auto-deploys → student gets a live URL (~30s)
5. Student can iterate: type follow-up prompts to modify the existing project

**Two user types:**
- **Students** — join via class code, build projects, see their live URL
- **Teachers** — create classes, monitor all student projects

---

## Tech stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS + shadcn/ui
- **Database:** Vercel Postgres via Prisma ORM
- **Auth:** Custom session-based (cookie), no NextAuth — students use class code + name only
- **AI:** Anthropic Claude API (`claude-sonnet-4-6`), streaming responses
- **Code hosting:** GitHub API — one repo per student project, under a shared GitHub Organization
- **Deployment:** Vercel — GitHub integration webhook, auto-deploys on push to main
- **Platform hosting:** Vercel

---

## Project structure

```
app/
  (auth)/join/          # Student entry — class code + name form
  dashboard/            # Student project list
  project/[id]/         # Single project: prompt input, deploy status, live URL
  teacher/
    classes/            # Class management
    projects/           # All student projects overview
  api/
    auth/               # Login/logout endpoints
    generate/           # Claude API call
    deploy/
      init/             # First deploy: create GitHub repo + Vercel project
      push/             # Commit code to GitHub (triggers Vercel)
      status/[id]/      # Poll deployment status
    classes/            # Class CRUD
    projects/           # Project CRUD

components/
  PromptEditor.tsx      # Main prompt input component
  DeployStatus.tsx      # Polling component — shows BUILDING / READY / ERROR
  CodePreview.tsx       # iframe preview (Phase 2)
  ProjectCard.tsx

lib/
  claude.ts             # Claude API wrapper + system prompt
  github.ts             # GitHub API wrapper
  vercel.ts             # Vercel API wrapper
  db.ts                 # Prisma client
  auth.ts               # Session helpers

prisma/
  schema.prisma
```

---

## Database schema

```prisma
model Teacher {
  id            String    @id @default(uuid())
  email         String    @unique
  passwordHash  String
  classes       Class[]
  createdAt     DateTime  @default(now())
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
  sessionToken String?
  projects     Project[]
  createdAt    DateTime  @default(now())
}

model Project {
  id              String    @id @default(uuid())
  studentId       String
  student         Student   @relation(fields: [studentId], references: [id])
  name            String
  currentPrompt   String?
  currentCode     String?   // full HTML file content
  deployUrl       String?
  deployStatus    String    @default("IDLE")  // IDLE | BUILDING | READY | ERROR
  githubRepo      String?   // repo name within the org
  vercelProjectId String?
  iterationCount  Int       @default(0)
  updatedAt       DateTime  @updatedAt
  createdAt       DateTime  @default(now())
}
```

---

## Key implementation details

### Claude API — code generation (`lib/claude.ts`)

The system prompt is critical. Key rules enforced:
- Always return a **single self-contained HTML file** (HTML + CSS + JS in one file)
- No external dependencies, no npm packages, no CDN links
- Must work when opened directly in a browser
- Visually polished and mobile-friendly
- Add comments throughout for student learning
- On iteration: receive previous code in context, modify it, preserve existing functionality unless told otherwise
- Output raw HTML only — no markdown fences, no explanation text

Use `claude-sonnet-4-6`. Stream the response back to the frontend so students see the code appearing in real time. `max_tokens: 8000`.

### GitHub automation (`lib/github.ts`)

- Use a dedicated service account (bot), not personal account
- On first deploy: create repo in the org with `auto_init: true` (required before pushing files)
- On each iteration: get current `index.html` SHA before updating (required by GitHub API for updates)
- Repo naming: `{slugified-student-name}-{slugified-project-name}`
- Repos are public (required for Vercel free tier)

### Vercel automation (`lib/vercel.ts`)

- On first deploy: create Vercel project linked to the GitHub repo (`framework: null` — static site)
- After that: no Vercel API calls needed. Every GitHub push auto-triggers a new deployment
- Poll `/v6/deployments?projectId=...&limit=1` every 3 seconds to get status
- Map Vercel states (QUEUED, INITIALIZING, BUILDING → "BUILDING"), (READY → "READY"), (ERROR → "ERROR")

### Auth

- Teachers: email + bcrypt password, session cookie
- Students: class join code + display name → create student record + session cookie
- No NextAuth — keep it simple and dependency-light
- Session stored in signed cookie (`SESSION_SECRET` env var)
- Teacher invite code (`TEACHER_INVITE_CODE`) gates teacher registration

---

## Environment variables

```
# AI
ANTHROPIC_API_KEY=

# GitHub
GITHUB_TOKEN=           # Service account PAT with repo scope
GITHUB_ORG=             # Organization name

# Vercel
VERCEL_TOKEN=
VERCEL_TEAM_ID=         # Optional, only if using a Team account

# Database
DATABASE_URL=           # Vercel Postgres connection string

# Auth
SESSION_SECRET=         # Random 32-char string
TEACHER_INVITE_CODE=    # Simple gate for teacher registration
```

---

## Code style

- TypeScript throughout, strict mode
- Async/await, no callbacks
- All API routes return `Response.json(...)` (Next.js 14 style)
- Error responses: `{ error: string }` with appropriate HTTP status
- Prisma for all DB access — no raw SQL
- Keep components focused — one responsibility per file
- Name GitHub/Vercel API functions descriptively: `createStudentRepo`, `pushCode`, `createVercelProject`

---

## What this platform is NOT

- Not a code editor — students never see or touch code
- Not a multi-file project builder — always a single `index.html`
- Not a real-time collaboration tool — one student per project
- Not trying to teach syntax — teaching how to use AI as a tool

---

## Build order (Phase 1 MVP)

1. Project scaffolding + Prisma schema + DB connection
2. Auth flows (teacher registration/login, student class join)
3. `lib/claude.ts` — Claude API + system prompt, test in isolation
4. `lib/github.ts` — create repo + push file, test with manual calls
5. `lib/vercel.ts` — create project + link to GitHub, test end-to-end manually
6. API routes: `/api/generate`, `/api/deploy/init`, `/api/deploy/push`, `/api/deploy/status`
7. Frontend: PromptEditor + DeployStatus components
8. Teacher dashboard
9. Error handling + edge cases
10. UI polish for student-facing pages (must feel approachable for a 10-year-old)
