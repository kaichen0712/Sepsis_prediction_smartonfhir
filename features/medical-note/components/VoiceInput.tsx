"use client"

import { useCallback, useState } from "react"
import { ReactMediaRecorder } from "react-media-recorder"
import { Mic, Square } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { TranslationKey } from "@/lib/i18n/i18n.config"

type Props = {
  value: string
  onChange: (next: string) => void
  onSubmit: () => void
  placeholder: string
  apiKey: string
  t: (key: TranslationKey) => string
  disabled?: boolean
}

export function VoiceInput({
  value,
  onChange,
  onSubmit,
  placeholder,
  apiKey,
  t,
  disabled = false,
}: Props) {
  const [isTranscribing, setIsTranscribing] = useState(false)

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
          onChange(value ? `${value} ${cleaned}` : cleaned)
        }
      } catch {
        // Keep silent; user can retry.
      } finally {
        setIsTranscribing(false)
      }
    },
    [apiKey, onChange, t, value]
  )

  return (
    <ReactMediaRecorder
      audio
      onStop={async (_url, blob) => {
        await handleWhisperRequest(blob)
      }}
      render={({ startRecording, stopRecording, status }) => (
        <div className="flex items-end gap-2">
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                onSubmit()
              }
            }}
            placeholder={placeholder}
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
                if (!apiKey) {
                  alert(t("medicalNote.apiKeyRequired"))
                  return
                }
                startRecording()
              }
            }}
            aria-label={t("medicalNote.startRecording")}
            disabled={isTranscribing || disabled}
          >
            {status === "recording" ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
          <Button onClick={onSubmit} disabled={disabled}>
            {disabled ? t("medicalNote.gptGenerating") : t("medicalNote.gptGenerate")}
          </Button>
        </div>
      )}
    />
  )
}
