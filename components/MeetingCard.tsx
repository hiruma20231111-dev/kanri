"use client"

import { useState } from "react"
import { CalendarEvent, MeetingInsight, DriveFile } from "@/types"
import {
  Clock,
  MapPin,
  Sparkles,
  ChevronDown,
  ChevronUp,
  FileText,
  ExternalLink,
  Loader2,
} from "lucide-react"

interface Props {
  event: CalendarEvent
}

function formatTime(dateTime?: string) {
  if (!dateTime) return ""
  return new Date(dateTime).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function extractCompanyName(title: string): string {
  const patterns = [
    /(.+?)[\s　]*(様|御中|さん)?[\s　]*商談/,
    /商談[\s　]*[：:＠@]?[\s　]*(.+)/,
    /(.+?)[\s　]*(?:訪問|MTG|Meeting|打合せ|打ち合わせ)/i,
  ]
  for (const p of patterns) {
    const m = title.match(p)
    if (m) return m[1].trim()
  }
  return title
}

export function MeetingCard({ event }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [insight, setInsight] = useState<MeetingInsight | null>(null)
  const [files, setFiles] = useState<DriveFile[]>([])
  const [loading, setLoading] = useState(false)

  const companyName = extractCompanyName(event.summary)
  const startTime = formatTime(event.start.dateTime)
  const endTime = formatTime(event.end.dateTime)

  async function fetchInsight() {
    if (insight) {
      setExpanded(!expanded)
      return
    }
    setExpanded(true)
    setLoading(true)

    try {
      const [geminiRes, driveRes] = await Promise.all([
        fetch("/api/gemini", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "meeting",
            eventTitle: event.summary,
            companyName,
            description: event.description || "",
            customerHistory: "",
          }),
        }),
        fetch(`/api/drive?q=${encodeURIComponent(companyName)}`),
      ])

      const geminiData = await geminiRes.json()
      const driveData = await driveRes.json()

      setInsight({ ...geminiData, companyName, driveFiles: driveData.files || [] })
      setFiles(driveData.files || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* ヘッダー */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{startTime} 〜 {endTime}</span>
              {event.location && (
                <>
                  <MapPin className="w-3.5 h-3.5 ml-1" />
                  <span className="truncate">{event.location}</span>
                </>
              )}
            </div>
            <h3 className="font-semibold text-slate-900 truncate">{event.summary}</h3>
          </div>
          <button
            onClick={fetchInsight}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-xs font-medium transition-colors flex-shrink-0"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            AI分析
            {expanded ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>
        </div>
      </div>

      {/* AI分析結果 */}
      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50 p-4 space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Gemini AIが分析中...
            </div>
          ) : insight ? (
            <>
              {/* 企業概要 */}
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  企業概要
                </h4>
                <p className="text-sm text-slate-700">{insight.companyOverview}</p>
              </div>

              {/* 提案商材 */}
              {insight.recommendedProducts?.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                    おすすめ商材
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {insight.recommendedProducts.map((p, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 商談アドバイス */}
              {insight.salesAdvice && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                    商談アドバイス
                  </h4>
                  <p className="text-sm text-slate-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    {insight.salesAdvice}
                  </p>
                </div>
              )}

              {/* ポイント */}
              {insight.keyPoints?.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                    チェックポイント
                  </h4>
                  <ul className="space-y-1">
                    {insight.keyPoints.map((p, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                        <span className="text-blue-500 mt-0.5">•</span>
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Drive ファイル */}
              {files.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                    関連資料（Google Drive）
                  </h4>
                  <div className="space-y-1.5">
                    {files.slice(0, 4).map((f) => (
                      <a
                        key={f.id}
                        href={f.webViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 hover:border-blue-300 transition-colors group"
                      >
                        <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span className="text-xs text-slate-700 truncate flex-1">{f.name}</span>
                        <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-blue-500" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  )
}
