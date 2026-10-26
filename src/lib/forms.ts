export const toNullableId = (v: unknown) =>
  v === '' || v === null || v === undefined ? null : Number(v);
export const toNullableText = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
