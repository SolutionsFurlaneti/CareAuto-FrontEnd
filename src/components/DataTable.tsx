import { useMediaQuery } from '@mui/material';
import type { ReactNode } from 'react';
import { AnimatePresence, m, useReducedMotion } from 'motion/react';

export interface Column<T> {
  label: string;
  render: (row: T) => ReactNode;
}

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  testId,
  caption,
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string | number;
  testId: string;
  caption: string;
}) {
  const cards = useMediaQuery('(max-width:1199px)');
  const reduced = useReducedMotion();
  const actionColumn = columns.find((column) =>
    ['detalhes', 'ações', 'opções'].some((label) =>
      column.label.toLocaleLowerCase('pt-BR').includes(label),
    ),
  );
  const dataColumns = columns.filter((column) => column !== actionColumn);
  const containsImmediateValues = columns.some((column) =>
    /valor|total|pre[cç]o|saldo|receita|recebimento|cobran[cç]a/i.test(column.label),
  );
  const animateCards = !reduced && !containsImmediateValues;

  if (cards) {
    return (
      <div className="record-cards" data-testid={testId} role="list" aria-label={caption}>
        <AnimatePresence initial={animateCards}>
          {rows.map((row, index) => (
            <m.article
              className="record-card"
              key={rowKey(row)}
              data-testid={testId + '-row'}
              role="listitem"
              layout={animateCards ? 'position' : false}
              initial={animateCards ? { opacity: 0, y: 4 } : false}
              animate={{ opacity: 1, y: 0 }}
              exit={animateCards ? { opacity: 0, y: -4 } : undefined}
              transition={
                !animateCards
                  ? { duration: 0 }
                  : {
                      duration: 0.15,
                      delay: Math.min(index * 0.004, 0.024),
                      ease: [0.2, 0, 0, 1],
                    }
              }
            >
              <dl>
                {dataColumns.map((c) => (
                  <div key={c.label}>
                    <dt>{c.label}</dt>
                    <dd>{c.render(row)}</dd>
                  </div>
                ))}
              </dl>
              {actionColumn && (
                <div className="record-card-actions">{actionColumn.render(row)}</div>
              )}
            </m.article>
          ))}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table data-testid={testId}>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((c) => (
              <th scope="col" key={c.label}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} data-testid={testId + '-row'}>
              {columns.map((c) => (
                <td key={c.label}>{c.render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
