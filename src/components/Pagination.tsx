import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui';
import { useI18n } from '../i18n';
export function Pagination({
  page,
  size,
  total,
  onChange,
  busy,
}: {
  page: number;
  size: number;
  total: number;
  onChange: (page: number) => void;
  busy?: boolean;
}) {
  const { t } = useI18n();
  const pages = Math.max(1, Math.ceil(total / size));
  return (
    <div className="pagination">
      <span>
        {t(
          total === 1
            ? '{total} registro · Página {page} de {pages}'
            : '{total} registros · Página {page} de {pages}',
          { total, page, pages },
        )}
      </span>
      <div>
        <Button
          variant="ghost"
          aria-label={t('Página anterior')}
          data-testid="page-previous"
          disabled={page <= 1 || busy}
          onClick={() => onChange(page - 1)}
        >
          <ChevronLeft size={18} />
        </Button>
        <Button
          variant="ghost"
          aria-label={t('Próxima página')}
          data-testid="page-next"
          disabled={page >= pages || busy}
          onClick={() => onChange(page + 1)}
        >
          <ChevronRight size={18} />
        </Button>
      </div>
    </div>
  );
}
