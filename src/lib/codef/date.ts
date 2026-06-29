export function toCodefDate(date: string) {
  return date.replaceAll("-", "");
}

export function normalizeIsoDate(date: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }

  if (/^\d{8}$/.test(date)) {
    return `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
  }

  throw new Error("Date must be YYYY-MM-DD or YYYYMMDD");
}

export function fromCodefDateTime(date?: string, time?: string) {
  if (!date || !/^\d{8}$/.test(date)) {
    throw new Error("CODEF payload date must be YYYYMMDD");
  }

  if (!time || !/^\d{6}$/.test(time)) {
    throw new Error("CODEF payload time must be HHmmss");
  }

  return new Date(
    `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}T${time.slice(0, 2)}:${time.slice(2, 4)}:${time.slice(4, 6)}+09:00`
  );
}

export function fromCodefDate(date?: string) {
  if (!date || !/^\d{8}$/.test(date)) {
    throw new Error("CODEF payload date must be YYYYMMDD");
  }

  return new Date(
    `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}T00:00:00+09:00`
  );
}
