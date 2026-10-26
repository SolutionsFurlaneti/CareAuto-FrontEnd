import type { KeyboardEvent, MouseEvent, ReactNode } from 'react';
import type { Avaria, Vista } from './api';
import { damageLabel, viewLabel, views } from './catalog';

/** Desenhos genéricos do veículo (traço simples), um por vista. Coordenadas no espaço do viewBox. */
const drawings: Record<Vista, { width: number; height: number; body: ReactNode }> = {
  TOPO: {
    width: 220,
    height: 110,
    body: (
      <>
        <rect x="34" y="8" width="26" height="12" rx="4" className="car-wheel" />
        <rect x="160" y="8" width="26" height="12" rx="4" className="car-wheel" />
        <rect x="34" y="90" width="26" height="12" rx="4" className="car-wheel" />
        <rect x="160" y="90" width="26" height="12" rx="4" className="car-wheel" />
        <rect x="12" y="16" width="196" height="78" rx="30" className="car-body" />
        <path d="M150 26 L172 34 L172 76 L150 84 Z" className="car-glass" />
        <path d="M58 30 L44 38 L44 72 L58 80 Z" className="car-glass" />
        <rect x="64" y="28" width="82" height="54" rx="10" className="car-roof" />
        <path d="M140 16 l6 -7 h10 l-2 7 M140 94 l6 7 h10 l-2 -7" className="car-line" />
      </>
    ),
  },
  LATERAL_ESQ: {
    width: 220,
    height: 96,
    body: (
      <>
        <path
          d="M10 64 L14 44 Q20 38 40 36 L66 34 L92 14 Q98 10 110 10 L150 10 Q160 10 168 18 L184 34 L200 38 Q210 40 211 52 L211 64 Q211 70 204 70 L10 70 Z"
          className="car-body"
        />
        <path d="M96 18 L74 35 L124 35 L124 16 L108 16 Q100 16 96 18 Z" className="car-glass" />
        <path d="M130 16 L130 35 L176 35 L162 20 Q158 16 150 16 Z" className="car-glass" />
        <path d="M127 14 L127 66 M74 38 L74 66" className="car-line" />
        <circle cx="52" cy="70" r="16" className="car-wheel" />
        <circle cx="168" cy="70" r="16" className="car-wheel" />
        <circle cx="52" cy="70" r="6" className="car-hub" />
        <circle cx="168" cy="70" r="6" className="car-hub" />
      </>
    ),
  },
  LATERAL_DIR: { width: 220, height: 96, body: null },
  FRENTE: {
    width: 150,
    height: 110,
    body: (
      <>
        <rect x="16" y="78" width="22" height="26" rx="5" className="car-wheel" />
        <rect x="112" y="78" width="22" height="26" rx="5" className="car-wheel" />
        <path
          d="M14 92 L14 58 Q14 48 24 46 L34 22 Q38 14 48 14 L102 14 Q112 14 116 22 L126 46 Q136 48 136 58 L136 92 Z"
          className="car-body"
        />
        <path
          d="M40 24 Q42 20 48 20 L102 20 Q108 20 110 24 L118 44 L32 44 Z"
          className="car-glass"
        />
        <rect x="20" y="54" width="22" height="10" rx="4" className="car-light" />
        <rect x="108" y="54" width="22" height="10" rx="4" className="car-light" />
        <rect x="52" y="56" width="46" height="14" rx="4" className="car-line" />
        <rect x="58" y="78" width="34" height="9" rx="2" className="car-line" />
      </>
    ),
  },
  TRASEIRA: {
    width: 150,
    height: 110,
    body: (
      <>
        <rect x="16" y="78" width="22" height="26" rx="5" className="car-wheel" />
        <rect x="112" y="78" width="22" height="26" rx="5" className="car-wheel" />
        <path
          d="M14 92 L14 56 Q14 48 24 46 L36 20 Q40 14 48 14 L102 14 Q110 14 114 20 L126 46 Q136 48 136 56 L136 92 Z"
          className="car-body"
        />
        <path
          d="M42 24 Q44 20 50 20 L100 20 Q106 20 108 24 L116 42 L34 42 Z"
          className="car-glass"
        />
        <rect x="18" y="52" width="26" height="12" rx="3" className="car-light car-light-rear" />
        <rect x="106" y="52" width="26" height="12" rx="3" className="car-light car-light-rear" />
        <rect x="56" y="62" width="38" height="13" rx="2" className="car-line" />
      </>
    ),
  },
};

/** Para onde aponta a frente do veículo em cada desenho. */
const direction: Partial<Record<Vista, string>> = { TOPO: '→', LATERAL_ESQ: '←', LATERAL_DIR: '→' };

const position = (event: MouseEvent<SVGSVGElement>) => {
  const rect = event.currentTarget.getBoundingClientRect();
  const clamp = (value: number) => Math.min(100, Math.max(0, Math.round(value * 100) / 100));
  return {
    x: clamp(((event.clientX - rect.left) / (rect.width || 1)) * 100),
    y: clamp(((event.clientY - rect.top) / (rect.height || 1)) * 100),
  };
};

export function DamageMap({
  damages,
  onAdd,
  selected,
  onSelect,
}: {
  damages: Avaria[];
  /** Sem onAdd o mapa é somente leitura (relatório). */
  onAdd?: (vista: Vista, x: number, y: number) => void;
  selected?: number | null;
  onSelect?: (index: number) => void;
}) {
  return (
    <div className="damage-map" data-testid="damage-map">
      {views.map(({ value: vista }) => {
        const drawing = drawings[vista];
        const mirrored = vista === 'LATERAL_DIR';
        const art = mirrored ? drawings.LATERAL_ESQ : drawing;
        const markers = damages
          .map((damage, index) => ({ damage, index }))
          .filter((x) => x.damage.vista === vista);
        const keyboard = (event: KeyboardEvent<SVGSVGElement>) => {
          if (!onAdd || (event.key !== 'Enter' && event.key !== ' ')) return;
          event.preventDefault();
          onAdd(vista, 50, 50);
        };
        return (
          <figure key={vista} className={'damage-view damage-view-' + vista.toLowerCase()}>
            <figcaption>
              {viewLabel(vista)}
              {direction[vista] && <small> · frente {direction[vista]}</small>}
            </figcaption>
            <svg
              viewBox={`0 0 ${art.width} ${art.height}`}
              data-testid={'damage-view-' + vista}
              role={onAdd ? 'button' : 'img'}
              tabIndex={onAdd ? 0 : undefined}
              aria-label={
                onAdd
                  ? `${viewLabel(vista)}: toque no ponto da avaria (Enter marca no centro)`
                  : `${viewLabel(vista)}: ${markers.length} avaria(s)`
              }
              className={onAdd ? 'editable' : undefined}
              onClick={(event) => {
                if (!onAdd) return;
                const { x, y } = position(event);
                onAdd(vista, x, y);
              }}
              onKeyDown={keyboard}
            >
              <g transform={mirrored ? `translate(${art.width} 0) scale(-1 1)` : undefined}>
                {art.body}
              </g>
              {markers.map(({ damage, index }) => (
                <g
                  key={index}
                  className={'damage-marker' + (selected === index ? ' selected' : '')}
                  data-testid="damage-marker"
                  transform={`translate(${(damage.posicaoX / 100) * art.width} ${(damage.posicaoY / 100) * art.height})`}
                  onClick={(event) => {
                    if (!onSelect) return;
                    event.stopPropagation();
                    onSelect(index);
                  }}
                >
                  <title>{`#${index + 1} ${damageLabel(damage.tipo)}${damage.observacao ? ': ' + damage.observacao : ''}`}</title>
                  <circle r="8" />
                  <text dy="0.35em">{damage.tipo}</text>
                </g>
              ))}
            </svg>
          </figure>
        );
      })}
    </div>
  );
}
