import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { createSessionToken, setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { joinCode, displayName } = await req.json();

  if (!joinCode || !displayName) {
    return Response.json({ error: "Join code and display name are required" }, { status: 400 });
  }

  const cls = await db.class.findUnique({
    where: { joinCode: joinCode.toUpperCase().trim() },
  });

  if (!cls || !cls.active) {
    return Response.json({ error: "Invalid or inactive class code" }, { status: 404 });
  }

  const name = displayName.trim().slice(0, 30);
  if (!name) return Response.json({ error: "Display name is required" }, { status: 400 });

  // Check if student with same name exists in this class
  let student = await db.student.findFirst({
    where: { classId: cls.id, displayName: name },
  });

  if (!student) {
    student = await db.student.create({
      data: { classId: cls.id, displayName: name },
    });
  }

  const token = createSessionToken(student.id, "student");
  await db.student.update({ where: { id: student.id }, data: { sessionToken: token } });

  setSessionCookie(token);
  return Response.json({ ok: true, studentId: student.id });
}
