import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { SidebarLayout } from "@/components/SidebarLayout"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) redirect("/login")
    if ((session as any).error === "RefreshAccessTokenError") redirect("/login")
  } catch {
    redirect("/login")
  }

  return (
    <SidebarLayout>
      {children}
    </SidebarLayout>
  )
}
