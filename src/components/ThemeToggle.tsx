import { Moon, Sun } from 'lucide-react';
import { useThemeStore } from '../stores/themeStore';
import { Button } from '../ui';
import { useI18n } from '../i18n';
export function ThemeToggle() {
  const { t } = useI18n();
  const { theme, toggle } = useThemeStore();
  return (
    <Button
      variant="ghost"
      data-testid="theme-toggle"
      aria-label={t(theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro')}
      onClick={toggle}
    >
      {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
    </Button>
  );
}
