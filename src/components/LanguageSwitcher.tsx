import { useTranslation } from 'react-i18next'
import { Languages } from 'lucide-react'

export function LanguageSwitcher() {
  const { i18n } = useTranslation()

  const toggleLanguage = () => {
    const nextLang = i18n.language.startsWith('zh') ? 'en' : 'zh'
    i18n.changeLanguage(nextLang)
  }

  return (
    <button 
      onClick={toggleLanguage}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-card hover:bg-muted transition-all text-xs font-medium active:scale-95"
    >
      <Languages className="w-3.5 h-3.5" />
      <span>{i18n.language.startsWith('zh') ? 'English' : '中文'}</span>
    </button>
  )
}
