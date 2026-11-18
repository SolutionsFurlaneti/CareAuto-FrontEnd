export type MonitoringPeriod = 'today' | '7' | '30' | 'custom';
const brasiliaDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
export function todayInBrasilia(now = new Date()): string {
  const parts = brasiliaDate.formatToParts(now);
  const part = (name: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === name)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function shiftDate(date: string, days: number): string {
  const value = new Date(date + 'T12:00:00Z');
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
export function periodDates(
  period: Exclude<MonitoringPeriod, 'custom'>,
  today = todayInBrasilia(),
) {
  return { start: shiftDate(today, period === 'today' ? 0 : 1 - Number(period)), end: today };
}
export function monitoringDateRange(start: string, end: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) return null;
  const first = new Date(start + 'T00:00:00-03:00');
  const last = new Date(end + 'T00:00:00-03:00');
  if (
    !Number.isFinite(first.getTime()) ||
    !Number.isFinite(last.getTime()) ||
    first.toISOString().slice(0, 10) !== start ||
    last.toISOString().slice(0, 10) !== end ||
    last < first ||
    (last.getTime() - first.getTime()) / 86400000 >= 366
  )
    return null;
  return {
    startDate: first.toISOString(),
    endDate: new Date(last.getTime() + 86400000).toISOString(),
  };
}
export const displayDate = (date: string) => date.split('-').reverse().join('/');
