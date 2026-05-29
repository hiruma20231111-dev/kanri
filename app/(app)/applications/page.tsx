import { ClipboardList } from "lucide-react"

export default function ApplicationsPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2 mb-2">
        <ClipboardList className="w-6 h-6 text-blue-500" />
        申込書作成
      </h1>
      <p className="text-slate-500 text-sm mb-8">
        申込書フォーマットを共有いただければ、自動生成機能をセットアップします。
      </p>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
        <h2 className="font-semibold text-amber-800 mb-2">フォーマット待ち</h2>
        <p className="text-amber-700 text-sm">
          申込書テンプレート（ExcelまたはGoogleスプレッドシート）を共有してください。
          テンプレートをもとに、入力フォームとPDF出力・Drive保存機能を実装します。
        </p>
      </div>
    </div>
  )
}
