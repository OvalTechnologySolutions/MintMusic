/**
 * Prisma `BigInt` columns (e.g. MediaAsset.byteSize) throw in `res.json()`:
 * `TypeError: Do not know how to serialize a BigInt`. Convert them to Number
 * so catalog payloads match the shared `byteSize: number` contract.
 *
 * Values are bounded by MEDIA_MAX_BYTES (500MB), well inside MAX_SAFE_INTEGER.
 */
export function toJsonSafe<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, nested) =>
      typeof nested === 'bigint' ? Number(nested) : nested
    )
  ) as T;
}
