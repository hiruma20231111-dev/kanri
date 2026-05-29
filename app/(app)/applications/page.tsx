"use client"

import { useState } from "react"
import { ClipboardList, Plus, Trash2, Printer } from "lucide-react"

const OFFICES = {
  higashiosaka: {
    label: "東大阪オフィス",
    address: "東大阪市下小阪2-14-16　天正八戸ノ里ビル3F",
    tel: "TEL.06-6729-8101　FAX.06-6729-8102",
    payment: "末日締め翌月末支払い",
  },
  nishiku: {
    label: "大阪西区オフィス",
    address: "大阪市西区靭本町1丁目6-6　大阪華東ビル3F",
    tel: "TEL.06-6729-8101　FAX.06-6729-8102",
    payment: "20日締め翌月末支払い",
  },
} as const

type OfficeKey = keyof typeof OFFICES

interface LineItem {
  id: number
  category: string
  name: string
  period: string
  quantity: string
  unit: string
  unitPrice: string
}

let _id = 1
function newItem(): LineItem {
  return { id: _id++, category: "", name: "", period: "", quantity: "", unit: "式", unitPrice: "" }
}

const INITIAL_ROWS = 8

export default function ApplicationsPage() {
  const [office, setOffice] = useState<OfficeKey>("higashiosaka")
  const [customerName, setCustomerName] = useState("")
  const [projectName, setProjectName] = useState("")
  const [expiryDate, setExpiryDate] = useState("")
  const [salesPerson, setSalesPerson] = useState("比留間　信")
  const [agreed, setAgreed] = useState(false)
  const [orderDate, setOrderDate] = useState("")
  const [orderCompany, setOrderCompany] = useState("")
  const [orderAddress, setOrderAddress] = useState("")
  const [orderPerson, setOrderPerson] = useState("")
  const [orderTel, setOrderTel] = useState("")
  const [items, setItems] = useState<LineItem[]>(() =>
    Array.from({ length: INITIAL_ROWS }, newItem)
  )

  const officeData = OFFICES[office]

  const today = new Date().toLocaleDateString("ja-JP", {
    year: "numeric", month: "long", day: "numeric", weekday: "long",
  })

  function updateItem(id: number, field: keyof LineItem, value: string) {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item))
  }

  function calcAmount(item: LineItem): number {
    const q = parseFloat(item.quantity) || 0
    const p = parseFloat(item.unitPrice) || 0
    return q * p
  }

  const subtotal = items.reduce((sum, item) => sum + calcAmount(item), 0)
  const tax = Math.floor(subtotal * 0.1)
  const total = subtotal + tax

  const fmtYen = (n: number) =>
    n === 0 ? "" : `¥${n.toLocaleString("ja-JP")}`

  const inputCls =
    "w-full px-2 py-1 focus:outline-none focus:bg-blue-50 print:focus:bg-transparent"
  const fieldCls =
    "border-b border-slate-300 focus:border-blue-500 focus:outline-none print:border-slate-400"

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* 操作バー（印刷時非表示） */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-blue-500" />
          申込書作成
        </h1>
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
            {(Object.entries(OFFICES) as [OfficeKey, typeof OFFICES[OfficeKey]][]).map(([key, val]) => (
              <button
                key={key}
                onClick={() => setOffice(key)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  office === key
                    ? "bg-white shadow text-blue-600"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {val.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
          >
            <Printer className="w-4 h-4" />
            PDF出力・印刷
          </button>
        </div>
      </div>

      {/* 申込書本体 */}
      <div className="bg-white border border-slate-300 p-8 print:p-4 print:border-0 print:shadow-none">

        {/* タイトルヘッダー */}
        <div className="flex justify-between items-start mb-5">
          <div>
            <p className="text-xs text-slate-500 mb-2">作成日　{today}</p>
            <h2 className="text-2xl font-bold mb-4 pb-1 border-b-2 border-slate-900 inline-block pr-16">
              商品申込書
            </h2>
            <div className="flex items-baseline gap-2 mt-1">
              <input
                type="text"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="顧客会社名を入力"
                className={`text-base font-semibold w-72 ${fieldCls}`}
              />
              <span className="text-base font-medium">御中</span>
            </div>
          </div>
          <div className="text-right text-sm leading-6">
            <p className="font-bold text-base">株式会社関西ぱど</p>
            <p className="text-slate-600 text-xs">{officeData.address}</p>
            <p className="text-slate-600 text-xs">{officeData.tel}</p>
          </div>
        </div>

        {/* 案件情報 */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-5 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-semibold whitespace-nowrap">案件名：</span>
            <input
              type="text"
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
              className={`flex-1 ${fieldCls}`}
            />
          </div>
          <div className="flex items-center gap-2 justify-end">
            <span className="font-semibold whitespace-nowrap">担当／</span>
            <input
              type="text"
              value={salesPerson}
              onChange={e => setSalesPerson(e.target.value)}
              className={`w-32 text-right ${fieldCls}`}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold whitespace-nowrap">有効期限：</span>
            <input
              type="text"
              value={expiryDate}
              onChange={e => setExpiryDate(e.target.value)}
              placeholder={office === "nishiku" ? "発行日より1カ月" : "YYYY/MM/DD"}
              className={`w-40 ${fieldCls}`}
            />
          </div>
        </div>

        {/* 西区フォーマット：合計金額を上部に表示 */}
        {office === "nishiku" && (
          <div className="mb-4 text-sm flex items-center gap-3">
            <span className="font-semibold">合計金額(税込）</span>
            <span className="text-lg font-bold">
              {total > 0 ? `¥${total.toLocaleString("ja-JP")}` : "¥0"}
            </span>
          </div>
        )}

        {/* 明細テーブル */}
        <div className="mb-6">
          <p className="font-bold text-sm mb-2">■明細・金額</p>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100">
                {["No.", "区分", "項目名 / 内容", "期間 / 発行日 / 仕様", "数量", "単位", "単価", "金額"].map(h => (
                  <th key={h} className="border border-slate-300 px-2 py-1.5 text-center font-semibold whitespace-nowrap">
                    {h}
                  </th>
                ))}
                <th className="border border-slate-300 w-6 print:hidden" />
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const amount = calcAmount(item)
                return (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="border border-slate-300 px-2 py-0.5 text-center text-slate-400 w-8">
                      {idx + 1}
                    </td>
                    <td className="border border-slate-300 p-0 w-16">
                      <input value={item.category} onChange={e => updateItem(item.id, "category", e.target.value)}
                        className={inputCls} />
                    </td>
                    <td className="border border-slate-300 p-0">
                      <input value={item.name} onChange={e => updateItem(item.id, "name", e.target.value)}
                        className={inputCls} />
                    </td>
                    <td className="border border-slate-300 p-0 w-28">
                      <input value={item.period} onChange={e => updateItem(item.id, "period", e.target.value)}
                        className={inputCls} />
                    </td>
                    <td className="border border-slate-300 p-0 w-14">
                      <input type="number" value={item.quantity}
                        onChange={e => updateItem(item.id, "quantity", e.target.value)}
                        className={`${inputCls} text-right`} />
                    </td>
                    <td className="border border-slate-300 p-0 w-10">
                      <input value={item.unit} onChange={e => updateItem(item.id, "unit", e.target.value)}
                        className={`${inputCls} text-center`} />
                    </td>
                    <td className="border border-slate-300 p-0 w-24">
                      <input type="number" value={item.unitPrice}
                        onChange={e => updateItem(item.id, "unitPrice", e.target.value)}
                        className={`${inputCls} text-right`} />
                    </td>
                    <td className="border border-slate-300 px-2 py-1 text-right w-24 font-medium">
                      {fmtYen(amount)}
                    </td>
                    <td className="border border-slate-300 px-1 py-1 text-center print:hidden">
                      <button onClick={() => setItems(prev => prev.filter(i => i.id !== item.id))}
                        disabled={items.length <= 1}
                        className="text-slate-300 hover:text-red-400 disabled:opacity-20 transition-colors">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              {[
                { label: "小計", value: fmtYen(subtotal) },
                { label: "消費税（10%）", value: fmtYen(tax) },
              ].map(({ label, value }) => (
                <tr key={label}>
                  <td colSpan={7} className="border border-slate-300 px-2 py-1.5 text-right text-sm">{label}</td>
                  <td className="border border-slate-300 px-2 py-1.5 text-right text-sm">{value}</td>
                  <td className="border border-slate-300 print:hidden" />
                </tr>
              ))}
              <tr className="bg-slate-50 font-bold">
                <td colSpan={7} className="border border-slate-300 px-2 py-2 text-right">
                  合計金額（税込）
                </td>
                <td className="border border-slate-300 px-2 py-2 text-right">
                  {total > 0 ? `¥${total.toLocaleString("ja-JP")}` : "¥0"}
                </td>
                <td className="border border-slate-300 print:hidden" />
              </tr>
            </tfoot>
          </table>
          <button
            onClick={() => setItems(prev => [...prev, newItem()])}
            className="mt-2 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors print:hidden"
          >
            <Plus className="w-3 h-3" />
            行を追加
          </button>
        </div>

        {/* 支払条件 */}
        <div className="mb-5 text-sm">
          <p className="font-bold mb-1.5">■支払条件</p>
          <div className="flex items-center gap-6">
            <span>支払条件</span>
            <span className="ml-4">☑{officeData.payment}</span>
          </div>
        </div>

        {/* 発注・確認事項 */}
        <div className="mb-5">
          <p className="font-bold text-sm mb-2">■発注・契約の申し込み</p>
          <p className="text-xs text-slate-600 mb-3">
            下記「確認事項」および、商品ごとに定められた「別紙利用規約・重要事項説明書」の内容を確認し、同意の上で申し込みます。
          </p>
          <div className="border border-slate-200 bg-slate-50 rounded p-3 text-xs text-slate-600 space-y-1.5">
            <p className="font-semibold text-slate-700">【確認事項】</p>
            <p>1. 契約の成立: 本書は広告掲載および業務委託の申込みとして使用され、株式会社関西ぱど側の承諾によって契約が成立するものとします。</p>
            <p>2. 反社会的勢力の排除: 申込者が反社会的勢力及び、反社会的勢力に協力・関与していることが判明した場合は申込をお断りいたします。</p>
            <p>3. 別紙の適用: 本申込書に記載のない事項については、各サービスの利用規約（確認書）または重要事項説明書（別紙）の規定が適用されます。</p>
            <p>4. 申込者が代表者であること、または代表者より本契約に関する権限を委任されていることを確認・保証の上、申し込むものとします。</p>
          </div>
          <label className="flex items-center gap-2 mt-3 cursor-pointer text-xs">
            <input
              type="checkbox"
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
              className="w-4 h-4 cursor-pointer"
            />
            <span className={agreed ? "text-slate-800 font-medium" : "text-slate-500"}>
              上記内容および別紙利用規約に同意して発注します。（チェックを入れてください）
            </span>
          </label>
        </div>

        {/* 申込者情報 */}
        <div className="text-sm">
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 items-center">
            <div className="flex items-center gap-2">
              <span className="font-semibold w-28 whitespace-nowrap">申込日</span>
              <input type="text" value={orderDate} onChange={e => setOrderDate(e.target.value)}
                placeholder="YYYY/MM/DD" className={`flex-1 ${fieldCls}`} />
            </div>
            <div />
            <div className="flex items-center gap-2">
              <span className="font-semibold w-28 whitespace-nowrap">会社名</span>
              <input type="text" value={orderCompany} onChange={e => setOrderCompany(e.target.value)}
                className={`flex-1 ${fieldCls}`} />
            </div>
            <div className="border border-slate-300 text-center text-slate-400 text-xs py-5">
              社印
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold w-28 whitespace-nowrap">住所</span>
              <input type="text" value={orderAddress} onChange={e => setOrderAddress(e.target.value)}
                className={`flex-1 ${fieldCls}`} />
            </div>
            <div />
            <div className="flex items-center gap-2">
              <span className="font-semibold w-28 whitespace-nowrap">担当者名</span>
              <input type="text" value={orderPerson} onChange={e => setOrderPerson(e.target.value)}
                className={`flex-1 ${fieldCls}`} />
              <span className="text-slate-400 ml-2">印</span>
            </div>
            <div />
            <div className="flex items-center gap-2">
              <span className="font-semibold w-28 whitespace-nowrap">連絡先（TEL）</span>
              <input type="text" value={orderTel} onChange={e => setOrderTel(e.target.value)}
                className={`flex-1 ${fieldCls}`} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
