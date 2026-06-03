"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { ClipboardList, Plus, Trash2, Printer } from "lucide-react"

/* ─── フォーム種別 ──────────────────────────────────────── */
type FT = "general" | "hplp" | "monthly" | "server"

const CFG = {
  general: { label: "汎用申込書",                   showPreTotal: false, rows: 8  },
  hplp:    { label: "HP・LP制作費",                 showPreTotal: true,  rows: 10 },
  monthly: { label: "月額保守費",                   showPreTotal: false, rows: 11 },
  server:  { label: "サーバーレンタル・ドメイン費", showPreTotal: false, rows: 10 },
} as const

/* ─── 明細行 ─────────────────────────────────────────────── */
interface Row { id: number; cat: string; name: string; period: string; qty: string; unit: string; price: string }
let _id = 1
const newRow = (): Row => ({ id: _id++, cat: "", name: "", period: "", qty: "", unit: "式", price: "" })
const makeRows = (n: number) => Array.from({ length: n }, newRow)

/* ─── 印刷対応フィールド ─────────────────────────────────── */
/* 画面: input / 印刷: div で全文を表示（truncate しない） */
function F({ v, set, ph = "", cls = "" }: { v: string; set: (s: string) => void; ph?: string; cls?: string }) {
  return (
    <div className={cls}>
      <input type="text" value={v} onChange={e => set(e.target.value)} placeholder={ph}
        className="w-full bg-transparent focus:outline-none focus:bg-blue-50 print:hidden" />
      <div className="hidden print:block break-words whitespace-pre-wrap leading-tight min-h-[1em]">
        {v || " "}
      </div>
    </div>
  )
}

/* テーブルセル用 */
function CF({ v, set, num = false, center = false }: { v: string; set: (s: string) => void; num?: boolean; center?: boolean }) {
  const align = center ? "text-center" : num ? "text-right" : ""
  return (
    <>
      <input type={num ? "number" : "text"} value={v} onChange={e => set(e.target.value)}
        className={`w-full bg-transparent focus:outline-none focus:bg-blue-50 px-0.5 print:hidden ${align}`} />
      <div className={`hidden print:block break-words whitespace-pre-wrap min-h-[0.9em] px-0.5 ${align}`}>
        {v || " "}
      </div>
    </>
  )
}

/* ─── メインコンポーネント ────────────────────────────────── */
export default function ApplicationsPage() {
  const { data: session } = useSession()
  const [ft,       setFt]      = useState<FT>("general")
  const [cust,     setCust]    = useState("")
  const [proj,     setProj]    = useState("")
  const [tanto,    setTanto]   = useState("")
  const [agreed,   setAgreed]  = useState(false)
  const [oDate,    setODate]   = useState("")
  const [oCo,      setOCo]     = useState("")
  const [oAddr,    setOAddr]   = useState("")
  const [oPer,     setOPer]    = useState("")
  const [oTel,     setOTel]    = useState("")
  const [payText,  setPayText] = useState("")   // 汎用・月額・サーバー用フリーテキスト
  const [payDate1, setPayDate1] = useState("")  // HP/LP 着手金支払日
  const [payDate2, setPayDate2] = useState("")  // HP/LP 中間金支払日
  const [payDate3, setPayDate3] = useState("")  // HP/LP 最終金支払日
  const [rows,     setRows]    = useState<Row[]>(() => makeRows(CFG.general.rows))

  const cfg = CFG[ft]

  /* フォーム切替時に支払条件・明細をリセット */
  useEffect(() => {
    setPayText(""); setPayDate1(""); setPayDate2(""); setPayDate3("")
    setRows(makeRows(cfg.rows))
  }, [ft])

  useEffect(() => {
    if (session?.user?.name && !tanto) setTanto(session.user.name)
  }, [session?.user?.name])

  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    if (p.get("company"))  { setCust(p.get("company")!); setOCo(p.get("company")!) }
    if (p.get("contact"))  setOPer(p.get("contact")!)
    if (p.get("tel"))      setOTel(p.get("tel")!)
    if (p.get("address"))  setOAddr(p.get("address")!)
  }, [])

  const upd = (id: number, k: keyof Row, val: string) =>
    setRows(p => p.map(r => r.id === id ? { ...r, [k]: val } : r))
  const calc  = (r: Row) => (parseFloat(r.qty) || 0) * (parseFloat(r.price) || 0)
  const sub   = rows.reduce((s, r) => s + calc(r), 0)
  const tax   = Math.floor(sub * 0.1)
  const total = sub + tax
  const fmt   = (n: number) => n.toLocaleString("ja-JP")

  const today = new Date().toLocaleDateString("ja-JP", {
    year: "numeric", month: "long", day: "numeric", weekday: "long",
  })

  /* セル共通クラス */
  const td  = "border border-slate-400 text-xs"
  const thc = `${td} bg-slate-100 text-center py-0.5 px-1 font-semibold`

  return (
    <>
      {/* ── 印刷CSS ──────────────────────────────────── */}
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 8mm 10mm; }
          body * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .pf { font-size: 8.5pt !important; }
          .pf td, .pf th { padding: 1px 2px !important; font-size: 8pt !important; line-height: 1.3 !important; }
          .pf .hdr { padding: 3px 5px !important; }
          .pf .conf { font-size: 7.5pt !important; line-height: 1.25 !important; padding: 2px 3px !important; }
        }
      `}</style>

      <div className="p-4 max-w-5xl mx-auto">

        {/* ── 操作バー ─────────────────────────────────── */}
        <div className="flex items-center justify-between mb-3 print:hidden">
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-blue-500" />申込書作成
          </h1>
          <button onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-sm font-medium">
            <Printer className="w-4 h-4" />PDF出力・印刷
          </button>
        </div>

        {/* ── タブ ─────────────────────────────────────── */}
        <div className="flex border-b border-slate-300 mb-4 print:hidden">
          {(Object.entries(CFG) as [FT, typeof CFG.hplp][]).map(([key, c]) => (
            <button key={key} onClick={() => setFt(key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                ft === key ? "border-blue-600 text-blue-600 bg-blue-50" : "border-transparent text-slate-500 hover:text-slate-700"
              }`}>
              {c.label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════
            申込書本体（印刷対象）
        ══════════════════════════════════════════════ */}
        <div className="bg-white border border-slate-400 pf" style={{ fontSize: "12px" }}>

          {/* 作成日 */}
          <div className="flex justify-end px-3 py-0.5 text-xs border-b border-slate-300">
            作成日　{today}
          </div>

          {/* タイトル */}
          <div className="text-center font-bold py-1 border-b border-slate-300" style={{ fontSize: "13px" }}>
            商品申込書
          </div>

          {/* ヘッダー左右 */}
          <div className="grid grid-cols-2 border-b border-slate-300">
            {/* 左：宛先 */}
            <div className="border-r border-slate-300 px-3 py-1.5 space-y-1 hdr">
              <div className="flex items-end gap-1">
                <F v={cust} set={setCust} ph="会社名・お客様名" cls="flex-1 border-b border-slate-400" />
                <span className="font-bold whitespace-nowrap ml-1">御中</span>
              </div>
              <div className="flex items-end gap-1">
                <span className="text-xs whitespace-nowrap">案件名：</span>
                <F v={proj} set={setProj} ph="案件名" cls="flex-1 border-b border-slate-400" />
              </div>
              <div className="text-xs">有効期限：発行日より1カ月</div>
            </div>
            {/* 右：発行元 */}
            <div className="px-3 py-1.5 text-xs space-y-0.5 hdr">
              <p className="font-bold">株式会社関西ぱど</p>
              <p>大阪市西区靭本町1丁目6-6　大阪華東ビル3F</p>
              <p>TEL.06-6729-8101　FAX.06-6729-8102</p>
              <div className="flex items-end gap-1 mt-0.5">
                <span className="whitespace-nowrap">担当／</span>
                <F v={tanto} set={setTanto} ph="担当者名" cls="flex-1 border-b border-slate-400" />
              </div>
            </div>
          </div>

          {/* HP/LPのみ：合計金額サマリー */}
          {cfg.showPreTotal && (
            <div className="flex items-center px-3 py-1 border-b border-slate-300 text-xs bg-slate-50">
              <span className="font-bold">合計金額（税込）</span>
              <span className="ml-auto font-bold">{total > 0 ? `¥${fmt(total)}` : "¥0"}</span>
            </div>
          )}

          {/* 明細テーブル */}
          <div className="px-2 pt-1.5 pb-1 border-b border-slate-300">
            <p className="text-xs font-bold mb-1">■明細・金額</p>
            <table className="w-full border-collapse">
              <colgroup>
                <col style={{ width: "4%" }} />
                <col style={{ width: "9%" }} />
                <col style={{ width: "24%" }} />
                <col style={{ width: "25%" }} />
                <col style={{ width: "7%" }} />
                <col style={{ width: "6%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "13%" }} />
                <col className="print:hidden" style={{ width: "2.5rem" }} />
              </colgroup>
              <thead>
                <tr>
                  <th className={thc}>No.</th>
                  <th className={thc}>区分</th>
                  <th className={thc}>項目名 / 内容</th>
                  <th className={thc}>期間 / 発行日 / 仕様</th>
                  <th className={thc}>数量</th>
                  <th className={thc}>単位</th>
                  <th className={thc}>単価</th>
                  <th className={thc}>金額</th>
                  <th className={`${thc} print:hidden`}></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const amt = calc(row)
                  return (
                    <tr key={row.id}>
                      <td className={`${td} text-center text-slate-400 py-0.5`}>{idx + 1}</td>
                      <td className={`${td} p-0`}><CF v={row.cat}    set={v => upd(row.id, "cat",    v)} /></td>
                      <td className={`${td} p-0`}><CF v={row.name}   set={v => upd(row.id, "name",   v)} /></td>
                      <td className={`${td} p-0`}><CF v={row.period} set={v => upd(row.id, "period", v)} /></td>
                      <td className={`${td} p-0`}><CF v={row.qty}    set={v => upd(row.id, "qty",    v)} num center /></td>
                      <td className={`${td} p-0`}><CF v={row.unit}   set={v => upd(row.id, "unit",   v)} center /></td>
                      <td className={`${td} p-0`}><CF v={row.price}  set={v => upd(row.id, "price",  v)} num /></td>
                      <td className={`${td} text-right px-1 py-0.5`}>{amt > 0 ? fmt(amt) : ""}</td>
                      <td className={`${td} text-center print:hidden`}>
                        <button onClick={() => setRows(p => p.filter(r => r.id !== row.id))}
                          disabled={rows.length <= 1}
                          className="p-0.5 text-slate-300 hover:text-red-400 disabled:opacity-20">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {/* 合計3行 */}
                {[
                  ["小計",          fmt(sub)],
                  ["消費税（10%）",  fmt(tax)],
                ].map(([label, val]) => (
                  <tr key={label}>
                    <td colSpan={6} className={`${td} text-right px-2 py-0.5`}>{label}</td>
                    <td colSpan={2} className={`${td} text-right px-2 py-0.5`}>{val}</td>
                    <td className={`${td} print:hidden`} />
                  </tr>
                ))}
                <tr className="bg-slate-50 font-bold">
                  <td colSpan={6} className={`${td} text-right px-2 py-0.5`}>合計金額（税込）</td>
                  <td colSpan={2} className={`${td} text-right px-2 py-0.5`}>{fmt(total)}</td>
                  <td className={`${td} print:hidden`} />
                </tr>
              </tbody>
            </table>
            <button onClick={() => setRows(p => [...p, newRow()])}
              className="mt-1 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 print:hidden">
              <Plus className="w-3 h-3" />行を追加
            </button>
          </div>

          {/* 支払条件 */}
          <div className="px-3 py-1.5 border-b border-slate-300 text-xs">
            <p className="font-bold mb-1">■支払条件</p>
            {ft === "hplp" ? (
              /* HP・LP制作費：3段階の支払い */
              <div className="space-y-1">
                {([
                  ["着手金（50%）",      payDate1, setPayDate1],
                  ["中間金（30%）",      payDate2, setPayDate2],
                  ["納品後最終金（20%）", payDate3, setPayDate3],
                ] as [string, string, (v: string) => void][]).map(([label, val, setVal]) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className="w-32 whitespace-nowrap font-medium">{label}</span>
                    <span className="whitespace-nowrap">支払日：</span>
                    {/* 画面 */}
                    <input type="text" value={val} onChange={e => setVal(e.target.value)}
                      placeholder="YYYY/MM/DD"
                      className="border-b border-slate-400 focus:outline-none focus:border-blue-500 bg-transparent w-28 print:hidden" />
                    {/* 印刷 */}
                    <span className="hidden print:inline border-b border-slate-400 w-28 inline-block">
                      {val || " "}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              /* 汎用・月額・サーバー：フリーテキスト */
              <div className="flex items-center gap-2">
                <span className="font-medium whitespace-nowrap">支払条件</span>
                {/* 画面 */}
                <input type="text" value={payText} onChange={e => setPayText(e.target.value)}
                  placeholder="例：末日締め翌月末支払い"
                  className="flex-1 border-b border-slate-400 focus:outline-none focus:border-blue-500 bg-transparent print:hidden" />
                {/* 印刷 */}
                <span className="hidden print:inline flex-1 border-b border-slate-400">
                  {payText || " "}
                </span>
              </div>
            )}
          </div>

          {/* 発注・契約の申し込み */}
          <div className="px-3 py-1.5 border-b border-slate-300 text-xs">
            <p className="font-bold mb-0.5">■発注・契約の申し込み</p>
            <p className="mb-1">下記「確認事項」および、商品ごとに定められた「別紙利用規約・重要事項説明書」の内容を確認し、同意の上で申し込みます。</p>
            <div className="border border-slate-200 bg-slate-50 p-1.5 space-y-0.5 conf">
              <p className="font-semibold">【確認事項】</p>
              <p>1. 契約の成立: 本書は広告掲載および業務委託の申込みとして使用され、株式会社関西ぱど側の承諾によって契約が成立するものとします。</p>
              <p>2. 反社会的勢力の排除: 申込者が反社会的勢力及び、反社会的勢力に協力・関与していることが判明した場合は申込をお断りいたします。</p>
              <p>3. 別紙の適用: 本申込書に記載のない事項については、各サービスの利用規約または重要事項説明書（別紙）の規定が適用されます。</p>
              <p>4. 申込者が代表者であること、または代表者より本契約に関する権限を委任されていることを確認・保証の上、申し込むものとします。</p>
            </div>
            <label className="flex items-center gap-2 mt-1.5 cursor-pointer">
              <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="w-3.5 h-3.5" />
              <span className={agreed ? "font-medium" : "text-slate-500"}>
                上記内容および別紙利用規約に同意して発注します。（チェックを入れてください）
              </span>
            </label>
          </div>

          {/* 申込者情報 */}
          <div className="px-3 py-1.5 text-xs">
            <div className="grid gap-y-0" style={{ gridTemplateColumns: "7rem 1fr 5rem" }}>
              {/* 申込日 */}
              <div className="py-1 font-semibold border-b border-slate-200">申込日</div>
              <div className="py-1 border-b border-slate-300 col-span-1">
                <F v={oDate} set={setODate} ph="YYYY/MM/DD" />
              </div>
              <div className="row-span-3 border border-slate-300 flex items-center justify-center text-slate-400 ml-4">社印</div>

              {/* 会社名 */}
              <div className="py-1 font-semibold border-b border-slate-200">会社名</div>
              <div className="py-1 border-b border-slate-300"><F v={oCo} set={setOCo} /></div>

              {/* 住所 */}
              <div className="py-1 font-semibold border-b border-slate-200">住所</div>
              <div className="py-1 border-b border-slate-300"><F v={oAddr} set={setOAddr} /></div>

              {/* 担当者名 */}
              <div className="py-1 font-semibold border-b border-slate-200">担当者名</div>
              <div className="py-1 border-b border-slate-300 flex items-end gap-2 col-span-2">
                <F v={oPer} set={setOPer} cls="flex-1" />
                <span className="text-slate-400 whitespace-nowrap">印</span>
              </div>

              {/* 連絡先 */}
              <div className="py-1 font-semibold">連絡先（TEL）</div>
              <div className="py-1 border-b border-slate-300 col-span-2"><F v={oTel} set={setOTel} /></div>
            </div>
          </div>

        </div>{/* /申込書本体 */}
      </div>
    </>
  )
}
