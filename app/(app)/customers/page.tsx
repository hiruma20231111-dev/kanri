"use client"

import { useEffect, useState } from "react"
import { Customer } from "@/types"
import { useRouter } from "next/navigation"
import {
  Users,
  Plus,
  RefreshCw,
  Loader2,
  Mail,
  Phone,
  Sparkles,
  ClipboardList,
  X,
  CheckCircle2,
} from "lucide-react"

const ACTION_TYPES = ["打合せ案内", "更新提案", "追加提案アポ"] as const
type ActionType = typeof ACTION_TYPES[number]

const STATUS_LABELS = {
  active: { label: "利用中", color: "bg-green-100 text-green-700" },
  prospect: { label: "見込み", color: "bg-amber-100 text-amber-700" },
  inactive: { label: "休眠", color: "bg-slate-100 text-slate-500" },
}

export default function CustomersPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [emailModal, setEmailModal] = useState<{
    customer: Customer
    action: ActionType
    email: { subject: string; body: string } | null
    loading: boolean
  } | null>(null)

  const [form, setForm] = useState({
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    services: "",
    status: "prospect" as Customer["status"],
    notes: "",
    nextAction: "",
  })

  async function fetchCustomers() {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/sheets")
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setCustomers(data.customers || [])
      if (data.warning) setError(data.warning)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCustomers() }, [])

  async function saveCustomer() {
    setSaving(true)
    try {
      const res = await fetch("/api/sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          services: form.services.split(",").map((s) => s.trim()).filter(Boolean),
        }),
      })
      const data = await res.json()
      if (data.success) {
        setShowForm(false)
        setForm({ companyName: "", contactName: "", email: "", phone: "", services: "", status: "prospect", notes: "", nextAction: "" })
        fetchCustomers()
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  async function generateEmail(customer: Customer, action: ActionType) {
    setEmailModal({ customer, action, email: null, loading: true })
    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "actionEmail",
          customerName: customer.companyName,
          contactName: customer.contactName,
          services: customer.services.join(", "),
          actionType: action,
        }),
      })
      const data = await res.json()
      setEmailModal((prev) => prev ? { ...prev, email: data, loading: false } : null)
    } catch (e) {
      setEmailModal((prev) => prev ? { ...prev, loading: false } : null)
    }
  }

  const activeCustomers = customers.filter((c) => c.status === "active")
  const prospectCustomers = customers.filter((c) => c.status !== "active")

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-500" />
            顧客管理
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {customers.length}社 · Googleスプレッドシートと同期
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchCustomers}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            更新
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            新規登録
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-700 text-sm mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
          <p className="text-slate-500 text-sm">顧客データを読み込み中...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 利用中顧客 */}
          {activeCustomers.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
                サービス利用中（{activeCustomers.length}社）
              </h2>
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">会社名</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">担当者</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">サービス</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">アクション</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeCustomers.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">{c.companyName}</p>
                          {c.email && (
                            <a href={`mailto:${c.email}`} className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-500 mt-0.5">
                              <Mail className="w-3 h-3" />
                              {c.email}
                            </a>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-slate-700">{c.contactName}</p>
                          {c.phone && (
                            <span className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                              <Phone className="w-3 h-3" />
                              {c.phone}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {c.services.map((s, i) => (
                              <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-xs">
                                {s}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {ACTION_TYPES.map((action) => (
                              <button
                                key={action}
                                onClick={() => generateEmail(c, action)}
                                className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-50 hover:bg-purple-100 text-purple-600 rounded-lg transition-colors"
                              >
                                <Sparkles className="w-3 h-3" />
                                {action}
                              </button>
                            ))}
                            <button
                              onClick={() => {
                                const p = new URLSearchParams({
                                  company: c.companyName,
                                  contact: c.contactName,
                                  tel: c.phone || "",
                                  address: c.address || "",
                                })
                                router.push(`/applications?${p.toString()}`)
                              }}
                              className="flex items-center gap-1 px-2 py-1 text-xs bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition-colors"
                            >
                              <ClipboardList className="w-3 h-3" />
                              申込書作成
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* 見込み顧客 */}
          {prospectCustomers.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
                見込み・休眠（{prospectCustomers.length}社）
              </h2>
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">会社名</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">担当者</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">ステータス</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">次のアクション</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {prospectCustomers.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-900">{c.companyName}</td>
                        <td className="px-4 py-3 text-slate-700">{c.contactName}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_LABELS[c.status].color}`}>
                            {STATUS_LABELS[c.status].label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs hidden md:table-cell">{c.nextAction}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => {
                              const p = new URLSearchParams({
                                company: c.companyName,
                                contact: c.contactName,
                                tel: c.phone || "",
                                address: c.address || "",
                              })
                              router.push(`/applications?${p.toString()}`)
                            }}
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition-colors"
                          >
                            <ClipboardList className="w-3 h-3" />
                            申込書作成
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {customers.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center py-20">
              <Users className="w-12 h-12 text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium">顧客データがありません</p>
              <p className="text-slate-400 text-sm mt-1">GOOGLE_SHEETS_ID を設定してスプレッドシートと接続してください</p>
            </div>
          )}
        </div>
      )}

      {/* 新規登録フォーム */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold text-slate-900">新規顧客登録</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {[
                { key: "companyName", label: "会社名 *", placeholder: "株式会社〇〇" },
                { key: "contactName", label: "担当者名 *", placeholder: "山田 太郎" },
                { key: "email", label: "メールアドレス", placeholder: "example@company.com" },
                { key: "phone", label: "電話番号", placeholder: "06-0000-0000" },
                { key: "services", label: "利用サービス", placeholder: "DOMOぱど, ワガシャdeDOMO" },
                { key: "nextAction", label: "次のアクション", placeholder: "〇月に更新提案" },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
                  <input
                    type="text"
                    placeholder={placeholder}
                    value={(form as any)[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">ステータス</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Customer["status"] }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="prospect">見込み</option>
                  <option value="active">利用中</option>
                  <option value="inactive">休眠</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 text-sm hover:bg-slate-50"
              >
                キャンセル
              </button>
              <button
                onClick={saveCustomer}
                disabled={saving || !form.companyName}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                登録する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* メール生成モーダル */}
      {emailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold text-slate-900">
                {emailModal.action}メール ·{" "}{emailModal.customer.companyName}
              </h2>
              <button onClick={() => setEmailModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {emailModal.loading ? (
                <div className="flex items-center gap-2 text-slate-500 py-8 justify-center">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Gemini AIが文案を生成中...
                </div>
              ) : emailModal.email ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">件名</label>
                    <input
                      type="text"
                      defaultValue={emailModal.email.subject}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">本文</label>
                    <textarea
                      defaultValue={emailModal.email.body}
                      rows={8}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                  <p className="text-xs text-slate-400">※ Gmailで開いて送信 or コピーしてご利用ください</p>
                </>
              ) : null}
            </div>
            <div className="p-6 border-t flex justify-end">
              <button
                onClick={() => setEmailModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
