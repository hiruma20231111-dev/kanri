import { redirect } from "next/navigation"

export default async function Home() {
  if (!process.env.NEXTAUTH_SECRET || !process.env.GOOGLE_CLIENT_ID) {
    redirect("/setup")
  }
  try {
    const { getServerSession } = await import("next-auth")
    const { authOptions } = await import("@/lib/auth")
    const session = await getServerSession(authOptions)
    if (session) redirect("/dashboard")
  } catch {
    redirect("/setup")
  }
  redirect("/login")
}
