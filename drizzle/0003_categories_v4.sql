-- 1. Убираем доходную категорию «Зарплата». Её операции переносим в «Прочее» (доход) того же пользователя.
UPDATE `transactions`
SET `category_id` = (
  SELECT p.`id` FROM `categories` p
  WHERE p.`user_id` = `transactions`.`user_id` AND p.`kind` = 'income' AND p.`name` = 'Прочее'
)
WHERE `category_id` IN (SELECT s.`id` FROM `categories` s WHERE s.`name` = 'Зарплата' AND s.`kind` = 'income')
  AND EXISTS (
    SELECT 1 FROM `categories` p
    WHERE p.`user_id` = `transactions`.`user_id` AND p.`kind` = 'income' AND p.`name` = 'Прочее'
  );
--> statement-breakpoint
-- Удаляем «Зарплату», где операций не осталось.
DELETE FROM `categories`
WHERE `name` = 'Зарплата' AND `kind` = 'income'
  AND NOT EXISTS (SELECT 1 FROM `transactions` t WHERE t.`category_id` = `categories`.`id`);
--> statement-breakpoint
-- Если «Прочего» у пользователя нет, история сохраняется, а категория просто скрывается.
UPDATE `categories` SET `archived` = 1 WHERE `name` = 'Зарплата' AND `kind` = 'income';
--> statement-breakpoint
-- 2. Новые стандартные категории.
INSERT OR IGNORE INTO `categories` (`id`, `user_id`, `name`, `icon`, `color`, `kind`, `sort_order`)
SELECT
  lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-a' || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6))),
  u.`id`, 'Родителям', 'hand-heart', '#8d5a3b', 'expense',
  COALESCE(
    (SELECT c.`sort_order` + 5 FROM `categories` c WHERE c.`user_id` = u.`id` AND c.`kind` = 'expense' AND c.`name` = 'Подарки'),
    (SELECT MAX(c.`sort_order`) + 10 FROM `categories` c WHERE c.`user_id` = u.`id`),
    0
  )
FROM `users` u;
--> statement-breakpoint
-- Клиники — в начало доходов: сначала «Другие клиники», затем «Улыбка 32» перед ними.
INSERT OR IGNORE INTO `categories` (`id`, `user_id`, `name`, `icon`, `color`, `kind`, `sort_order`)
SELECT
  lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-a' || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6))),
  u.`id`, 'Другие клиники', 'toothbrush', '#0d9488', 'income',
  COALESCE(
    (SELECT MIN(c.`sort_order`) - 10 FROM `categories` c WHERE c.`user_id` = u.`id` AND c.`kind` = 'income'),
    (SELECT MAX(c.`sort_order`) + 10 FROM `categories` c WHERE c.`user_id` = u.`id`),
    0
  )
FROM `users` u;
--> statement-breakpoint
INSERT OR IGNORE INTO `categories` (`id`, `user_id`, `name`, `icon`, `color`, `kind`, `sort_order`)
SELECT
  lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-a' || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6))),
  u.`id`, 'Улыбка 32', 'tooth', '#0891b2', 'income',
  COALESCE(
    (SELECT MIN(c.`sort_order`) - 10 FROM `categories` c WHERE c.`user_id` = u.`id` AND c.`kind` = 'income'),
    (SELECT MAX(c.`sort_order`) + 10 FROM `categories` c WHERE c.`user_id` = u.`id`),
    0
  )
FROM `users` u;
--> statement-breakpoint
INSERT OR IGNORE INTO `categories` (`id`, `user_id`, `name`, `icon`, `color`, `kind`, `sort_order`)
SELECT
  lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-a' || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6))),
  u.`id`, 'Алименты', 'hand-coins', '#eda100', 'income',
  COALESCE(
    (SELECT c.`sort_order` - 6 FROM `categories` c WHERE c.`user_id` = u.`id` AND c.`kind` = 'income' AND c.`name` = 'Подарки'),
    (SELECT MAX(c.`sort_order`) + 10 FROM `categories` c WHERE c.`user_id` = u.`id`),
    0
  )
FROM `users` u;
--> statement-breakpoint
INSERT OR IGNORE INTO `categories` (`id`, `user_id`, `name`, `icon`, `color`, `kind`, `sort_order`)
SELECT
  lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-a' || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6))),
  u.`id`, 'Проценты', 'percent', '#008300', 'income',
  COALESCE(
    (SELECT c.`sort_order` - 3 FROM `categories` c WHERE c.`user_id` = u.`id` AND c.`kind` = 'income' AND c.`name` = 'Подарки'),
    (SELECT MAX(c.`sort_order`) + 10 FROM `categories` c WHERE c.`user_id` = u.`id`),
    0
  )
FROM `users` u;
