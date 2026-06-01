import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Sidebar } from "@/components/Sidebar"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) redirect("/login")
    if ((session as any).error === "RefreshAccessTokenError") redirect("/login")
  } catch {
    redirect("/login")
  }

  return (
    <div className="flex h-screen overflow-hidden print:block print:h-auto print:overflow-visible">
      <Sidebar />
      <main className="flex-1 ml-64 overflow-y-auto bg-slate-50 print:ml-0 print:overflow-visible print:bg-white">
        {children}
      </main>
    </div>
  )
}
