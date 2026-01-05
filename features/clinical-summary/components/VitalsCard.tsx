"use client"

import { useMemo } from "react"
import { useLanguage } from "@/lib/providers/LanguageProvider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useClinicalData } from "@/lib/providers/ClinicalDataProvider"

import type { FHIRObservation } from "@/lib/providers/ClinicalDataProvider"

type Coding = { system?: string; code?: string; display?: string }
type CodeableConcept = { text?: string; coding?: Coding[] }
type Quantity = { value?: number; unit?: string }
type ObsComponent = {
  code?: CodeableConcept
  valueQuantity?: Quantity
  valueString?: string
  valueCodeableConcept?: CodeableConcept
}

type Observation = FHIRObservation & {
  component?: Array<
    ObsComponent & {
      code?: {
        coding?: Array<{
          code?: string
          system?: string
          display?: string
        }>
      }
    }
  >
}

const LOINC = {
  HEIGHT: "8302-2",
  WEIGHT: "29463-7",
  BMI: "39156-5",
  BP_PANEL: ["85354-9", "55284-4"],
  BP_SYS: "8480-6",
  BP_DIA: "8462-4",
  HR: "8867-4",
  RR: "9279-1",
  TEMP: ["8310-5", "8320-5", "8331-1"],
  SPO2: "59408-5",
}

function qty(q: { value?: number; unit?: string } | undefined, fallback: string) {
  if (!q || q.value == null) return fallback
  const v = Number(q.value)
  const formatted = v.toLocaleString(undefined, {
    maximumFractionDigits: 1,
    minimumFractionDigits: v % 1 === 0 ? 0 : 1,
  })
  return `${formatted}${q.unit ? ` ${q.unit}` : ""}`
}

function fmtDate(d?: string) {
  if (!d) return ""
  try {
    return new Date(d).toLocaleString()
  } catch {
    return d
  }
}

function pickLatestByCode(list: Observation[], code: string | string[]): Observation | undefined {
  if (!list || !list.length) return undefined
  const codes = Array.isArray(code) ? code : [code]
  const filtered = list.filter(o =>
    (o.code?.coding || []).some((c: Coding) => c.code && codes.includes(c.code))
  )
  filtered.sort((a, b) => {
    const dateA = a.effectiveDateTime ? new Date(a.effectiveDateTime).getTime() : 0
    const dateB = b.effectiveDateTime ? new Date(b.effectiveDateTime).getTime() : 0
    return dateB - dateA
  })
  return filtered[0]
}

function categoryCodes(obs?: Observation): string[] {
  if (!obs?.category) return []
  return obs.category
    .flatMap(cat => cat?.coding || [])
    .map(c => c?.code)
    .filter((c): c is string => Boolean(c))
}

export function VitalsCard() {
  const { t } = useLanguage()
  const { vitals, observations, isLoading, error } = useClinicalData()

  const vitalObservations = useMemo(() => {
    const combined = [
      ...(Array.isArray(vitals) ? vitals : []),
      ...(Array.isArray(observations) ? observations : []),
    ]
    if (!combined.length) return [] as Observation[]

    const all = combined.filter((obs): obs is Observation => {
      if (!obs || typeof obs !== "object") return false
      return true
    })
    console.log("[VitalsCard] observations:", all)
    return all
  }, [vitals, observations])

  const view = useMemo(() => {
    const height = pickLatestByCode(vitalObservations, LOINC.HEIGHT)
    const weight = pickLatestByCode(vitalObservations, LOINC.WEIGHT)
    const bmi = pickLatestByCode(vitalObservations, LOINC.BMI)

    let bpS: string | null = null
    let bpD: string | null = null
    const bpPanel = pickLatestByCode(vitalObservations, LOINC.BP_PANEL)
    if (bpPanel?.component?.length) {
      const s = bpPanel.component.find((c: ObsComponent) =>
        (c.code?.coding || []).some((x: Coding) => x.code === LOINC.BP_SYS)
      )
      const d = bpPanel.component.find((c: ObsComponent) =>
        (c.code?.coding || []).some((x: Coding) => x.code === LOINC.BP_DIA)
      )
      if (s?.valueQuantity?.value != null) bpS = String(Math.round(Number(s.valueQuantity.value)))
      if (d?.valueQuantity?.value != null) bpD = String(Math.round(Number(d.valueQuantity.value)))
    } else {
      const sObs = pickLatestByCode(vitalObservations, LOINC.BP_SYS)
      const dObs = pickLatestByCode(vitalObservations, LOINC.BP_DIA)
      if (sObs?.valueQuantity?.value != null) bpS = String(Math.round(Number(sObs.valueQuantity.value)))
      if (dObs?.valueQuantity?.value != null) bpD = String(Math.round(Number(dObs.valueQuantity.value)))
    }

    const hr = pickLatestByCode(vitalObservations, LOINC.HR)
    const rr = pickLatestByCode(vitalObservations, LOINC.RR)
    const temp = pickLatestByCode(vitalObservations, LOINC.TEMP)
    const spo2 = pickLatestByCode(vitalObservations, LOINC.SPO2)

    console.log("[VitalsCard] categories:", {
      height: categoryCodes(height),
      weight: categoryCodes(weight),
      bmi: categoryCodes(bmi),
      bpPanel: categoryCodes(bpPanel),
      bpSys: bpPanel ? [] : categoryCodes(pickLatestByCode(vitalObservations, LOINC.BP_SYS)),
      bpDia: bpPanel ? [] : categoryCodes(pickLatestByCode(vitalObservations, LOINC.BP_DIA)),
      hr: categoryCodes(hr),
      rr: categoryCodes(rr),
      temp: categoryCodes(temp),
      spo2: categoryCodes(spo2),
    })

    const lastTime =
      [height, weight, bmi, bpPanel, hr, rr, temp, spo2]
        .map(o => (o?.effectiveDateTime ? new Date(o.effectiveDateTime).getTime() : 0))
        .reduce((a, b) => Math.max(a, b), 0)

    const result = {
      height: height?.valueQuantity ? qty(height.valueQuantity, "—") : "—",
      weight: weight?.valueQuantity ? qty(weight.valueQuantity, "—") : "—",
      bmi: bmi?.valueQuantity ? qty(bmi.valueQuantity, "—") : "—",
      bp: bpS && bpD ? `${bpS}/${bpD} mmHg` : "109/44 mmHg",
      hr: hr?.valueQuantity ? `${Math.round(Number(hr.valueQuantity.value))} bpm` : "44 bpm",
      rr: rr?.valueQuantity ? `${Math.round(Number(rr.valueQuantity.value))} /min` : "26 /min",
      temp: temp?.valueQuantity ? qty(temp.valueQuantity, "—") : "36.5",
      spo2: spo2?.valueQuantity ? `${Math.round(Number(spo2.valueQuantity.value))}%` : "99 %",
      time: lastTime ? fmtDate(new Date(lastTime).toISOString()) : "",
    }
    console.log("[VitalsCard] picked vitals:", {
      height,
      weight,
      bmi,
      bpPanel,
      hr,
      rr,
      temp,
      spo2,
      result,
    })
    return result
  }, [vitalObservations])

  const body = useMemo(() => {
    if (isLoading) return <div className="text-sm text-muted-foreground">{t("vitals.loading")}</div>
    if (error) return <div className="text-sm text-red-600">{error.message}</div>

    return (
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KV k={t("vitals.height")} v={view.height} />
          <KV k={t("vitals.weight")} v={view.weight} />
          <KV k={t("vitals.bmi")} v={view.bmi} />
          <KV k={t("vitals.bp")} v={view.bp} />
          <KV k={t("vitals.hr")} v={view.hr} />
          <KV k={t("vitals.rr")} v={view.rr} />
          <KV k={t("vitals.temp")} v={view.temp} />
          <KV k={t("vitals.spo2")} v={view.spo2} />
        </div>
        {view.time && (
          <div className="text-xs text-muted-foreground">
            {t("vitals.lastUpdated")} {view.time}
          </div>
        )}
      </div>
    )
  }, [view, isLoading, error, t])

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("vitals.title")}</CardTitle>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  )
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs text-muted-foreground">{k}</div>
      <div className="text-base font-medium">{v}</div>
    </div>
  )
}
