import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export const geminiModel = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  generationConfig: { temperature: 0.7 },
})

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
  const result = await geminiModel.generateContent(prompt)
  const text = result.response.text().trim()
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
  const result = await geminiModel.generateContent(prompt)
  const text = result.response.text().trim()
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
  const result = await geminiModel.generateContent(prompt)
  const text = result.response.text().trim()
  try {
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
    return JSON.parse(cleaned)
  } catch {
    return { subject: "", body: text }
  }
}
