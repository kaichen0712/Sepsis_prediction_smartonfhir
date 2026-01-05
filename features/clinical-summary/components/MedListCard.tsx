// features/clinical-summary/components/MedListCard.tsx
"use client"

import { useMemo } from "react"
import { useLanguage } from "@/lib/providers/LanguageProvider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useClinicalData } from "@/lib/providers/ClinicalDataProvider"
import { Badge } from "@/components/ui/badge"

type Coding = {
  system?: string
  code?: string
  display?: string
}

type CodeableConcept = {
  text?: string
  coding?: Coding[]
}

type TimingRepeat = {
  frequency?: number
  period?: number
  periodUnit?: string
}

type DoseAndRate = {
  doseQuantity?: { value?: number; unit?: string }
  doseRange?: {
    low?: { value?: number; unit?: string }
    high?: { value?: number; unit?: string }
  }
}

type Medication = {
  id?: string
  resourceType?: string
  status?: string
  intent?: string
  medicationCodeableConcept?: CodeableConcept
  medicationReference?: { display?: string }
  authoredOn?: string
  effectiveDateTime?: string
  dosageInstruction?: Array<{
    text?: string
    route?: CodeableConcept
    timing?: { repeat?: TimingRepeat }
    doseAndRate?: DoseAndRate[]
  }>
  dosage?: Array<{
    text?: string
    route?: CodeableConcept
    timing?: { repeat?: TimingRepeat }
    doseAndRate?: DoseAndRate[]
  }>
  code?: CodeableConcept
  medication?: CodeableConcept
  resource?: {
    code?: CodeableConcept
  }
}

type Row = {
  id: string
  title: string
  status: string
  detail?: string
  when?: string
}

function ccText(cc?: CodeableConcept, fallback?: string) {
  return cc?.text || cc?.coding?.[0]?.display || cc?.coding?.[0]?.code || fallback || ""
}

function fmtDate(d?: string) {
  if (!d) return ""
  try {
    return new Date(d).toLocaleString()
  } catch {
    return d
  }
}

function round1(n: number) {
  return Number.isFinite(n) ? Math.round(n * 10) / 10 : n
}

function normalizeFormUnit(u?: string) {
  if (!u) return ""
  const s = u.toLowerCase().trim()
  if (["tablet", "tablets", "tab", "tabs"].includes(s)) return "tab"
  if (["capsule", "capsules", "cap", "caps"].includes(s)) return "cap"
  if (["milliliter", "milliliters", "ml", "mL"].includes(s)) return "mL"
  if (["drop", "drops", "gtt"].includes(s)) return "drop"
  if (["puff", "puffs", "actuation", "spray", "sprays"].includes(s)) return "puff"
  if (["mg", "g", "mcg", "μg", "ug"].includes(s)) return s
  return u
}

function humanDoseAmount(doseAndRate?: DoseAndRate[], text?: string) {
  const d = doseAndRate?.[0]
  if (d?.doseQuantity?.value != null) {
    const v = round1(d.doseQuantity.value)
    const u = normalizeFormUnit(d.doseQuantity.unit || "")
    return `${v}${u ? " " + u : ""}`
  }
  if (d?.doseRange?.low?.value != null || d?.doseRange?.high?.value != null) {
    const lo = d.doseRange.low
    const hi = d.doseRange.high
    const unit = normalizeFormUnit(lo?.unit || hi?.unit || "")
    const left = lo?.value != null ? String(round1(lo.value)) : ""
    const right = hi?.value != null ? String(round1(hi.value)) : ""
    const core = left && right ? `${left}-${right}` : left || right
    if (core) return `${core}${unit ? " " + unit : ""}`
  }
  if (text) {
    const m = text.match(
      /(\d+(?:\.\d+)?)\s*(tab(?:let)?s?|cap(?:sule)?s?|mL|ml|mg|mcg|g|drop(?:s)?|puff(?:s)?)/i
    )
    if (m) {
      const val = m[1]
      const unit = normalizeFormUnit(m[2])
      return `${val} ${unit}`
    }
  }
  return ""
}

function humanDoseFreq(rep?: TimingRepeat) {
  if (!rep) return ""
  const freq = rep.frequency ?? 0
  const period = rep.period ?? 0
  const unitRaw = (rep.periodUnit || "").toLowerCase()

  const unit =
    unitRaw.startsWith("d")
      ? "day"
      : unitRaw.startsWith("h")
      ? "hour"
      : unitRaw.startsWith("wk")
      ? "week"
      : unitRaw.startsWith("mo")
      ? "month"
      : unitRaw

  if (unit == "day" && period == 1) {
    const map: Record<number, string> = { 1: "QD", 2: "BID", 3: "TID", 4: "QID" }
    const code = map[freq]
    if (code) return code
    if (freq > 0) return `${freq}x/day`
  }

  if (unit == "hour" && period > 0 && freq == 1) return `q${period}h`
  if (unit == "week" && period == 1 && freq == 1) return "QW"
  if (unit == "month" && period == 1 && freq == 1) return "QM"

  if (unit == "day" && period > 0 && freq > 0) {
    return `${freq}x every ${period} day${period > 1 ? "s" : ""}`
  }
  if (unit == "hour" && period > 0 && freq > 0) return `${freq}x q${period}h`
  if (unit == "week" && period > 0 && freq > 0) {
    return `${freq}x every ${period} week${period > 1 ? "s" : ""}`
  }
  if (unit == "month" && period > 0 && freq > 0) {
    return `${freq}x every ${period} month${period > 1 ? "s" : ""}`
  }

  return ""
}

function buildDetail({
  doseAndRate,
  doseText,
  route,
  repeat,
  labels,
}: {
  doseAndRate?: DoseAndRate[]
  doseText?: string
  route?: CodeableConcept
  repeat?: TimingRepeat
  labels: { dose: string; route: string; freq: string; unknown: string; separator: string }
}) {
  const dose = humanDoseAmount(doseAndRate, doseText)
  const r = ccText(route, labels.unknown)
  const freq = humanDoseFreq(repeat)

  const parts = [
    dose ? `${labels.dose} ${dose}` : "",
    r !== labels.unknown ? `${labels.route} ${r}` : "",
    freq ? `${labels.freq} ${freq}` : "",
  ].filter(Boolean)

  return parts.join(labels.separator)
}

export function MedListCard() {
  const { t } = useLanguage()
  const unknownLabel = t("common.unknown")
  const { medications = [], isLoading, error } = useClinicalData()

  const rows = useMemo<Row[]>(() => {
    if (!Array.isArray(medications)) return []

    return medications.map((med: Medication) => {
      const dosage = med.dosageInstruction?.[0] || med.dosage?.[0]

      let medicationName = t("medications.unknownMedication")
      if (med.medicationCodeableConcept) {
        medicationName = ccText(med.medicationCodeableConcept, unknownLabel)
      } else if (med.medicationReference?.display) {
        medicationName = med.medicationReference.display
      } else if (med.code?.text) {
        medicationName = med.code.text
      } else if (med.medication?.text) {
        medicationName = med.medication.text
      } else if (med.resource?.code?.text) {
        medicationName = med.resource.code.text
      } else if (med.code?.coding?.[0]?.display) {
        medicationName = med.code.coding[0].display
      }

      const detail = buildDetail({
        doseAndRate: dosage?.doseAndRate,
        doseText: dosage?.text,
        route: dosage?.route,
        repeat: dosage?.timing?.repeat,
        labels: {
          dose: t("medications.doseLabel"),
          route: t("medications.routeLabel"),
          freq: t("medications.freqLabel"),
          unknown: unknownLabel,
          separator: t("common.separator"),
        },
      })

      return {
        id: med.id || Math.random().toString(36),
        title: medicationName,
        status: med.status?.toLowerCase() || "unknown",
        detail: detail || undefined,
        when: fmtDate(med.authoredOn || med.effectiveDateTime),
      }
    })
  }, [medications, t, unknownLabel])

  const statusLabel = (status: string) => {
    if (status === "active") return t("medications.status.active")
    if (status === "completed") return t("medications.status.completed")
    if (status === "stopped") return t("medications.status.stopped")
    if (status === "unknown") return unknownLabel
    return status
  }

  const body = useMemo(() => {
    if (isLoading) {
      return <div className="text-sm text-muted-foreground">{t("medications.loading")}</div>
    }
    if (error) {
      return (
        <div className="text-sm text-red-600">
          {error instanceof Error ? error.message : String(error)}
        </div>
      )
    }
    if (rows.length === 0) {
      return <div className="text-sm text-muted-foreground">{t("medications.noneFound")}</div>
    }

    return (
      <div className="space-y-2">
        {rows.map(row => (
          <div key={row.id} className="rounded-md border p-3">
            <div className="flex items-center justify-between">
              <div className="font-medium">{row.title}</div>
              <Badge
                variant={
                  row.status === "active"
                    ? "default"
                    : row.status === "completed" || row.status === "stopped"
                    ? "secondary"
                    : "outline"
                }
                className="ml-2 capitalize"
              >
                {statusLabel(row.status)}
              </Badge>
            </div>
            {row.detail && (
              <div className="mt-1 text-sm text-muted-foreground">{row.detail}</div>
            )}
            {row.when && (
              <div className="mt-1 text-xs text-muted-foreground">{row.when}</div>
            )}
          </div>
        ))}
      </div>
    )
  }, [rows, isLoading, error, t, unknownLabel])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-slate-900 font-semibold">{t("medications.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">{body}</CardContent>
    </Card>
  )
}
