// features/medical-note/components/AsrPanel.tsx
"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import { ReactMediaRecorder } from "react-media-recorder"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useApiKey } from "@/lib/providers/ApiKeyProvider"
import { useLanguage } from "@/lib/providers/LanguageProvider"
import { useNote } from "../providers/NoteProvider"

export function AsrPanel({ embedded = false }: { embedded?: boolean }) {
  const { t } = useLanguage()
  const { asrText, setAsrText } = useNote()
  const { apiKey } = useApiKey()
  const [isRecording, setIsRecording] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const timerRef = useRef<number | null>(null)

  const startTimer = () => {
    stopTimer()
    timerRef.current = window.setInterval(() => setSeconds(s => s + 1), 1000)
  }
  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }
  useEffect(() => () => stopTimer(), [])

  const handleWhisperRequest = useCallback(
    async (audioBlob: Blob) => {
      if (!apiKey) {
        alert(t("medicalNote.apiKeyRequired"))
        return
      }
      setIsLoading(true)
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
        const text = j?.text || t("medicalNote.transcriptionFailed")
        setAsrText(prev => (prev ? prev + "\n" : "") + text)
      } catch {
        setAsrText(prev => (prev ? prev + "\n" : "") + t("medicalNote.transcriptionFailedRetry"))
      } finally {
        setIsLoading(false)
      }
    },
    [apiKey, setAsrText, t]
  )

  const body = (
    <div className="space-y-3">
      <ReactMediaRecorder
        audio
        onStop={async (_url, blob) => {
          setIsRecording(false)
          stopTimer()
          setSeconds(0)
          await handleWhisperRequest(blob)
        }}
        render={({ startRecording, stopRecording }) => (
          <div className="flex items-center gap-3">
            {isRecording ? (
              <>
                <Button variant="destructive" onClick={stopRecording}>
                  {t("medicalNote.stopRecording")}
                </Button>
                <span className="text-sm tabular-nums">
                  {t("medicalNote.recordingLabel")} {seconds}s
                </span>
              </>
            ) : (
              <Button
                onClick={() => {
                  if (!apiKey) {
                    alert(t("medicalNote.apiKeyRequiredShort"))
                    return
                  }
                  setIsRecording(true)
                  setSeconds(0)
                  startTimer()
                  startRecording()
                }}
              >
                {t("medicalNote.startRecording")}
              </Button>
            )}
            {isLoading && (
              <span className="text-sm text-muted-foreground">{t("medicalNote.transcribing")}</span>
            )}
          </div>
        )}
      />
      <Textarea
        value={asrText}
        onChange={(e) => setAsrText(e.target.value)}
        className="min-h-[60px]"
        spellCheck={false}
      />
    </div>
  )

  if (embedded) {
    return (
      <div className="space-y-2">
        <div className="text-sm font-semibold text-slate-900">{t("medicalNote.asrTitle")}</div>
        {body}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-slate-900 font-semibold">{t("medicalNote.asrTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">{body}</CardContent>
    </Card>
  )
}
