"use client"

import { useState, useEffect, useCallback } from "react"
import {
  MessageSquare, RefreshCw, Loader2, ChevronDown, ChevronUp,
  Send, CheckCircle, AlertCircle, Clock, Sparkles, Edit3
} from "lucide-react"

interface Mention {
  id: string
  channel_id: string
  channel_name: string
  user_id: string
  sender_name: string
  body: string
  parent_id: string | null
  created_at: string
}

interface Analysis {
  summary: string
  requiredAction: string
  priority: "high" | "medium" | "low"
  replyDraft: string
}

interface MentionItem extends Mention {
  analysis?: Analysis
  analyzing?: boolean
  analyzeError?: string
  expanded?: boolean
  replySent?: boolean
  replyText?: string
  replySending?: boolean
  replyError?: string
}

const PRI: Record<string, { label: string; cls: string; dot: string }> = {
  high:   { label: "急",   cls: "bg-red-100 text-red-700 border-red-200",     dot: "bg-red-500" },
  medium: { label: "通常", cls: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-400" },
  low:    { label: "低",   cls: "bg-slate-100 text-slate-500 border-slate-200", dot: "bg-slate-300" },
}

function cleanBody(body: string) {
  return body.replace(/<@[a-f0-9-]+>/g, "").replace(/\n{3,}/g, "\n\n").trim()
}

function relativeTime(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return "たった今"
  if (diff < 3600) return `${Math.floor(diff / 60)}分前`
  if (diff < 86400) return `${Math.floor(diff / 3600)}時間前`
  return `${Math.floor(diff / 86400)}日前`
}

export default function MentionsPage() {
  const [mentions, setMentions] = useState<MentionItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const fetchMentions = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/sfchat")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "取得失敗")
      setMentions((data.mentions || []).map((m: Mention) => ({
        ...m, expanded: false, replySent: false, replyText: "",
      })))
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchMentions() }, [fetchMentions])

  // AI分析
  async function analyze(id: string) {
    const m = mentions.find(x => x.id === id)
    if (!m || m.analyzing) return
    setMentions(prev => prev.map(x => x.id === id ? { ...x, analyzing: true, analyzeError: undefined, analysis: undefined } : x))
    try {
      const res = await fetch("/api/sfchat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "analyze",
          senderName: m.sender_name,
          channelName: m.channel_name,
          body: m.body,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `分析エラー (${res.status})`)
      setMentions(prev => prev.map(x =>
        x.id === id ? { ...x, analyzing: false, analysis: data, replyText: data.replyDraft } : x
      ))
    } catch (e: any) {
      const msg = e.message?.includes("503") || e.message?.includes("overloaded")
        ? "AI処理中（過負荷）。しばらく待ってから再試行してください"
        : e.message || "分析に失敗しました"
      setMentions(prev => prev.map(x => x.id === id ? { ...x, analyzing: false, analyzeError: msg } : x))
    }
  }

  function toggle(id: string) {
    setMentions(prev => prev.map(x => x.id === id ? { ...x, expanded: !x.expanded } : x))
    analyze(id)
  }

  function setReplyText(id: string, text: string) {
    setMentions(prev => prev.map(x => x.id === id ? { ...x, replyText: text } : x))
  }

  // kp-chatへ返信送信
  async function sendReply(id: string) {
    const m = mentions.find(x => x.id === id)
    if (!m || !m.replyText?.trim()) return
    setMentions(prev => prev.map(x => x.id === id ? { ...x, replySending: true, replyError: undefined } : x))
    try {
      const res = await fetch("/api/sfchat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "reply",
          channelId: m.channel_id,
          parentId: m.parent_id ?? m.id,
          replyBody: m.replyText,
          senderUserId: m.user_id,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "送信失敗")
      setMentions(prev => prev.map(x => x.id === id ? { ...x, replySending: false, replySent: true } : x))
    } catch (e: any) {
      setMentions(prev => prev.map(x =>
        x.id === id ? { ...x, replySending: false, replyError: e.message } : x
      ))
    }
  }

  const highCount = mentions.filter(m => m.analysis?.priority === "high").length
  const unread = mentions.filter(m => !m.replySent).length

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">kp-chat メンション</h1>
            <p className="text-xs text-slate-500">@比留間信 宛のメッセージ · {unread}件 未対応</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {highCount > 0 && (
            <span className="px-2.5 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">
              急 {highCount}件
            </span>
          )}
          <button
            onClick={fetchMentions}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            更新
          </button>
        </div>
      </div>

      {/* エラー */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-700">取得エラー</p>
            <p className="text-xs text-red-600 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
          <span className="ml-2 text-slate-500 text-sm">取得中...</span>
        </div>
      )}

      {!loading && mentions.length === 0 && !error && (
        <div className="text-center py-20 text-slate-400">
          <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">メンションはありません</p>
        </div>
      )}

      {/* メンション一覧 */}
      <div className="space-y-3">
        {mentions.map(m => {
          const p = m.analysis ? PRI[m.analysis.priority] : null
          return (
            <div
              key={m.id}
              className={`bg-white border rounded-xl overflow-hidden shadow-sm transition-all ${
                m.replySent ? "border-green-200 opacity-60" : "border-slate-200 hover:border-slate-300"
              }`}
            >
              {/* ヘッダー行 */}
              <button
                onClick={() => toggle(m.id)}
                className="w-full text-left px-4 py-3.5 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      {p && (
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${p.cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />
                          {p.label}
                        </span>
                      )}
                      <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full truncate max-w-[180px]">
                        #{m.channel_name}
                      </span>
                      {m.replySent && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200 font-medium">
                          ✓ 返信済
                        </span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-semibold text-slate-800">{m.sender_name}</span>
                      <span className="text-sm text-slate-500 truncate">
                        {m.analysis?.summary ?? cleanBody(m.body).slice(0, 55) + "…"}
                      </span>
                      {m.analyzing && (
                        <span className="text-xs text-indigo-400 flex items-center gap-1 flex-shrink-0">
                          <Loader2 className="w-3 h-3 animate-spin" />AI分析中
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />{relativeTime(m.created_at)}
                    </span>
                    {m.expanded
                      ? <ChevronUp className="w-4 h-4 text-slate-400" />
                      : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>
              </button>

              {/* 展開エリア */}
              {m.expanded && (
                <div className="border-t border-slate-100 bg-slate-50 px-4 py-4 space-y-4">
                  {/* 本文 */}
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">本文</p>
                    <div className="bg-white border border-slate-100 rounded-lg p-3 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {cleanBody(m.body)}
                    </div>
                  </div>

                  {m.analyzing && (
                    <div className="flex items-center gap-2 text-sm text-indigo-500 py-2 bg-indigo-50 rounded-lg px-3">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Gemini AIが分析中... （過負荷時は自動リトライします）</span>
                    </div>
                  )}

                  {m.analysis && (
                    <>
                      {/* AI分析サマリー */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white border border-slate-100 rounded-lg p-3">
                          <p className="text-xs font-semibold text-slate-400 mb-1">必要なアクション</p>
                          <p className="text-sm text-slate-700">{m.analysis.requiredAction}</p>
                        </div>
                        <div className={`rounded-lg p-3 border ${PRI[m.analysis.priority].cls}`}>
                          <p className="text-xs font-semibold opacity-60 mb-1">優先度</p>
                          <p className="text-sm font-bold">{PRI[m.analysis.priority].label}</p>
                        </div>
                      </div>

                      {/* 返信エリア */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">返信文（編集可）</p>
                        </div>
                        <textarea
                          value={m.replyText ?? ""}
                          onChange={e => setReplyText(m.id, e.target.value)}
                          rows={4}
                          disabled={m.replySent}
                          className="w-full bg-white border border-slate-200 rounded-lg p-3 text-sm text-slate-700 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:opacity-50"
                          placeholder="返信文を入力..."
                        />

                        {m.replyError && (
                          <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />{m.replyError}
                          </p>
                        )}

                        <div className="flex gap-2 mt-3">
                          {m.replySent ? (
                            <span className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 text-sm rounded-lg font-medium">
                              <CheckCircle className="w-4 h-4" />kp-chatへ送信済み
                            </span>
                          ) : (
                            <button
                              onClick={() => sendReply(m.id)}
                              disabled={!m.replyText?.trim() || m.replySending}
                              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors font-medium"
                            >
                              {m.replySending
                                ? <><Loader2 className="w-4 h-4 animate-spin" />送信中...</>
                                : <><Send className="w-4 h-4" />kp-chatへ送信</>}
                            </button>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {/* 分析エラー時の表示 */}
                  {m.analyzeError && !m.analyzing && (
                    <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-red-700 mb-2">{m.analyzeError}</p>
                        <button
                          onClick={() => analyze(m.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-xs rounded-lg transition-colors font-medium"
                        >
                          <RefreshCw className="w-3 h-3" />再試行
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 分析未実施の場合 */}
                  {!m.analysis && !m.analyzing && !m.analyzeError && (
                    <button
                      onClick={() => analyze(m.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-50 text-sm rounded-lg transition-colors"
                    >
                      <Sparkles className="w-4 h-4" />AIで分析・返信文案を生成
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
