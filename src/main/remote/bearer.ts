const BEARER_PATTERN: RegExp = /^Bearer\s+(\S+)\s*$/i;

// The credential of an "Authorization: Bearer <credential>" header, or null without a well-formed one.
export function bearerCredential(header: string | undefined): string | null {
  return BEARER_PATTERN.exec(header ?? '')?.[1] ?? null;
}
