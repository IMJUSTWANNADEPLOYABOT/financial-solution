import type { TransactionKind } from "@/db/schema";

type Preset = { name: string; icon: string; color: string; kind: TransactionKind };

// Первые восемь цветов — проверенная на дальтонизм категориальная палитра, в фиксированном порядке.
export const CATEGORY_COLORS = [
  "#2a78d6",
  "#eb6834",
  "#1baf7a",
  "#eda100",
  "#e87ba4",
  "#008300",
  "#6d5bd0",
  "#e34948",
  "#0ea5e9",
  "#0d9488",
  "#db2777",
  "#78716c",
  "#8d5a3b",
  "#4f46e5",
  "#d97706",
];

export const DEFAULT_CATEGORIES: Preset[] = [
  { name: "Продукты", icon: "shopping-cart", color: "#2a78d6", kind: "expense" },
  { name: "Сладкое", icon: "chocolate", color: "#8d5a3b", kind: "expense" },
  { name: "Кафе и рестораны", icon: "utensils", color: "#eb6834", kind: "expense" },
  { name: "Транспорт", icon: "bus", color: "#1baf7a", kind: "expense" },
  { name: "Жильё и ЖКХ", icon: "house", color: "#eda100", kind: "expense" },
  { name: "Здоровье", icon: "heart-pulse", color: "#e34948", kind: "expense" },
  { name: "Развлечения", icon: "popcorn", color: "#e87ba4", kind: "expense" },
  { name: "Покупки", icon: "shopping-bag", color: "#6d5bd0", kind: "expense" },
  { name: "Связь и интернет", icon: "wifi", color: "#008300", kind: "expense" },
  { name: "Подписки", icon: "repeat", color: "#0ea5e9", kind: "expense" },
  { name: "Образование", icon: "graduation-cap", color: "#0d9488", kind: "expense" },
  { name: "Подарки", icon: "gift", color: "#db2777", kind: "expense" },
  { name: "Коля ♥️", icon: "boy", color: "#4f46e5", kind: "expense" },
  { name: "На пиво любимке ♥️", icon: "young-man", color: "#d97706", kind: "expense" },
  { name: "Прочее", icon: "ellipsis", color: "#78716c", kind: "expense" },
  { name: "Зарплата", icon: "briefcase", color: "#008300", kind: "income" },
  { name: "Подработка", icon: "laptop", color: "#2a78d6", kind: "income" },
  { name: "Подарки", icon: "gift", color: "#db2777", kind: "income" },
  { name: "Прочее", icon: "ellipsis", color: "#78716c", kind: "income" },
];
