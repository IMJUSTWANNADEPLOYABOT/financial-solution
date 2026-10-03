-- 1. Убираем категорию «Сладкое». Её операции переносим в «Продукты» того же пользователя.
UPDATE `transactions`
SET `category_id` = (
  SELECT p.`id` FROM `categories` p
  WHERE p.`user_id` = `transactions`.`user_id` AND p.`kind` = 'expense' AND p.`name` = 'Продукты'
)
WHERE `category_id` IN (SELECT s.`id` FROM `categories` s WHERE s.`name` = 'Сладкое' AND s.`kind` = 'expense')
  AND EXISTS (
    SELECT 1 FROM `categories` p
    WHERE p.`user_id` = `transactions`.`user_id` AND p.`kind` = 'expense' AND p.`name` = 'Продукты'
  );
--> statement-breakpoint
-- Удаляем «Сладкое», где операций не осталось (лимиты по ней удалятся каскадно).
DELETE FROM `categories`
WHERE `name` = 'Сладкое' AND `kind` = 'expense'
  AND NOT EXISTS (SELECT 1 FROM `transactions` t WHERE t.`category_id` = `categories`.`id`);
--> statement-breakpoint
-- Если «Продуктов» у пользователя нет, история сохраняется, а категория просто скрывается.
UPDATE `categories` SET `archived` = 1 WHERE `name` = 'Сладкое' AND `kind` = 'expense';
--> statement-breakpoint
-- 2. Новые стандартные категории. Разреживаем sort_order, чтобы вставить их на нужные места.
UPDATE `categories` SET `sort_order` = `sort_order` * 10;
--> statement-breakpoint
INSERT OR IGNORE INTO `categories` (`id`, `user_id`, `name`, `icon`, `color`, `kind`, `sort_order`)
SELECT
  lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-a' || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6))),
  u.`id`, 'Такси', 'car-taxi-front', '#ca8a04', 'expense',
  COALESCE(
    (SELECT c.`sort_order` + 5 FROM `categories` c WHERE c.`user_id` = u.`id` AND c.`kind` = 'expense' AND c.`name` = 'Транспорт'),
    (SELECT MAX(c.`sort_order`) + 10 FROM `categories` c WHERE c.`user_id` = u.`id`),
    0
  )
FROM `users` u;
--> statement-breakpoint
INSERT OR IGNORE INTO `categories` (`id`, `user_id`, `name`, `icon`, `color`, `kind`, `sort_order`)
SELECT
  lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-a' || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6))),
  u.`id`, 'Красота', 'sparkles', '#c026d3', 'expense',
  COALESCE(
    (SELECT c.`sort_order` + 3 FROM `categories` c WHERE c.`user_id` = u.`id` AND c.`kind` = 'expense' AND c.`name` = 'Здоровье'),
    (SELECT MAX(c.`sort_order`) + 10 FROM `categories` c WHERE c.`user_id` = u.`id`),
    0
  )
FROM `users` u;
--> statement-breakpoint
INSERT OR IGNORE INTO `categories` (`id`, `user_id`, `name`, `icon`, `color`, `kind`, `sort_order`)
SELECT
  lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-a' || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6))),
  u.`id`, 'Тренировки', 'dumbbell', '#65a30d', 'expense',
  COALESCE(
    (SELECT c.`sort_order` + 6 FROM `categories` c WHERE c.`user_id` = u.`id` AND c.`kind` = 'expense' AND c.`name` = 'Здоровье'),
    (SELECT MAX(c.`sort_order`) + 10 FROM `categories` c WHERE c.`user_id` = u.`id`),
    0
  )
FROM `users` u;
--> statement-breakpoint
INSERT OR IGNORE INTO `categories` (`id`, `user_id`, `name`, `icon`, `color`, `kind`, `sort_order`)
SELECT
  lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-a' || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6))),
  u.`id`, 'Путешествия', 'plane', '#0891b2', 'expense',
  COALESCE(
    (SELECT c.`sort_order` + 5 FROM `categories` c WHERE c.`user_id` = u.`id` AND c.`kind` = 'expense' AND c.`name` = 'Развлечения'),
    (SELECT MAX(c.`sort_order`) + 10 FROM `categories` c WHERE c.`user_id` = u.`id`),
    0
  )
FROM `users` u;
--> statement-breakpoint
INSERT OR IGNORE INTO `categories` (`id`, `user_id`, `name`, `icon`, `color`, `kind`, `sort_order`)
SELECT
  lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-a' || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6))),
  u.`id`, 'Одежда и обувь', 'shirt', '#be185d', 'expense',
  COALESCE(
    (SELECT c.`sort_order` + 5 FROM `categories` c WHERE c.`user_id` = u.`id` AND c.`kind` = 'expense' AND c.`name` = 'Покупки'),
    (SELECT MAX(c.`sort_order`) + 10 FROM `categories` c WHERE c.`user_id` = u.`id`),
    0
  )
FROM `users` u;
