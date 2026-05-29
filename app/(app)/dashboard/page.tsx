"use client"

import { useEffect, useState } from "react"
import { CalendarEvent } from "@/types"
import { MeetingCard } from "@/components/MeetingCard"
import { Calendar, RefreshCw, Loader2, SunMedium } from "lucide-react"

export default function DashboardPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  async function fetchEvents() {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/calendar")
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setEvents(data.events || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchEvents() }, [])

  const today = new Date().toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  })

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
            <SunMedium className="w-4 h-4 text-amber-500" />
            <span>{today}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">今日の商談スケジュール</h1>
        </div>
        <button
          onClick={fetchEvents}
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
          <p className="text-slate-500 text-sm">カレンダーを読み込み中...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm">
          エラー: {error}
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Calendar className="w-12 h-12 text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">本日の商談はありません</p>
          <p className="text-slate-400 text-sm mt-1">Googleカレンダーの予定を確認してください</p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            {events.length}件の予定 ·「AI分析」ボタンで商談情報・商材提案・資料を確認
          </p>
          {events.map((event) => (
            <MeetingCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  )
}
