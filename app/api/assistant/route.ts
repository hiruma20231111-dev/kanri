import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { KPD_PRODUCTS } from "@/lib/gemini"
import { GoogleGenerativeAI } from "@google/generative-ai"

const SECRETARY_SYSTEM = `
あなたは株式会社関西ぱどの営業秘書AIです。名前は「ぱどアシスタント」です。

【あなたの役割】
- 営業担当者の業務を全面的にサポートする秘書
- 提案書作成・商談準備・メール文案・数字分析など何でも対応
- 丁寧だが親しみやすい口調（「〜ですね！」「承知しました」「いいですね！」）
- 具体的で実践的なアドバイスを提供

【会社情報】
会社名: 株式会社関西ぱど
事業: 紙メディア・SNS広告・LP/HP制作・求人広告の営業
担当者: 比留間 信

${KPD_PRODUCTS}

【対応できること】
- 商談準備・企業調査のサポート
- 提案書・見積書の文案作成
- メール文案の作成・添削
- 広告効果の数字分析・レポート作成
- 商材の提案組み合わせアドバイス
- 新規開拓先のリストアップ・アプローチ方法
- クレーム対応・交渉のアドバイス
- 日々のTODO管理・優先順位整理
- 壁打ち・相談・ブレインストーミング

相手の依頼に対して、具体的かつ実践的に答えてください。
`

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "GEMINI_API_KEY未設定" }, { status: 503 })
  }

  const { messages } = await req.json()

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({
      model: "gemini-flash-latest",
      systemInstruction: SECRETARY_SYSTEM,
      generationConfig: { temperature: 0.8, maxOutputTokens: 2048 },
    })

    const rawHistory = (messages as { role: string; content: string }[])
      .slice(0, -1)
      .map((m) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }],
      }))
    // Gemini requires history to start with 'user'.
    // firstUserIdx === -1 → no user messages yet → pass empty history
    // firstUserIdx > 0   → leading model messages (e.g. initial greeting) → slice them off
    const firstUserIdx = rawHistory.findIndex(m => m.role === "user")
    const history = firstUserIdx >= 0 ? rawHistory.slice(firstUserIdx) : []

    const lastMessage = messages[messages.length - 1].content

    const chat = model.startChat({ history })
    const result = await chat.sendMessage(lastMessage)
    const text = result.response.text()

    return NextResponse.json({ content: text })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
