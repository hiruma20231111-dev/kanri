"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import {
  LayoutDashboard,
  Mail,
  FileText,
  ClipboardList,
  Bot,
  LogOut,
  Building2,
  MessageSquare,
  BarChart2,
  PhoneCall,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  UserCheck,
  Receipt,
  MessageCircle,
  ExternalLink,
} from "lucide-react"

const navItems = [
  { href: "/dashboard",    label: "ダッシュボード",    icon: LayoutDashboard },
  { href: "/assistant",    label: "AIアシスタント",    icon: Bot },
  { href: "/clients",      label: "顧客稼働状況",      icon: BarChart2 },
  { href: "/newleads",     label: "見込みリスト",      icon: PhoneCall },
  { href: "/mentions",     label: "kp-chatメンション", icon: MessageSquare },
  { href: "/gmail",        label: "Gmail",             icon: Mail },
  { href: "/estimates",    label: "見積書",            icon: FileText },
  { href: "/applications", label: "申込書",            icon: ClipboardList },
]

const externalLinks = [
  { href: "https://eigyo.kansaipado.jp/dashboard",                                                                                                                    label: "営業管理",                     icon: TrendingUp    },
  { href: "https://eigyobucho.kansaipado.jp/login",                                                                                                                   label: "営業部長君",                   icon: UserCheck     },
  { href: "https://script.google.com/a/macros/kansaipado.co.jp/s/AKfycbxtogEdthTWzTltBnZq5iENqfdBOtdY9DGD_xk8DtB9W4YpN8iuU7Mhf9NpvYGS1f-wOQ/exec",               label: "請求書・領収証 発行・書換 依頼", icon: Receipt       },
  { href: "https://d2qopozfrwtgu9.cloudfront.net/chat/",                                                                                                              label: "社内チャット",                 icon: MessageCircle },
]

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
}

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const { data: session } = useSession()

  return (
    <div
      className={`flex flex-col bg-slate-900 text-white h-screen fixed left-0 top-0 z-30 print:hidden transition-all duration-200 ${
        isOpen ? "w-64" : "w-16"
      }`}
    >
      {/* ロゴ + 開閉トグル */}
      <div className="flex items-center gap-3 px-3 py-5 border-b border-slate-700 relative">
        <div className="bg-blue-500 rounded-lg p-2 flex-shrink-0">
          <Building2 className="w-5 h-5 text-white" />
        </div>
        {isOpen && (
          <div className="min-w-0 overflow-hidden">
            <p className="font-bold text-sm leading-tight whitespace-nowrap">関西ぱど</p>
            <p className="text-xs text-slate-400 whitespace-nowrap">営業パイロット</p>
          </div>
        )}
        <button
          onClick={onToggle}
          className="absolute -right-3 top-1/2 -translate-y-1/2 bg-slate-700 hover:bg-slate-500 border border-slate-600 rounded-full p-0.5 transition-colors"
          aria-label={isOpen ? "メニューを閉じる" : "メニューを開く"}
        >
          {isOpen
            ? <ChevronLeft  className="w-4 h-4 text-slate-300" />
            : <ChevronRight className="w-4 h-4 text-slate-300" />}
        </button>
      </div>

      {/* ユーザー */}
      {session?.user && (
        <div className={`flex items-center gap-3 mx-2 mt-3 bg-slate-800 rounded-lg ${isOpen ? "px-4 py-3" : "justify-center px-1 py-2"}`}>
          {session.user.image && (
            <img src={session.user.image} alt="avatar" className="w-8 h-8 rounded-full flex-shrink-0" />
          )}
          {isOpen && (
            <div className="min-w-0">
              <p className="text-xs font-medium truncate">{session.user.name}</p>
              <p className="text-xs text-slate-400 truncate">{session.user.email}</p>
            </div>
          )}
        </div>
      )}

      {/* ナビゲーション */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              title={!isOpen ? label : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              } ${!isOpen ? "justify-center" : ""}`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {isOpen && <span className="truncate">{label}</span>}
            </Link>
          )
        })}

        {/* 申込書の下：関連ツール */}
        <div className={`pt-2 ${isOpen ? "" : ""}`}>
          {isOpen && (
            <p className="px-3 pb-1 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              関連ツール
            </p>
          )}
          {!isOpen && <div className="border-t border-slate-700 my-1" />}
          {externalLinks.map(({ href, label, icon: Icon }) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              title={!isOpen ? label : undefined}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-colors ${
                !isOpen ? "justify-center" : ""
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {isOpen && (
                <span className="truncate flex-1">{label}</span>
              )}
              {isOpen && <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-50" />}
            </a>
          ))}
        </div>
      </nav>

      {/* ログアウト */}
      <div className="px-2 py-4 border-t border-slate-700">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          title={!isOpen ? "ログアウト" : undefined}
          className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors ${
            !isOpen ? "justify-center" : ""
          }`}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {isOpen && "ログアウト"}
        </button>
      </div>
    </div>
  )
}
