import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAuthDisabled } from "@/lib/dev-auth";

export default async function HomePage() {
  if (isAuthDisabled()) redirect("/dashboard");
  try {
    const session = await auth();
    if (session?.user) redirect("/dashboard");
  } catch (err) {
    console.error("[home] auth check failed:", err);
  }
  redirect("/login");
}
