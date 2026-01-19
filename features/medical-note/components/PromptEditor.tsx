// features/medical-note/components/PromptEditor.tsx
"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { useLanguage } from "@/lib/providers/LanguageProvider"
import { useNote } from "../providers/NoteProvider"

export function PromptEditor({
  title,
  embedded = false,
}: {
  title?: string
  embedded?: boolean
}) {
  const { t } = useLanguage()
  const { prompt, setPrompt } = useNote()
  const heading = title ?? t("medicalNote.prompt")

  const body = (
    <Textarea
      value={prompt}
      onChange={(e) => setPrompt(e.target.value)}
      className="min-h-[60px]"
      spellCheck={false}
    />
  )

  if (embedded) {
    return (
      <div className="space-y-2">
        <div className="text-sm font-semibold text-slate-900">{heading}</div>
        {body}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-slate-900 font-semibold">{heading}</CardTitle>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  )
}
