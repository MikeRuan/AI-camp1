import { NextRequest } from "next/server";
import { getTeacher } from "@/lib/auth";
import { db } from "@/lib/db";

function generateJoinCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function GET() {
  const teacher = await getTeacher();
  if (!teacher) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const classes = await db.class.findMany({
    where: { teacherId: teacher.id },
    include: { _count: { select: { students: true } } },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(classes);
}

export async function POST(req: NextRequest) {
  const teacher = await getTeacher();
  if (!teacher) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await req.json();
  if (!name) return Response.json({ error: "Class name required" }, { status: 400 });

  const joinCode = generateJoinCode();
  const cls = await db.class.create({
    data: { name, joinCode, teacherId: teacher.id },
  });

  return Response.json(cls, { status: 201 });
}
