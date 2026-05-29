import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { analyzeMeeting, analyzeEmail, generateActionEmail } from "@/lib/gemini"

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { type } = body

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "AI分析機能は現在準備中です（GEMINI_API_KEY未設定）" }, { status: 503 })
  }

  try {
    switch (type) {
      case "meeting": {
        const { eventTitle, companyName, description, customerHistory } = body
        const result = await analyzeMeeting(eventTitle, companyName, description, customerHistory)
        return NextResponse.json(result)
      }
      case "email": {
        const { subject, from, emailBody, customerInfo } = body
        const result = await analyzeEmail(subject, from, emailBody, customerInfo)
        return NextResponse.json(result)
      }
      case "actionEmail": {
        const { customerName, contactName, services, actionType } = body
        const result = await generateActionEmail(customerName, contactName, services, actionType)
        return NextResponse.json(result)
      }
      default:
        return NextResponse.json({ error: "Unknown type" }, { status: 400 })
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
