export function isTrustedRequestSource({
  host,
  origin,
  referer,
}: {
  host: string | null;
  origin: string | null;
  referer: string | null;
}) {
  if (!host) {
    return false;
  }

  try {
    if (origin && new URL(origin).host !== host) {
      return false;
    }
    if (!origin && referer && new URL(referer).host !== host) {
      return false;
    }
  } catch {
    return false;
  }

  return true;
}
