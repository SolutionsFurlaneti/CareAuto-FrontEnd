export const BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, '');
export const appPath = (path: string) => BASE_PATH + '/' + path.replace(/^\//, '');
export const safeReturnPath = (path: unknown) =>
  typeof path === 'string' && path.startsWith('/') && !path.startsWith('//') && !path.includes('\\')
    ? path
    : '/';
