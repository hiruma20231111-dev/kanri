"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { FileText, Plus, Trash2, Printer, X } from "lucide-react"

/* ────────────────────────────────────
   共通ユーティリティ
──────────────────────────────────── */
let _uid = 1
const uid = () => _uid++

const toReiwa = (d: Date) => {
  const y = d.getFullYear()
  const reiwa = y - 2018
  return `令和${reiwa}年${d.getMonth() + 1}月${d.getDate()}日`
}

const yen = (n: number) => n === 0 ? "" : `¥${n.toLocaleString("ja-JP")}`

const inputCls = "w-full px-2 py-1 focus:outline-none focus:bg-blue-50 bg-transparent"
const lineCls  = "border-b border-slate-300 focus:border-blue-500 focus:outline-none bg-transparent"

/* ─── 備考欄: 複数行対応 ─── */
interface MemoRow { id: number; text: string }

function MemoSection({ rows, onChange }: {
  rows: MemoRow[]
  onChange: (rows: MemoRow[]) => void
}) {
  const addRow = () => onChange([...rows, { id: uid(), text: "" }])
  const delRow = (id: number) => { if (rows.length > 1) onChange(rows.filter(r => r.id !== id)) }
  const updRow = (id: number, text: string) => onChange(rows.map(r => r.id === id ? { ...r, text } : r))

  return (
    <div className="mb-4 text-sm">
      <span className="font-semibold">備考</span>
      <div className="mt-1 space-y-0.5">
        {rows.map((r, i) => (
          <div key={r.id} className="flex items-center gap-1">
            <span className="text-slate-400 text-xs w-4 text-right print:hidden">{i + 1}</span>
            <input
              value={r.text}
              onChange={e => updRow(r.id, e.target.value)}
              className={`flex-1 ${lineCls}`}
              placeholder="備考を入力"
            />
            <button
              onClick={() => delRow(r.id)}
              disabled={rows.length <= 1}
              className="print:hidden text-slate-300 hover:text-red-400 disabled:opacity-20 ml-1"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={addRow}
        className="print:hidden flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mt-1"
      >
        <Plus className="w-3 h-3" />行を追加
      </button>
    </div>
  )
}

/* ────────────────────────────────────
   Template 1: 汎用御見積書
──────────────────────────────────── */
interface GeneralRow { id: number; name: string; unitPrice: string; qty: string }

function GeneralEstimate({ defaultPerson }: { defaultPerson: string }) {
  const [customer, setCustomer] = useState("")
  const [person,   setPerson]   = useState("")
  const [dateStr,  setDateStr]  = useState(toReiwa(new Date()))
  const [no,       setNo]       = useState("1")
  const [title,    setTitle]    = useState("")
  const [payment,  setPayment]  = useState("貴社支払い条件に準ずる。")
  const [expiry,   setExpiry]   = useState("ご提示より1か月間")
  const [memoRows, setMemoRows] = useState<MemoRow[]>([{ id: uid(), text: "" }])
  const [rows, setRows] = useState<GeneralRow[]>(() =>
    Array.from({ length: 8 }, () => ({ id: uid(), name: "", unitPrice: "", qty: "" }))
  )

  useEffect(() => { if (defaultPerson && !person) setPerson(defaultPerson) }, [defaultPerson])

  const calcRow  = (r: GeneralRow) => (parseFloat(r.unitPrice) || 0) * (parseFloat(r.qty) || 0)
  const subtotal = rows.reduce((s, r) => s + calcRow(r), 0)
  const tax      = Math.floor(subtotal * 0.1)
  const total    = subtotal + tax

  const upd = (id: number, f: keyof GeneralRow, v: string) =>
    setRows(p => p.map(r => r.id === id ? { ...r, [f]: v } : r))

  return (
    <div className="bg-white border border-slate-300 p-8 print:p-4 print:border-0">
      {/* タイトル */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold mb-3">御　見　積　書</h2>
          <div className="flex items-baseline gap-2 text-base">
            <input value={customer} onChange={e => setCustomer(e.target.value)}
              placeholder="顧客会社名" className={`w-64 ${lineCls}`} />
            <span className="font-medium">御中</span>
          </div>
          {title && <p className="text-sm mt-2 text-slate-600">ご提案：{title}</p>}
        </div>
        <div className="text-right text-sm leading-7">
          <div className="flex items-center gap-2 justify-end mb-0.5">
            <span className="text-slate-500 text-xs">日付</span>
            <input value={dateStr} onChange={e => setDateStr(e.target.value)} className={`w-40 text-right ${lineCls}`} />
          </div>
          <div className="flex items-center gap-2 justify-end mb-0.5">
            <span className="text-slate-500 text-xs">No.</span>
            <input value={no} onChange={e => setNo(e.target.value)} className={`w-16 text-right ${lineCls}`} />
          </div>
          <p className="font-bold">(株)関西ぱど</p>
          <input value={person} onChange={e => setPerson(e.target.value)} className={`w-40 text-right ${lineCls}`} placeholder="担当者名" />
        </div>
      </div>

      {/* 税込総金額（上部） */}
      <div className="flex items-center gap-4 mb-5 py-3 border-y border-slate-200">
        <span className="font-semibold">税込総金額</span>
        <span className="text-xl font-bold">￥ {total.toLocaleString("ja-JP")}</span>
      </div>

      <p className="text-sm text-slate-600 mb-1">下記の通りお見積申し上げます</p>
      <p className="text-sm text-slate-600 mb-4">ご検討の上何卒御用命を賜りますよう、よろしくお願い申し上げます。</p>

      {/* 件名 */}
      <div className="flex items-center gap-2 text-sm mb-4">
        <span className="font-semibold whitespace-nowrap">件名：</span>
        <input value={title} onChange={e => setTitle(e.target.value)} className={`flex-1 ${lineCls}`} />
      </div>

      {/* 明細テーブル */}
      <table className="w-full border-collapse text-sm mb-2">
        <thead>
          <tr className="bg-slate-100">
            {["品　　　名", "単　価", "数　量", "金　額"].map(h => (
              <th key={h} className="border border-slate-300 px-3 py-2 text-center font-semibold">{h}</th>
            ))}
            <th className="border border-slate-300 w-6 print:hidden" />
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id} className="hover:bg-slate-50">
              <td className="border border-slate-300 p-0">
                <input value={r.name} onChange={e => upd(r.id, "name", e.target.value)}
                  className={`${inputCls} px-3`} />
              </td>
              <td className="border border-slate-300 p-0 w-28">
                <input type="number" value={r.unitPrice} onChange={e => upd(r.id, "unitPrice", e.target.value)}
                  className={`${inputCls} text-right px-2`} />
              </td>
              <td className="border border-slate-300 p-0 w-20">
                <input type="number" value={r.qty} onChange={e => upd(r.id, "qty", e.target.value)}
                  className={`${inputCls} text-right px-2`} />
              </td>
              <td className="border border-slate-300 px-3 py-1.5 text-right w-28">
                {yen(calcRow(r))}
              </td>
              <td className="border border-slate-300 px-1 py-1 text-center print:hidden">
                <button onClick={() => setRows(p => p.filter(x => x.id !== r.id))}
                  disabled={rows.length <= 1}
                  className="text-slate-300 hover:text-red-400 disabled:opacity-20">
                  <Trash2 className="w-3 h-3" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          {[["小         計", yen(subtotal)], ["消 費 税 額", yen(tax)], ["税込総金額", total > 0 ? `¥${total.toLocaleString("ja-JP")}` : "¥0"]].map(([label, val], i) => (
            <tr key={label} className={i === 2 ? "font-bold bg-slate-50" : ""}>
              <td colSpan={3} className="border border-slate-300 px-3 py-2 text-right">{label}</td>
              <td className="border border-slate-300 px-3 py-2 text-right">{val}</td>
              <td className="border border-slate-300 print:hidden" />
            </tr>
          ))}
        </tfoot>
      </table>
      <button onClick={() => setRows(p => [...p, { id: uid(), name: "", unitPrice: "", qty: "" }])}
        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mb-5 print:hidden">
        <Plus className="w-3 h-3" />行を追加
      </button>

      {/* 備考（複数行対応） */}
      <MemoSection rows={memoRows} onChange={setMemoRows} />

      {/* 支払条件・有効期限 */}
      <div className="text-sm space-y-2">
        <div className="flex items-center gap-3">
          <span className="font-semibold whitespace-nowrap w-28">支払条件　：</span>
          <input value={payment} onChange={e => setPayment(e.target.value)} className={`flex-1 ${lineCls}`} />
        </div>
        <div className="flex items-center gap-3">
          <span className="font-semibold whitespace-nowrap w-28">見積有効期限：</span>
          <input value={expiry} onChange={e => setExpiry(e.target.value)} className={`flex-1 ${lineCls}`} />
        </div>
      </div>
    </div>
  )
}

/* ────────────────────────────────────
   Template 2: 誌面広告見積り兼申込書
──────────────────────────────────── */
interface MediaRow { id: number; version: string; content: string; area: string; listPrice: string; discount: string; memo: string }

function MediaEstimate() {
  const [customer, setCustomer] = useState("")
  const [dateStr,  setDateStr]  = useState(toReiwa(new Date()))
  const [subject,  setSubject]  = useState("まみたん誌面")
  const [expiry,   setExpiry]   = useState("ご提案から1ヶ月間")
  const [company,  setCompany]  = useState("")
  const [contact,  setContact]  = useState("")
  const [bikoRows, setBikoRows] = useState<MemoRow[]>([{ id: uid(), text: "" }])
  const [rows, setRows] = useState<MediaRow[]>(() => Array.from({ length: 5 }, () => ({
    id: uid(), version: "", content: "", area: "", listPrice: "", discount: "", memo: ""
  })))

  const calcRow   = (r: MediaRow) => (parseFloat(r.listPrice) || 0) - (parseFloat(r.discount) || 0)
  const totalTax  = rows.reduce((s, r) => s + calcRow(r), 0)
  const totalList = rows.reduce((s, r) => s + (parseFloat(r.listPrice) || 0), 0)
  const totalDisc = rows.reduce((s, r) => s + (parseFloat(r.discount) || 0), 0)

  const upd = (id: number, f: keyof MediaRow, v: string) =>
    setRows(p => p.map(r => r.id === id ? { ...r, [f]: v } : r))

  return (
    <div className="bg-white border border-slate-300 p-8 print:p-4 print:border-0">
      <div className="flex justify-between items-start mb-5">
        <div className="flex items-baseline gap-2">
          <input value={customer} onChange={e => setCustomer(e.target.value)}
            placeholder="顧客会社名" className={`text-base font-semibold w-64 ${lineCls}`} />
          <span className="font-medium">御中</span>
        </div>
        <input value={dateStr} onChange={e => setDateStr(e.target.value)}
          className={`w-44 text-right text-sm ${lineCls}`} />
      </div>

      <div className="space-y-2 mb-5 text-sm">
        <div className="flex items-center gap-2">
          <span className="font-semibold w-20">件  名：</span>
          <input value={subject} onChange={e => setSubject(e.target.value)} className={`flex-1 ${lineCls}`} />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold w-20">有効期限：</span>
          <input value={expiry} onChange={e => setExpiry(e.target.value)} className={`flex-1 ${lineCls}`} />
        </div>
      </div>

      <div className="flex items-center gap-3 mb-5 py-2 border-y border-slate-200">
        <span className="font-semibold">御掲載料金</span>
        <span className="text-lg font-bold">{totalTax > 0 ? `¥${totalTax.toLocaleString("ja-JP")}` : "¥0"}</span>
        <span className="text-sm text-slate-500">（税別）</span>
      </div>

      <table className="w-full border-collapse text-xs mb-2">
        <thead>
          <tr className="bg-slate-100">
            {["掲載版", "内容", "配布エリア", "定価（税別）", "割引", "金額（税別）", "備考"].map(h => (
              <th key={h} className="border border-slate-300 px-2 py-1.5 text-center font-semibold whitespace-nowrap">{h}</th>
            ))}
            <th className="border border-slate-300 w-5 print:hidden" />
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id} className="hover:bg-slate-50">
              {(["version", "content", "area"] as const).map(f => (
                <td key={f} className="border border-slate-300 p-0">
                  <input value={r[f]} onChange={e => upd(r.id, f, e.target.value)} className={inputCls} />
                </td>
              ))}
              <td className="border border-slate-300 p-0 w-24">
                <input type="number" value={r.listPrice} onChange={e => upd(r.id, "listPrice", e.target.value)}
                  className={`${inputCls} text-right`} />
              </td>
              <td className="border border-slate-300 p-0 w-20">
                <input type="number" value={r.discount} onChange={e => upd(r.id, "discount", e.target.value)}
                  className={`${inputCls} text-right`} />
              </td>
              <td className="border border-slate-300 px-2 py-1.5 text-right w-24 font-medium">
                {yen(calcRow(r))}
              </td>
              <td className="border border-slate-300 p-0 w-28">
                <input value={r.memo} onChange={e => upd(r.id, "memo", e.target.value)} className={inputCls} />
              </td>
              <td className="border border-slate-300 px-1 text-center print:hidden">
                <button onClick={() => setRows(p => p.filter(x => x.id !== r.id))}
                  disabled={rows.length <= 1}
                  className="text-slate-300 hover:text-red-400 disabled:opacity-20">
                  <Trash2 className="w-3 h-3" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-semibold">
            <td colSpan={3} className="border border-slate-300 px-2 py-1.5 text-right">合計</td>
            <td className="border border-slate-300 px-2 py-1.5 text-right">{yen(totalList)}</td>
            <td className="border border-slate-300 px-2 py-1.5 text-right">{yen(totalDisc)}</td>
            <td className="border border-slate-300 px-2 py-1.5 text-right">{yen(totalTax)}</td>
            <td className="border border-slate-300" /><td className="border border-slate-300 print:hidden" />
          </tr>
        </tfoot>
      </table>
      <button onClick={() => setRows(p => [...p, { id: uid(), version: "", content: "", area: "", listPrice: "", discount: "", memo: "" }])}
        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mb-5 print:hidden">
        <Plus className="w-3 h-3" />行を追加
      </button>

      {/* 備考（複数行対応） */}
      <MemoSection rows={bikoRows} onChange={setBikoRows} />

      <div className="border border-slate-300 p-4 text-sm">
        <p className="mb-3 text-slate-700">上記見積にて、発注致します。</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <span className="whitespace-nowrap">御社名</span>
            <input value={company} onChange={e => setCompany(e.target.value)} className={`flex-1 ${lineCls}`} />
          </div>
          <div className="border border-slate-300 text-center text-slate-400 text-xs py-4">印</div>
          <div className="flex items-center gap-2">
            <span className="whitespace-nowrap">ご担当者名</span>
            <input value={contact} onChange={e => setContact(e.target.value)} className={`flex-1 ${lineCls}`} />
          </div>
        </div>
      </div>
      <div className="mt-3 text-xs text-slate-500 space-y-0.5">
        <p>※お手数ですが、上記必要事項をご記入の上、FAXにてご返送下さい。</p>
        <p>※双方の確認の文書となりますので、必ず控えをご保管下さい。</p>
        <p>※本書は掲載の申込として使用され、ぱど側の掲載承諾によって契約が成立するものとします。</p>
      </div>
    </div>
  )
}

/* ────────────────────────────────────
   Template 3: ポスティング見積書
──────────────────────────────────── */
interface PostRow {
  id: number; method: string; area: string; size: string
  deliveryDate: string; arrivalDate: string; qty: string; unitPrice: string; deliveryTo: string
}

function PostingEstimate() {
  const [customer, setCustomer] = useState("")
  const [dateStr,  setDateStr]  = useState(toReiwa(new Date()))
  const [subject,  setSubject]  = useState("単独ポスティング　軒並配布 金額一覧")
  const [expiry,   setExpiry]   = useState("")
  const [bikoRows, setBikoRows] = useState<MemoRow[]>([
    { id: uid(), text: "●納品先：" },
    { id: uid(), text: "住所：" },
    { id: uid(), text: "平日9時～17時納品可" },
    { id: uid(), text: "月～金で配布、前週（金）までに納品" },
  ])
  const [company, setCompany] = useState("")
  const [contact, setContact] = useState("")
  const [rows, setRows] = useState<PostRow[]>(() => [
    { id: uid(), method: "軒並配布", area: "", size: "A4", deliveryDate: "", arrivalDate: "", qty: "", unitPrice: "4.5", deliveryTo: "" }
  ])

  const calcRow    = (r: PostRow) => (parseFloat(r.qty) || 0) * (parseFloat(r.unitPrice) || 0)
  const totalQty   = rows.reduce((s, r) => s + (parseFloat(r.qty) || 0), 0)
  const totalPrice = rows.reduce((s, r) => s + calcRow(r), 0)

  const upd = (id: number, f: keyof PostRow, v: string) =>
    setRows(p => p.map(r => r.id === id ? { ...r, [f]: v } : r))

  return (
    <div className="bg-white border border-slate-300 p-8 print:p-4 print:border-0">
      <div className="flex justify-between items-start mb-5">
        <div className="flex items-baseline gap-2">
          <input value={customer} onChange={e => setCustomer(e.target.value)}
            placeholder="顧客会社名" className={`text-base font-semibold w-64 ${lineCls}`} />
          <span className="font-medium">御中</span>
        </div>
        <input value={dateStr} onChange={e => setDateStr(e.target.value)}
          className={`w-44 text-right text-sm ${lineCls}`} />
      </div>

      <div className="space-y-2 mb-5 text-sm">
        <div className="flex items-center gap-2">
          <span className="font-semibold w-20">件  名：</span>
          <input value={subject} onChange={e => setSubject(e.target.value)} className={`flex-1 ${lineCls}`} />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold w-20">有効期限：</span>
          <input value={expiry} onChange={e => setExpiry(e.target.value)} className={`flex-1 ${lineCls}`} />
        </div>
      </div>

      <div className="flex items-center gap-3 mb-5 py-2 border-y border-slate-200">
        <span className="font-semibold">配布料金</span>
        <span className="text-lg font-bold">{totalPrice > 0 ? `¥${totalPrice.toLocaleString("ja-JP")}` : "¥0"}</span>
        <span className="text-sm text-slate-500">（税別）</span>
      </div>

      <table className="w-full border-collapse text-xs mb-2">
        <thead>
          <tr className="bg-slate-100">
            {["配布方法", "配布エリア", "サイズ", "配布日", "納品日", "部数", "配布単価", "配布料金", "納品場所"].map(h => (
              <th key={h} className="border border-slate-300 px-1.5 py-1.5 text-center font-semibold whitespace-nowrap">{h}</th>
            ))}
            <th className="border border-slate-300 w-5 print:hidden" />
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id} className="hover:bg-slate-50">
              {(["method", "area", "size", "deliveryDate", "arrivalDate"] as const).map(f => (
                <td key={f} className="border border-slate-300 p-0">
                  <input value={r[f]} onChange={e => upd(r.id, f, e.target.value)}
                    className={`${inputCls} text-center`} />
                </td>
              ))}
              <td className="border border-slate-300 p-0 w-16">
                <input type="number" value={r.qty} onChange={e => upd(r.id, "qty", e.target.value)}
                  className={`${inputCls} text-right`} />
              </td>
              <td className="border border-slate-300 p-0 w-16">
                <input type="number" value={r.unitPrice} onChange={e => upd(r.id, "unitPrice", e.target.value)}
                  className={`${inputCls} text-right`} />
              </td>
              <td className="border border-slate-300 px-1.5 py-1.5 text-right w-20 font-medium">
                {yen(calcRow(r))}
              </td>
              <td className="border border-slate-300 p-0">
                <input value={r.deliveryTo} onChange={e => upd(r.id, "deliveryTo", e.target.value)}
                  className={inputCls} />
              </td>
              <td className="border border-slate-300 px-1 text-center print:hidden">
                <button onClick={() => setRows(p => p.filter(x => x.id !== r.id))}
                  disabled={rows.length <= 1}
                  className="text-slate-300 hover:text-red-400 disabled:opacity-20">
                  <Trash2 className="w-3 h-3" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-semibold">
            <td colSpan={5} className="border border-slate-300 px-2 py-1.5 text-right">合計</td>
            <td className="border border-slate-300 px-1.5 py-1.5 text-right">{totalQty.toLocaleString("ja-JP")}</td>
            <td className="border border-slate-300" />
            <td className="border border-slate-300 px-1.5 py-1.5 text-right">{yen(totalPrice)}</td>
            <td className="border border-slate-300" /><td className="border border-slate-300 print:hidden" />
          </tr>
        </tfoot>
      </table>
      <button onClick={() => setRows(p => [...p, { id: uid(), method: "軒並配布", area: "", size: "A4", deliveryDate: "", arrivalDate: "", qty: "", unitPrice: "4.5", deliveryTo: "" }])}
        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mb-5 print:hidden">
        <Plus className="w-3 h-3" />行を追加
      </button>

      {/* 備考（複数行対応） */}
      <MemoSection rows={bikoRows} onChange={setBikoRows} />

      <div className="border border-slate-300 p-4 text-sm">
        <p className="mb-3 text-slate-700">上記見積にて、発注致します。</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <span className="whitespace-nowrap">御社名</span>
            <input value={company} onChange={e => setCompany(e.target.value)} className={`flex-1 ${lineCls}`} />
          </div>
          <div className="border border-slate-300 text-center text-slate-400 text-xs py-4">印</div>
          <div className="flex items-center gap-2">
            <span className="whitespace-nowrap">ご担当者名</span>
            <input value={contact} onChange={e => setContact(e.target.value)} className={`flex-1 ${lineCls}`} />
          </div>
        </div>
      </div>
      <div className="mt-3 text-xs text-slate-500 space-y-0.5">
        <p>※お手数ですが、上記必要事項をご記入の上、FAXにてご返送下さい。</p>
        <p>※双方の確認の文書となりますので、必ず控えをご保管下さい。</p>
        <p>※本書は掲載の申込として使用され、ぱど側の掲載承諾によって契約が成立するものとします。</p>
      </div>
    </div>
  )
}

/* ────────────────────────────────────
   メインページ（テンプレート切替）
──────────────────────────────────── */
const TEMPLATES = [
  { key: "general", label: "汎用御見積書" },
  { key: "media",   label: "誌面広告見積書" },
  { key: "posting", label: "ポスティング見積書" },
] as const

type TemplateKey = typeof TEMPLATES[number]["key"]

export default function EstimatesPage() {
  const { data: session } = useSession()
  const [tmpl, setTmpl] = useState<TemplateKey>("general")

  const defaultPerson = session?.user?.name || ""

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 print:hidden">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <FileText className="w-6 h-6 text-blue-500" />
          見積書作成
        </h1>
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
            {TEMPLATES.map(t => (
              <button key={t.key} onClick={() => setTmpl(t.key)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  tmpl === t.key
                    ? "bg-white shadow text-blue-600"
                    : "text-slate-500 hover:text-slate-700"
                }`}>
                {t.label}
              </button>
            ))}
          </div>
          <button onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors">
            <Printer className="w-4 h-4" />
            PDF出力・印刷
          </button>
        </div>
      </div>

      {tmpl === "general"  && <GeneralEstimate defaultPerson={defaultPerson} />}
      {tmpl === "media"    && <MediaEstimate />}
      {tmpl === "posting"  && <PostingEstimate />}
    </div>
  )
}
