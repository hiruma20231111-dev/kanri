import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { google } from "googleapis"

const SHEET_ID = process.env.GOOGLE_SHEETS_ID || ""
const SHEET_NAME = "顧客一覧"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const accessToken = (session as any).accessToken
  if (!accessToken) return NextResponse.json({ error: "No access token" }, { status: 401 })

  if (!SHEET_ID) return NextResponse.json({ customers: [], warning: "GOOGLE_SHEETS_ID not configured" })

  try {
    const auth = new google.auth.OAuth2()
    auth.setCredentials({ access_token: accessToken })
    const sheets = google.sheets({ version: "v4", auth })

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!A2:J1000`,
    })

    const rows = res.data.values || []
    const customers = rows
      .filter((row) => row[0])
      .map((row, i) => ({
        id: String(i + 2),
        companyName: row[0] || "",
        contactName: row[1] || "",
        email: row[2] || "",
        phone: row[3] || "",
        address: row[4] || "",
        services: (row[5] || "").split(",").map((s: string) => s.trim()).filter(Boolean),
        status: (row[6] || "active") as "active" | "prospect" | "inactive",
        notes: row[7] || "",
        lastContact: row[8] || "",
        nextAction: row[9] || "",
      }))

    return NextResponse.json({ customers })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const accessToken = (session as any).accessToken
  const customer = await req.json()

  if (!SHEET_ID) return NextResponse.json({ error: "GOOGLE_SHEETS_ID not configured" }, { status: 400 })

  try {
    const auth = new google.auth.OAuth2()
    auth.setCredentials({ access_token: accessToken })
    const sheets = google.sheets({ version: "v4", auth })

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!A:J`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
          customer.companyName,
          customer.contactName,
          customer.email,
          customer.phone,
          customer.address || "",
          (customer.services || []).join(", "),
          customer.status || "prospect",
          customer.notes || "",
          new Date().toLocaleDateString("ja-JP"),
          customer.nextAction || "",
        ]],
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
