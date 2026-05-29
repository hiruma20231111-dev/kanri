"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import {
  LayoutDashboard,
  Mail,
  Users,
  FileText,
  ClipboardList,
  Bot,
  LogOut,
  Building2,
} from "lucide-react"

const navItems = [
  { href: "/dashboard", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/assistant", label: "AIアシスタント", icon: Bot },
  { href: "/gmail", label: "Gmail", icon: Mail },
  { href: "/customers", label: "顧客管理", icon: Users },
  { href: "/estimates", label: "見積書", icon: FileText },
  { href: "/applications", label: "申込書", icon: ClipboardList },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  return (
    <div className="flex flex-col w-64 bg-slate-900 text-white h-screen fixed left-0 top-0 z-30">
      {/* ロゴ */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700">
        <div className="bg-blue-500 rounded-lg p-2">
          <Building2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-bold text-sm leading-tight">関西ぱど</p>
          <p className="text-xs text-slate-400">営業パイロット</p>
        </div>
      </div>

      {/* ユーザー */}
      {session?.user && (
        <div className="flex items-center gap-3 px-4 py-3 mx-3 mt-3 bg-slate-800 rounded-lg">
          {session.user.image && (
            <img
              src={session.user.image}
              alt="avatar"
              className="w-8 h-8 rounded-full"
            />
          )}
          <div className="min-w-0">
            <p className="text-xs font-medium truncate">{session.user.name}</p>
            <p className="text-xs text-slate-400 truncate">{session.user.email}</p>
          </div>
        </div>
      )}

      {/* ナビゲーション */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* ログアウト */}
      <div className="px-3 py-4 border-t border-slate-700">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4" />
          ログアウト
        </button>
      </div>
    </div>
  )
}
