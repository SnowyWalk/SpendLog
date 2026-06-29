export function getTrustedAppHost() {
  return process.env.APP_PUBLIC_HOST?.trim().toLocaleLowerCase("en-US") || null;
}

function normalizeHost(host?: string | null) {
  return host?.split(",")[0]?.trim().toLocaleLowerCase("en-US") || null;
}

export function isTrustedHost({
  host,
}: {
  host: string | null;
}) {
  const trustedHost = getTrustedAppHost();
  if (!trustedHost) {
    return false;
  }

  return normalizeHost(host) === trustedHost;
}

export function isTrustedRequestSource({
  host,
  origin,
  referer,
}: {
  host: string | null;
  origin: string | null;
  referer: string | null;
}) {
  const requestHost = normalizeHost(host);
  if (!requestHost || !isTrustedHost({ host })) {
    return false;
  }

  try {
    const originHost = normalizeHost(origin ? new URL(origin).host : null);
    const refererHost = normalizeHost(referer ? new URL(referer).host : null);
    if (
      originHost &&
      originHost !== requestHost &&
      !isTrustedHost({ host: originHost })
    ) {
      return false;
    }
    if (
      !originHost &&
      refererHost &&
      refererHost !== requestHost &&
      !isTrustedHost({ host: refererHost })
    ) {
      return false;
    }
  } catch {
    return false;
  }

  return true;
}
