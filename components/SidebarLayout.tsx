"use client"

import { useState } from "react"
import { Sidebar } from "./Sidebar"

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(true)
  return (
    <div className="flex h-screen overflow-hidden print:block print:h-auto print:overflow-visible">
      <Sidebar isOpen={isOpen} onToggle={() => setIsOpen(p => !p)} />
      <main
        className={`flex-1 overflow-y-auto bg-slate-50 print:ml-0 print:overflow-visible print:bg-white transition-[margin] duration-200 ${
          isOpen ? "ml-64" : "ml-16"
        }`}
      >
        {children}
      </main>
    </div>
  )
}
