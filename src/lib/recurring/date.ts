const SEOUL_TIME_ZONE = "Asia/Seoul";

export function seoulDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SEOUL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
    day: Number(parts.find((part) => part.type === "day")?.value),
  };
}

export function seoulDayOfWeek(date: Date) {
  const parts = seoulDateParts(date);
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
}

export function nextExpectedDate(lastPaidAt: Date, averageDay: number, now = new Date()) {
  const last = seoulDateParts(lastPaidAt);
  const today = seoulDateParts(now);
  const startsFromFuturePayment =
    last.year > today.year || (last.year === today.year && last.month >= today.month);
  const baseYear = startsFromFuturePayment ? last.year : today.year;
  const baseMonth = startsFromFuturePayment ? last.month + 1 : today.month;
  const candidate = buildSeoulDate(baseYear, baseMonth, averageDay);
  const todayStart = buildSeoulDate(today.year, today.month, today.day);

  if (candidate >= todayStart) {
    return candidate;
  }

  return buildSeoulDate(baseYear, baseMonth + 1, averageDay);
}

function buildSeoulDate(year: number, month: number, day: number) {
  const targetYear = year + Math.floor((month - 1) / 12);
  const normalizedMonth = ((month - 1) % 12) + 1;
  const lastDay = new Date(Date.UTC(targetYear, normalizedMonth, 0)).getUTCDate();
  const normalizedDay = Math.min(Math.max(1, Math.round(day)), lastDay);
  return new Date(
    `${targetYear}-${String(normalizedMonth).padStart(2, "0")}-${String(
      normalizedDay
    ).padStart(2, "0")}T00:00:00+09:00`
  );
}
