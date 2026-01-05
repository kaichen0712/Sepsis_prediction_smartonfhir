// features/clinical-summary/components/PatientInfoCard.tsx
"use client"

import { useMemo } from "react"
import { useLanguage } from "@/lib/providers/LanguageProvider"
import { usePatient } from "@/lib/providers/PatientProvider"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

function calculateAge(birthDate: string | undefined, naLabel: string): string {
  if (!birthDate) return naLabel
  try {
    const birth = new Date(birthDate)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age.toString()
  } catch (error) {
    console.error("Error calculating age:", error)
    return naLabel
  }
}

function formatGender(gender: string | undefined, naLabel: string): string {
  if (!gender) return naLabel
  return gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase()
}

function formatName(patient: any, naLabel: string): string {
  if (!patient?.name?.[0]) return naLabel
  const name = patient.name[0]
  const givenName = name.given?.join(" ").trim()
  const familyName = name.family?.trim() || ""
  return [givenName, familyName].filter(Boolean).join(" ") || naLabel
}

export function PatientInfoCard() {
  const { t } = useLanguage()
  const naLabel = t("common.na")
  const { patient, loading, error } = usePatient()

  const normalizeErrorMessage = (message: string) => {
    if (message.includes("No 'state' parameter found")) {
      return t("patientInfo.stateMissing")
    }
    if (message.includes("Failed to load patient")) {
      return t("patientInfo.failedToLoad")
    }
    return message
  }

  const patientInfo = useMemo(() => {
    if (!patient) return null
    
    return {
      name: formatName(patient, naLabel),
      gender: formatGender(patient.gender, naLabel),
      age: calculateAge(patient.birthDate, naLabel),
      id: patient.id
    }
  }, [patient, naLabel])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("patientInfo.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="h-5 w-3/4 animate-pulse bg-muted rounded" />
          <div className="h-5 w-1/2 animate-pulse bg-muted rounded" />
          <div className="h-5 w-1/3 animate-pulse bg-muted rounded" />
        </CardContent>
      </Card>
    )
  }

  if (error || !patientInfo) {
    let errorMessage = t("patientInfo.failedToLoad")
    
    if (error) {
      if (typeof error === 'string') {
        errorMessage = normalizeErrorMessage(error)
      } else if (error && typeof error === 'object') {
        // Handle object with message property
        const err = error as { message?: unknown }
        if (typeof err.message === 'string') {
          errorMessage = normalizeErrorMessage(err.message)
        } else {
          errorMessage = JSON.stringify(error)
        }
      } else {
        errorMessage = String(error)
      }
    }
      
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("patientInfo.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">
            {errorMessage}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("patientInfo.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-3 gap-2">
          <span className="font-medium text-muted-foreground">{t("patientInfo.name")}</span>
          <span className="col-span-2">{patientInfo.name}</span>
          
          <span className="font-medium text-muted-foreground">{t("patientInfo.gender")}</span>
          <span className="col-span-2">{patientInfo.gender}</span>
          
          <span className="font-medium text-muted-foreground">{t("patientInfo.age")}</span>
          <span className="col-span-2">{patientInfo.age}</span>
          
          {patientInfo.id && (
            <>
              <span className="font-medium text-muted-foreground">{t("patientInfo.id")}</span>
              <span className="col-span-2 text-sm text-muted-foreground">
                {patientInfo.id}
              </span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
