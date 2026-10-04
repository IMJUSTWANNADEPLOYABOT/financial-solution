import { createLucideIcon } from "lucide-react";

// Иконки, которых нет в lucide, нарисованные в его стиле (24×24, обводка 2px).

export const ChocolateBar = createLucideIcon("ChocolateBar", [
  [
    "path",
    {
      d: "M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z",
      key: "bar",
    },
  ],
  ["path", { d: "M12 2v11", key: "split-v" }],
  ["path", { d: "M5 8h14", key: "split-h" }],
  ["path", { d: "m5 15 2.33-1.5 2.34 1.5 2.33-1.5 2.33 1.5 2.34-1.5L19 15", key: "foil" }],
]);

// Ребёнок: крупная голова, маленькое тело, хохолок.
export const Boy = createLucideIcon("Boy", [
  ["circle", { cx: "12", cy: "9", r: "6", key: "head" }],
  ["path", { d: "M12 3c.4-1.2 1.7-1.7 2.8-1.2", key: "tuft" }],
  ["path", { d: "M10 8.5h.01", key: "eye-l" }],
  ["path", { d: "M14 8.5h.01", key: "eye-r" }],
  ["path", { d: "M10 11.5a2.5 2.5 0 0 0 4 0", key: "smile" }],
  ["path", { d: "M7.5 22a4.5 4.5 0 0 1 9 0", key: "body" }],
]);

// Юноша: взрослые пропорции, широкие плечи, чёлка набок, ворот футболки.
export const YoungMan = createLucideIcon("YoungMan", [
  ["circle", { cx: "12", cy: "8", r: "4", key: "head" }],
  [
    "path",
    {
      d: "M8.2 7.2C8.7 5 10.1 4 12 4s3.5 1 3.9 3.1c-1.7-.2-3-.9-3.9-2.1-.8 1.2-2.1 2-3.8 2.2z",
      key: "hair",
    },
  ],
  ["path", { d: "M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1", key: "shoulders" }],
  ["path", { d: "m10 14 2 2 2-2", key: "collar" }],
]);

// Зуб: широкая коронка с ложбинкой сверху и двумя корнями.
export const Tooth = createLucideIcon("Tooth", [
  [
    "path",
    {
      d: "M7.5 3C5 3 3 5 3 7.5c0 1.9.8 3.2 1.5 4.6.6 1.3.8 2.8 1 4.3.3 2.3.8 4.6 2.3 4.6 1.4 0 1.6-2 2-3.6.3-1.3.9-2.4 2.2-2.4s1.9 1.1 2.2 2.4c.4 1.6.6 3.6 2 3.6 1.5 0 2-2.3 2.3-4.6.2-1.5.4-3 1-4.3.7-1.4 1.5-2.7 1.5-4.6C21 5 19 3 16.5 3c-1.8 0-2.8 1-4.5 1S9.3 3 7.5 3z",
      key: "tooth",
    },
  ],
]);
