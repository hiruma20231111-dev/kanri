"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import {
  ClipboardList, Plus, RefreshCw, Loader2, ChevronDown, ChevronUp,
  Save, AlertCircle, CheckCircle, Pencil, X, ExternalLink,
} from "lucide-react"

/* ─── 定数 ─────────────────────────────── */
const KAKEDEN_OPTIONS  = ["不在", "担当者不在", "折り返し", "NG", "ステップ2へ移行", "受注", "その他"]
const SOGAI_OPTIONS    = ["まみたん", "求人", "DOMOぱど", "ワガシャ", "WEB広告", "ロカオプ", "HP/LP", "ポスティング", "その他"]
const SF_OPTIONS       = ["済〇", "未", "不要"]
const SHODAN_OPTIONS   = ["受注", "NG", "保留", "継続商談", "次回提案", ""]
const STEP2_TRIGGER    = "ステップ2へ移行"
const SHEET_URL        = "https://docs.google.com/spreadsheets/d/14Burb_XpKRI3Rr9Om3FgGuEorzoqWQml-D0y7jcycQ8/edit"

/* 列インデックス（0-based） */
const C = { 日付:0,担当:1,企業:2,電話:3,SF:4,商材:5,エリア:6,業種:7,架電結果:8,商談予定:9,受注日:10,商談結果:11,金額:12,備考:13 }

function toIso(jp: string)  { return jp.replace(/\//g, "-") }
function toJp(iso: string)  { return iso.replace(/-/g, "/") }
function todayJp()          { return new Date().toLocaleDateString("ja-JP", { year:"numeric",month:"2-digit",day:"2-digit" }).replace(/\//g,"/") }

interface LeadRow { rowIndex: number; data: string[] }

/* ─── 編集フィールドの型定義 ─── */
interface EditFieldDef {
  key: string
  label: string
  type: "select" | "date" | "number" | "text"
  opts?: string[]
  col: number
}

function buildEditFields(eriaOptions: string[], gyoshuOptions: string[]): EditFieldDef[] {
  return [
    { key:"エリア",  label:"エリア",       type: eriaOptions.length > 0 ? "select" : "text",   opts: eriaOptions,    col: C.エリア },
    { key:"業種",    label:"業種",         type: gyoshuOptions.length > 0 ? "select" : "text", opts: gyoshuOptions,  col: C.業種 },
    { key:"架電結果",label:"架電結果",     type: "select",  opts: KAKEDEN_OPTIONS,              col: C.架電結果 },
    { key:"商談予定",label:"商談予定日",   type: "date",                                        col: C.商談予定 },
    { key:"受注日",  label:"受注日",       type: "date",                                        col: C.受注日 },
    { key:"商談結果",label:"商談結果",     type: "select",  opts: SHODAN_OPTIONS,               col: C.商談結果 },
    { key:"金額",    label:"初回受注金額", type: "number",                                      col: C.金額 },
    { key:"備考",    label:"備考",         type: "text",                                        col: C.備考 },
  ]
}

function emptyForm(tantoDefault = "") {
  return { 日付: new Date().toISOString().slice(0, 10), 担当:tantoDefault,企業:"",電話:"",SF:"済〇",商材:"",エリア:"",業種:"",架電結果:"",商談予定:"",受注日:"",商談結果:"",金額:"",備考:"" }
}

type EditState = Record<string, string>

const TABLE_HEADERS = ["架電日","担当","企業・店舗名","電話番号","SF","想定商材","エリア","業種","架電結果","商談予定日","受注日","商談結果","初回金額","備考"]
const EDITABLE_FROM = C.エリア

/* ─── コンポーネント ───────────────────── */
export default function NewLeadsPage() {
  const { data: session } = useSession()

  const [shinkiRows,        setShinkiRows]        = useState<LeadRow[]>([])
  const [step2ExtraHeaders, setStep2ExtraHeaders] = useState<string[]>([])
  const [step2ExtraDesc,    setStep2ExtraDesc]    = useState<string[]>([])
  const [step2Rows,         setStep2Rows]         = useState<LeadRow[]>([])
  const [eriaOptions,       setEriaOptions]       = useState<string[]>([])
  const [gyoshuOptions,     setGyoshuOptions]     = useState<string[]>([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState("")
  const [showForm,   setShowForm]   = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [toast,      setToast]      = useState<{ msg:string; type:"ok"|"err" } | null>(null)
  const [filterTanto,setFilterTanto]= useState("")

  const [editingRowIdx, setEditingRowIdx] = useState<number | null>(null)
  const [editState,     setEditState]     = useState<EditState>({})
  const [editSaving,    setEditSaving]    = useState(false)

  const [step2Open,   setStep2Open]   = useState<number | null>(null)
  const [step2Forms,  setStep2Forms]  = useState<Record<number,string[]>>({})
  const [step2Saving, setStep2Saving] = useState<number | null>(null)

  const userName = session?.user?.name || ""
  useEffect(() => {
    if (userName && !filterTanto) setFilterTanto(userName)
  }, [userName])

  const [form, setForm] = useState(emptyForm())
  useEffect(() => {
    if (userName) setForm(p => p.担当 ? p : { ...p, 担当: userName })
  }, [userName])

  const showToast = (msg: string, type: "ok"|"err" = "ok") => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchData = useCallback(async () => {
    setLoading(true); setError("")
    try {
      const res = await fetch("/api/newleads")
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      setShinkiRows(d.shinkiRows || [])
      setStep2ExtraHeaders(d.step2ExtraHeaders || [])
      setStep2ExtraDesc(d.step2ExtraDesc || [])
      setStep2Rows(d.step2Rows || [])
      setEriaOptions(d.eriaOptions || [])
      setGyoshuOptions(d.gyoshuOptions || [])
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  function formToRow(f: typeof form): string[] {
    return [toJp(f.日付),f.担当,f.企業,f.電話,f.SF,f.商材,f.エリア,f.業種,f.架電結果,f.商談予定,f.受注日,f.商談結果,f.金額,f.備考]
  }

  async function handleAdd() {
    if (!form.企業) return showToast("企業・店舗名は必須です", "err")
    setSaving(true)
    try {
      const shinkiRow = formToRow(form)
      const step2Row  = form.架電結果 === STEP2_TRIGGER
        ? [...shinkiRow, ...Array(step2ExtraHeaders.length).fill("")]
        : undefined
      const res = await fetch("/api/newleads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shinkiRow, step2Row }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      showToast("追加しました")
      setShowForm(false)
      setForm(emptyForm(userName))
      fetchData()
    } catch (e: any) { showToast(e.message, "err") }
    finally { setSaving(false) }
  }

  function openEdit(row: LeadRow) {
    const d = row.data
    const s: EditState = {}
    s["架電日"] = toIso(d[C.日付] || "")
    buildEditFields(eriaOptions, gyoshuOptions).forEach(f => {
      const v = d[f.col] || ""
      s[f.key] = f.type === "date" ? toIso(v) : v
    })
    setEditState(s)
    setEditingRowIdx(row.rowIndex)
    setStep2Open(null)
  }

  async function saveEdit(row: LeadRow) {
    setEditSaving(true)
    try {
      const newData = [...row.data]
      while (newData.length < 14) newData.push("")
      newData[C.日付] = toJp(editState["架電日"] || "")
      buildEditFields(eriaOptions, gyoshuOptions).forEach(f => {
        const v = editState[f.key] || ""
        newData[f.col] = f.type === "date" ? toJp(v) : v
      })

      const res = await fetch("/api/newleads", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rowIndex: row.rowIndex, row: newData, sheet: "shinki" }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)

      if (editState["架電結果"] === STEP2_TRIGGER) {
        const existingS2 = step2Rows.find(s => s.data[C.企業] === row.data[C.企業])
        if (!existingS2) {
          const s2Row = [...newData, ...Array(step2ExtraHeaders.length).fill("")]
          await fetch("/api/newleads", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ shinkiRow: newData, step2Row: s2Row }),
          })
        }
      }

      showToast("更新しました")
      setEditingRowIdx(null)
      fetchData()
    } catch (e: any) { showToast(e.message, "err") }
    finally { setEditSaving(false) }
  }

  async function saveStep2(row: LeadRow) {
    setStep2Saving(row.rowIndex)
    try {
      const extraVals  = step2Forms[row.rowIndex] || []
      const company    = row.data[C.企業] || ""
      const existingS2 = step2Rows.find(s => s.data[C.企業] === company)
      const fullRow    = [...row.data, ...extraVals]

      if (existingS2) {
        await fetch("/api/newleads", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rowIndex: existingS2.rowIndex, row: fullRow, sheet: "step2" }),
        })
      } else {
        await fetch("/api/newleads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ shinkiRow: row.data, step2Row: fullRow }),
        })
      }
      showToast("ステップ2を保存しました")
      fetchData()
    } catch (e: any) { showToast(e.message, "err") }
    finally { setStep2Saving(null) }
  }

  const filtered = filterTanto
    ? shinkiRows.filter(r => {
        const tanto = r.data[C.担当] || ""
        return tanto.includes(filterTanto) || filterTanto.includes(tanto)
      })
    : shinkiRows

  const inputCls  = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
  const labelCls  = "text-xs font-semibold text-slate-500 mb-1 block"
  const selectCls = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"

  const FORM_FIELDS: Array<{ k: string; label: string; type: string; opts?: string[] }> = [
    { k:"日付",    label:"架電日",        type:"date" },
    { k:"担当",    label:"担当",          type:"text" },
    { k:"企業",    label:"企業・店舗名 *", type:"text" },
    { k:"電話",    label:"電話番号",      type:"tel" },
    { k:"SF",      label:"SFチェック",    type:"select",   opts:SF_OPTIONS },
    { k:"商材",    label:"想定商材",      type:"datalist", opts:SOGAI_OPTIONS },
    { k:"エリア",  label:"エリア",        type: eriaOptions.length > 0 ? "select" : "text",   opts:eriaOptions },
    { k:"業種",    label:"業種",          type: gyoshuOptions.length > 0 ? "select" : "text", opts:gyoshuOptions },
    { k:"架電結果",label:"架電結果",      type:"select",   opts:KAKEDEN_OPTIONS },
    { k:"商談予定",label:"商談予定日",    type:"date" },
    { k:"受注日",  label:"受注日",        type:"date" },
    { k:"商談結果",label:"商談結果",      type:"select",   opts:SHODAN_OPTIONS },
    { k:"金額",    label:"初回受注金額",  type:"number" },
    { k:"備考",    label:"備考",          type:"text" },
  ]

  const editFields = buildEditFields(eriaOptions, gyoshuOptions)

  return (
    <div className="p-6 max-w-[1400px] mx-auto">

      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">見込みリスト</h1>
            <p className="text-xs text-slate-500">Google Sheets 双方向同期 · {shinkiRows.length}件</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input value={filterTanto} onChange={e => setFilterTanto(e.target.value)}
            placeholder="担当者で絞込" className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-32 focus:outline-none" />
          <button onClick={fetchData} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-sm">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />更新
          </button>
          <a href={SHEET_URL} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-sm">
            <ExternalLink className="w-4 h-4" />シートを開く
          </a>
          <button onClick={() => { setShowForm(true); setForm(emptyForm(userName)) }}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium">
            <Plus className="w-4 h-4" />新規追加
          </button>
        </div>
      </div>

      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
          toast.type === "ok" ? "bg-green-600 text-white" : "bg-red-600 text-white"
        }`}>
          {toast.type === "ok" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
        </div>
      )}

      {showForm && (
        <div className="mb-6 bg-white border border-slate-200 rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">新規追加</h2>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {FORM_FIELDS.map(({ k, label, type, opts }) => (
              <div key={k}>
                <label className={labelCls}>{label}</label>
                {type === "select" ? (
                  <select value={(form as any)[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))} className={selectCls}>
                    <option value="">選択...</option>
                    {opts?.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : type === "datalist" ? (
                  <>
                    <input list={`dl-${k}`} value={(form as any)[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))} className={inputCls} placeholder="入力または選択" />
                    <datalist id={`dl-${k}`}>{opts?.map(o => <option key={o} value={o} />)}</datalist>
                  </>
                ) : (
                  <input type={type} value={(form as any)[k]}
                    onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))}
                    className={inputCls} />
                )}
              </div>
            ))}
          </div>

          {form.架電結果 === STEP2_TRIGGER && step2ExtraHeaders.length > 0 && (
            <div className="mt-4 pt-4 border-t border-teal-200 bg-teal-50 rounded-xl p-4">
              <p className="text-sm font-semibold text-teal-700 mb-3">📋 ステップ2追加項目</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {step2ExtraHeaders.map((hdr, i) => (
                  <div key={i}>
                    <label className={labelCls}>{hdr}</label>
                    {step2ExtraDesc[i] && <p className="text-xs text-slate-400 mb-1">{step2ExtraDesc[i]}</p>}
                    <input value={(form as any)[`step2_${i}`] || ""} onChange={e => setForm(p => ({ ...p, [`step2_${i}`]: e.target.value } as any))} className={inputCls} />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 mt-4">
            <button onClick={handleAdd} disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "保存中..." : "保存してシートに反映"}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">キャンセル</button>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-teal-500 animate-spin" />
          <span className="ml-2 text-slate-500 text-sm">シートから読み込み中...</span>
        </div>
      )}

      {!loading && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-max">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {TABLE_HEADERS.map((h, i) => (
                    <th key={h} className={`text-left px-3 py-2.5 font-semibold whitespace-nowrap ${i >= EDITABLE_FROM ? "text-teal-700 bg-teal-50" : "text-slate-600"}`}>
                      {h}{i >= EDITABLE_FROM ? " ✎" : ""}
                    </th>
                  ))}
                  <th className="px-3 py-2.5 bg-slate-50" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={15} className="text-center py-12 text-slate-400">データがありません</td></tr>
                )}
                {filtered.map(row => {
                  const d         = row.data
                  const isStep2   = d[C.架電結果] === STEP2_TRIGGER
                  const isEditing = editingRowIdx === row.rowIndex
                  const isS2Open  = step2Open === row.rowIndex
                  const s2Row     = step2Rows.find(s => s.data[C.企業] === d[C.企業])

                  return (
                    <>
                      <tr key={row.rowIndex}
                        className={`border-b border-slate-100 transition-colors ${
                          isEditing ? "bg-blue-50 border-blue-200" : isStep2 ? "bg-teal-50/50" : "hover:bg-slate-50"
                        }`}
                      >
                        {(d.slice(0, EDITABLE_FROM) as string[]).map((cell, ci) => (
                          <td key={ci} className="px-3 py-2 whitespace-nowrap text-slate-700">
                            {isEditing && ci === C.日付 ? (
                              <input type="date" value={editState["架電日"] || ""}
                                onChange={e => setEditState(p => ({ ...p, "架電日": e.target.value }))}
                                className="border border-blue-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white w-32" />
                            ) : (
                              cell || <span className="text-slate-300">-</span>
                            )}
                          </td>
                        ))}

                        {isEditing ? (
                          editFields.map(f => (
                            <td key={f.key} className="px-2 py-1.5">
                              {f.type === "select" ? (
                                <select value={editState[f.key] || ""} onChange={e => setEditState(p => ({ ...p, [f.key]: e.target.value }))}
                                  className="border border-blue-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white min-w-[90px]">
                                  <option value="">-</option>
                                  {f.opts?.map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                              ) : f.type === "date" ? (
                                <input type="date" value={editState[f.key] || ""}
                                  onChange={e => setEditState(p => ({ ...p, [f.key]: e.target.value }))}
                                  className="border border-blue-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white w-32" />
                              ) : f.type === "number" ? (
                                <input type="number" value={editState[f.key] || ""} placeholder="0"
                                  onChange={e => setEditState(p => ({ ...p, [f.key]: e.target.value }))}
                                  className="border border-blue-300 rounded px-2 py-1 text-xs focus:outline-none w-24 bg-white" />
                              ) : (
                                <input type="text" value={editState[f.key] || ""}
                                  onChange={e => setEditState(p => ({ ...p, [f.key]: e.target.value }))}
                                  className="border border-blue-300 rounded px-2 py-1 text-xs focus:outline-none w-28 bg-white" />
                              )}
                            </td>
                          ))
                        ) : (
                          (d.slice(EDITABLE_FROM, 14) as string[]).map((cell, ci) => (
                            <td key={ci + EDITABLE_FROM} className="px-3 py-2 whitespace-nowrap">
                              {ci === (C.架電結果 - EDITABLE_FROM) && cell === STEP2_TRIGGER ? (
                                <span className="px-2 py-0.5 bg-teal-100 text-teal-700 rounded-full font-medium">{cell}</span>
                              ) : ci === (C.架電結果 - EDITABLE_FROM) && cell ? (
                                <span className={`px-2 py-0.5 rounded-full font-medium ${
                                  cell === "受注" ? "bg-green-100 text-green-700" :
                                  cell === "NG"   ? "bg-red-100 text-red-700" :
                                  "bg-slate-100 text-slate-600"
                                }`}>{cell}</span>
                              ) : cell || <span className="text-slate-300">-</span>}
                            </td>
                          ))
                        )}

                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1">
                            {isEditing ? (
                              <>
                                <button onClick={() => saveEdit(row)} disabled={editSaving}
                                  className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded text-xs font-medium whitespace-nowrap">
                                  {editSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                  保存
                                </button>
                                <button onClick={() => setEditingRowIdx(null)}
                                  className="px-2 py-1 text-slate-400 hover:text-slate-600 rounded text-xs">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => openEdit(row)}
                                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                  title="エリア・業種・架電結果以降を編集">
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                {isStep2 && step2ExtraHeaders.length > 0 && (
                                  <button
                                    onClick={() => {
                                      const next = isS2Open ? null : row.rowIndex
                                      setStep2Open(next)
                                      if (next !== null) {
                                        setStep2Forms(p => ({ ...p, [row.rowIndex]: s2Row ? s2Row.data.slice(13) : Array(step2ExtraHeaders.length).fill("") }))
                                        setEditingRowIdx(null)
                                      }
                                    }}
                                    className="flex items-center gap-0.5 text-teal-600 hover:text-teal-800 text-xs font-medium whitespace-nowrap px-1"
                                  >
                                    {isS2Open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                    S2
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>

                      {isS2Open && step2ExtraHeaders.length > 0 && (
                        <tr key={`s2-${row.rowIndex}`} className="bg-teal-50/70 border-b border-teal-100">
                          <td colSpan={15} className="px-4 py-4">
                            <div className="bg-white border border-teal-200 rounded-xl p-4">
                              <p className="text-sm font-semibold text-teal-700 mb-3">
                                📋 ステップ2追加入力 — {d[C.企業]}
                                {s2Row && <span className="ml-2 text-xs font-normal text-teal-500">（既存データあり）</span>}
                              </p>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                {step2ExtraHeaders.map((hdr, i) => (
                                  <div key={i}>
                                    <label className={labelCls}>{hdr}</label>
                                    {step2ExtraDesc[i] && <p className="text-xs text-slate-400 mb-1">{step2ExtraDesc[i]}</p>}
                                    <input value={(step2Forms[row.rowIndex] || [])[i] || ""}
                                      onChange={e => {
                                        const vals = [...(step2Forms[row.rowIndex] || Array(step2ExtraHeaders.length).fill(""))]
                                        vals[i] = e.target.value
                                        setStep2Forms(p => ({ ...p, [row.rowIndex]: vals }))
                                      }}
                                      className={inputCls} />
                                  </div>
                                ))}
                              </div>
                              <button onClick={() => saveStep2(row)} disabled={step2Saving === row.rowIndex}
                                className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm rounded-lg font-medium">
                                {step2Saving === row.rowIndex
                                  ? <><Loader2 className="w-4 h-4 animate-spin" />保存中...</>
                                  : <><Save className="w-4 h-4" />ステップ2を保存</>}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 border-t border-slate-100 text-xs text-slate-400 flex items-center justify-between">
            <span>表示: {filtered.length}件 / 合計: {shinkiRows.length}件</span>
            <span className="text-teal-600">✎ エリア・業種・架電結果以降は鉛筆アイコンから編集できます</span>
          </div>
        </div>
      )}
    </div>
  )
}
