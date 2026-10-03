-- Новые стандартные категории расходов для всех существующих пользователей.
-- Сначала разреживаем sort_order (×10), чтобы вставить категории на нужные места.
UPDATE `categories` SET `sort_order` = `sort_order` * 10;
--> statement-breakpoint
-- «Сладкое» — сразу после «Продуктов» (или в конец, если «Продукты» удалены).
INSERT OR IGNORE INTO `categories` (`id`, `user_id`, `name`, `icon`, `color`, `kind`, `sort_order`)
SELECT
  lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-a' || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6))),
  u.`id`, 'Сладкое', 'chocolate', '#8d5a3b', 'expense',
  COALESCE(
    (SELECT c.`sort_order` + 5 FROM `categories` c WHERE c.`user_id` = u.`id` AND c.`kind` = 'expense' AND c.`name` = 'Продукты'),
    (SELECT MAX(c.`sort_order`) + 10 FROM `categories` c WHERE c.`user_id` = u.`id`),
    0
  )
FROM `users` u;
--> statement-breakpoint
-- «Коля ♥️» и «На пиво любимке ♥️» — перед «Прочее» в расходах.
INSERT OR IGNORE INTO `categories` (`id`, `user_id`, `name`, `icon`, `color`, `kind`, `sort_order`)
SELECT
  lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-a' || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6))),
  u.`id`, 'Коля ♥️', 'boy', '#4f46e5', 'expense',
  COALESCE(
    (SELECT c.`sort_order` - 4 FROM `categories` c WHERE c.`user_id` = u.`id` AND c.`kind` = 'expense' AND c.`name` = 'Прочее'),
    (SELECT MAX(c.`sort_order`) + 10 FROM `categories` c WHERE c.`user_id` = u.`id`),
    0
  )
FROM `users` u;
--> statement-breakpoint
INSERT OR IGNORE INTO `categories` (`id`, `user_id`, `name`, `icon`, `color`, `kind`, `sort_order`)
SELECT
  lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-a' || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6))),
  u.`id`, 'На пиво любимке ♥️', 'young-man', '#d97706', 'expense',
  COALESCE(
    (SELECT c.`sort_order` - 2 FROM `categories` c WHERE c.`user_id` = u.`id` AND c.`kind` = 'expense' AND c.`name` = 'Прочее'),
    (SELECT MAX(c.`sort_order`) + 10 FROM `categories` c WHERE c.`user_id` = u.`id`),
    0
  )
FROM `users` u;
