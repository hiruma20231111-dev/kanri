import { CheckCircle2, XCircle, ExternalLink, Building2 } from "lucide-react"

function EnvRow({ name, value, required }: { name: string; value?: string; required?: boolean }) {
  const set = !!value
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
      {set ? (
        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
      ) : (
        <XCircle className={`w-4 h-4 flex-shrink-0 ${required ? "text-red-500" : "text-amber-400"}`} />
      )}
      <code className="text-sm font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700 flex-1">
        {name}
      </code>
      <span className={`text-xs ${set ? "text-green-600" : required ? "text-red-500 font-medium" : "text-amber-600"}`}>
        {set ? "設定済み" : required ? "必須・未設定" : "任意・未設定"}
      </span>
    </div>
  )
}

export default function SetupPage() {
  const vars = {
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GOOGLE_SHEETS_ID: process.env.GOOGLE_SHEETS_ID,
  }

  const allRequired =
    vars.NEXTAUTH_SECRET && vars.NEXTAUTH_URL && vars.GOOGLE_CLIENT_ID &&
    vars.GOOGLE_CLIENT_SECRET && vars.GEMINI_API_KEY

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-4">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">KPD 営業パイロット — セットアップ</h1>
          <p className="text-slate-500 text-sm mt-1">
            {allRequired ? "✅ 環境変数は設定済みです。再デプロイしてください。" : "以下の環境変数を Vercel に設定してください"}
          </p>
        </div>

        {/* 環境変数ステータス */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <h2 className="font-semibold text-slate-800 mb-3">環境変数の状態</h2>
          <EnvRow name="NEXTAUTH_SECRET" value={vars.NEXTAUTH_SECRET} required />
          <EnvRow name="NEXTAUTH_URL" value={vars.NEXTAUTH_URL} required />
          <EnvRow name="GOOGLE_CLIENT_ID" value={vars.GOOGLE_CLIENT_ID} required />
          <EnvRow name="GOOGLE_CLIENT_SECRET" value={vars.GOOGLE_CLIENT_SECRET} required />
          <EnvRow name="GEMINI_API_KEY" value={vars.GEMINI_API_KEY} required />
          <EnvRow name="GOOGLE_SHEETS_ID" value={vars.GOOGLE_SHEETS_ID} />
        </div>

        {/* 手順 */}
        <div className="space-y-4">
          {/* Step 1: Vercel 環境変数 */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center font-bold">1</span>
              Vercel 環境変数を設定
            </h2>
            <p className="text-sm text-slate-600 mb-3">
              Vercel ダッシュボード → Settings → Environment Variables で以下を追加
            </p>
            <div className="bg-slate-900 rounded-xl p-4 text-xs font-mono text-slate-300 space-y-1.5">
              <p className="text-slate-500"># openssl rand -base64 32 で生成した値を設定</p>
              <p><span className="text-amber-400">NEXTAUTH_SECRET</span>=<span className="text-slate-500">（ランダム文字列 32バイト以上）</span></p>
              <p><span className="text-amber-400">NEXTAUTH_URL</span>=https://kanri-wheat.vercel.app</p>
              <p><span className="text-blue-400">GOOGLE_CLIENT_ID</span>=<span className="text-slate-500">（Google CloudのOAuth クライアントID）</span></p>
              <p><span className="text-blue-400">GOOGLE_CLIENT_SECRET</span>=<span className="text-slate-500">（Google Cloudのシークレット）</span></p>
              <p><span className="text-green-400">GEMINI_API_KEY</span>=<span className="text-slate-500">（AI StudioのAPIキー）</span></p>
              <p><span className="text-slate-500">GOOGLE_SHEETS_ID</span>=<span className="text-slate-500">（任意・後で設定可）</span></p>
            </div>
          </div>

          {/* Step 2: Google OAuth */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center font-bold">2</span>
              Google OAuth（ウェブアプリ用）を作成
            </h2>
            <ol className="text-sm text-slate-600 space-y-1.5 list-decimal list-inside">
              <li>Google Cloud Console → 認証情報 → OAuth クライアントID を作成</li>
              <li>アプリの種類：<strong>ウェブ アプリケーション</strong>を選択</li>
              <li>承認済みのリダイレクト URI に追加：</li>
            </ol>
            <div className="bg-slate-100 rounded-lg p-3 mt-2 text-xs font-mono text-slate-700 space-y-1">
              <p>https://kanri-wheat.vercel.app/api/auth/callback/google</p>
              <p>http://localhost:3000/api/auth/callback/google</p>
            </div>
            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-3 text-sm text-blue-600 hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Google Cloud Console を開く
            </a>
          </div>

          {/* Step 3: Gemini API */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center font-bold">3</span>
              Gemini APIキーを取得
            </h2>
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Google AI Studio → APIキーを作成
            </a>
          </div>

          {/* Step 4: 再デプロイ */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
            <h2 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
              <span className="w-6 h-6 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center font-bold">4</span>
              環境変数設定後 → Vercel で再デプロイ
            </h2>
            <p className="text-sm text-blue-700">
              Vercel の Settings → Environment Variables に全て入力後、Deployments → 最新ビルドの「...」→「Redeploy」をクリック
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
