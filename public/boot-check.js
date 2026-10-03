// Сторож запуска. Если React-приложение не запустилось за 10 секунд (не загрузились скрипты,
// синтаксическая ошибка, падение до гидрации), показываем текст пойманных ошибок вместо пустого
// экрана — его можно сфотографировать и прислать разработчику.
// Дополнительно отправляет короткий диагностический отчёт на сервер (смотреть: docker logs).
(function () {
  var REPORT_URL = "/finance-auditor/api/diag";
  var pageId = Math.random().toString(36).slice(2, 8);
  var errors = [];
  function add(message) {
    if (errors.length < 10) errors.push(String(message).slice(0, 500));
  }

  window.addEventListener(
    "error",
    function (e) {
      var target = e.target;
      if (target && target !== window && (target.src || target.href)) {
        add("Не загрузился ресурс: " + (target.src || target.href));
        return;
      }
      var where = e.filename ? " @ " + e.filename.split("/").pop() + ":" + e.lineno : "";
      add((e.message || "Ошибка") + where);
    },
    true,
  );
  window.addEventListener("unhandledrejection", function (e) {
    var reason = e.reason;
    add("Promise: " + ((reason && (reason.stack || reason.message)) || reason));
  });

  function describe(el) {
    if (!el) return null;
    var cls = typeof el.className === "string" ? el.className.slice(0, 80) : "";
    return el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + (cls ? "." + cls : "");
  }

  function report(stage) {
    try {
      var body = document.body;
      var bodyStyle = body ? getComputedStyle(body) : null;
      var main = document.querySelector("main");
      var rect = main ? main.getBoundingClientRect() : null;
      var resources = (performance.getEntriesByType ? performance.getEntriesByType("resource") : [])
        .filter(function (r) { return r.name.indexOf("/_next/static/") !== -1; })
        .map(function (r) {
          return r.name.split("/").pop() + " " + Math.round(r.duration) + "ms " +
            (r.responseStatus || "?") + " " + (r.transferSize || 0) + "b";
        });
      var data = {
        stage: stage,
        page: pageId,
        url: location.pathname + location.search,
        ua: navigator.userAgent,
        hydrated: !!window.__faHydrated,
        readyState: document.readyState,
        errors: errors,
        viewport: innerWidth + "x" + innerHeight + "@" + (window.devicePixelRatio || 1),
        htmlClass: document.documentElement.className.slice(0, 120),
        bodyBg: bodyStyle && bodyStyle.backgroundColor,
        bodyColor: bodyStyle && bodyStyle.color,
        textLength: body ? (body.innerText || "").trim().length : -1,
        textSample: body ? (body.innerText || "").trim().slice(0, 120) : "",
        main: rect ? Math.round(rect.width) + "x" + Math.round(rect.height) + " opacity=" + getComputedStyle(main).opacity + " visibility=" + getComputedStyle(main).visibility : null,
        center: describe(document.elementFromPoint(innerWidth / 2, innerHeight / 2)),
        sw: "serviceWorker" in navigator ? (navigator.serviceWorker.controller ? "active" : "none") : "unsupported",
        cookies: navigator.cookieEnabled,
        resources: resources.slice(0, 30),
      };
      var json = JSON.stringify(data);
      if (!(navigator.sendBeacon && navigator.sendBeacon(REPORT_URL, json))) {
        fetch(REPORT_URL, { method: "POST", body: json, keepalive: true }).catch(function () {});
      }
    } catch (e) {
      try {
        navigator.sendBeacon(REPORT_URL, JSON.stringify({ stage: stage + ":failed", page: pageId, error: String(e) }));
      } catch (ignored) {
        void ignored;
      }
    }
  }

  // Сигнал «скрипт выполнился» и полный отчёт после загрузки и через 10 секунд.
  report("start");
  window.addEventListener("load", function () { setTimeout(function () { report("load"); }, 500); });

  function resetAndReload() {
    var tasks = [];
    if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
      tasks.push(
        navigator.serviceWorker.getRegistrations().then(function (list) {
          return Promise.all(list.map(function (r) { return r.unregister(); }));
        }),
      );
    }
    if (window.caches) {
      tasks.push(
        caches.keys().then(function (keys) {
          return Promise.all(keys.map(function (k) { return caches.delete(k); }));
        }),
      );
    }
    Promise.all(tasks).then(
      function () { location.reload(); },
      function () { location.reload(); },
    );
  }

  setTimeout(function () {
    report("10s");
    if (window.__faHydrated) return;
    var box = document.createElement("div");
    box.setAttribute(
      "style",
      "position:fixed;inset:0;z-index:2147483647;overflow:auto;padding:24px;" +
        "background:#fff;color:#1f1724;font:15px/1.45 system-ui,-apple-system,sans-serif",
    );
    var title = document.createElement("h1");
    title.textContent = "Приложение не запустилось";
    title.setAttribute("style", "font-size:20px;margin:0 0 8px");
    var hint = document.createElement("p");
    hint.textContent =
      "Пришли скриншот этого экрана разработчику. Можно попробовать сбросить кэш приложения.";
    hint.setAttribute("style", "margin:0 0 16px;opacity:.7");
    var pre = document.createElement("pre");
    pre.setAttribute(
      "style",
      "white-space:pre-wrap;word-break:break-word;font-size:12px;background:#f4ecf8;" +
        "border-radius:10px;padding:12px;margin:0 0 16px",
    );
    pre.textContent =
      (errors.length ? errors.join("\n\n") : "Ошибок не поймано (скрипты не выполнились).") +
      "\n\n" + navigator.userAgent +
      "\nSW: " + ("serviceWorker" in navigator ? (navigator.serviceWorker.controller ? "активен" : "нет") : "не поддерживается") +
      "\nCookies: " + (navigator.cookieEnabled ? "да" : "нет");
    var button = document.createElement("button");
    button.textContent = "Сбросить кэш и перезагрузить";
    button.setAttribute(
      "style",
      "font:inherit;border:0;border-radius:10px;padding:10px 16px;background:#d9bce6;color:#3b1f47",
    );
    button.onclick = resetAndReload;
    box.appendChild(title);
    box.appendChild(hint);
    box.appendChild(pre);
    box.appendChild(button);
    document.body.appendChild(box);
  }, 10000);
})();
