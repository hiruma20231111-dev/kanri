"use client"

import { useState, useRef, useEffect } from "react"
import { Bot, Send, Loader2, User, RotateCcw, Sparkles } from "lucide-react"

interface Message {
  id: number
  role: "user" | "assistant"
  content: string
}

let _id = 1
const SUGGESTIONS = [
  "今日の商談準備を手伝って",
  "DOMOぱどとワガシャのセット提案文を作って",
  "新規開拓のアプローチ方法を教えて",
  "更新提案のメール文案を作って",
  "ロカオプの提案ポイントを整理して",
  "来週のTODOを整理したい",
]

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: _id++,
      role: "assistant",
      content: "こんにちは！関西ぱど営業秘書の「ぱどアシスタント」です😊\n\n商談準備・提案書・メール文案・数字分析など、何でもお気軽にご相談ください。",
    },
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [noGemini, setNoGemini] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function send(text?: string) {
    const content = (text ?? input).trim()
    if (!content || loading) return
    setInput("")

    const userMsg: Message = { id: _id++, role: "user", content }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setLoading(true)

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages.map((m) => ({ role: m.role, content: m.content })) }),
      })
      const data = await res.json()

      if (res.status === 503) {
        setNoGemini(true)
        setMessages((prev) => [...prev, { id: _id++, role: "assistant", content: "⚠️ AI機能を利用するには GEMINI_API_KEY の設定が必要です。Vercel の環境変数に追加してください。" }])
        return
      }

      if (data.error) throw new Error(data.error)
      setMessages((prev) => [...prev, { id: _id++, role: "assistant", content: data.content }])
    } catch (e: any) {
      setMessages((prev) => [...prev, { id: _id++, role: "assistant", content: `エラーが発生しました: ${e.message}` }])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  function reset() {
    setMessages([{
      id: _id++,
      role: "assistant",
      content: "こんにちは！関西ぱど営業秘書の「ぱどアシスタント」です😊\n\n商談準備・提案書・メール文案・数字分析など、何でもお気軽にご相談ください。",
    }])
    setNoGemini(false)
  }

  return (
    <div className="flex flex-col h-screen">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900">ぱどアシスタント</h1>
            <p className="text-xs text-slate-500">関西ぱど 営業秘書AI</p>
          </div>
        </div>
        <button
          onClick={reset}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          リセット
        </button>
      </div>

      {/* メッセージ一覧 */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5 bg-slate-50">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            {/* アバター */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              msg.role === "assistant"
                ? "bg-gradient-to-br from-blue-500 to-purple-600"
                : "bg-slate-700"
            }`}>
              {msg.role === "assistant"
                ? <Bot className="w-4 h-4 text-white" />
                : <User className="w-4 h-4 text-white" />}
            </div>
            {/* バブル */}
            <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
              msg.role === "assistant"
                ? "bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm"
                : "bg-blue-600 text-white rounded-tr-sm"
            }`}>
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* サジェスト（初回のみ） */}
      {messages.length === 1 && !loading && (
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-100">
          <p className="text-xs text-slate-400 mb-2 flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> よく使う質問
          </p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="px-3 py-1.5 bg-white border border-slate-200 hover:border-blue-300 hover:text-blue-600 rounded-full text-xs text-slate-600 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 入力欄 */}
      <div className="px-4 py-4 bg-white border-t border-slate-200">
        {noGemini && (
          <div className="mb-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            GEMINI_API_KEY が未設定です。Vercel の環境変数に追加後、再デプロイしてください。
          </div>
        )}
        <div className="flex gap-3 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="メッセージを入力（Enter で送信 / Shift+Enter で改行）"
            rows={1}
            disabled={loading || noGemini}
            className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 max-h-32 overflow-y-auto"
            style={{ minHeight: "48px" }}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading || noGemini}
            className="w-12 h-12 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center transition-colors flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-1.5 text-center">Powered by Gemini AI</p>
      </div>
    </div>
  )
}
