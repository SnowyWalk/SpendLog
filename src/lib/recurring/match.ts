export function normalizeRecurringMatchKey(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("ko-KR")
    .replace(/[()[\]{}]/g, " ")
    .replace(/[·ㆍ,._\-_/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
