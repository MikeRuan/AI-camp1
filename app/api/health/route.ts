import { db } from "@/lib/db";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ db: "ok" });
  } catch (err) {
    return Response.json({ db: "error", message: String(err) }, { status: 500 });
  }
}
