import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { analyzeMention } from "@/lib/gemini"

const SFCHAT_BASE = "https://qr5n9xzn4j.execute-api.ap-northeast-1.amazonaws.com/api/v1"

function tryParse(t: string) { try { return JSON.parse(t) } catch { return t } }

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
      const log: Record<string, any> = {}

      // 試行1: id_tokenでスレッド返信
      if (idToken) {
        const r = await fetch(`${SFCHAT_BASE}/messages/${parentId}/replies`, {
          method: "POST",
          headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ body: messageBody }),
        })
        const t = await r.text()
        log.t1_idToken_replies = { status: r.status, body: tryParse(t) }
        if (r.ok) return NextResponse.json({ ok: true, data: tryParse(t), method: "thread_id_token", log })
      }

      // 試行2: sfchat_keyでスレッド返信 /messages/{id}/replies
      {
        const r = await fetch(`${SFCHAT_BASE}/messages/${parentId}/replies`, {
          method: "POST", headers: sfHeaders(), body: JSON.stringify({ body: messageBody }),
        })
        const t = await r.text()
        log.t2_sfchat_replies = { status: r.status, body: tryParse(t) }
        if (r.ok) return NextResponse.json({ ok: true, data: tryParse(t), method: "thread_sfchat", log })
      }

      // 試行3〜8: チャンネル投稿でスレッド関連パラメータを全パターン試す
      const threadParams = [
        { parent_id: parentId },
        { thread_id: parentId },
        { reply_to: parentId },
        { in_reply_to: parentId },
        { tmid: parentId },
        { root_id: parentId },
        // 全部同時に送る
        { parent_id: parentId, thread_id: parentId, tmid: parentId, root_id: parentId },
      ]

      let lastOkData: any = null
      for (let i = 0; i < threadParams.length; i++) {
        const params = threadParams[i]
        const r = await fetch(`${SFCHAT_BASE}/channels/${channelId}/messages`, {
          method: "POST", headers: sfHeaders(),
          body: JSON.stringify({ body: `[テスト${i + 1}]`, ...params }),
        })
        const t = await r.text()
        const parsed = tryParse(t)
        log[`t${i + 3}_${Object.keys(params).join("+")}` ] = { status: r.status, body: parsed }
        if (r.ok && (parsed?.parent_id || parsed?.thread_id || parsed?.tmid || parsed?.root_id)) {
          // スレッド紐付けが成功！本文で再送
          const r2 = await fetch(`${SFCHAT_BASE}/channels/${channelId}/messages`, {
            method: "POST", headers: sfHeaders(),
            body: JSON.stringify({ body: messageBody, ...params }),
          })
          const t2 = await r2.text()
          return NextResponse.json({ ok: true, data: tryParse(t2), method: `thread_param_${Object.keys(params)[0]}`, log })
        }
        if (r.ok) lastOkData = parsed
        // テスト送信後は少し待つ
        if (i < threadParams.length - 1) await new Promise(r => setTimeout(r, 300))
      }

      // どのパラメータでもスレッドにならなかった → ログ付きで結果返却
      return NextResponse.json({ ok: true, data: lastOkData, method: "no_thread_possible", log })
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ error: "Unknown type" }, { status: 400 })
}
