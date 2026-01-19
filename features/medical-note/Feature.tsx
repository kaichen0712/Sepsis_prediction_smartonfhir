// features/medical-note/Feature.tsx
"use client"

import { NoteProvider } from "./providers/NoteProvider"
import { ApiKeyField } from "./components/ApiKeyField"
import { usePatient } from "@/lib/providers/PatientProvider"
import { useLanguage } from "@/lib/providers/LanguageProvider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { GptPanel } from "./components/GptPanel"

export default function MedicalNoteFeature() {
  const { patient } = usePatient()
  const { t } = useLanguage()

  return (
    <NoteProvider>
      <div className="space-y-3">
        <ApiKeyField />
        <Card>
          <CardHeader>
            <CardTitle className="text-slate-900 font-semibold">{t("tabs.medicalNote")}</CardTitle>
            <div className="text-sm text-muted-foreground">{t("medicalNote.pageDescription")}</div>
          </CardHeader>
          <CardContent className="space-y-5">
            <GptPanel embedded patient={patient ?? undefined} />
          </CardContent>
        </Card>
      </div>
    </NoteProvider>
  )
}
