export const normalizePlate = (text: string) => text.toUpperCase().replace(/[\s-]/g, '');
export const isPlate = (text: string) => /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(text);
