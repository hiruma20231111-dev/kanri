import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Sidebar } from "@/components/Sidebar"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!process.env.NEXTAUTH_SECRET || !process.env.GOOGLE_CLIENT_ID) {
    redirect("/setup")
  }

  try {
    const session = await getServerSession(authOptions)
    if (!session) redirect("/login")
    // リフレッシュ失敗時は再ログインさせる
    if ((session as any).error === "RefreshAccessTokenError") redirect("/login")
  } catch {
    redirect("/setup")
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 ml-64 overflow-y-auto bg-slate-50">
        {children}
      </main>
    </div>
  )
}
