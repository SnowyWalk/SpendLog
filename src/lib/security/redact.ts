const SENSITIVE_KEYS = [
  /connectedid/i,
  /password/i,
  /secret/i,
  /token/i,
  /approval/i,
  /cardno/i,
  /accountno/i,
  /account$/i,
  /birth/i,
  /id$/i,
];

export function redactValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      key,
      SENSITIVE_KEYS.some((pattern) => pattern.test(key))
        ? "<redacted>"
        : redactValue(entry),
    ])
  );
}

export function redactMessage(message: unknown) {
  return String(message)
    .replace(/[A-Za-z0-9._-]{18,}/g, "<redacted>")
    .replace(/\b\d{6,}\b/g, "<redacted>");
}
