# Деплой Finance Auditor

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

## 1. Первый запуск

```bash
git clone <url-репозитория> /opt/finance-auditor
cd /opt/finance-auditor

mkdir -p data
sudo chown 1001:1001 data        # в контейнере приложение работает от пользователя с uid 1001

docker compose up -d --build
docker compose logs -f           # ждём строку «Ready»
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

Обычное обновление (без изменений в базе):

```bash
cd /opt/finance-auditor
git pull
docker compose up -d --build
docker image prune -f            # необязательно: удалить старые образы
```

Если обновление содержит новую миграцию (файл в `drizzle/`, меняющий данные), сначала сделайте копию базы.
База работает в режиме WAL, поэтому копировать файл нужно при остановленном контейнере:

```bash
cd /opt/finance-auditor
git pull
docker compose stop
cp data/finance.db data/finance.db.bak-$(date +%F-%H%M)
docker compose up -d --build
docker image prune -f            # необязательно
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
0 4 * * * cd /opt/finance-auditor && docker compose exec -T finance-auditor node -e "require('better-sqlite3')('/app/data/finance.db').backup('/app/data/backup-'+new Date().toISOString().slice(0,10)+'.db')" && find /opt/finance-auditor/data -name 'backup-*.db' -mtime +14 -delete
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
