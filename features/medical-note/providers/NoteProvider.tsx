// features/medical-note/providers/NoteProvider.tsx
"use client"
import {
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
  useEffect,
  type Dispatch,
  type SetStateAction,
} from "react"
import { useLanguage } from "@/lib/providers/LanguageProvider"

type Ctx = {
  asrText: string
  setAsrText: Dispatch<SetStateAction<string>>
  prompt: string
  setPrompt: Dispatch<SetStateAction<string>>
  gptResponse: string
  setGptResponse: Dispatch<SetStateAction<string>>
  model: string
  setModel: Dispatch<SetStateAction<string>>
}

const NoteContext = createContext<Ctx | null>(null)

export function NoteProvider({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage()
  const defaultPrompt = t("medicalNote.defaultPrompt")
  const defaultPromptRef = useRef(defaultPrompt)

  const [asrText, setAsrText] = useState("")
  const [prompt, setPrompt] = useState(defaultPrompt)
  const [gptResponse, setGptResponse] = useState("")
  const [model, setModel] = useState("gpt-4.1")

  useEffect(() => {
    if (prompt === defaultPromptRef.current) {
      setPrompt(defaultPrompt)
    }
    defaultPromptRef.current = defaultPrompt
  }, [defaultPrompt, prompt])

  const value: Ctx = useMemo(
    () => ({
      asrText,
      setAsrText,
      prompt,
      setPrompt,
      gptResponse,
      setGptResponse,
      model,
      setModel,
    }),
    [asrText, prompt, gptResponse, model]
  )

  return <NoteContext.Provider value={value}>{children}</NoteContext.Provider>
}

export function useNote() {
  const ctx = useContext(NoteContext)
  if (!ctx) throw new Error("useNote must be used inside <NoteProvider>")
  return ctx
}
