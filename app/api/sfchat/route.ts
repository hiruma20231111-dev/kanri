import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { analyzeMention } from "@/lib/gemini"

const SFCHAT_BASE = "https://qr5n9xzn4j.execute-api.ap-northeast-1.amazonaws.com/api/v1"

function sfHeaders() {
  return {
    Authorization: `Bearer ${process.env.SFCHAT_API_KEY}`,
    "Content-Type": "application/json",
  }
}

// GET: メンション一覧取得
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (!process.env.SFCHAT_API_KEY) {
    return NextResponse.json({ error: "SFCHAT_API_KEY未設定" }, { status: 503 })
  }

  try {
    const res = await fetch(`${SFCHAT_BASE}/me/mentions?limit=50`, {
      headers: sfHeaders(),
      cache: "no-store",
    })
    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: `kp-chat API error: ${res.status}`, detail: text }, { status: res.status })
    }
    return NextResponse.json(await res.json())
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: AI分析 または kp-chatへ返信送信
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()

  // AI分析リクエスト
  if (body.type === "analyze") {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "GEMINI_API_KEY未設定" }, { status: 503 })
    }
    try {
      const result = await analyzeMention(body.senderName, body.channelName, body.body)
      return NextResponse.json(result)
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  // 返信送信リクエスト
  if (body.type === "reply") {
    if (!process.env.SFCHAT_API_KEY) {
      return NextResponse.json({ error: "SFCHAT_API_KEY未設定" }, { status: 503 })
    }
    const { channelId, parentId, replyBody, senderUserId } = body

    const mentionPrefix = senderUserId ? `<@${senderUserId}>\n` : ""
    const messageBody = mentionPrefix + replyBody

    // Google id_tokenがあればまずそれでスレッド返信を試みる
    const idToken = (session as any).idToken as string | undefined

    try {
      // 試行1: id_tokenでスレッド返信
      if (idToken) {
        const r1 = await fetch(`${SFCHAT_BASE}/messages/${parentId}/replies`, {
          method: "POST",
          headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ body: messageBody }),
        })
        const t1 = await r1.text()
        console.log(`[sfchat] 試行1 id_token /messages/${parentId}/replies → ${r1.status}`, t1.slice(0, 300))
        if (r1.ok) {
          const data = JSON.parse(t1)
          return NextResponse.json({ ok: true, data, method: "thread_id_token" })
        }
      }

      // 試行2: sfchat_keyでスレッド返信
      const r2 = await fetch(`${SFCHAT_BASE}/messages/${parentId}/replies`, {
        method: "POST",
        headers: sfHeaders(),
        body: JSON.stringify({ body: messageBody }),
      })
      const t2 = await r2.text()
      console.log(`[sfchat] 試行2 sfchat_key /messages/${parentId}/replies → ${r2.status}`, t2.slice(0, 300))
      if (r2.ok) {
        return NextResponse.json({ ok: true, data: JSON.parse(t2), method: "thread_sfchat" })
      }

      // 試行3: sfchat_key + parent_idでチャンネル投稿
      if (channelId) {
        const r3 = await fetch(`${SFCHAT_BASE}/channels/${channelId}/messages`, {
          method: "POST",
          headers: sfHeaders(),
          body: JSON.stringify({ body: messageBody, parent_id: parentId }),
        })
        const t3 = await r3.text()
        console.log(`[sfchat] 試行3 channel+parent_id → ${r3.status}`, t3.slice(0, 300))
        if (r3.ok) {
          const data = JSON.parse(t3)
          console.log(`[sfchat] 試行3 response parent_id:`, data?.parent_id, "id:", data?.id)
          return NextResponse.json({ ok: true, data, method: "channel_fallback" })
        }
        const errText = t3
        return NextResponse.json({ error: `送信失敗 (${r3.status})`, detail: errText }, { status: r3.status })
      }

      return NextResponse.json({ error: `スレッド返信失敗 (${r2.status})`, detail: t2 }, { status: r2.status })
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ error: "Unknown type" }, { status: 400 })
}
