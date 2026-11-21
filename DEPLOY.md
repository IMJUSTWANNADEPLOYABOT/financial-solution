# Деплой «Олечкиных финансов»

Приложение работает в одном Docker-контейнере (Next.js standalone + SQLite) и открывается по адресу
**https://andrewha.tech/finance-auditor**. Nginx на хосте проксирует этот путь в контейнер.

```
браузер ──HTTPS──▶ Nginx (andrewha.tech:443) ──/finance-auditor──▶ 127.0.0.1:3010 ──▶ контейнер :3000
                                                                                   └─ ./data/finance.db (volume)
```

## Требования к серверу

- Docker Engine 24+ с плагином `docker compose`
- Nginx с уже настроенным HTTPS для `andrewha.tech`
- Свободный порт `3010` на localhost (если занят — поменяйте в `docker-compose.yml` и в конфиге Nginx)

Проверенное окружение на 2026-11-21: сервер `89.110.93.182`, каталог `/opt/financial-solution`,
архитектура `x86_64`, около 1 ГБ RAM и диск 10 ГБ. Обновление готовым образом успешно завершилось
со статусом контейнера `healthy`. Тяжёлую сборку выполняем на ПК или в CI.

## 1. Первый запуск

```bash
git clone <url-репозитория> /opt/financial-solution
cd /opt/financial-solution

mkdir -p data
sudo chown 1001:1001 data        # в контейнере приложение работает от пользователя с uid 1001

# Сначала передайте готовый finance-update.tar в data/ по инструкции из раздела 3.
docker load -i data/finance-update.tar
docker compose up -d --no-build --wait
docker compose logs --tail=50
```

Проверка с самого сервера:

```bash
curl -I http://127.0.0.1:3010/finance-auditor/login    # должен вернуть 200
```

Таблицы создаются автоматически при первом запросе: миграции из папки `drizzle/` применяются при старте.

## 2. Nginx

Готовые блоки лежат в [`deploy/nginx.conf`](deploy/nginx.conf). Вставьте блоки `location` внутрь существующего
`server { ... }` для `andrewha.tech` (того, что слушает 443 с сертификатом).

Если в конфиге ещё нет `map $http_upgrade $connection_upgrade`, добавьте его в блок `http { }`
(пример есть в конце того же файла).

```bash
sudo nginx -t && sudo systemctl reload nginx
```

> Префикс `/finance-auditor` **не обрезается**: приложение собрано с `basePath: "/finance-auditor"` и
> ожидает полный путь. Поэтому в `proxy_pass` нет завершающего слэша.

Откройте https://andrewha.tech/finance-auditor и зарегистрируйтесь.

## 3. Обновление

Для текущего VPS с 1 ГБ RAM и диском 10 ГБ используйте готовый образ по инструкции ниже:
сборка Next.js на самом сервере уже приводила к исчерпанию памяти и потере доступа по SSH.

### Обновление готовым образом для маломощного VPS

Соберите образ на ПК с Docker Desktop в режиме Linux-контейнеров или в CI. Для Windows выполните
из корня проекта в PowerShell (это локальные команды, не SSH-сессия):

```powershell
New-Item -ItemType Directory -Path data -Force | Out-Null
docker build --platform linux/amd64 -t finance-auditor:latest .
if ($LASTEXITCODE -ne 0) { throw "Сборка образа не завершилась" }
docker image save --output data/finance-update.tar finance-auditor:latest
if ($LASTEXITCODE -ne 0) { throw "Экспорт образа не завершился" }
scp data/finance-update.tar root@89.110.93.182:/opt/financial-solution/data/
```

Дождитесь успешного завершения передачи. Затем выполните на сервере:

```bash
cd /opt/financial-solution &&
docker compose exec -T finance-auditor node -e 'const db = require("better-sqlite3")("/app/data/finance.db"); db.backup("/app/data/backup-before-update-" + Date.now() + ".db").then(() => db.close()).catch(e => { console.error(e); process.exit(1); });' &&
docker load -i data/finance-update.tar &&
docker compose up -d --no-build --wait &&
docker compose ps
```

`docker load` также принимает сжатый gzip-архив: в этом случае укажите имя `.tar.gz`.
Для этой команды Compose нужен образ с тегом `finance-auditor:latest`, платформа сервера —
`linux/amd64` (`uname -m` возвращает `x86_64`). Флаг `--no-build` исключает повторную сборку на VPS.
Миграции из образа применятся автоматически. Сборочные инструменты для SQLite находятся только
в промежуточном этапе Dockerfile и не попадают в итоговый контейнер.

После подтверждения `healthy` и проверки приложения локальные архивы переноса и образ можно
удалить. В PowerShell из корня проекта:

```powershell
docker image rm finance-auditor:latest
if (Test-Path -LiteralPath data/finance-update.tar) {
  Remove-Item -LiteralPath data/finance-update.tar
}
if (Test-Path -LiteralPath data/finance-update.tar.gz) {
  Remove-Item -LiteralPath data/finance-update.tar.gz
}
```

Тестовые контейнеры запускайте с `--rm`: после остановки они удалятся автоматически.
Удаление локального образа и архивов не затрагивает работающий сервер. Для очистки кэша сборки
выбирайте только записи данного проекта; общая очистка Docker может затронуть другие проекты.

### Обновление со сборкой на сервере с достаточными ресурсами

Обычное обновление (без изменений в базе):

```bash
cd /opt/financial-solution
git pull
docker compose up -d --build
docker image prune -f            # необязательно: удалить старые образы
```

Если обновление содержит новую миграцию, перед запуском нового образа сделайте согласованную
копию базы через SQLite backup API. Это учитывает данные из WAL при работающем приложении:

```bash
cd /opt/financial-solution &&
git pull --ff-only origin main &&
docker compose build &&
docker compose exec -T finance-auditor node -e 'const db = require("better-sqlite3")("/app/data/finance.db"); db.backup("/app/data/backup-before-update-" + Date.now() + ".db").then(() => db.close()).catch(e => { console.error(e); process.exit(1); });' &&
docker compose up -d --no-build --wait
```

Новые миграции БД применятся автоматически. Сессии пользователей сохраняются: они лежат в той же БД.

## 4. Резервные копии

Все данные хранятся в одном файле `data/finance.db` (плюс служебные `-wal`/`-shm`, пока приложение работает).
Безопасная копия «на горячую»:

```bash
docker compose exec finance-auditor node -e "
  const db = require('better-sqlite3')('/app/data/finance.db');
  db.backup('/app/data/backup-' + new Date().toISOString().slice(0,10) + '.db').then(() => console.log('ok'));
"
```

Или просто остановите контейнер и скопируйте папку `data/`. Пример ежедневного бэкапа через cron
(`crontab -e`):

```cron
0 4 * * * cd /opt/financial-solution && docker compose exec -T finance-auditor node -e "require('better-sqlite3')('/app/data/finance.db').backup('/app/data/backup-'+new Date().toISOString().slice(0,10)+'.db')" && find /opt/financial-solution/data -name 'backup-*.db' -mtime +14 -delete
```

Восстановление: остановить контейнер → заменить `data/finance.db` копией → удалить
`finance.db-wal` и `finance.db-shm` → запустить.

## 5. Переменные окружения

| Переменная      | По умолчанию           | Назначение                                                    |
| --------------- | ---------------------- | ------------------------------------------------------------- |
| `DATABASE_PATH` | `/app/data/finance.db` | Путь к файлу SQLite внутри контейнера                         |
| `PORT`          | `3000`                 | Порт внутри контейнера                                        |
| `COOKIE_SECURE` | `true` (в production)  | `false` — разрешить cookie без HTTPS (только для отладки)     |

## 6. Частые проблемы

- **После входа снова открывается страница логина.** Сайт открыт по HTTP, а cookie помечена `Secure`.
  Откройте по HTTPS (или временно выставьте `COOKIE_SECURE=false`).
- **`SQLITE_CANTOPEN` / `attempt to write a readonly database`.** У папки `data/` неверный владелец:
  `sudo chown -R 1001:1001 data`.
- **404 на стилях и скриптах.** Проверьте, что в `proxy_pass` нет завершающего `/` и префикс не обрезается.
- **Сменили путь `/finance-auditor`.** Поменяйте `BASE_PATH` в `next.config.ts`, пересоберите образ и
  обновите конфиг Nginx: base path вшивается в сборку.

## Локальная разработка

```bash
npm install
cp .env.example .env
npm run dev                # http://localhost:3000/finance-auditor
```

Полезные команды: `npm run lint`, `npm run typecheck`, `npm run format`,
`npm run db:generate` (новая миграция после правки `src/db/schema.ts`), `npm run db:studio`.
