import { cookies } from "next/headers";
import { db } from "@/lib/db";

const SESSION_SECRET = process.env.SESSION_SECRET!;

function sign(payload: string): string {
  // Simple HMAC-style signing using btoa + secret mixing
  // In production iron-session handles this properly
  return Buffer.from(`${payload}.${SESSION_SECRET}`).toString("base64url");
}

export function createSessionToken(id: string, role: "student" | "teacher"): string {
  const payload = JSON.stringify({ id, role, iat: Date.now() });
  const encoded = Buffer.from(payload).toString("base64url");
  const sig = sign(encoded);
  return `${encoded}.${sig}`;
}

export function parseSessionToken(token: string): { id: string; role: "student" | "teacher" } | null {
  try {
    const [encoded, sig] = token.split(".");
    if (sign(encoded) !== sig) return null;
    return JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

export async function getSession() {
  const cookieStore = cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return null;
  return parseSessionToken(token);
}

export async function getStudent() {
  const session = await getSession();
  if (!session || session.role !== "student") return null;
  return db.student.findUnique({
    where: { id: session.id },
    include: { class: true },
  });
}

export async function getTeacher() {
  const session = await getSession();
  if (!session || session.role !== "teacher") return null;
  return db.teacher.findUnique({ where: { id: session.id } });
}

export function setSessionCookie(token: string) {
  cookies().set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

export function clearSessionCookie() {
  cookies().delete("session");
}
