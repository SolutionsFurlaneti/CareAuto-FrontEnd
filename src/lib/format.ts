export const money = (value: number | null | undefined) =>
  value == null
    ? '—'
    : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
export const dateTime = (value: string | null | undefined) =>
  !value
    ? '—'
    : new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone: 'America/Sao_Paulo',
      }).format(new Date(/[Zz]|[+-]\d\d:\d\d$/.test(value) ? value : value + 'Z'));
export const dateOnly = (value: string) => {
  const [y, m, d] = value.split('-');
  return d + '/' + m + '/' + y;
};
export const todayIso = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
export const integer = (value: number) => new Intl.NumberFormat('pt-BR').format(value);
