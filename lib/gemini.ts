import { GoogleGenerativeAI } from "@google/generative-ai"

// フリー枠の別クォータを持つモデルを幅広く試す
const MODEL_CANDIDATES = [
  "gemini-1.5-flash-8b",   // フリー枠最大・軽量
  "gemini-2.0-flash-lite", // フリー枠大
  "gemini-1.5-flash",      // フリー枠大
  "gemini-2.0-flash",      // 標準
]

// retryDelay ヘッダーから待機秒数を抽出
function parseRetryDelay(msg: string): number {
  const m = msg.match(/"retryDelay"\s*:\s*"(\d+)s"/)
  return m ? parseInt(m[1], 10) * 1000 : 5000
}

async function generateWithRetry(prompt: string): Promise<string> {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY が設定されていません")
  const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

  let lastError: Error | null = null
  for (let attempt = 0; attempt < MODEL_CANDIDATES.length; attempt++) {
    const modelName = MODEL_CANDIDATES[attempt]
    try {
      const model = ai.getGenerativeModel({ model: modelName, generationConfig: { temperature: 0.7 } })
      const result = await model.generateContent(prompt)
      return result.response.text().trim()
    } catch (e: any) {
      lastError = e
      const is503 = e.message?.includes("503") || e.message?.includes("overloaded")
      const is429 = e.message?.includes("429") || e.message?.includes("quota") || e.message?.includes("rate")
      if (is503 || is429) {
        if (attempt < MODEL_CANDIDATES.length - 1) {
          // 次のモデルへ切り替え前に少し待つ
          const delay = is429 ? Math.min(parseRetryDelay(e.message), 8000) : 2000
          await new Promise(r => setTimeout(r, delay))
          continue
        }
      }
      throw e
    }
  }
  throw lastError || new Error("AI分析に失敗しました（全モデル試行済み）")
}

export const KPD_PRODUCTS = `
【関西ぱどの商材一覧】
■ 求人系
- DOMOぱど: 求人フリーペーパー（紙）東大阪・八尾・大東・京阪エリア配布
- ワガシャdeDOMO（WD）: WEB求人媒体。DOMOぱどとセット。Indeedスポンサー・AI面接オプションあり
- お仕事ノート: ミドル・シニア向け求人別冊フリーペーパー
- ドクターbook: 医療従事者向け求人媒体
- 採用LP: 採用専用ランディングページ制作（CVR改善）
- 採用ブランディングページ: 採用サイト構築
- おしごと博: 就職イベント（布施・八尾・枚方等）
- ガイダブル: 外国人採用支援（WDオプション）
- Indeedスポンサー: Indeed上位表示

■ SP・プロモーション系
- まみたん: 子育て向けフリーペーパー（習い事・幼稚園・保育園等の広告主向け）
- アフルエント: 富裕層向けDM。Meta広告パックとのセット
- ポスティング: 東大阪・大東エリアのチラシ配布
- まみたんフェスタ: 子育てイベント出展

■ WEBサービス
- ロカオプ（MEO）: Googleマップ最適化・月額運用代行
- HP制作: ホームページ制作（制作費+月額ランニング）
- Meta広告: Facebook/Instagram広告運用
- OM運用代行: Instagram等SNS運用代行
`

export async function analyzeMeeting(
  eventTitle: string,
  companyName: string,
  description: string,
  customerHistory: string
) {
  const prompt = `
あなたは関西ぱどの優秀な営業アシスタントです。以下の商談情報を分析し、JSON形式で回答してください。

【商談情報】
タイトル: ${eventTitle}
企業名: ${companyName}
詳細: ${description || "なし"}
過去履歴: ${customerHistory || "新規顧客"}

${KPD_PRODUCTS}

以下のJSON形式で回答（コードブロックなし、JSONのみ）:
{
  "companyOverview": "企業の概要（2〜3文）",
  "recommendedProducts": ["商材1", "商材2", "商材3"],
  "salesAdvice": "この商談での具体的な営業アドバイス（200文字以内）",
  "keyPoints": ["ポイント1", "ポイント2", "ポイント3"]
}
`
  const text = await generateWithRetry(prompt)
  try {
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
    return JSON.parse(cleaned)
  } catch {
    return {
      companyOverview: "分析中にエラーが発生しました",
      recommendedProducts: [],
      salesAdvice: text,
      keyPoints: [],
    }
  }
}

export async function analyzeEmail(
  subject: string,
  from: string,
  body: string,
  customerInfo: string
) {
  const prompt = `
あなたは関西ぱどの営業担当の優秀なメールアシスタントです。
以下のメールを分析し、JSON形式で回答してください。

【メール情報】
差出人: ${from}
件名: ${subject}
本文: ${body.substring(0, 2000)}
顧客情報: ${customerInfo || "情報なし"}

${KPD_PRODUCTS}

以下のJSON形式で回答（コードブロックなし、JSONのみ）:
{
  "summary": "メールの要約（100文字以内）",
  "category": "問い合わせ/クレーム/受注/見積依頼/情報提供/その他",
  "priority": "high/medium/low",
  "requiredAction": "必要なアクション（50文字以内）",
  "replyDraft": "返信文案（丁寧で簡潔な日本語）"
}
`
  const text = await generateWithRetry(prompt)
  try {
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
    return JSON.parse(cleaned)
  } catch {
    return {
      summary: "分析中にエラーが発生しました",
      category: "その他",
      priority: "medium" as const,
      requiredAction: "手動で確認してください",
      replyDraft: "",
    }
  }
}

export async function analyzeMention(
  senderName: string,
  channelName: string,
  body: string
) {
  const cleanBody = body.replace(/<@[a-f0-9-]+>/g, "@ユーザー").replace(/\n+/g, "\n").trim()
  const prompt = `
あなたは関西ぱどの営業担当・比留間信さんのアシスタントです。
以下の社内チャットのメンションを分析し、JSON形式で回答してください。

【メンション情報】
送信者: ${senderName}
チャンネル: ${channelName}
本文:
${cleanBody}

以下のJSON形式で回答（コードブロックなし、JSONのみ）:
{
  "summary": "メッセージの要約（50文字以内）",
  "requiredAction": "比留間さんに求められているアクション（40文字以内）",
  "priority": "high/medium/low",
  "replyDraft": "比留間さんとしての自然な返信文案（敬語・簡潔に）"
}
`
  const text = await generateWithRetry(prompt)
  try {
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
    return JSON.parse(cleaned)
  } catch {
    return {
      summary: "分析できませんでした",
      requiredAction: "内容を確認してください",
      priority: "medium" as const,
      replyDraft: "",
    }
  }
}

export async function generateActionEmail(
  customerName: string,
  contactName: string,
  services: string,
  actionType: "打合せ案内" | "更新提案" | "追加提案アポ"
) {
  const prompt = `
あなたは関西ぱどの営業担当です。以下の情報をもとに、${actionType}のメール文を作成してください。

【顧客情報】
会社名: ${customerName}
担当者名: ${contactName}
利用中サービス: ${services}

要件:
- 丁寧かつ簡潔な日本語
- 件名も含めること
- 営業らしい自然な文体
- 300文字以内

JSON形式で回答（コードブロックなし）:
{
  "subject": "件名",
  "body": "本文"
}
`
  const text = await generateWithRetry(prompt)
  try {
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
    return JSON.parse(cleaned)
  } catch {
    return { subject: "", body: text }
  }
}
