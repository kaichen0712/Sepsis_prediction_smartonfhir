"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import {
  defaultLocale,
  isLocale,
  translations,
  type Locale,
  type TranslationKey,
} from "@/lib/i18n/i18n.config"

type LanguageContextValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: TranslationKey) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({
  children,
  storageKey = "APP_LOCALE",
}: {
  children: React.ReactNode
  storageKey?: string
}) {
  const isBrowser = typeof window !== "undefined"
  const [locale, setLocaleState] = useState<Locale>(defaultLocale)

  useEffect(() => {
    if (!isBrowser) return
    try {
      const stored = window.localStorage.getItem(storageKey)
      if (!stored) return
      if (isLocale(stored)) {
        setLocaleState(stored)
        return
      }
      if (stored === "en") setLocaleState("en-US")
      if (stored === "zh" || stored === "zh-TW") setLocaleState("zh-TW")
    } catch {}
  }, [isBrowser, storageKey])

  useEffect(() => {
    if (!isBrowser) return
    try {
      window.localStorage.setItem(storageKey, locale)
    } catch {}
    document.documentElement.lang = locale
  }, [isBrowser, locale, storageKey])

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
  }, [])

  const t = useCallback(
    (key: TranslationKey) => {
      const read = (source: Record<string, unknown>) => {
        const parts = key.split(".")
        let current: unknown = source
        for (const part of parts) {
          if (!current || typeof current !== "object") return undefined
          current = (current as Record<string, unknown>)[part]
        }
        return typeof current === "string" ? current : undefined
      }
      return (
        read(translations[locale] as Record<string, unknown>) ??
        read(translations[defaultLocale] as Record<string, unknown>) ??
        key
      )
    },
    [locale]
  )

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error("useLanguage must be used inside <LanguageProvider>")
  return ctx
}
