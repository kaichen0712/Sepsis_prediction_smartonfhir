import { NextResponse } from "next/server"

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

type ModelResponse = {
  processed_data?: Array<{ id?: string; sepsis?: number | null }>
  error_data?: unknown
}

type PredictionRequest = {
  payload?: ModelPayloadItem[]
  token?: string
}

export async function POST(req: Request) {
  const modelUrl = process.env.SEPSIS_MODEL_URL || "https://theheal.tech/toNYCU/sepsis"
  const envToken = process.env.SEPSIS_MODEL_TOKEN

  let payload: ModelPayloadItem[] | undefined
  let token: string | undefined
  try {
    const body = (await req.json()) as PredictionRequest
    payload = body?.payload
    token = body?.token || envToken
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 })
  }

  if (!token) {
    return NextResponse.json(
      { error: "Missing SEPSIS_MODEL_TOKEN environment variable." },
      { status: 500 }
    )
  }

  if (!Array.isArray(payload) || payload.length === 0) {
    return NextResponse.json({ error: "Payload must be a non-empty array." }, { status: 400 })
  }

  const res = await fetch(modelUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  const text = await res.text()
  let data: ModelResponse | null = null
  try {
    data = text ? (JSON.parse(text) as ModelResponse) : null
  } catch {
    data = null
  }

  if (!res.ok) {
    return NextResponse.json(
      { error: "Model request failed.", status: res.status, raw: data ?? text },
      { status: res.status }
    )
  }

  const prediction = data?.processed_data?.[0]?.sepsis ?? null
  return NextResponse.json({ prediction, raw: data })
}
