import type { Metadata } from "next"
import { Geist } from "next/font/google"
import "./globals.css"
import { SessionProvider } from "@/components/providers/SessionProvider"

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" })

export const metadata: Metadata = {
  title: "KPD 営業パイロット",
  description: "関西ぱど 営業管理ツール",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${geist.variable} h-full`}>
      <body className="h-full bg-slate-50 antialiased">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
