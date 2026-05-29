"use client"

import { useEffect, useState } from "react"
import { GmailMessage } from "@/types"
import { EmailItem } from "@/components/EmailItem"
import { Mail, RefreshCw, Loader2, Inbox } from "lucide-react"

export default function GmailPage() {
  const [messages, setMessages] = useState<GmailMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  async function fetchEmails() {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/gmail?maxResults=15")
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setMessages(data.messages || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchEmails() }, [])

  const unreadCount = messages.filter((m) => !m.isRead).length

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Mail className="w-6 h-6 text-blue-500" />
            受信メール
          </h1>
          {!loading && messages.length > 0 && (
            <p className="text-sm text-slate-500 mt-1">
              {messages.length}件 · 未読 {unreadCount}件 ·「AI分析」で要約と返信案を生成
            </p>
          )}
        </div>
        <button
          onClick={fetchEmails}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-sm transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          更新
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
          <p className="text-slate-500 text-sm">メールを読み込み中...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm">
          エラー: {error}
        </div>
      ) : messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Inbox className="w-12 h-12 text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">メールがありません</p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => (
            <EmailItem key={msg.id} message={msg} />
          ))}
        </div>
      )}
    </div>
  )
}
