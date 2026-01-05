// features/medical-note/components/PromptEditor.tsx
"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { useLanguage } from "@/lib/providers/LanguageProvider"
import { useNote } from "../providers/NoteProvider"

export function PromptEditor({ title }: { title?: string }) {
  const { t } = useLanguage()
  const { prompt, setPrompt } = useNote()
  const heading = title ?? t("medicalNote.prompt")

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-slate-900 font-semibold">{heading}</CardTitle>
      </CardHeader>
      <CardContent>
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="min-h-[60px]"
          spellCheck={false}
        />
      </CardContent>
    </Card>
  )
}
