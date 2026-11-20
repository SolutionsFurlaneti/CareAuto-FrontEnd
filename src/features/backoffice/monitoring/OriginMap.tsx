import { useI18n } from '../../../i18n';
import { useId, useState } from 'react';
import type { MonitoringLocation } from './types';

// Contornos esquemáticos em longitude/latitude. Não representam limites políticos.
const land = [
  [
    [-168, 72],
    [-142, 70],
    [-128, 60],
    [-122, 50],
    [-126, 43],
    [-116, 32],
    [-111, 29],
    [-107, 23],
    [-98, 16],
    [-87, 21],
    [-83, 10],
    [-77, 8],
    [-80, 24],
    [-84, 31],
    [-76, 35],
    [-66, 45],
    [-55, 52],
    [-62, 61],
    [-82, 64],
    [-96, 73],
    [-120, 75],
    [-143, 71],
  ],
  [
    [-73, 60],
    [-48, 60],
    [-23, 72],
    [-30, 82],
    [-50, 83],
    [-62, 77],
  ],
  [
    [-81, 12],
    [-70, 12],
    [-60, 8],
    [-51, 4],
    [-35, -5],
    [-39, -16],
    [-46, -24],
    [-51, -30],
    [-57, -38],
    [-67, -55],
    [-74, -49],
    [-74, -29],
    [-80, -9],
    [-78, 2],
  ],
  [
    [-11, 36],
    [-10, 44],
    [-3, 49],
    [-8, 58],
    [9, 59],
    [20, 71],
    [33, 70],
    [30, 58],
    [43, 49],
    [54, 54],
    [72, 66],
    [106, 75],
    [143, 71],
    [177, 65],
    [165, 54],
    [143, 49],
    [136, 36],
    [121, 21],
    [109, 18],
    [105, 8],
    [96, 5],
    [88, 21],
    [79, 8],
    [72, 20],
    [60, 25],
    [51, 30],
    [42, 12],
    [34, 30],
    [28, 40],
    [14, 44],
    [4, 43],
  ],
  [
    [-17, 35],
    [9, 37],
    [26, 32],
    [35, 25],
    [44, 11],
    [51, 12],
    [44, -2],
    [40, -14],
    [32, -28],
    [19, -35],
    [11, -18],
    [9, -1],
    [-2, 5],
    [-13, 7],
    [-18, 20],
  ],
  [
    [113, -22],
    [122, -14],
    [133, -12],
    [140, -17],
    [145, -11],
    [153, -25],
    [149, -38],
    [136, -39],
    [129, -31],
    [116, -34],
  ],
  [
    [47, -13],
    [50, -17],
    [49, -25],
    [44, -26],
    [44, -18],
  ],
  [
    [130, 32],
    [136, 35],
    [141, 42],
    [145, 44],
    [143, 34],
    [136, 31],
  ],
  [
    [96, 5],
    [105, -7],
    [116, -8],
    [124, -10],
    [130, -5],
    [120, 1],
    [108, 7],
  ],
  [
    [167, -35],
    [178, -38],
    [173, -47],
    [166, -46],
    [171, -40],
  ],
];
const brazil = [
  [-74, -7],
  [-70, -1],
  [-60, 5],
  [-51, 4],
  [-49, 0],
  [-35, -5],
  [-38, -13],
  [-40, -20],
  [-48, -28],
  [-53, -34],
  [-58, -29],
  [-54, -24],
  [-58, -19],
  [-61, -13],
  [-69, -10],
];
const point = ([longitude, latitude]: number[]) => [(longitude + 180) * 2, (90 - latitude) * 2];
const path = (points: number[][]) =>
  points.map((entry, index) => `${index ? 'L' : 'M'}${point(entry).join(',')}`).join(' ') + ' Z';
export function OriginMap({ locations }: { locations: MonitoringLocation[] }) {
  const { t } = useI18n();
  const [region, setRegion] = useState<'world' | 'brazil'>('world');
  const titleId = useId();
  const dots = locations.filter(
    (location) =>
      Number.isFinite(location.latitude) &&
      Number.isFinite(location.longitude) &&
      (region === 'world' || /^(brasil|brazil|br)$/i.test(location.country ?? '')),
  );
  const max = Math.max(1, ...dots.map((location) => location.count));
  return (
    <>
      <div className="telemetry-panel-heading">
        <div>
          <h2>{t('Mapa de origem das requisições')}</h2>
          <p>{t('O tamanho dos marcadores acompanha o volume de acessos.')}</p>
        </div>
        <div className="telemetry-segment" aria-label={t('Região do mapa')}>
          <button
            type="button"
            aria-pressed={region === 'world'}
            onClick={() => setRegion('world')}
            data-testid="monitoring-map-world"
          >
            {t('Mundo')}{' '}
          </button>
          <button
            type="button"
            aria-pressed={region === 'brazil'}
            onClick={() => setRegion('brazil')}
            data-testid="monitoring-map-brazil"
          >
            {t('Brasil')}{' '}
          </button>
        </div>
      </div>
      <div className="telemetry-map" data-testid="monitoring-map">
        <svg
          viewBox={region === 'world' ? '0 15 720 310' : '207 160 100 98'}
          role="img"
          aria-labelledby={titleId}
          preserveAspectRatio="xMidYMid meet"
        >
          <title id={titleId}>
            {t(
              'Mapa esquemático de {region}. {count} localidades com coordenadas disponíveis nos registros.',
              {
                region: t(region === 'world' ? 'origens no mundo' : 'origens no Brasil'),
                count: dots.length,
              },
            )}
          </title>
          <g className="telemetry-map-grid">
            {[-60, -30, 0, 30, 60].map((latitude) => (
              <path key={latitude} d={`M0 ${(90 - latitude) * 2}H720`} />
            ))}
            {[-120, -60, 0, 60, 120].map((longitude) => (
              <path key={longitude} d={`M${(longitude + 180) * 2} 0V360`} />
            ))}
          </g>
          <g className="telemetry-map-land">
            {land.map((shape, index) => (
              <path key={index} d={path(shape)} />
            ))}
            {region === 'brazil' && <path className="telemetry-map-brazil" d={path(brazil)} />}
          </g>
          {dots.map((location, index) => {
            const [x, y] = point([location.longitude, location.latitude]);
            const label =
              [location.city, location.region, location.country].filter(Boolean).join(' / ') ||
              t('Localidade não informada');
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r={
                  (region === 'world' ? 3 : 0.8) +
                  Math.sqrt(location.count / max) * (region === 'world' ? 7 : 2)
                }
                className="telemetry-map-dot"
                tabIndex={0}
                aria-label={t('{location}: {count} acessos', {
                  location: label,
                  count: location.count,
                })}
              >
                <title>
                  {t('{location}: {count} acessos', { location: label, count: location.count })}
                </title>
              </circle>
            );
          })}
        </svg>
        {!dots.length && (
          <p className="telemetry-map-empty">
            {t('Sem coordenadas disponíveis para esta região.')}
          </p>
        )}
      </div>
      <p className="telemetry-note">
        {t(
          'Localização disponível nos registros · mapa esquemático. Registros legados podem ter origem diferente da localização autorizada pelo visitante.',
        )}{' '}
      </p>
      <p className="telemetry-note">
        {t('Geocodificação, quando disponível:')}{' '}
        <a href="https://www.geoapify.com/" target="_blank" rel="noreferrer">
          Geoapify
        </a>
        {' · © '}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
          OpenStreetMap
        </a>
        .
      </p>
      <details className="telemetry-table-toggle">
        <summary>{t('Ver tabela de localidades')}</summary>
        <ul className="telemetry-map-list">
          {dots.map((location, index) => (
            <li key={index}>
              <span>
                {[location.country, location.region, location.city].filter(Boolean).join(' / ') ||
                  t('Não informado')}
              </span>
              <strong>{location.count}</strong>
            </li>
          ))}
        </ul>
        {!dots.length && <p>{t('Sem localidades com coordenadas.')}</p>}
      </details>
    </>
  );
}
