// features/medical-note/components/GptPanel.tsx
"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { useNote } from "../providers/NoteProvider"
import { usePatient } from "@/lib/providers/PatientProvider"
import { useApiKey } from "@/lib/providers/ApiKeyProvider"
import { useLanguage } from "@/lib/providers/LanguageProvider"
import { useGptQuery } from "../hooks/useGptQuery"
import { useClinicalContext } from "@/features/data-selection/hooks/useClinicalContext"

type PatientLite = {
  name?: { given?: string[]; family?: string }[]
  gender?: string
  birthDate?: string
}

function calculateAge(birthDate?: string, naLabel?: string): string {
  if (!birthDate) return naLabel || ""
  const birth = new Date(birthDate)
  if (isNaN(birth.getTime())) return naLabel || ""

  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }

  return age.toString()
}

export function GptPanel({
  patient,
  defaultModel = "gpt-4",
}: {
  patient?: PatientLite | null
  defaultModel?: string
}) {
  const { t } = useLanguage()
  const naLabel = t("common.na")
  const { patient: currentPatient } = usePatient()
  const { asrText, prompt, model } = useNote()
  const { getFormattedClinicalContext } = useClinicalContext()

  const { queryGpt, isLoading, error, response: gptResponse } = useGptQuery({
    defaultModel: defaultModel,
  })
  const { apiKey } = useApiKey()
  const [displayResponse, setDisplayResponse] = useState("")
  const [isEdited, setIsEdited] = useState(false)

  const validateApiKey = () => {
    if (!apiKey) {
      alert(t("medicalNote.apiKeyRequired"))
      return false
    }
    return true
  }

  const handleGptRequest = async () => {
    if (!validateApiKey()) return

    try {
      const patientInfo = currentPatient
        ? `Patient ID: ${currentPatient.id || naLabel}\nGender: ${currentPatient.gender || naLabel}\nAge: ${
            currentPatient.birthDate ? calculateAge(currentPatient.birthDate, naLabel) : naLabel
          }`
        : t("medicalNote.noPatientInfo")

      if (currentPatient) {
        console.log("Original Patient Info (not sent to GPT):", {
          name:
            `${currentPatient.name?.[0]?.given?.join(" ") || ""} ${
              currentPatient.name?.[0]?.family || ""
            }`.trim() || naLabel,
          gender: currentPatient.gender,
          birthDate: currentPatient.birthDate,
          id: currentPatient.id,
        })
      }

      console.log("Patient Info:", patientInfo)

      const clinicalContext = getFormattedClinicalContext()
      console.log("Raw Clinical Context:", clinicalContext)

      interface ClinicalContextSection {
        title?: string
        items?: (string | { [key: string]: any })[] | string
      }

      const formatClinicalContext = (
        context: ClinicalContextSection[] | string | null | undefined
      ): string => {
        if (!context) return t("medicalNote.noClinicalDataSelected")

        if (Array.isArray(context)) {
          return context
            .map((section: ClinicalContextSection) => {
              if (!section) return ""
              const title = section.title || t("medicalNote.untitled")
              const items = Array.isArray(section.items)
                ? section.items
                    .map((item: any) => `- ${typeof item === "object" ? JSON.stringify(item) : item}`)
                    .join("\n")
                : String(section.items || "")
              return `${title}:\n${items}`
            })
            .filter(Boolean)
            .join("\n\n")
        }

        return String(context)
      }

      const formattedContext = formatClinicalContext(clinicalContext)
      console.log("Formatted Clinical Context:", formattedContext)

      const fullPrompt = `## Patient Information\n${patientInfo}\n\n## Clinical Context\n${formattedContext}\n\n## Note\n${
        asrText || t("medicalNote.noNoteProvided")
      }\n\n## Instruction\n${prompt || t("medicalNote.defaultPrompt")}`

      console.log("Full Prompt:", fullPrompt)

      await queryGpt(
        [
          {
            role: "system",
            content:
              "You are a helpful medical assistant. Provide clear and concise responses based on the patient information and clinical context provided.",
          },
          {
            role: "user",
            content: fullPrompt,
          },
        ],
        model || defaultModel
      )
    } catch (err) {
      console.error("Error in handleGptRequest:", err)
      const errorMessage = err instanceof Error ? err.message : t("medicalNote.gptFailed")
      console.error("Error details:", { error: err })
      setDisplayResponse(`${t("medicalNote.gptErrorPrefix")} ${errorMessage}`)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-slate-900 font-semibold">{t("medicalNote.gptResponseTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={isEdited ? displayResponse : gptResponse || displayResponse || ""}
          onChange={(e) => {
            if (!isEdited) setIsEdited(true)
            setDisplayResponse(e.target.value)
          }}
          placeholder={t("medicalNote.gptResponsePlaceholder")}
          className="min-h-[80px]"
        />
        <Button onClick={handleGptRequest} disabled={isLoading}>
          {isLoading ? t("medicalNote.gptGenerating") : t("medicalNote.gptGenerate")}
        </Button>
      </CardContent>
    </Card>
  )
}
