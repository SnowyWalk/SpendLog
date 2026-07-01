type TextLikeTransaction = {
  merchantName?: string | null;
  description?: string | null;
};

const KOREAN_TRANSIT_PATTERNS = [
  "후불교통",
  "티머니",
  "캐시비",
  "지하철",
  "버스",
  "마을버스",
  "광역버스",
  "시내버스",
];

const ENGLISH_TRANSIT_PATTERNS = [
  /\bt-?money\b/i,
  /\bcashbee\b/i,
  /\btransit\s+(card|fare|pass|payment)\b/i,
  /\b(public\s+)?transport(ation)?\s+(card|fare|pass|payment)\b/i,
  /\b(bus|subway|metro)\s+(fare|pass|card|payment)\b/i,
  /\b(city|public|airport|express)\s+(bus|subway|metro)\b/i,
];

export function normalizeTransactionText(input: TextLikeTransaction | string) {
  const raw =
    typeof input === "string"
      ? input
      : `${input.merchantName ?? ""} ${input.description ?? ""}`;

  return raw
    .normalize("NFKC")
    .replace(/[_·・|()[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function isTransitCardOrFareText(input: TextLikeTransaction | string) {
  const normalized = normalizeTransactionText(input);
  if (!normalized) {
    return false;
  }

  return (
    KOREAN_TRANSIT_PATTERNS.some((pattern) => normalized.includes(pattern)) ||
    ENGLISH_TRANSIT_PATTERNS.some((pattern) => pattern.test(normalized))
  );
}

export function isCommuteLikeTransitText(input: TextLikeTransaction | string) {
  return isTransitCardOrFareText(input);
}

export function isAutomaticRecurringCommuteTransitText(input: TextLikeTransaction | string) {
  return isTransitCardOrFareText(input);
}
