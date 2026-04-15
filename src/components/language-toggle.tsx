import { useTranslation } from '~/lib/i18n'

export function LanguageToggle() {
  const { language, toggleLanguage } = useTranslation()

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors"
      style={{
        backgroundColor: 'var(--color-secondary)',
        color: 'var(--color-secondary-foreground)',
      }}
      title={language === 'en' ? 'เปลี่ยนเป็นภาษาไทย' : 'Switch to English'}
    >
      <span className="text-base leading-none">
        {language === 'en' ? '🇺🇸' : '🇹🇭'}
      </span>
      <span>{language === 'en' ? 'EN' : 'TH'}</span>
    </button>
  )
}
