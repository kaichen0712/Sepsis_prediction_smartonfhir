// features/sepsis-risk/Feature.tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import { useClinicalData } from "@/lib/providers/ClinicalDataProvider"
import { usePatient } from "@/lib/providers/PatientProvider"
import { useLanguage } from "@/lib/providers/LanguageProvider"

import type { FHIRObservation } from "@/lib/providers/ClinicalDataProvider"

const LOINC_MAP: Record<string, keyof Vitals> = {
  "8867-4": "HR",
  "9279-1": "RR",
  "8310-5": "Temp",
  "8320-5": "Temp",
  "8331-1": "Temp",
  "59408-5": "SpO2",
  "8480-6": "SBP",
  "8462-4": "DBP",
}

type Vitals = {
  HR: VitalValue
  RR: VitalValue
  Temp: VitalValue
  SpO2: VitalValue
  SBP: VitalValue
  DBP: VitalValue
}

type VitalValue = {
  val: number | null
  time: string
}

type PatientDemographics = {
  gender: string | null
  birthDate: string | null
}

type SmartResult = {
  patientId: string
  patient: PatientDemographics
  vitals: Vitals
  targetDate: string
}

type ModelPayloadItem = {
  id: string
  age: number | null
  gender: number | null
  hr: number | null
  tp: number | null
  spo2: number | null
  sbp: number | null
  dbp: number | null
  resp: number | null
}

function computeAge(birthDate: string | null, targetDate: string): number | null {
  if (!birthDate) return null
  const bd = new Date(birthDate)
  const td = new Date(targetDate)
  if (Number.isNaN(bd.getTime()) || Number.isNaN(td.getTime())) return null
  let age = td.getFullYear() - bd.getFullYear()
  const beforeBirthday =
    td.getMonth() < bd.getMonth() ||
    (td.getMonth() === bd.getMonth() && td.getDate() < bd.getDate())
  if (beforeBirthday) age -= 1
  return age
}

function genderToInt(gender: string | null): number | null {
  if (gender === "male") return 1
  if (gender === "female") return 0
  return null
}

function timeToMs(time: string): number {
  if (!time) return 0
  const ms = Date.parse(time)
  return Number.isNaN(ms) ? 0 : ms
}

function obsTime(obs: FHIRObservation): string {
  return (
    obs?.effectiveDateTime ||
    (obs as any)?.issued ||
    (obs as any)?.effectivePeriod?.end ||
    ""
  )
}

function extractLatestVitals(list: FHIRObservation[]): Vitals {
  const latestVitals: Vitals = {
    HR: { val: null, time: "" },
    RR: { val: null, time: "" },
    Temp: { val: null, time: "" },
    SpO2: { val: null, time: "" },
    SBP: { val: null, time: "" },
    DBP: { val: null, time: "" },
  }

  const updateIfLatest = (key: keyof Vitals, value: number | null, time: string) => {
    const currentTime = timeToMs(latestVitals[key].time)
    const nextTime = timeToMs(time)
    if (!latestVitals[key].time || nextTime > currentTime) {
      latestVitals[key] = { val: value, time }
    }
  }

  for (const obs of list || []) {
    if (!obs || typeof obs !== "object") continue
    const time = obsTime(obs)

    if (obs?.valueQuantity) {
      const codeList = obs?.code?.coding ?? []
      for (const coding of codeList) {
        const code = coding?.code
        if (code && LOINC_MAP[code]) {
          updateIfLatest(LOINC_MAP[code], obs.valueQuantity?.value ?? null, time)
        }
      }
    }

    if (Array.isArray(obs?.component)) {
      for (const comp of obs.component) {
        const codeList = comp?.code?.coding ?? []
        for (const coding of codeList) {
          const code = coding?.code
          if (code && LOINC_MAP[code]) {
            updateIfLatest(LOINC_MAP[code], comp?.valueQuantity?.value ?? null, time)
          }
        }
      }
    }
  }

  return latestVitals
}

function readVitalsFromDom(labelToKey: Record<string, keyof Vitals | "BP">): Partial<Record<keyof Vitals, number>> {
  if (typeof document === "undefined") return {}

  const result: Partial<Record<keyof Vitals, number>> = {}
  const labels = Object.keys(labelToKey)

  const divs = Array.from(document.querySelectorAll("div"))
  for (const label of labels) {
    const labelEl = divs.find(el => el.textContent?.trim() === label)
    if (!labelEl?.parentElement) continue
    const parent = labelEl.parentElement
    const valueEl = parent.children.length > 1 ? parent.children[1] : null
    const text = valueEl?.textContent?.trim() || ""
    const nums = text.match(/-?\d+(\.\d+)?/g)?.map(Number) || []

    if (labelToKey[label] === "BP") {
      if (nums.length >= 2) {
        result.SBP = nums[0]
        result.DBP = nums[1]
      }
      continue
    }

    const key = labelToKey[label]
    if (typeof key !== "string") continue
    if (nums.length) {
      result[key] = nums[0]
    }
  }

  return result
}

function fillVitalsFromDisplay(
  vitals: Vitals,
  labelToKey: Record<string, keyof Vitals | "BP">
): Vitals {
  const display = readVitalsFromDom(labelToKey)
  return {
    HR: { ...vitals.HR, val: vitals.HR.val ?? display.HR ?? null },
    RR: { ...vitals.RR, val: vitals.RR.val ?? display.RR ?? null },
    Temp: { ...vitals.Temp, val: vitals.Temp.val ?? display.Temp ?? null },
    SpO2: { ...vitals.SpO2, val: vitals.SpO2.val ?? display.SpO2 ?? null },
    SBP: { ...vitals.SBP, val: vitals.SBP.val ?? display.SBP ?? null },
    DBP: { ...vitals.DBP, val: vitals.DBP.val ?? display.DBP ?? null },
  }
}

function dateToYmd(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function buildModelPayload(
  patientId: string,
  targetDate: string,
  data: SmartResult
): ModelPayloadItem[] {
  return [
    {
      id: `${patientId}-${targetDate}`,
      age: computeAge(data.patient.birthDate, targetDate),
      gender: genderToInt(data.patient.gender),
      hr: data.vitals.HR.val,
      tp: data.vitals.Temp.val,
      spo2: data.vitals.SpO2.val,
      sbp: roundNullable(data.vitals.SBP.val),
      dbp: roundNullable(data.vitals.DBP.val),
      resp: data.vitals.RR.val,
    },
  ]
}

async function fetchPrediction(payload: ModelPayloadItem[]) {
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  const res = await fetch(
    "https://sepsissmartonfhir-amhgcnfacgejhqhr.centralus-01.azurewebsites.net/api/sepsis",
    {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    }
  )

  const text = await res.text()
  if (!res.ok) throw new Error(`Proxy failed (${res.status}): ${text.slice(0, 200)}`)

  const data = JSON.parse(text)
  const prediction = data?.processed_data?.[0]?.sepsis ?? null
  return { prediction, raw: data } as { prediction: number | null; raw?: unknown }
}

function formatValue(value: number | null, naLabel: string) {
  return value === null || value === undefined ? naLabel : String(value)
}

function formatTemp(value: number | null, naLabel: string): string {
  if (value === null || value === undefined || Number.isNaN(value)) return naLabel
  return value.toFixed(1)
}

function roundNullable(value: number | null): number | null {
  if (value === null || value === undefined || Number.isNaN(value)) return null
  return Math.round(value)
}

function formatGender(gender?: string | null): string | null {
  if (!gender) return null
  return gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase()
}

function formatName(patient: any): string | null {
  if (!patient?.name?.[0]) return null
  const name = patient.name[0]
  const givenName = name.given?.join(" ").trim()
  const familyName = name.family?.trim() || ""
  return [givenName, familyName].filter(Boolean).join(" ") || null
}

function pickVitalsSource(
  vitals?: FHIRObservation[],
  vitalSigns?: FHIRObservation[],
  observations?: FHIRObservation[],
) {
  if (vitals?.length) return { label: "vitals", list: vitals }
  if (vitalSigns?.length) return { label: "vitalSigns", list: vitalSigns }
  if (observations?.length) return { label: "observations", list: observations }
  return { label: "none", list: [] as FHIRObservation[] }
}

function categoryCodes(obs?: FHIRObservation): string[] {
  if (!obs?.category) return []
  return obs.category
    .flatMap(cat => cat?.coding || [])
    .map(c => c?.code)
    .filter((c): c is string => Boolean(c))
}

function logVitalCategories(list: FHIRObservation[]) {
  const byCode = (code: string) =>
    list.find(o => (o.code?.coding || []).some(c => c.code === code))

  const height = byCode("8302-2")
  const weight = byCode("29463-7")
  const bmi = byCode("39156-5")
  const bpPanel = byCode("85354-9")
  const bpSys = byCode("8480-6")
  const bpDia = byCode("8462-4")
  const hr = byCode("8867-4")
  const rr = byCode("9279-1")
  const temp = byCode("8310-5")
  const spo2 = byCode("59408-5")

  console.log("[SepsisRisk] categories:", {
    height: categoryCodes(height),
    weight: categoryCodes(weight),
    bmi: categoryCodes(bmi),
    bpPanel: categoryCodes(bpPanel),
    bpSys: categoryCodes(bpSys),
    bpDia: categoryCodes(bpDia),
    hr: categoryCodes(hr),
    rr: categoryCodes(rr),
    temp: categoryCodes(temp),
    spo2: categoryCodes(spo2),
  })
}

export default function SepsisRiskFeature({ isActive }: { isActive?: boolean }) {
  const { t } = useLanguage()
  const { patient, loading: patientLoading, error: patientError } = usePatient()
  const {
    vitals,
    vitalSigns,
    observations,
    isLoading: vitalsLoading,
    error: vitalsError,
  } = useClinicalData()
  const [data, setData] = useState<SmartResult | null>(null)
  const [prediction, setPrediction] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [predictionError, setPredictionError] = useState<string | null>(null)
  const [hasFetched, setHasFetched] = useState(false)
  const naLabel = t("common.na")
  const labelToKey = {
    HR: "HR",
    [t("vitals.hr")]: "HR",
    RR: "RR",
    [t("vitals.rr")]: "RR",
    Temp: "Temp",
    [t("vitals.temp")]: "Temp",
    "SpO₂": "SpO2",
    [t("vitals.spo2")]: "SpO2",
    BP: "BP",
    [t("vitals.bp")]: "BP",
  } as Record<string, keyof Vitals | "BP">

  const patientInfo = useMemo(() => {
    if (!patient) return null
    const ageToday = computeAge(patient.birthDate ?? null, dateToYmd(new Date()))
    return {
      id: patient.id ?? null,
      name: formatName(patient),
      genderLabel: formatGender(patient.gender),
      genderRaw: patient.gender ?? null,
      birthDate: patient.birthDate ?? null,
      age: ageToday,
    }
  }, [patient])

  const handleFetch = async () => {
    setLoading(true)
    setError(null)
    setPredictionError(null)
    try {
      const patientId = patientInfo?.id?.trim()
      if (!patientId) {
        throw new Error(t("sepsisRisk.errors.patientUnavailable"))
      }
      setHasFetched(true)

      const vitalsSource = pickVitalsSource(vitals, vitalSigns, observations)
      const latestVitals = extractLatestVitals(vitalsSource.list || [])
      const filledVitals = fillVitalsFromDisplay(latestVitals, labelToKey)
      const latestTime = Object.values(latestVitals)
        .map(v => timeToMs(v.time))
        .reduce((a, b) => Math.max(a, b), 0)
      const targetDate = dateToYmd(latestTime ? new Date(latestTime) : new Date())

      const result: SmartResult = {
        patientId,
        patient: {
          gender: patientInfo?.genderRaw ?? null,
          birthDate: patientInfo?.birthDate ?? null,
        },
        vitals: filledVitals,
        targetDate,
      }

      console.log("[SepsisRisk] vitals source:", vitalsSource)
      console.log("[SepsisRisk] latest vitals:", latestVitals)
      console.log("[SepsisRisk] filled vitals:", filledVitals)
      logVitalCategories(vitalsSource.list || [])
      console.log("[SepsisRisk] result:", result)

      setData(result)
      try {
        const payload = buildModelPayload(patientId, targetDate, result)
        const modelResult = await fetchPrediction(payload)
        setPrediction(modelResult.prediction ?? null)
      } catch (err) {
        setPrediction(null)
        setPredictionError(err instanceof Error ? err.message : t("sepsisRisk.errors.predictionFailed"))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("sepsisRisk.errors.unknownError"))
      setData(null)
      setPrediction(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isActive) return
    if (hasFetched || loading || patientLoading || vitalsLoading) return
    if (!patientInfo?.id) return
    void handleFetch()
  }, [isActive, hasFetched, loading, patientLoading, vitalsLoading, patientInfo?.id])

  const age = data ? computeAge(data.patient.birthDate, data.targetDate) : null
  const vitalsSource = pickVitalsSource(vitals, vitalSigns, observations)
  const vitalsSourceLabel =
    {
      vitals: t("sepsisRisk.source.vitals"),
      vitalSigns: t("sepsisRisk.source.vitalSigns"),
      observations: t("sepsisRisk.source.observations"),
      none: t("sepsisRisk.source.none"),
    }[vitalsSource.label] ?? vitalsSource.label
  const predictionLabel =
    prediction === 1
      ? t("sepsisRisk.prediction.highRisk")
      : prediction === 0
      ? t("sepsisRisk.prediction.normal")
      : naLabel
  const predictionTone =
    prediction === 1
      ? "border-red-200 bg-red-50 text-red-800"
      : prediction === 0
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : "border-muted text-muted-foreground"

  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-4">
        <div className="text-sm font-semibold inline-flex items-center gap-2 rounded-md bg-sky-50 px-2 py-1 text-slate-900 border-b-2 border-sky-300/70">
          {t("sepsisRisk.aboutTitle")}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{t("sepsisRisk.aboutDescription")}</p>
        {loading && (
          <div className="mt-4 text-sm text-muted-foreground">
            {t("common.loading")}
          </div>
        )}
      </div>

      {hasFetched && (
      <div className="rounded-lg border p-4">
        <div className="text-sm font-semibold inline-flex items-center gap-2 rounded-md bg-sky-50 px-2 py-1 text-slate-900 border-b-2 border-sky-300/70">
          {t("sepsisRisk.predictionTitle")}
        </div>

        {(error || patientError || vitalsError) && (
          <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error || patientError || vitalsError?.message}
          </div>
        )}

        <div className="mt-4 rounded-md border p-4">
          <div className="text-sm font-semibold inline-flex items-center gap-2 rounded-md bg-sky-50 px-2 py-1 text-slate-900 border-b-2 border-sky-300/70">
            {t("sepsisRisk.predictionResult")}
          </div>
          {predictionError ? (
            <div className="mt-3 text-sm text-red-700">{predictionError}</div>
          ) : (
            <div className={`mt-3 rounded-md border px-4 py-3 text-base font-semibold ${predictionTone}`}>
              {predictionLabel}
            </div>
          )}
        </div>
        <div className="mt-4 space-y-4">
        <div className="rounded-md border p-3">
          <div className="text-xs font-semibold inline-flex items-center gap-2 rounded-md bg-sky-50 px-2 py-1 text-slate-900 border-b-2 border-sky-300/70">
            {t("sepsisRisk.patientInputs")}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {t("sepsisRisk.patientInputsDescription")}
          </div>
          <div className="mt-2 text-sm">
            <div>{t("sepsisRisk.patientIdLabel")} {data?.patientId ?? patientInfo?.id ?? naLabel}</div>
            <div>{t("sepsisRisk.genderLabel")} {data?.patient.gender ?? patientInfo?.genderLabel ?? naLabel}</div>
            <div>{t("sepsisRisk.ageLabel")} {patientInfo?.age ?? age ?? naLabel}</div>
          </div>
        </div>

        <div className="rounded-md border p-3">
          <div className="text-xs font-semibold inline-flex items-center gap-2 rounded-md bg-sky-50 px-2 py-1 text-slate-900 border-b-2 border-sky-300/70">
            {t("sepsisRisk.latestVitals")}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {t("sepsisRisk.latestVitalsDescription")}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {t("sepsisRisk.sourceLabel")} {vitalsSourceLabel} ({vitalsSource.list.length})
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
            <div>{t("sepsisRisk.vitalLabels.hr")} {formatValue(data?.vitals.HR.val ?? null, naLabel)}</div>
            <div>{t("sepsisRisk.vitalLabels.rr")} {formatValue(data?.vitals.RR.val ?? null, naLabel)}</div>
            <div>{t("sepsisRisk.vitalLabels.temp")} {formatTemp(data?.vitals.Temp.val ?? null, naLabel)}</div>
            <div>{t("sepsisRisk.vitalLabels.spo2")} {formatValue(data?.vitals.SpO2.val ?? null, naLabel)}</div>
            <div>{t("sepsisRisk.vitalLabels.sbp")} {formatValue(roundNullable(data?.vitals.SBP.val ?? null), naLabel)}</div>
            <div>{t("sepsisRisk.vitalLabels.dbp")} {formatValue(roundNullable(data?.vitals.DBP.val ?? null), naLabel)}</div>
          </div>
        </div>
        </div>

      </div>
      )}
    </div>
  )
}
