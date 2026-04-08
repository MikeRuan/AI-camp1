import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function Home() {
  const session = await getSession();
  if (session?.role === "student") redirect("/dashboard");
  if (session?.role === "teacher") redirect("/teacher/classes");
  redirect("/join");
}
