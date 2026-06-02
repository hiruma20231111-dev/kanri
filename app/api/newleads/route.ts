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
 * ONE_OF_LIST → 直接取得
 * ONE_OF_RANGE → 参照先レンジをfetchして取得
 * 取得できない場合は空配列を返す（フロントでフォールバック）
 */
async function getValidationOptions(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  sheetName: string,
  colLetter: string
): Promise<string[]> {
  try {
    const res = await (sheets as any).spreadsheets.get({
      spreadsheetId,
      includeGridData: true,
      ranges: [`${sheetName}!${colLetter}2`],
    })
    const cell =
      res.data.sheets?.[0]?.data?.[0]?.rowData?.[0]?.values?.[0]
    const validation = cell?.dataValidation
    if (!validation) return []

    const condType = validation.condition?.type
    if (condType === "ONE_OF_LIST") {
      return (
        validation.condition.values
          ?.map((v: any) => v.userEnteredValue as string)
          .filter(Boolean) || []
      )
    }
    if (condType === "ONE_OF_RANGE") {
      const rangeRef = (
        validation.condition.values?.[0]?.userEnteredValue as string
      )?.replace(/^=/, "")
      if (rangeRef) {
        const rangeRes = await (sheets as any).spreadsheets.values.get({
          spreadsheetId,
          range: rangeRef,
        })
        return ((rangeRes.data.values as string[][]) || [])
          .flat()
          .filter(Boolean)
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

    const [shinkiRes, step2HdrRes, step2DataRes, eriaOpts, gyoshuOpts] =
      await Promise.all([
        sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${SHEET_SHINKI}!A1:N` }),
        sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${SHEET_STEP2}!A1:AZ2` }),
        sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${SHEET_STEP2}!A2:AZ` }),
        getValidationOptions(sheets, SHEET_ID, SHEET_SHINKI, "G"), // エリア
        getValidationOptions(sheets, SHEET_ID, SHEET_SHINKI, "H"), // 業種
      ])

    const shinkiValues    = shinkiRes.data.values   || []
    const step2HdrValues  = step2HdrRes.data.values  || []
    const step2DataValues = step2DataRes.data.values || []

    const shinkiHeaders     = shinkiValues[0] || []
    const shinkiRows        = shinkiValues.slice(1).map((row, i) => ({ rowIndex: i + 2, data: row }))

    // ステップ2: row0=タイトル row1=入力例、L列以降が追加項目
    const step2AllHeaders   = step2HdrValues[0] || []
    const step2AllDesc      = step2HdrValues[1] || []
    const step2ExtraHeaders = step2AllHeaders.slice(13)
    const step2ExtraDesc    = step2AllDesc.slice(13)
    const step2Rows         = step2DataValues.map((row, i) => ({ rowIndex: i + 2, data: row }))

    return NextResponse.json({
      shinkiHeaders, shinkiRows,
      step2AllHeaders, step2ExtraHeaders, step2ExtraDesc, step2Rows,
      eriaOptions: eriaOpts,
      gyoshuOptions: gyoshuOpts,
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

// PUT: 既存行の更新（ステップ2追加入力など）
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
