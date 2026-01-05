// features/medical-note/components/ApiKeyField.tsx
"use client"

import { useState } from "react"
import { useLanguage } from "@/lib/providers/LanguageProvider"
import { useApiKey } from "@/lib/providers/ApiKeyProvider"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export function ApiKeyField() {
  const { t } = useLanguage()
  const { apiKey, setApiKey, clearApiKey } = useApiKey()
  const [value, setValue] = useState(apiKey)

  return (
    <div className="max-w-xl space-y-1">
      <label htmlFor={`api-key-${Date.now()}`} className="text-xs text-muted-foreground">
        {t("medicalNote.apiKeyLabel")}
      </label>
      <div className="flex gap-1.5">
        <Input
          id={`api-key-${Date.now()}`}
          type="password"
          placeholder={t("medicalNote.apiKeyPlaceholder")}
          className="h-8 text-sm"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <Button size="sm" onClick={() => setApiKey(value)} disabled={!value}>
          {t("common.save")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setValue("")
            clearApiKey()
          }}
        >
          {t("common.clear")}
        </Button>
      </div>
      {!apiKey && (
        <p className="text-[11px] leading-tight text-muted-foreground">
          {t("medicalNote.apiKeyHint")}
        </p>
      )}
    </div>
  )
}
