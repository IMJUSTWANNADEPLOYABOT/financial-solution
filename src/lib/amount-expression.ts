import { parseAmount } from "@/lib/money";

/**
 * Сумма, набранная на экранной клавиатуре: числа с запятой и знаки «+»/«-» между ними,
 * например «150+320,5-20». Хранится строкой, считается при сохранении.
 */

export type AmountKey =
  "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "000" | "," | "+" | "-" | "backspace";

const MAX_LENGTH = 24;
const isOperator = (ch: string | undefined) => ch === "+" || ch === "-";

/** Последнее число выражения (то, что сейчас набирается). */
function currentNumber(expr: string) {
  const match = expr.match(/[\d,]*$/);
  return match ? match[0] : "";
}

export function hasOperator(expr: string) {
  return /\d[+-]/.test(expr);
}

/** Применяет нажатие клавиши к выражению. Некорректные нажатия просто игнорируются. */
export function pressAmountKey(expr: string, key: AmountKey): string {
  if (key === "backspace") return expr.slice(0, -1);

  const last = expr.at(-1);
  const number = currentNumber(expr);

  if (key === "+" || key === "-") {
    if (!expr) return expr;
    if (isOperator(last)) return expr.slice(0, -1) + key;
    const base = last === "," ? expr.slice(0, -1) : expr;
    return base.length < MAX_LENGTH ? base + key : base;
  }

  if (expr.length + key.length > MAX_LENGTH) return expr;

  if (key === ",") {
    if (number.includes(",")) return expr;
    return expr + (number ? "," : "0,");
  }

  // Не больше двух знаков после запятой — это копейки.
  const decimals = number.split(",")[1];
  if (decimals !== undefined) {
    if (key === "000" || decimals.length >= 2) return expr;
    return expr + key;
  }

  if (key === "000") return number && number !== "0" ? expr + key : expr;
  // «0» в начале числа заменяется следующей цифрой: не бывает «007».
  if (number === "0") return expr.slice(0, -1) + key;
  return expr + key;
}

/** Считает выражение в копейках. null — если оно неполное или результат не больше нуля. */
export function evaluateAmount(input: string): number | null {
  const expr = input.replace(/[\s ₽]/g, "").replace(/−/g, "-");
  if (!hasOperator(expr)) return parseAmount(expr);

  const parts = expr.split(/([+-])/);
  let total = 0;
  for (let i = 0; i < parts.length; i += 2) {
    const value = parseAmount(parts[i]);
    if (value === null) return null;
    total += parts[i - 1] === "-" ? -value : value;
  }
  return total > 0 && total <= 100_000_000_000 ? total : null;
}

/** Для показа: разряды через неразрывный пробел, «-» как настоящий минус. */
export function formatAmountExpression(expr: string) {
  return expr
    .split(/([+-])/)
    .map((part) => {
      if (part === "+") return " + ";
      if (part === "-") return " − ";
      const [int, frac] = part.split(",");
      const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
      return frac === undefined ? grouped : `${grouped},${frac}`;
    })
    .join("");
}
