/** Normalize Express route params (string | string[] in strict typings). */
export function routeParam(value: string | string[] | undefined): string {
  if (value === undefined) return '';
  return Array.isArray(value) ? (value[0] ?? '') : value;
}
