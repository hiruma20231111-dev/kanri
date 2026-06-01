"use client"

import { useState, useEffect } from "react"
import { BarChart2, ExternalLink, RefreshCw, Users, TrendingUp, DollarSign, Calendar } from "lucide-react"

interface ClientRecord {
  rank: string
  client: string
  media: string
  product: string
  sales: number
  cost: number
  profit: number
  contractType: string
  contractDate: string
  months: string[]
  editUrl: string
}

interface EigyoData {
  lastUpdated: string
  owner: string
  clients: ClientRecord[]
}

const MEDIA_TABS = [
  { key: "ワガシャ",  label: "ワガシャdeDOMO", color: "blue"   },
  { key: "DOMOぱど",  label: "DOMOpado",        color: "indigo" },
  { key: "WEB広告",   label: "WEB広告",          color: "violet" },
  { key: "まみたん",  label: "まみたん",          color: "pink"   },
  { key: "ロカオプ",  label: "ロカオプ",          color: "emerald"},
] as const

const ACTIVE_RANKS = ["契約書回収", "A"]
const CURRENT_MONTH = "6月"

const COLOR: Record<string, { tab: string; bg: string; badge: string; dot: string }> = {
  blue:    { tab: "border-blue-500 text-blue-700 bg-blue-50",    bg: "bg-blue-50",    badge: "bg-blue-100 text-blue-700",    dot: "bg-blue-500"    },
  indigo:  { tab: "border-indigo-500 text-indigo-700 bg-indigo-50",  bg: "bg-indigo-50",  badge: "bg-indigo-100 text-indigo-700",  dot: "bg-indigo-500"  },
  violet:  { tab: "border-violet-500 text-violet-700 bg-violet-50",  bg: "bg-violet-50",  badge: "bg-violet-100 text-violet-700",  dot: "bg-violet-500"  },
  pink:    { tab: "border-pink-500 text-pink-700 bg-pink-50",    bg: "bg-pink-50",    badge: "bg-pink-100 text-pink-700",    dot: "bg-pink-500"    },
  emerald: { tab: "border-emerald-500 text-emerald-700 bg-emerald-50", bg: "bg-emerald-50", badge: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
}

const RANK_BADGE: Record<string, string> = {
  "契約書回収": "bg-green-100 text-green-700 border border-green-200",
  "A":          "bg-blue-100 text-blue-700 border border-blue-200",
}

function yen(n: number) {
  return n > 0 ? `¥${n.toLocaleString("ja-JP")}` : "¥0"
}

export default function ClientsPage() {
  const [data, setData] = useState<EigyoData | null>(null)
  const [activeTab, setActiveTab] = useState<string>("ワガシャ")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/eigyo")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
    </div>
  )
  if (!data) return <div className="p-6 text-red-500">データ取得失敗</div>

  const currentTabMeta = MEDIA_TABS.find(t => t.key === activeTab)!
  const clr = COLOR[currentTabMeta.color]

  // タブのデータ（全ランク）
  const tabAll = data.clients.filter(c => c.media === activeTab)
  // 稼働中（契約書回収 or A）
  const tabActive = tabAll.filter(c => ACTIVE_RANKS.includes(c.rank))
  // 当月稼働
  const tabThisMonth = tabActive.filter(c => c.months.includes(CURRENT_MONTH))
  // 当月売上合計
  const thisMonthSales = tabThisMonth.reduce((s, c) => s + c.sales, 0)
  const thisMonthProfit = tabThisMonth.reduce((s, c) => s + c.profit, 0)
  // 稼働中ユニーク社数
  const uniqueClients = new Set(tabActive.map(c => c.client)).size

  // 全媒体サマリー（タブバッジ用）
  const tabBadges = MEDIA_TABS.reduce<Record<string, number>>((acc, t) => {
    acc[t.key] = data.clients.filter(c => c.media === t.key && ACTIVE_RANKS.includes(c.rank)).length
    return acc
  }, {})

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center">
            <BarChart2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">顧客稼働状況</h1>
            <p className="text-xs text-slate-500">比留間信 · 契約書回収 / Aランク · {CURRENT_MONTH}現在</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">最終更新: {data.lastUpdated}</span>
          <a
            href="https://eigyo.kansaipado.jp/pipeline?fy=2026&owner=hiruma%40kansaipado.co.jp"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            営業管理を開く
          </a>
        </div>
      </div>

      {/* 媒体タブ */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {MEDIA_TABS.map(tab => {
          const count = tabBadges[tab.key] ?? 0
          const c = COLOR[tab.color]
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                isActive
                  ? `${c.tab} shadow-sm`
                  : "border-transparent text-slate-500 hover:bg-slate-100"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isActive ? c.dot : "bg-slate-300"}`} />
              {tab.label}
              {count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${isActive ? c.badge : "bg-slate-100 text-slate-500"}`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className={`rounded-xl p-4 ${clr.bg}`}>
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-slate-500" />
            <span className="text-xs text-slate-500 font-medium">稼働中クライアント</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{uniqueClients}<span className="text-sm font-normal ml-1">社</span></p>
          <p className="text-xs text-slate-500 mt-1">全{tabAll.length}件中 {tabActive.length}件稼働</p>
        </div>
        <div className={`rounded-xl p-4 ${clr.bg}`}>
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span className="text-xs text-slate-500 font-medium">{CURRENT_MONTH}稼働件数</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{tabThisMonth.length}<span className="text-sm font-normal ml-1">件</span></p>
          <p className="text-xs text-slate-500 mt-1">稼働中の当月分</p>
        </div>
        <div className={`rounded-xl p-4 ${clr.bg}`}>
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-slate-500" />
            <span className="text-xs text-slate-500 font-medium">{CURRENT_MONTH}売上合計</span>
          </div>
          <p className="text-xl font-bold text-slate-800">{yen(thisMonthSales)}</p>
          <p className="text-xs text-slate-500 mt-1">当月稼働案件の売上</p>
        </div>
        <div className={`rounded-xl p-4 ${clr.bg}`}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-slate-500" />
            <span className="text-xs text-slate-500 font-medium">{CURRENT_MONTH}粗利合計</span>
          </div>
          <p className="text-xl font-bold text-slate-800">{yen(thisMonthProfit)}</p>
          <p className="text-xs text-slate-500 mt-1">当月稼働案件の粗利</p>
        </div>
      </div>

      {/* 稼働中クライアント一覧 */}
      {tabActive.length === 0 ? (
        <div className="text-center py-16 text-slate-400 bg-slate-50 rounded-xl">
          <BarChart2 className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">稼働中の案件はありません</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-semibold text-slate-600">クライアント</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">商品</th>
                <th className="text-center px-3 py-3 font-semibold text-slate-600">ランク</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">売上</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">粗利</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">計上月</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">契約形態</th>
                <th className="text-left px-3 py-3 font-semibold text-slate-600">契約日</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {tabActive.map((c, i) => {
                const isThisMonth = c.months.includes(CURRENT_MONTH)
                return (
                  <tr
                    key={i}
                    className={`border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors ${
                      isThisMonth ? "" : "opacity-60"
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-slate-800">
                      <div className="flex items-center gap-2">
                        {isThisMonth && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${clr.dot}`} />}
                        {c.client}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{c.product}</td>
                    <td className="px-3 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${RANK_BADGE[c.rank] ?? "bg-slate-100 text-slate-500"}`}>
                        {c.rank}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{yen(c.sales)}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{yen(c.profit)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {c.months.map(m => (
                          <span
                            key={m}
                            className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                              m === CURRENT_MONTH ? `${clr.badge}` : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {m}
                          </span>
                        ))}
                        {c.months.length === 0 && <span className="text-xs text-slate-400">-</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{c.contractType}</td>
                    <td className="px-3 py-3 text-slate-500 text-xs whitespace-nowrap">{c.contractDate}</td>
                    <td className="px-3 py-3">
                      <a
                        href={c.editUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-blue-500 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 全媒体サマリー */}
      <div className="mt-8">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">全商材サマリー（{CURRENT_MONTH}）</h2>
        <div className="grid grid-cols-5 gap-3">
          {MEDIA_TABS.map(tab => {
            const c = COLOR[tab.color]
            const active = data.clients.filter(cl => cl.media === tab.key && ACTIVE_RANKS.includes(cl.rank))
            const thisMonth = active.filter(cl => cl.months.includes(CURRENT_MONTH))
            const sales = thisMonth.reduce((s, cl) => s + cl.sales, 0)
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  activeTab === tab.key ? `border-2 ${c.tab}` : "border-slate-100 bg-white hover:border-slate-200"
                }`}
              >
                <p className="text-xs font-semibold text-slate-600 mb-1">{tab.label}</p>
                <p className="text-lg font-bold text-slate-800">{new Set(active.map(cl => cl.client)).size}<span className="text-xs font-normal ml-1">社</span></p>
                <p className="text-xs text-slate-500">{sales > 0 ? yen(sales) : "稼働なし"}</p>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
