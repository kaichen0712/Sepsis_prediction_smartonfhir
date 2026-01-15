// app/layout.tsx
import "./globals.css"
import type { Metadata } from "next"
import { ApiKeyProvider } from "@/lib/providers/ApiKeyProvider"
import { PatientProvider } from "@/lib/providers/PatientProvider"
import { ClinicalDataProvider } from "@/lib/providers/ClinicalDataProvider"
import { LanguageProvider } from "@/lib/providers/LanguageProvider"

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ""

export const metadata: Metadata = {
  title: "SepsisProbe · SMART on FHIR",
  description: "SepsisProbe: Plug-and-Play Sepsis Early Warning System on FHIR",
  icons: {
    icon: `${basePath}/icon_result.ico`,
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-US">
      <body>
        <LanguageProvider>
          <ApiKeyProvider storage="session">
            <PatientProvider>
              <ClinicalDataProvider>
                {children}
              </ClinicalDataProvider>
            </PatientProvider>
          </ApiKeyProvider>
        </LanguageProvider>
      </body>
    </html>
  )
}
