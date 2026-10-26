import { useRef, type KeyboardEvent, type ReactNode } from 'react';

export interface TabItem {
  id: string;
  label: string;
  icon?: ReactNode;
}

/** IDs compartilhados entre a aba e o painel que ela controla. */
export const tabIds = (prefix: string, id: string) => ({
  tab: `${prefix}-tab-${id}`,
  panel: `${prefix}-panel-${id}`,
});

/**
 * Abas horizontais com ícone (padrão WAI-ARIA tabs, ativação automática).
 * Setas, Home e End movem o foco e a seleção; somente a aba ativa entra na ordem de Tab.
 * O painel deve usar `role="tabpanel"` com os IDs de `tabIds`.
 */
export function Tabs({
  items,
  value,
  onChange,
  label,
  idPrefix,
}: {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  label: string;
  idPrefix: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const current = items.findIndex((t) => t.id === value);
    const last = items.length - 1;
    const next =
      event.key === 'ArrowRight'
        ? current === last
          ? 0
          : current + 1
        : event.key === 'ArrowLeft'
          ? current === 0
            ? last
            : current - 1
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : -1;
    if (next < 0) return;
    event.preventDefault();
    onChange(items[next].id);
    refs.current[next]?.focus();
  }
  return (
    <div className="icon-tabs" role="tablist" aria-label={label} onKeyDown={onKeyDown}>
      {items.map((item, index) => {
        const selected = item.id === value;
        const ids = tabIds(idPrefix, item.id);
        return (
          <button
            key={item.id}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="tab"
            id={ids.tab}
            aria-selected={selected}
            aria-controls={ids.panel}
            tabIndex={selected ? 0 : -1}
            className={'icon-tab' + (selected ? ' active' : '')}
            data-testid={'tab-' + item.id}
            onClick={() => onChange(item.id)}
          >
            {item.icon ? (
              <span className="icon-tab-icon" aria-hidden="true">
                {item.icon}
              </span>
            ) : null}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
