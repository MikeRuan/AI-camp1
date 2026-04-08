import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createSessionToken, setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email, password, inviteCode } = await req.json();

  if (inviteCode !== process.env.TEACHER_INVITE_CODE) {
    return Response.json({ error: "Invalid invite code" }, { status: 403 });
  }

  if (!email || !password) {
    return Response.json({ error: "Email and password required" }, { status: 400 });
  }

  const existing = await db.teacher.findUnique({ where: { email } });
  if (existing) {
    return Response.json({ error: "Email already registered" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const teacher = await db.teacher.create({ data: { email, passwordHash } });

  const token = createSessionToken(teacher.id, "teacher");
  setSessionCookie(token);
  return Response.json({ ok: true, teacherId: teacher.id });
}
