// features/clinical-summary/components/ReportsCard.tsx
"use client"

import { useMemo } from "react"
import { useLanguage } from "@/lib/providers/LanguageProvider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useClinicalData } from "@/lib/providers/ClinicalDataProvider"

type Coding = { system?: string; code?: string; display?: string }
type Quantity = { value?: number; unit?: string }
type CodeableConcept = { text?: string; coding?: Coding[] }
type ReferenceRange = { low?: Quantity; high?: Quantity; text?: string }

type ObsComponent = {
  code?: CodeableConcept
  valueQuantity?: Quantity
  valueString?: string
  interpretation?: CodeableConcept
  referenceRange?: ReferenceRange[]
}

type Observation = {
  resourceType: "Observation"
  id?: string
  code?: CodeableConcept
  valueQuantity?: Quantity
  valueString?: string
  interpretation?: CodeableConcept
  referenceRange?: ReferenceRange[]
  component?: ObsComponent[]
  hasMember?: { reference?: string }[]
  effectiveDateTime?: string
  status?: string
  category?: CodeableConcept[]
  encounter?: { reference?: string }
}

interface DiagnosticReport {
  id?: string
  resourceType: "DiagnosticReport"
  code?: CodeableConcept
  status?: string
  issued?: string
  effectiveDateTime?: string
  result?: { reference?: string }[]
  category?: CodeableConcept | CodeableConcept[]
  _observations?: Observation[]
}

type Row = { id: string; title: string; meta: string; obs: Observation[] }

function ccText(cc?: CodeableConcept, fallback?: string) {
  return cc?.text || cc?.coding?.[0]?.display || cc?.coding?.[0]?.code || fallback || ""
}

function qty(q?: Quantity, fallback?: string) {
  if (!q || q.value == null) return fallback || ""
  return `${q.value}${q.unit ? " " + q.unit : ""}`
}

function valueWithUnit(v?: Quantity, fallback?: string) {
  if (v && v.value != null) return qty(v)
  return fallback || ""
}

function fmtDate(d?: string) {
  if (!d) return ""
  try {
    return new Date(d).toLocaleString()
  } catch {
    return d
  }
}

function refRangeText(rr: ReferenceRange[] | undefined, refPrefix: string) {
  if (!rr || rr.length == 0) return ""
  const r = rr[0]
  if (r.text) return `${refPrefix} ${r.text}`
  const low = r.low?.value
  const high = r.high?.value
  const unit = r.low?.unit || r.high?.unit
  if (low != null && high != null) return `${refPrefix} ${low}-${high}${unit ? " " + unit : ""}`
  if (low != null) return `${refPrefix} ${low}${unit ? " " + unit : ""}`
  if (high != null) return `${refPrefix} ${high}${unit ? " " + unit : ""}`
  return ""
}

function interpCode(concept?: CodeableConcept) {
  const raw = concept?.coding?.[0]?.code || concept?.coding?.[0]?.display || concept?.text || ""
  return (raw || "").toString().toUpperCase()
}

function getInterpTag(
  concept: CodeableConcept | undefined,
  labels: {
    criticalHigh: string
    high: string
    criticalLow: string
    low: string
    abnormal: string
    positive: string
    negative: string
    normal: string
  }
) {
  const code = interpCode(concept)
  if (!code) return null
  let label = code
  let style = "bg-muted text-muted-foreground"
  if (["H", "HI", "HIGH", "ABOVE", ">", "HH", "CRIT-HI"].includes(code)) {
    label = code == "HH" ? labels.criticalHigh : labels.high
    style = "bg-red-100 text-red-700 border border-red-200"
  } else if (["L", "LO", "LOW", "BELOW", "<", "LL", "CRIT-LO"].includes(code)) {
    label = code == "LL" ? labels.criticalLow : labels.low
    style = "bg-blue-100 text-blue-700 border border-blue-200"
  } else if (["A", "ABN", "ABNORMAL"].includes(code)) {
    label = labels.abnormal
    style = "bg-amber-100 text-amber-700 border border-amber-200"
  } else if (["POS", "POSITIVE", "DETECTED", "REACTIVE"].includes(code)) {
    label = labels.positive
    style = "bg-orange-100 text-orange-700 border border-orange-200"
  } else if (["NEG", "NEGATIVE", "NOT DETECTED", "NONREACTIVE"].includes(code)) {
    label = labels.negative
    style = "bg-emerald-100 text-emerald-700 border border-emerald-200"
  } else if (["N", "NORMAL"].includes(code)) {
    label = labels.normal
    style = "bg-gray-100 text-gray-600 border border-gray-200"
  }
  return { label, style }
}

export function ReportsCard() {
  const { t } = useLanguage()
  const unknownLabel = t("common.unknown")
  const { diagnosticReports = [], observations = [], isLoading, error } = useClinicalData()

  const interpLabels = {
    criticalHigh: t("reports.status.criticalHigh"),
    high: t("reports.status.high"),
    criticalLow: t("reports.status.criticalLow"),
    low: t("reports.status.low"),
    abnormal: t("reports.status.abnormal"),
    positive: t("reports.status.positive"),
    negative: t("reports.status.negative"),
    normal: t("reports.status.normal"),
  }

  const { reportRows, seenIds } = useMemo(() => {
    const rows: Row[] = []
    const seen = new Set<string>()

    ;(diagnosticReports as DiagnosticReport[]).forEach(dr => {
      if (!dr || dr.resourceType !== "DiagnosticReport") return

      const obs = Array.isArray(dr._observations)
        ? dr._observations.filter((o): o is Observation => !!o?.resourceType && o.resourceType === "Observation")
        : []

      obs.forEach(o => {
        if (o?.id) seen.add(o.id)
      })

      if (obs.length === 0) return

      const category = Array.isArray(dr.category)
        ? dr.category.map(c => ccText(c, unknownLabel)).filter(Boolean).join(", ")
        : ccText(dr.category as CodeableConcept, unknownLabel)

      rows.push({
        id: dr.id || Math.random().toString(36),
        title: ccText(dr.code, t("reports.unnamedReport")),
        meta: `${category || t("reports.laboratory")} · ${dr.status || unknownLabel} · ${fmtDate(
          dr.issued || dr.effectiveDateTime
        )}`,
        obs,
      })
    })

    return { reportRows: rows, seenIds: seen }
  }, [diagnosticReports, t, unknownLabel])

  const orphanRows: Row[] = useMemo(() => {
    if (!Array.isArray(observations)) return []

    const orphan = observations.filter(
      (o): o is Observation => o?.resourceType === "Observation" && (!o.id || !seenIds.has(o.id))
    )

    const panels = orphan.filter(
      o =>
        (Array.isArray(o.component) && o.component.length > 0) ||
        (Array.isArray(o.hasMember) && o.hasMember.length > 0) ||
        !!o.valueQuantity ||
        !!o.valueString
    )

    const groupKey = (o: Observation) =>
      (o.encounter?.reference || "") +
      "|" +
      (o.effectiveDateTime ? new Date(o.effectiveDateTime).toISOString().slice(0, 10) : "unknown") +
      "|" +
      (ccText(o.code, t("reports.observation")) || t("reports.observation"))

    const groups = new Map<string, Observation[]>()
    for (const o of panels) {
      const k = groupKey(o)
      const arr = groups.get(k) || []
      arr.push(o)
      groups.set(k, arr)
    }

    return Array.from(groups.entries()).map(([k, lst]) => {
      const first = lst[0]
      return {
        id: `orphan:${k}`,
        title: ccText(first.code, t("reports.observation")),
        meta: `${t("reports.observationGroup")} · ${fmtDate(first.effectiveDateTime)}`,
        obs: lst,
      }
    })
  }, [observations, seenIds, t])

  const rows: Row[] = useMemo(() => {
    const all = [...reportRows, ...orphanRows]
    all.sort((a, b) => {
      const dateA = a.obs[0]?.effectiveDateTime
      const dateB = b.obs[0]?.effectiveDateTime
      const timeA = dateA ? new Date(dateA).getTime() : 0
      const timeB = dateB ? new Date(dateB).getTime() : 0
      return timeB - timeA
    })
    return all
  }, [reportRows, orphanRows])

  function ObservationBlock({ o }: { o: Observation }) {
    const title = ccText(o.code, unknownLabel)
    const interp = getInterpTag(o.interpretation, interpLabels)
    const ref = refRangeText(o.referenceRange, t("reports.referenceRange"))

    const selfVal = o.valueQuantity || o.valueString ? (
      <div className="text-sm leading-relaxed">
        <span className="font-medium">{title}:</span>{" "}
        <span className={interp ? "font-semibold" : ""}>
          {o.valueQuantity ? valueWithUnit(o.valueQuantity, unknownLabel) : o.valueString ?? unknownLabel}
        </span>
        {interp && (
          <span className={`ml-2 inline-flex items-center rounded px-1.5 py-0.5 text-xs ${interp.style}`}>
            {interp.label}
          </span>
        )}
        {ref && <span className="ml-2 text-xs text-muted-foreground">{ref}</span>}
      </div>
    ) : (
      <div className="text-sm font-medium">{title}</div>
    )

    return (
      <div className="rounded-md border p-3">
        {selfVal}
        {Array.isArray(o.component) && o.component.length > 0 && (
          <div className="mt-2 grid gap-1 pl-2">
            {o.component.map((c, i) => {
              const name = ccText(c.code, unknownLabel)
              const v = c.valueQuantity ? valueWithUnit(c.valueQuantity, unknownLabel) : c.valueString ?? unknownLabel
              const ci = getInterpTag(c.interpretation, interpLabels)
              const rr = refRangeText(c.referenceRange, t("reports.referenceRange"))
              return (
                <div key={i} className="text-sm leading-relaxed">
                  <span className="font-medium">{name}:</span>{" "}
                  <span className={ci ? "font-semibold" : ""}>{v}</span>
                  {ci && (
                    <span className={`ml-2 inline-flex items-center rounded px-1.5 py-0.5 text-xs ${ci.style}`}>
                      {ci.label}
                    </span>
                  )}
                  {rr && <span className="ml-2 text-xs text-muted-foreground">{rr}</span>}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("reports.title")}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">{t("reports.loading")}</CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("reports.title")}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-red-600">
          {t("reports.errorPrefix")} {error?.message || t("common.unknown")}
        </CardContent>
      </Card>
    )
  }

  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("reports.title")}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">{t("reports.noReports")}</CardContent>
      </Card>
    )
  }

  const defaultOpen = rows.slice(0, 2).map(r => r.id)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("reports.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" defaultValue={defaultOpen} className="w-full">
          {rows.map(row => (
            <AccordionItem key={row.id} value={row.id} className="border rounded-md px-2 mb-2">
              <AccordionTrigger className="py-3">
                <div className="flex flex-col items-start text-left">
                  <div className="font-medium">{row.title}</div>
                  <div className="text-xs text-muted-foreground">{row.meta}</div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="space-y-3">
                  {row.obs.map((obs, i) => (
                    <ObservationBlock key={obs.id ? `obs-${obs.id}` : `obs-${i}`} o={obs} />
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  )
}
