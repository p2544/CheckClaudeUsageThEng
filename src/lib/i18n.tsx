import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { th } from './translations'

export type Language = 'en' | 'th'

interface LanguageContextType {
  language: Language
  toggleLanguage: () => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en')

  useEffect(() => {
    try {
      const saved = localStorage.getItem('claude-usage-lang') as Language
      if (saved === 'th' || saved === 'en') {
        setLanguage(saved)
      }
    } catch (e) {
      // ignore
    }
  }, [])

  const toggleLanguage = () => {
    setLanguage((prev) => {
      const next = prev === 'en' ? 'th' : 'en'
      try {
        localStorage.setItem('claude-usage-lang', next)
      } catch (e) {
        // ignore
      }
      return next
    })
  }

  const t = (key: string): string => {
    if (language === 'th') {
      return th[key] || key
    }
    return key
  }

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useTranslation() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useTranslation must be used within a LanguageProvider')
  }
  return context
}
