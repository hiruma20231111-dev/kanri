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

    const idToken = (session as any).idToken as string | undefined

    try {
      // 試行1: Google id_tokenでスレッド返信（ログイン後のセッションのみ有効）
      if (idToken) {
        const res = await fetch(`${SFCHAT_BASE}/messages/${parentId}/replies`, {
          method: "POST",
          headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ body: messageBody }),
        })
        if (res.ok) {
          const data = await res.json().catch(() => ({ ok: true }))
          return NextResponse.json({ ok: true, data, method: "thread_reply" })
        }
      }

      // 試行2: sfchat_keyでスレッド返信（権限があれば）
      const res2 = await fetch(`${SFCHAT_BASE}/messages/${parentId}/replies`, {
        method: "POST",
        headers: sfHeaders(),
        body: JSON.stringify({ body: messageBody }),
      })
      if (res2.ok) {
        const data = await res2.json().catch(() => ({ ok: true }))
        return NextResponse.json({ ok: true, data, method: "thread_reply" })
      }
      const err2Status = res2.status
      const err2Body = await res2.text()

      // 試行3: チャンネルへのメッセージ投稿（フォールバック）
      if (channelId) {
        const res3 = await fetch(`${SFCHAT_BASE}/channels/${channelId}/messages`, {
          method: "POST",
          headers: sfHeaders(),
          body: JSON.stringify({ body: messageBody, parent_id: parentId }),
        })
        if (res3.ok) {
          const data = await res3.json().catch(() => ({ ok: true }))
          return NextResponse.json({ ok: true, data, method: "channel_message" })
        }
        const text = await res3.text()
        return NextResponse.json(
          { error: `送信失敗 (${res3.status})`, detail: text },
          { status: res3.status }
        )
      }

      return NextResponse.json(
        { error: `スレッド返信失敗 (${err2Status})`, detail: err2Body },
        { status: err2Status }
      )
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ error: "Unknown type" }, { status: 400 })
}
