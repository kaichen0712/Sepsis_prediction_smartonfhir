// features/sepsis-risk/Feature.tsx
"use client"

import { useMemo, useState } from "react"
import { useClinicalData } from "@/lib/providers/ClinicalDataProvider"
import { usePatient } from "@/lib/providers/PatientProvider"

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

function readVitalsFromDom(): Partial<Record<keyof Vitals, number>> {
  if (typeof document === "undefined") return {}
  const labelToKey: Record<string, keyof Vitals | "BP"> = {
    HR: "HR",
    RR: "RR",
    Temp: "Temp",
    "SpO₂": "SpO2",
    BP: "BP",
  }

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

function fillVitalsFromDisplay(vitals: Vitals): Vitals {
  const display = readVitalsFromDom()
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

async function fetchPrediction(payload: ModelPayloadItem[], token?: string) {
  const trimmed = token?.trim()
  if (!trimmed) throw new Error("Token is required")

  const res = await fetch("https://theheal.tech/toNYCU/sepsis", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${trimmed}`,
    },
    // 注意：遠端 API 要的是「陣列」，不是 { payload, token }
    body: JSON.stringify(payload),
  })

  const text = await res.text()

  if (!res.ok) {
    throw new Error(`Model request failed (${res.status}): ${text.slice(0, 200)}`)
  }

  // 避免又遇到 HTML / 非 JSON 時直接炸掉，看得到內容
  let data: any
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    throw new Error(`Expected JSON but got: ${text.slice(0, 120)}`)
  }

  const prediction = data?.processed_data?.[0]?.sepsis ?? null
  return { prediction, raw: data } as { prediction: number | null; raw?: unknown }
}


function formatValue(value: number | null) {
  return value === null || value === undefined ? "N/A" : String(value)
}

function formatTemp(value: number | null): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "N/A"
  return value.toFixed(1)
}

function roundNullable(value: number | null): number | null {
  if (value === null || value === undefined || Number.isNaN(value)) return null
  return Math.round(value)
}

function formatGender(gender?: string | null): string {
  if (!gender) return "N/A"
  return gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase()
}

function formatName(patient: any): string {
  if (!patient?.name?.[0]) return "N/A"
  const name = patient.name[0]
  const givenName = name.given?.join(" ").trim()
  const familyName = name.family?.trim() || ""
  return [givenName, familyName].filter(Boolean).join(" ") || "N/A"
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

export default function SepsisRiskFeature() {
  const { patient, loading: patientLoading, error: patientError } = usePatient()
  const {
    vitals,
    vitalSigns,
    observations,
    isLoading: vitalsLoading,
    error: vitalsError,
  } = useClinicalData()
  const [token, setToken] = useState("")
  const [data, setData] = useState<SmartResult | null>(null)
  const [prediction, setPrediction] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [predictionError, setPredictionError] = useState<string | null>(null)
  const [hasFetched, setHasFetched] = useState(false)

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
    setHasFetched(true)
    try {
      const patientId = patientInfo?.id?.trim()
      if (!patientId) {
        throw new Error("Patient is not available yet")
      }

      const vitalsSource = pickVitalsSource(vitals, vitalSigns, observations)
      const latestVitals = extractLatestVitals(vitalsSource.list || [])
      const filledVitals = fillVitalsFromDisplay(latestVitals)
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
        const modelResult = await fetchPrediction(payload, token.trim() || undefined)
        setPrediction(modelResult.prediction ?? null)
      } catch (err) {
        setPrediction(null)
        setPredictionError(err instanceof Error ? err.message : "Prediction failed")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
      setData(null)
      setPrediction(null)
    } finally {
      setLoading(false)
    }
  }

  const age = data ? computeAge(data.patient.birthDate, data.targetDate) : null
  const vitalsSource = pickVitalsSource(vitals, vitalSigns, observations)
  const predictionLabel =
    prediction === 1 ? "High Risk" : prediction === 0 ? "Normal" : "N/A"
  const predictionTone =
    prediction === 1
      ? "border-red-200 bg-red-50 text-red-800"
      : prediction === 0
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : "border-muted text-muted-foreground"

  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-4">
        <div className="text-sm font-semibold">Model Token</div>
        <div className="mt-2 grid gap-3 md:grid-cols-[1fr_auto]">
          <input
            className="h-9 rounded-md border px-2 text-sm"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste bearer token (stored in memory only)"
          />
          <button
            className="h-9 rounded-md border px-3 text-sm hover:bg-muted disabled:opacity-60"
            onClick={handleFetch}
            disabled={loading || patientLoading || vitalsLoading}
          >
            {loading ? "Loading..." : "Use SMART Vitals"}
          </button>
        </div>
      </div>

      {hasFetched && (
      <div className="rounded-lg border p-4">
        <div className="text-sm font-semibold">Sepsis Risk Prediction</div>

        {(error || patientError || vitalsError) && (
          <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error || patientError || vitalsError?.message}
          </div>
        )}

        <div className="mt-4 rounded-md border p-4">
          <div className="text-sm font-semibold">Prediction Result</div>
          {predictionError ? (
            <div className="mt-3 text-sm text-red-700">{predictionError}</div>
          ) : (
            <div className={`mt-3 rounded-md border px-4 py-3 text-base font-semibold ${predictionTone}`}>
              {predictionLabel}
            </div>
          )}
          <div className="mt-2 text-xs text-muted-foreground">
            1 = sepsis risk, 0 = normal
          </div>
        </div>
        <div className="mt-4 space-y-4">
        <div className="rounded-md border p-3">
          <div className="text-xs font-semibold">Patient</div>
          <div className="mt-2 text-sm">
            <div>Patient ID : {data?.patientId ?? patientInfo?.id ?? "N/A"}</div>
            <div>Gender : {data?.patient.gender ?? patientInfo?.genderLabel ?? "N/A"}</div>
            <div>Birth Date : {data?.patient.birthDate ?? patientInfo?.birthDate ?? "N/A"}</div>
            <div>Age : {patientInfo?.age ?? age ?? "N/A"}</div>
          </div>
        </div>

        <div className="rounded-md border p-3">
          <div className="text-xs font-semibold">Latest Vitals (SMART)</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Source: {vitalsSource.label} ({vitalsSource.list.length})
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
            <div>HR : {formatValue(data?.vitals.HR.val ?? null)}</div>
            <div>RR : {formatValue(data?.vitals.RR.val ?? null)}</div>
            <div>Temp : {formatTemp(data?.vitals.Temp.val ?? null)}</div>
            <div>SpO₂ : {formatValue(data?.vitals.SpO2.val ?? null)}</div>
            <div>SBP : {formatValue(roundNullable(data?.vitals.SBP.val ?? null))}</div>
            <div>DBP : {formatValue(roundNullable(data?.vitals.DBP.val ?? null))}</div>
          </div>
        </div>
        </div>

      </div>
      )}
    </div>
  )
}
