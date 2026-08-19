// ─────────────────────────────────────────────────────────────────────────────
// Firestore-safe object serializer
//
// Converts any object (including class instances, DTOs, and nested structures)
// into a plain JavaScript object safe for Firestore writes.
//
// Rules enforced:
//   - class instances with custom prototypes → plain objects (own enumerable props)
//   - undefined values → stripped entirely
//   - Date instances → preserved (Firestore converts to Timestamp)
//   - null, string, number, boolean → preserved
//   - arrays → recursively processed
//   - plain objects → recursively processed
// ─────────────────────────────────────────────────────────────────────────────

export function toPlainFirestoreObject<T extends Record<string, any>>(
  data: T,
): Record<string, any> {
  const plain: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;

    if (value === null || typeof value !== 'object' || value instanceof Date) {
      plain[key] = value;
    } else if (Array.isArray(value)) {
      plain[key] = value.map((item) =>
        item !== null && typeof item === 'object' && !(item instanceof Date)
          ? toPlainFirestoreObject(item as Record<string, unknown>)
          : item,
      );
    } else {
      // Class instance or plain object — extract own enumerable properties
      plain[key] = toPlainFirestoreObject(value as Record<string, unknown>);
    }
  }

  return plain;
}
