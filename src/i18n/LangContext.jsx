import { createContext, useContext, useState } from 'react'
import { translations } from './translations'

const LangContext = createContext(null)

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('jeibe_lang') || 'en')

  function toggleLang() {
    const next = lang === 'en' ? 'sw' : 'en'
    setLang(next)
    localStorage.setItem('jeibe_lang', next)
  }

  return (
    <LangContext.Provider value={{ lang, toggleLang }}>
      {children}
    </LangContext.Provider>
  )
}

export function useT() {
  const { lang } = useContext(LangContext)
  return (key) => translations[lang]?.[key] ?? translations['en']?.[key] ?? key
}

export function useLang() {
  return useContext(LangContext)
}
