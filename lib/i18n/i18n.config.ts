import { en } from "@/lib/i18n/translations/en-US"
import { zhTW } from "@/lib/i18n/translations/zh-TW"

export const locales = ["en-US", "zh-TW"] as const
export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = "en-US"

export const localeNames: Record<Locale, string> = {
  "en-US": "English",
  "zh-TW": "繁體中文",
}

export const translations = {
  "en-US": en,
  "zh-TW": zhTW,
} as const

type LeafKeys<T> = {
  [K in Extract<keyof T, string>]: T[K] extends Record<string, unknown>
    ? `${K}.${LeafKeys<T[K]>}`
    : K
}[Extract<keyof T, string>]

export type TranslationKey = LeafKeys<typeof en>

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale)
}
