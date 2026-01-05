// features/medical-note/Feature.tsx
"use client"

import dynamic from "next/dynamic"
import { NoteProvider } from "./providers/NoteProvider"
import { ApiKeyField } from "./components/ApiKeyField"
import { PromptEditor } from "./components/PromptEditor"
import { GptPanel } from "./components/GptPanel"
import { usePatient } from "@/lib/providers/PatientProvider"
import { useLanguage } from "@/lib/providers/LanguageProvider"

function LoadingRecorder() {
  const { t } = useLanguage()
  return (
    <div className="rounded-md border p-4 text-sm text-muted-foreground">
      {t("medicalNote.loadingRecorder")}
    </div>
  )
}

const AsrPanel = dynamic(
  () => import("./components/AsrPanel").then(m => m.AsrPanel),
  {
    ssr: false,
    loading: () => <LoadingRecorder />,
  }
)

export default function MedicalNoteFeature() {
  const { patient } = usePatient()

  return (
    <NoteProvider>
      <div className="space-y-3">
        <ApiKeyField />
        <AsrPanel />
        <PromptEditor />
        <GptPanel patient={patient ?? undefined} />
      </div>
    </NoteProvider>
  )
}
