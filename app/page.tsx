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
      <div className="flex h-svh flex-col overflow-hidden">
        <header className="shrink-0 border-b px-6 py-3 flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">{t("header.title")}</h1>
          <LanguageSwitcher />
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
