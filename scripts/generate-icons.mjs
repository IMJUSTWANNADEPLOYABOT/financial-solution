// Генерирует PNG-иконки PWA из SVG. Запуск: node scripts/generate-icons.mjs
import { writeFileSync } from "node:fs";
import sharp from "sharp";

const glyph = (scale) => `
  <g transform="translate(${16 - 16 * scale} ${16 - 16 * scale}) scale(${scale})">
    <path d="M10 21.5V10.5h9M10 16h7" stroke="${INK}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <circle cx="22" cy="21" r="2.2" fill="${INK}"/>
  </g>`;

// Цвета как у логотипа в светлой теме: акцент --primary и текст на нём --primary-foreground.
const BG = "#d9bce6";
const INK = "#3b1f47";

// Обычная иконка: скруглённый квадрат.
const rounded = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="8" fill="${BG}"/>${glyph(1)}</svg>`;

// Maskable: фон на весь холст, глиф в безопасной зоне (80%).
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" fill="${BG}"/>${glyph(0.75)}</svg>`;

writeFileSync("public/icons/icon.svg", rounded.trim());

const jobs = [
  [rounded, 192, "icon-192.png"],
  [rounded, 512, "icon-512.png"],
  [maskable, 512, "icon-maskable-512.png"],
  [maskable, 180, "apple-touch-icon.png"],
  [rounded, 48, "favicon-48.png"],
];

for (const [svg, size, name] of jobs) {
  await sharp(Buffer.from(svg), { density: 72 * (size / 32) })
    .resize(size, size)
    .png()
    .toFile(`public/icons/${name}`);
  console.log("✓", name);
}
