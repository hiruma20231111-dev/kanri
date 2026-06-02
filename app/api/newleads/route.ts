import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { google } from "googleapis"

const SHEET_ID    = process.env.SHINKI_SHEETS_ID || ""
const SHEET_SHINKI = "新規リスト"
const SHEET_STEP2  = "ステップ2新規"

function makeAuth(accessToken: string) {
  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: accessToken })
  return google.sheets({ version: "v4", auth })
}

/**
 * 指定セルのデータ検証（ドロップダウン）選択肢を取得。
 * 失敗した場合は空配列を返す（メインデータ取得には影響しない）。
 */
async function getValidationOptions(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  colLetter: string
): Promise<string[]> {
  try {
    const auth = new google.auth.OAuth2()
    auth.setCredentials({ access_token: accessToken })
    const sheets = google.sheets({ version: "v4", auth })

    const res = await sheets.spreadsheets.get({
      spreadsheetId,
      includeGridData: true,
      ranges: [`${sheetName}!${colLetter}2`],
    })

    const cell =
      res.data.sheets?.[0]?.data?.[0]?.rowData?.[0]?.values?.[0]
    const validation = (cell as any)?.dataValidation
    if (!validation) return []

    const condType = validation.condition?.type
    if (condType === "ONE_OF_LIST") {
      return (
        validation.condition.values
          ?.map((v: { userEnteredValue: string }) => v.userEnteredValue)
          .filter(Boolean) || []
      )
    }
    if (condType === "ONE_OF_RANGE") {
      const rangeRef = (validation.condition.values?.[0]?.userEnteredValue as string)
        ?.replace(/^=/, "")
      if (rangeRef) {
        const rangeRes = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: rangeRef,
        })
        return ((rangeRes.data.values as string[][]) || []).flat().filter(Boolean)
      }
    }
    return []
  } catch {
    return []
  }
}

// GET: 新規リスト + ステップ2新規 のヘッダー・データ + エリア・業種の選択肢
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const accessToken = (session as any).accessToken
  if (!accessToken) return NextResponse.json({ error: "No access token" }, { status: 401 })
  if (!SHEET_ID) return NextResponse.json({ error: "SHINKI_SHEETS_ID未設定" }, { status: 503 })

  try {
    const sheets = makeAuth(accessToken)

    // ── メインデータ取得（オリジナルと同じ構造・影響なし） ──
    const [shinkiRes, step2HdrRes, step2DataRes] = await Promise.all([
      sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${SHEET_SHINKI}!A1:N` }),
      sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${SHEET_STEP2}!A1:AZ2` }),
      sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${SHEET_STEP2}!A2:AZ` }),
    ])

    const shinkiValues    = shinkiRes.data.values   || []
    const step2HdrValues  = step2HdrRes.data.values  || []
    const step2DataValues = step2DataRes.data.values || []

    const shinkiHeaders     = shinkiValues[0] || []
    const shinkiRows        = shinkiValues.slice(1).map((row, i) => ({ rowIndex: i + 2, data: row }))

    const step2AllHeaders   = step2HdrValues[0] || []
    const step2AllDesc      = step2HdrValues[1] || []
    const step2ExtraHeaders = step2AllHeaders.slice(13)
    const step2ExtraDesc    = step2AllDesc.slice(13)
    const step2Rows         = step2DataValues.map((row, i) => ({ rowIndex: i + 2, data: row }))

    // ── バリデーション選択肢（メインデータ取得後・失敗しても空配列で継続） ──
    const [eriaOptions, gyoshuOptions] = await Promise.all([
      getValidationOptions(accessToken, SHEET_ID, SHEET_SHINKI, "G"),
      getValidationOptions(accessToken, SHEET_ID, SHEET_SHINKI, "H"),
    ])

    return NextResponse.json({
      shinkiHeaders, shinkiRows,
      step2AllHeaders, step2ExtraHeaders, step2ExtraDesc, step2Rows,
      eriaOptions,
      gyoshuOptions,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST: 新規追加（新規リスト ＋ 必要ならステップ2新規へも）
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const accessToken = (session as any).accessToken
  if (!SHEET_ID) return NextResponse.json({ error: "SHINKI_SHEETS_ID未設定" }, { status: 503 })

  const { shinkiRow, step2Row } = await req.json()

  try {
    const sheets = makeAuth(accessToken)

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_SHINKI}!A:N`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [shinkiRow] },
    })

    if (step2Row?.length) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: `${SHEET_STEP2}!A:AZ`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [step2Row] },
      })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// PUT: 既存行の更新
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const accessToken = (session as any).accessToken
  if (!SHEET_ID) return NextResponse.json({ error: "SHINKI_SHEETS_ID未設定" }, { status: 503 })

  const { rowIndex, row, sheet } = await req.json()

  try {
    const sheets  = makeAuth(accessToken)
    const sName   = sheet === "step2" ? SHEET_STEP2 : SHEET_SHINKI
    const endCol  = sheet === "step2" ? "AZ" : "N"
    const range   = `${sName}!A${rowIndex}:${endCol}${rowIndex}`

    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [row] },
    })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
