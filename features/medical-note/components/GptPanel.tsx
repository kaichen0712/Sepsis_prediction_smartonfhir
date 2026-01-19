// features/medical-note/components/GptPanel.tsx
"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ReactMediaRecorder } from "react-media-recorder"
import { Database, MessageCircle, Mic, Square, Trash2 } from "lucide-react"
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
  embedded = false,
}: {
  patient?: PatientLite | null
  defaultModel?: string
  embedded?: boolean
}) {
  const { t, locale } = useLanguage()
  const naLabel = t("common.na")
  const { patient: currentPatient } = usePatient()
  const { prompt, setPrompt, model, setGptResponse } = useNote()
  const { getFormattedClinicalContext } = useClinicalContext()

  const { queryGpt, isLoading, error, setResponse: setGptQueryResponse, cancel: cancelGpt } = useGptQuery({
    defaultModel: defaultModel,
  })
  const { apiKey } = useApiKey()
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [insertNotice, setInsertNotice] = useState("")
  const [useLiterature, setUseLiterature] = useState(false)
  const [literatureItems, setLiteratureItems] = useState<
    { pmid: string; title: string; url: string }[]
  >([])
  const [messages, setMessages] = useState<
    { id: string; role: "user" | "assistant"; content: string; at: Date }[]
  >([])
  const [literatureStatus, setLiteratureStatus] = useState<
    "idle" | "loading" | "ready" | "empty" | "error"
  >("idle")

  const validateApiKey = () => {
    if (!apiKey) {
      alert(t("medicalNote.apiKeyRequired"))
      return false
    }
    return true
  }

  const literatureQuery = useMemo(() => {
    const base = prompt.trim()
    if (!base) return ""
    return `${base} sepsis`
  }, [prompt])

  const handleGptRequest = async () => {
    if (!validateApiKey()) return

    try {
      const nextInput = prompt.trim()
      if (!nextInput) return

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

      const displayInput = nextInput
      const userInput = displayInput ? `## Note\n${displayInput}` : ""
      const userAt = new Date()
      setMessages(prev => [
        ...prev,
        {
          id: `${userAt.getTime()}-${Math.random().toString(36).slice(2)}`,
          role: "user",
          content: displayInput,
          at: userAt,
        },
      ])

      let literatureBlock = ""
      if (useLiterature && literatureQuery) {
        try {
          setLiteratureStatus("loading")
          const r = await fetch("/api/literature", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: literatureQuery, maxResults: 5 }),
          })
          if (r.ok) {
            const data = await r.json()
            literatureBlock = data?.summary ? `## Literature Summary\n${data.summary}\n\n` : ""
            const items = Array.isArray(data?.items) ? data.items : []
            setLiteratureItems(items)
            setLiteratureStatus(items.length ? "ready" : "empty")
          } else {
            setLiteratureItems([])
            setLiteratureStatus("error")
          }
        } catch {
          setLiteratureItems([])
          setLiteratureStatus("error")
        }
      } else if (useLiterature) {
        setLiteratureItems([])
        setLiteratureStatus("empty")
      }

      const fullPrompt = `## Patient Information\n${patientInfo}\n\n## Clinical Context\n${formattedContext}\n\n${literatureBlock}${
        userInput || t("medicalNote.noNoteProvided")
      }`

      console.log("Full Prompt:", fullPrompt)

      const responseLanguage = locale.startsWith("zh") ? "Traditional Chinese" : "English"
      const responseFormat = locale.startsWith("zh")
        ? "請用純文字輸出，格式固定如下：\n敗血症風險：低/中/高（擇一）\n依據：用 2-4 句說明判斷理由\n異常/警訊：列 3-6 點\n建議：列 3-6 點"
        : "Output plain text only with this exact format:\nSepsis Risk: Low/Medium/High (choose one)\nRationale: 2-4 sentences\nAbnormalities/Red Flags: 3-6 bullet points\nRecommendations: 3-6 bullet points"

      const content = await queryGpt(
        [
          {
            role: "system",
            content:
              `You are a helpful medical assistant. Provide clear and concise responses based on the patient information and clinical context provided. Respond in ${responseLanguage} regardless of the input language. Output plain text only; do not use Markdown or asterisks. ${responseFormat}`,
          },
          {
            role: "user",
            content: fullPrompt,
          },
        ],
        model || defaultModel
      )

      if (typeof content === "string" && content.trim()) {
        const responseAt = new Date()
        setMessages(prev => [
          ...prev,
          {
            id: `${responseAt.getTime()}-${Math.random().toString(36).slice(2)}`,
            role: "assistant",
            content,
            at: responseAt,
          },
        ])
      }

      setPrompt("")
    } catch (err) {
      console.error("Error in handleGptRequest:", err)
      const errorMessage = err instanceof Error ? err.message : t("medicalNote.gptFailed")
      console.error("Error details:", { error: err })
      const responseAt = new Date()
      setMessages(prev => [
        ...prev,
        {
          id: `${responseAt.getTime()}-${Math.random().toString(36).slice(2)}`,
          role: "assistant",
          content: `${t("medicalNote.gptErrorPrefix")} ${errorMessage}`,
          at: responseAt,
        },
      ])
    }
  }

  const handleWhisperRequest = useCallback(
    async (audioBlob: Blob) => {
      if (!apiKey) {
        alert(t("medicalNote.apiKeyRequired"))
        return
      }
      setIsTranscribing(true)
      const fd = new FormData()
      fd.append("file", audioBlob, "audio.webm")
      fd.append("model", "whisper-1")
      try {
        const r = await fetch("https://api.openai.com/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}` },
          body: fd,
        })
        const j = await r.json()
        const raw = (j?.text || "").trim()
        const cleaned = raw.replace(/\s+/g, " ").trim()
        if (cleaned) {
          setPrompt(prev => (prev ? `${prev} ${cleaned}` : cleaned))
        }
      } catch {
        // Keep silent; user can retry.
      } finally {
        setIsTranscribing(false)
      }
    },
    [apiKey, setPrompt, t]
  )

  const body = (
    <div className="space-y-3">
      <div className="rounded-md border bg-white p-4 space-y-3 h-72 overflow-y-auto resize-y min-h-[220px] max-h-[520px]">
        <div className="text-xs text-muted-foreground">
          {useLiterature ? t("medicalNote.literatureOn") : t("medicalNote.literatureOff")}
        </div>
        {useLiterature && literatureStatus === "ready" && literatureItems.length ? (
          <div className="rounded-md border bg-slate-50 p-2 text-xs text-slate-700 space-y-1">
            <div className="font-semibold">{t("medicalNote.literatureSources")}</div>
            {literatureItems.slice(0, 5).map(item => (
              <a
                key={item.pmid}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="block underline underline-offset-2 hover:text-slate-900"
              >
                {item.title}
              </a>
            ))}
          </div>
        ) : null}
        {useLiterature && literatureStatus === "loading" ? (
          <div className="text-xs text-muted-foreground">
            {t("medicalNote.literatureLoading")}
          </div>
        ) : null}
        {useLiterature && literatureStatus === "empty" ? (
          <div className="text-xs text-muted-foreground">
            {t("medicalNote.literatureEmpty")}
          </div>
        ) : null}
        {useLiterature && literatureStatus === "error" ? (
          <div className="text-xs text-amber-700">
            {t("medicalNote.literatureError")}
          </div>
        ) : null}
        {messages.map(item => (
          <div
            key={item.id}
            className="space-y-1"
          >
            <div
              className={`flex items-center gap-2 text-xs text-slate-500 ${
                item.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <span>{item.role === "user" ? t("medicalNote.youLabel") : t("medicalNote.gptLabel")}</span>
              <span>{item.at.toLocaleTimeString()}</span>
            </div>
            <div className={item.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm shadow-sm whitespace-pre-wrap ${
                  item.role === "user"
                    ? "bg-blue-600 text-white"
                    : "border bg-slate-50 text-slate-900"
                }`}
              >
                {item.content}
              </div>
            </div>
          </div>
        ))}
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center text-sm text-muted-foreground h-full">
            <MessageCircle className="h-10 w-10 text-slate-300 mb-3" />
            <div>{t("medicalNote.emptyStateHint")}</div>
          </div>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            const context = getFormattedClinicalContext()
            if (
              !context ||
              context.includes("No clinical data") ||
              context.includes(t("medicalNote.noClinicalDataSelected"))
            ) {
              setInsertNotice(t("medicalNote.noClinicalDataForSepsis"))
              return
            }
            setInsertNotice("")
            setPrompt(prev => (prev ? `${prev}\n\n${context}` : context))
          }}
        >
          <Database className="mr-1 h-4 w-4" />
          {t("medicalNote.insertClinicalData")}
        </Button>
        <div className="flex items-center gap-2">
          <Checkbox
            id="literature-toggle"
            checked={useLiterature}
            onCheckedChange={(checked) => setUseLiterature(checked === true)}
          />
          <Label htmlFor="literature-toggle" className="text-sm">
            {t("medicalNote.useLiterature")}
          </Label>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            cancelGpt()
            setPrompt("")
            setMessages([])
            setGptResponse("")
            setGptQueryResponse("")
            setInsertNotice("")
            setLiteratureItems([])
            setLiteratureStatus("idle")
          }}
          className="text-red-600 border-red-200 hover:text-red-700 hover:border-red-300"
        >
          <Trash2 className="mr-1 h-4 w-4" />
          {t("medicalNote.clearConversation")}
        </Button>
      </div>
      {insertNotice ? (
        <div className="text-xs text-amber-700">{insertNotice}</div>
      ) : null}
      <ReactMediaRecorder
        audio
        onStop={async (_url, blob) => {
          await handleWhisperRequest(blob)
        }}
        render={({ startRecording, stopRecording, status }) => (
          <div className="flex items-end gap-2">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  void handleGptRequest()
                }
              }}
              placeholder={t("medicalNote.inputPlaceholder")}
              className="min-h-[44px] resize-none"
              rows={2}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (status === "recording") {
                  stopRecording()
                } else {
                  if (!validateApiKey()) return
                  startRecording()
                }
              }}
              aria-label={t("medicalNote.startRecording")}
              disabled={isTranscribing}
            >
              {status === "recording" ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Button onClick={handleGptRequest} disabled={isLoading}>
              {isLoading ? t("medicalNote.gptGenerating") : t("medicalNote.gptGenerate")}
            </Button>
          </div>
        )}
      />
    </div>
  )

  if (embedded) {
    return (
      <div className="space-y-2">
        {body}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-slate-900 font-semibold">{t("medicalNote.gptResponseTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">{body}</CardContent>
    </Card>
  )
}
