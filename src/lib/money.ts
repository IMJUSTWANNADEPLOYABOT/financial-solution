const formatters = new Map<string, Intl.NumberFormat>();

function formatter(fractions: number) {
  const key = String(fractions);
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      minimumFractionDigits: fractions,
      maximumFractionDigits: fractions,
    });
    formatters.set(key, f);
  }
  return f;
}

/** Форматирует сумму в копейках: 123450 → «1 234,50 ₽», 120000 → «1 200 ₽». */
export function formatMoney(kopecks: number, { sign = false }: { sign?: boolean } = {}) {
  const fractions = kopecks % 100 === 0 ? 0 : 2;
  const text = formatter(fractions).format(Math.abs(kopecks) / 100);
  if (kopecks < 0) return `−${text}`;
  return sign && kopecks > 0 ? `+${text}` : text;
}

/** Компактный формат для осей графиков: 12 500 ₽ → «12,5 тыс.». */
export function formatMoneyCompact(kopecks: number) {
  return new Intl.NumberFormat("ru-RU", { notation: "compact", maximumFractionDigits: 1 }).format(
    kopecks / 100,
  );
}

/** Разбирает ввод пользователя («1 234,5») в копейки. Возвращает null, если ввод некорректен. */
export function parseAmount(input: string): number | null {
  const normalized = input.replace(/[\s\u00a0₽]/g, "").replace(",", ".");
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) return null;
  const value = Math.round(Number(normalized) * 100);
  return value > 0 && value <= 100_000_000_000 ? value : null;
}

/** Копейки → строка для поля ввода: 123450 → «1234,5». */
export function amountToInput(kopecks: number) {
  return (kopecks / 100).toString().replace(".", ",");
}
