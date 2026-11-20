import { Languages } from 'lucide-react';
import { useId } from 'react';
import { useI18n } from '../i18n';
import { isLocale } from '../stores/localeStore';

export function LanguageSelector() {
  const { t, locale, setLocale } = useI18n();
  const id = useId();
  return (
    <label className="language-selector" htmlFor={id}>
      <Languages size={18} aria-hidden="true" />
      <span className="sr-only">{t('Idioma')}</span>
      <select
        id={id}
        aria-label={t('Idioma')}
        data-testid="language-selector"
        value={locale}
        onChange={(event) => {
          if (isLocale(event.target.value)) setLocale(event.target.value);
        }}
      >
        <option value="pt-BR" lang="pt-BR">
          PT-BR
        </option>
        <option value="en-US" lang="en-US">
          EN-US
        </option>
      </select>
    </label>
  );
}
