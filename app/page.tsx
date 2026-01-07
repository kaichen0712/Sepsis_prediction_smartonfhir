// app/page.tsx
"use client"

import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import ClinicalSummaryFeature from "@/features/clinical-summary/Feature"
import { RightPanelFeature } from "@/features/right-panel/Feature"
import { PatientProvider } from "@/lib/providers/PatientProvider"
import { useLanguage } from "@/lib/providers/LanguageProvider"

export default function Page() {
  const { t } = useLanguage()

  return (
    <PatientProvider>
      <div className="flex h-svh flex-col overflow-hidden bg-slate-50">
        <header className="shrink-0 border-b bg-white px-6 py-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div />
          <h1 className="text-2xl md:text-3xl font-semibold text-center">
            <span className="inline-flex items-center gap-3 bg-gradient-to-r from-sky-600 via-blue-600 to-cyan-500 bg-clip-text text-transparent">
              <img
                src="/icon.png"
                alt=""
                className="h-9 w-9 md:h-11 md:w-11 shrink-0"
                aria-hidden="true"
              />
              {t("header.title")}
            </span>
          </h1>
          <div className="justify-self-end">
            <LanguageSwitcher />
          </div>
        </header>
        <main className="grid flex-1 grid-cols-1 gap-4 overflow-hidden p-4 lg:grid-cols-2">
          {/* Left Panel - Clinical Summary */}
          <section className="min-h-0 overflow-y-auto">
            <ClinicalSummaryFeature />
          </section>

          {/* Right Panel - Tabs (Medical Note / Data Selection) */}
          <section className="min-h-0 overflow-y-auto">
            <RightPanelFeature />
          </section>
        </main>
      </div>
    </PatientProvider>
  )
}
