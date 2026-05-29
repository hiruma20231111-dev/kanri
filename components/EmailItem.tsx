"use client"

import { useState } from "react"
import { GmailMessage, EmailInsight } from "@/types"
import {
  Sparkles,
  Send,
  BookmarkPlus,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Clock,
  CheckCircle2,
} from "lucide-react"

interface Props {
  message: GmailMessage
}

const priorityConfig = {
  high: { label: "緊急", color: "text-red-600 bg-red-50 border-red-200" },
  medium: { label: "通常", color: "text-amber-600 bg-amber-50 border-amber-200" },
  low: { label: "低", color: "text-slate-500 bg-slate-50 border-slate-200" },
}

export function EmailItem({ message }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [insight, setInsight] = useState<EmailInsight | null>(null)
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [sentStatus, setSentStatus] = useState<"draft" | "sent" | null>(null)
  const [editedReply, setEditedReply] = useState("")

  async function analyzeEmail() {
    if (insight) {
      setExpanded(!expanded)
      return
    }
    setExpanded(true)
    setLoading(true)
    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "email",
          subject: message.subject,
          from: message.fromName || message.from,
          emailBody: message.body,
          customerInfo: "",
        }),
      })
      const data = await res.json()
      setInsight(data)
      setEditedReply(data.replyDraft || "")
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function sendReply(asDraft: boolean) {
    setSending(true)
    try {
      const res = await fetch("/api/gmail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: message.from,
          subject: `Re: ${message.subject}`,
          body: editedReply,
          threadId: message.threadId,
          draft: asDraft,
        }),
      })
      const data = await res.json()
      if (data.success) setSentStatus(asDraft ? "draft" : "sent")
    } catch (e) {
      console.error(e)
    } finally {
      setSending(false)
    }
  }

  const pc = insight ? priorityConfig[insight.priority] : null

  return (
    <div
      className={`bg-white rounded-xl border shadow-sm overflow-hidden ${
        !message.isRead ? "border-blue-300" : "border-slate-200"
      }`}
    >
      {/* ヘッダー */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div
            className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
              !message.isRead ? "bg-blue-500" : "bg-transparent"
            }`}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-0.5">
              <span className="text-sm font-medium text-slate-900 truncate">
                {message.fromName || message.from}
              </span>
              <span className="text-xs text-slate-400 flex-shrink-0">
                {message.date ? new Date(message.date).toLocaleDateString("ja-JP") : ""}
              </span>
            </div>
            <p className="text-sm text-slate-700 font-medium truncate">{message.subject}</p>
            <p className="text-xs text-slate-400 truncate mt-0.5">{message.snippet}</p>
          </div>
          <button
            onClick={analyzeEmail}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-600 rounded-lg text-xs font-medium transition-colors flex-shrink-0"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            AI分析
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* AI分析 */}
      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50 p-4 space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Gemini AIが分析中...
            </div>
          ) : insight ? (
            <>
              <div className="flex flex-wrap gap-2">
                {pc && (
                  <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border font-medium ${pc.color}`}>
                    <AlertCircle className="w-3 h-3" />
                    {pc.label}
                  </span>
                )}
                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs">
                  {insight.category}
                </span>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">要約</h4>
                <p className="text-sm text-slate-700">{insight.summary}</p>
              </div>

              {insight.requiredAction && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <Clock className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-700">{insight.requiredAction}</p>
                </div>
              )}

              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">返信文案</h4>
                <textarea
                  value={editedReply}
                  onChange={(e) => setEditedReply(e.target.value)}
                  rows={6}
                  className="w-full p-3 text-sm bg-white border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {sentStatus ? (
                <div className="flex items-center gap-2 text-green-600 text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  {sentStatus === "draft" ? "下書き保存しました" : "送信しました"}
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => sendReply(true)}
                    disabled={sending}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm transition-colors disabled:opacity-50"
                  >
                    <BookmarkPlus className="w-4 h-4" />
                    下書き保存
                  </button>
                  <button
                    onClick={() => sendReply(false)}
                    disabled={sending}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    送信
                  </button>
                </div>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  )
}
