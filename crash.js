// === Хуки ====
// === WebSocket ====

(() => {
    if (window.__MEP_WS_HOOKED__) return;
    window.__MEP_WS_HOOKED__ = true;

    const NativeWS = window.WebSocket;

    // куда складываем "последнее известное"
    window.MEP = window.MEP || {};
    window.MEP.WS = window.MEP.WS || {
        sockets: [],
        last: {
            subId: null, // "id" верхнего уровня (обычно постоянный)
            roundLikeId: null, // crashMultiplier.id (меняется по раундам)
            multiplier: null,
            elapsed: null,
            ts: null,
        },
        // быстро включать/выключать лог
        debug: false,
    };

    // Склейка roundLikeId так, чтобы в БД улетал ID ЗАВЕРШИВШЕЙСЯ игры,
    // даже если в момент записи wsLast.roundLikeId уже переключился на следующий.
    window.MEP.WSLink = window.MEP.WSLink || {
        curId: null,
        lastEndedId: null,
        lastEndedAt: 0,

        noteTick(roundLikeId) {
            const id = roundLikeId ?? null;
            const isZero = id === 0 || id === "0";

            // стартовое заполнение
            if (this.curId == null) {
                if (!isZero && id) this.curId = id;
                return;
            }

            // "0" = граница (сигнал смены ID)
            if (isZero) {
                this.lastEndedId = this.curId;
                this.lastEndedAt = Date.now();
                this.curId = null;
                return;
            }

            // после "0" пришёл новый id => старт следующей игры
            if (this.curId == null && id) {
                this.curId = id;
                return;
            }

            // на всякий: если смена произошла без "0"
            if (id && this.curId && id !== this.curId) {
                this.lastEndedId = this.curId;
                this.lastEndedAt = Date.now();
                this.curId = id;
            }
        },

        // event_key для записи: если недавно был lastEndedId — используем его (1 раз),
        // иначе берём текущий wsLast.roundLikeId (если он не 0).
        pickEventKey(wsLast) {
            const now = Date.now();
            const ended = this.lastEndedId;
            const endedFresh = ended && now - (this.lastEndedAt || 0) < 15000;

            if (endedFresh) {
                this.lastEndedId = null;
                this.lastEndedAt = 0;
                return ended;
            }

            const id = wsLast ? (wsLast.roundLikeId ?? null) : null;
            if (id === 0 || id === "0") return null;
            return id || null;
        },
    };

    function tryParseJSON(s) {
        if (typeof s !== "string") return null;
        if (!s || (s[0] !== "{" && s[0] !== "[")) return null;
        try {
            return JSON.parse(s);
        } catch {
            return null;
        }
    }

    function handleWSMessage(url, data) {
        const obj = tryParseJSON(data);
        if (!obj) return;

        // Фильтр: нам нужен именно поток "next" payload.data...
        // (оставляем максимально общий, но без шума)
        const payload = obj && obj.payload && obj.payload.data;
        if (!payload) return;

        // 1) Crash multiplier stream
        const cm = payload.crashMultiplier;
        if (cm && typeof cm === "object") {
            // ВАЖНО: obj.id часто постоянный (id подписки), а cm.id — меняется по раундам
            const state = window.MEP.WS.last;
            state.subId = obj.id ?? state.subId;
            state.roundLikeId = cm.id ?? state.roundLikeId;
            state.multiplier = cm.multiplier ?? state.multiplier;
            state.elapsed = cm.elapsed ?? state.elapsed;
            state.ts = Date.now();
            if (window.MEP && window.MEP.WSLink && typeof window.MEP.WSLink.noteTick === "function") {
                window.MEP.WSLink.noteTick(state.roundLikeId);
            }

            // Событие наружу (чтобы твой код спокойно подписался)
            window.dispatchEvent(
                new CustomEvent("MEP:crashMultiplier", {
                    detail: {
                        url,
                        subId: state.subId,
                        roundLikeId: state.roundLikeId,
                        multiplier: state.multiplier,
                        elapsed: state.elapsed,
                        raw: obj,
                    },
                })
            );

            if (window.MEP.WS.debug) {
                console.log("[MEP][WS cm]", {
                    url,
                    subId: state.subId,
                    roundLikeId: state.roundLikeId,
                    multiplier: state.multiplier,
                    elapsed: state.elapsed,
                });
            }
            return;
        }

        // 2) Если вдруг летит crashGame / ended / crashpoint — тоже ловим
        const cg = payload.crashGame;
        if (cg && typeof cg === "object") {
            window.dispatchEvent(
                new CustomEvent("MEP:crashGame", {
                    detail: { url, raw: obj, crashGame: cg },
                })
            );
            if (window.MEP.WS.debug) console.log("[MEP][WS crashGame]", cg);
            return;
        }
    }

    // Подмена конструктора WS
    window.WebSocket = function WebSocketHook(url, protocols) {
        const ws = protocols ? new NativeWS(url, protocols) : new NativeWS(url);

        try {
            ws.__mepUrl = url;
            window.MEP.WS.sockets.push(ws);
        } catch {}

        // Перехват addEventListener('message', ...)
        const nativeAdd = ws.addEventListener.bind(ws);
        ws.addEventListener = function (type, listener, options) {
            if (type === "message") {
                const wrapped = function (ev) {
                    try {
                        handleWSMessage(ws.__mepUrl || url, ev.data);
                    } catch {}
                    return listener.call(this, ev);
                };
                return nativeAdd(type, wrapped, options);
            }
            return nativeAdd(type, listener, options);
        };

        // Перехват onmessage =
        Object.defineProperty(ws, "onmessage", {
            configurable: true,
            get() {
                return ws.__mepOnMessage || null;
            },
            set(fn) {
                ws.__mepOnMessage = fn;
                return nativeAdd("message", function (ev) {
                    try {
                        handleWSMessage(ws.__mepUrl || url, ev.data);
                    } catch {}
                    if (typeof fn === "function") fn.call(ws, ev);
                });
            },
        });

        return ws;
    };

    // сохранить статические поля
    window.WebSocket.prototype = NativeWS.prototype;
    Object.setPrototypeOf(window.WebSocket, NativeWS);

    console.log("[MEP] WebSocket hook installed");
})();

// === MEP Control Panel + Crash Stats Tracker  ===

(() => {
    try {
        const MEP = (window.MEP = window.MEP || {});
        MEP.ver = "0.1.4.80";

        // -------------------------
        // Settings module
        // -------------------------
        MEP.Settings = {
            key: "mep_settings",

            state: {
                endpointUrl: "", // URL на твой PHP POST endpoint
                historySteps: 0,

                // Звуки: по одному на строку "key=url"
                soundsText: "",
                // Глобальный звук по умолчанию
                soundDefaultKey: "",

                // Время подсветки "HIT" (мс). Если звук играет дольше — будем мигать пока играет.
                hitFlashMs: 6000,

                // Пауза между страницами истории при нажатии "Далее" (мс)
                historyNextDelayMs: 1000,

                // Приоритет при одновременном срабатывании: "high" = больший X, "low" = меньший X
                priorityMode: "high",

                // Реестр игр (slug по одному в строке): crash, spribe-aviator, dice-game ...
                supportedGamesText: "",

                // Уникальный id устройства/браузера (для сохранения настроек в БД)
                deviceId: "",
            },

            load() {
                try {
                    const raw = localStorage.getItem(this.key);
                    if (!raw) return;

                    const data = JSON.parse(raw);
                    if (!data || typeof data !== "object") return;

                    if (typeof data.endpointUrl === "string") {
                        this.state.endpointUrl = data.endpointUrl.trim();
                    }

                    if (typeof data.historySteps === "number" && Number.isFinite(data.historySteps)) {
                        this.state.historySteps = Math.max(0, Math.floor(data.historySteps));
                    }

                    if (typeof data.soundsText === "string") {
                        this.state.soundsText = data.soundsText;
                    }

                    if (typeof data.soundDefaultKey === "string") {
                        this.state.soundDefaultKey = data.soundDefaultKey.trim();
                    }

                    if (typeof data.hitFlashMs === "number" && Number.isFinite(data.hitFlashMs)) {
                        this.state.hitFlashMs = Math.max(500, Math.floor(data.hitFlashMs));
                    }

                    if (typeof data.historyNextDelayMs === "number" && Number.isFinite(data.historyNextDelayMs)) {
                        this.state.historyNextDelayMs = Math.max(0, Math.floor(data.historyNextDelayMs));
                    }

                    if (typeof data.priorityMode === "string") {
                        const m = data.priorityMode.trim().toLowerCase();
                        this.state.priorityMode = m === "low" ? "low" : "high";
                    }

                    if (typeof data.supportedGamesText === "string") {
                        this.state.supportedGamesText = data.supportedGamesText;
                    }
                } catch (e) {}
            },

            save() {
                try {
                    localStorage.setItem(this.key, JSON.stringify(this.state));
                } catch (e) {}
            },

            setSoundsText(txt) {
                this.state.soundsText = (txt ?? "").toString();
                this.save();
            },

            getSoundsText() {
                return (this.state.soundsText ?? "").toString();
            },

            setSoundDefaultKey(k) {
                this.state.soundDefaultKey = (k ?? "").toString().trim();
                this.save();
            },

            getSoundDefaultKey() {
                return (this.state.soundDefaultKey ?? "").toString().trim();
            },

            setHitFlashMs(ms) {
                let v = Math.floor(Number(ms) || 0);
                if (!Number.isFinite(v) || v < 500) v = 500;
                this.state.hitFlashMs = v;
                this.save();
            },

            getHitFlashMs() {
                const v = Math.floor(Number(this.state.hitFlashMs) || 0);
                return Number.isFinite(v) && v >= 500 ? v : 6000;
            },

            setPriorityMode(mode) {
                const m = (mode ?? "").toString().trim().toLowerCase();
                this.state.priorityMode = m === "low" ? "low" : "high";
                this.save();
            },

            getPriorityMode() {
                const m = (this.state.priorityMode ?? "").toString().trim().toLowerCase();
                return m === "low" ? "low" : "high";
            },

            setHistoryNextDelayMs(ms) {
                const v = Math.max(0, Math.floor(Number(ms) || 0));
                this.state.historyNextDelayMs = v;
                this.save();
            },

            getHistoryNextDelayMs() {
                return Math.max(0, Math.floor(Number(this.state.historyNextDelayMs) || 0));
            },

            setSupportedGamesText(txt) {
                this.state.supportedGamesText = (txt ?? "").toString();
                this.save();
            },
            getSupportedGamesText() {
                return (this.state.supportedGamesText ?? "").toString();
            },

            getDeviceId() {
                // 1) если уже есть в state — ок
                let id = (this.state.deviceId ?? "").toString().trim();
                if (id) return id;

                // 2) пробуем отдельный ключ, чтобы переживал любые изменения state
                try {
                    const stored = (localStorage.getItem("mep_device_id") ?? "").toString().trim();
                    if (stored) {
                        this.state.deviceId = stored;
                        this.save();
                        return stored;
                    }
                } catch (e) {}

                // 3) генерим
                id = "dev_" + Math.random().toString(16).slice(2) + "_" + Date.now().toString(16);
                try {
                    localStorage.setItem("mep_device_id", id);
                } catch (e) {}

                this.state.deviceId = id;
                this.save();
                return id;
            },

            async syncToDb(reason = "settings_save") {
                const url = (this.getEndpoint?.() ?? "").toString().trim();
                if (!url) return;

                // если сетевой модуль не готов — тихо выходим
                if (!MEP.Net?.postJson) return;

                const payload = {
                    action: "settings_save",
                    ts: Date.now(),
                    ver: MEP.ver,
                    reason: (reason ?? "").toString(),
                    game_slug: (MEP.State?.gameSlug ?? "").toString(),
                    game_name: (MEP.State?.gameName ?? "").toString(),
                    device_id: this.getDeviceId(),
                    settings: this.state,
                };

                // не блокируем UI: ошибки только в консоль
                try {
                    const resp = await MEP.Net.postJson(url, payload, 9000);
                    if (!(resp?.ok && resp?.json?.ok === true)) {
                        console.warn("[MEP] settings_save not ok:", resp);
                    }
                } catch (e) {
                    console.warn("[MEP] settings_save failed:", e);
                }
            },

            async loadFromDb(reason = "settings_get") {
                const url = (this.getEndpoint?.() ?? "").toString().trim();
                if (!url) return null;

                if (!MEP.Net?.postJson) return null;

                const payload = {
                    action: "settings_get",
                    ts: Date.now(),
                    ver: MEP.ver,
                    reason: (reason ?? "").toString(),
                    game_slug: (MEP.State?.gameSlug ?? "").toString(),
                    game_name: (MEP.State?.gameName ?? "").toString(),
                    device_id: this.getDeviceId(),
                };

                try {
                    const resp = await MEP.Net.postJson(url, payload, 9000);
                    if (!(resp?.ok && resp?.json?.ok === true)) {
                        console.warn("[MEP] settings_get not ok:", resp);
                        return null;
                    }

                    const st = resp?.json?.settings;
                    if (!st || typeof st !== "object") return null;

                    // мягко мерджим (чтобы не потерять новые поля)
                    this.state = { ...(this.state || {}), ...st };
                    this.save();
                    return st;
                } catch (e) {
                    console.warn("[MEP] settings_get failed:", e);
                    return null;
                }
            },

            // slug'и по одному в строке -> массив уникальных
            parseSupportedGames() {
                const raw = (this.state.supportedGamesText ?? "").toString();
                const lines = raw
                    .split(/\r?\n/)
                    .map((s) => (s || "").trim().toLowerCase())
                    .filter(Boolean);
                const out = [];
                const seen = new Set();
                for (const s of lines) {
                    const slug = s.replace(/^\/+|\/+$/g, "").trim();
                    if (!slug) continue;
                    if (seen.has(slug)) continue;
                    seen.add(slug);
                    out.push(slug);
                }
                return out;
            },

            // Парсим "key=url" по строкам
            parseSounds() {
                const text = this.getSoundsText();
                const map = {};
                const lines = text.split(/\r?\n/);
                for (const line of lines) {
                    const s = (line || "").trim();
                    if (!s) continue;
                    if (s.startsWith("#")) continue;

                    const idx = s.indexOf("=");
                    if (idx <= 0) continue;

                    const key = s.slice(0, idx).trim();
                    const url = s.slice(idx + 1).trim();
                    if (!key || !url) continue;

                    map[key] = url;
                }
                return map;
            },

            // 👉 ВОТ СЮДА 👇
            setHistorySteps(n) {
                const v = Math.max(0, Math.floor(Number(n) || 0));
                this.state.historySteps = v;
                this.save();
            },

            getHistorySteps() {
                return Math.max(0, Math.floor(Number(this.state.historySteps) || 0));
            },

            setEndpoint(url) {
                this.state.endpointUrl = (url ?? "").toString().trim();
                this.save();
            },

            getEndpoint() {
                return (this.state.endpointUrl ?? "").toString().trim();
            },
        };

        // -------------------------
        // Storage module (cookies)
        // -------------------------
        MEP.Storage = {
            key: "mep_tracking",

            _cookieSet(value) {
                // cookie + современные атрибуты
                // domain ставим на текущий хост (и дополнительно пробуем .stake.com, если подходит)
                const base = `${this.key}=${value}; path=/; max-age=31536000; SameSite=Lax; Secure`;

                document.cookie = base;

                // если мы на stake.com / поддомене — попробуем закрепить доменом
                const host = location.hostname;
                if (host.endsWith("stake.com")) {
                    document.cookie = `${base}; domain=.stake.com`;
                }
            },

            _cookieGet() {
                const m = document.cookie.match(new RegExp(`(?:^|; )${this.key}=([^;]*)`));
                return m ? m[1] : null;
            },

            save() {
                const data = {
                    trackCount: MEP.State.trackCount,
                    track: MEP.State.track,
                    graphMax: MEP.State.graphMax,
                    graphDensity: MEP.State.graphDensity,
                    graphLine: MEP.State.graphLine,

                    diffDensity: MEP.State.diffDensity,
                    diffDensityManual: MEP.State.diffDensityManual,
                    diffDensitySync: MEP.State.diffDensitySync,

                    diffPosLevel: MEP.State.diffPosLevel,
                    diffNegLevel: MEP.State.diffNegLevel,
                };

                const str = JSON.stringify(data);

                // 1) localStorage (гарантированно)
                try {
                    localStorage.setItem(this.key, str);
                } catch (e) {}

                // 2) cookie (как ты просил)
                try {
                    const value = encodeURIComponent(str);
                    this._cookieSet(value);
                } catch (e) {}
            },

            load() {
                // 1) пробуем localStorage
                try {
                    const rawLS = localStorage.getItem(this.key);
                    if (rawLS) {
                        const data = JSON.parse(rawLS);
                        if (typeof data.trackCount === "number") MEP.State.trackCount = data.trackCount;
                        if (data.track && typeof data.track === "object") MEP.State.track = data.track;
                        if (typeof data.graphMax === "number") MEP.State.graphMax = data.graphMax;
                        if (typeof data.graphDensity === "number") MEP.State.graphDensity = data.graphDensity;
                        if (typeof data.graphLine === "number") MEP.State.graphLine = data.graphLine;

                        if (typeof data.diffDensity === "number") MEP.State.diffDensity = data.diffDensity;
                        if (typeof data.diffDensityManual === "number") MEP.State.diffDensityManual = data.diffDensityManual;
                        if (typeof data.diffDensitySync === "boolean") MEP.State.diffDensitySync = data.diffDensitySync;

                        if (typeof data.diffPosLevel === "number") MEP.State.diffPosLevel = data.diffPosLevel;
                        if (typeof data.diffNegLevel === "number") MEP.State.diffNegLevel = data.diffNegLevel;

                        return true;
                    }
                } catch (e) {}

                // 2) пробуем cookie
                try {
                    const rawC = this._cookieGet();
                    if (!rawC) return false;

                    const data = JSON.parse(decodeURIComponent(rawC));
                    if (typeof data.trackCount === "number") MEP.State.trackCount = data.trackCount;
                    if (data.track && typeof data.track === "object") MEP.State.track = data.track;
                    if (typeof data.graphMax === "number") MEP.State.graphMax = data.graphMax;
                    if (typeof data.graphDensity === "number") MEP.State.graphDensity = data.graphDensity;
                    if (typeof data.graphLine === "number") MEP.State.graphLine = data.graphLine;

                    if (typeof data.diffDensity === "number") MEP.State.diffDensity = data.diffDensity;
                    if (typeof data.diffDensityManual === "number") MEP.State.diffDensityManual = data.diffDensityManual;
                    if (typeof data.diffDensitySync === "boolean") MEP.State.diffDensitySync = data.diffDensitySync;

                    if (typeof data.diffPosLevel === "number") MEP.State.diffPosLevel = data.diffPosLevel;
                    if (typeof data.diffNegLevel === "number") MEP.State.diffNegLevel = data.diffNegLevel;

                    return true;
                } catch (e) {
                    return false;
                }
            },

            // удобно для проверки в консоли
            debug() {
                console.log("[MEP.Storage] cookie:", this._cookieGet());
                console.log("[MEP.Storage] localStorage:", localStorage.getItem(this.key));
            },
        };

        // -------------------------
        // HistoryLoader module
        // -------------------------
        MEP.HistoryLoader = {
            pauseAfterOpenMs: 600,
            pauseAfterNextMs: 1000,

            // кнопка открытия истории (ты дал)
            async openHistory() {
                document.querySelector("#main-content div.side-btns button")?.click();

                // Пауза после открытия
                await MEP.Utils.sleep(this.pauseAfterOpenMs);

                // ждём появления модалки/таблицы (класс может меняться)
                const t0 = Date.now();
                while (Date.now() - t0 < 5000) {
                    if (document.querySelector('[data-testid="game-modal-close"]')) break;
                    if (document.querySelector(".wrapper tbody tr")) break;
                    await MEP.Utils.sleep(120);
                }
            },

            getModalRoot() {
                const h3 = [...document.querySelectorAll("h3")].find((x) =>
                    (x.textContent || "").includes("История результатов Crash")
                );
                if (h3) return h3.closest(".wrapper");

                const closeBtn = document.querySelector('[data-testid="game-modal-close"]');
                return closeBtn ? closeBtn.closest(".wrapper") : null;
            },

            getCloseBtn(modal) {
                return modal?.querySelector('[data-testid="game-modal-close"]');
            },

            getNextBtn(modal) {
                return modal?.querySelector('[data-testid="pagination-next"]');
            },

            readRows(modal) {
                const rows = [...(modal?.querySelectorAll("tbody tr") || [])];
                const out = [];

                for (const tr of rows) {
                    const tds = tr.querySelectorAll("td");
                    if (tds.length < 2) continue;

                    const timeCell = tds[0];
                    const coefCell = tds[1];

                    const timeText = (timeCell.textContent || "").replace(/\s+/g, " ").trim();

                    const raw = (coefCell.textContent || "").replace(/\s+/g, " ").trim();
                    if (!raw) continue;

                    const { clean } = MEP.Utils.parseMultiplier(raw); // "1,64" без ×
                    const key = `${timeText}__${raw}`;

                    out.push({ key, clean, raw, timeText });
                }

                return out;
            },

            async waitForTableChange(modal, prevSignature, timeoutMs = 3000) {
                const t0 = Date.now();
                while (Date.now() - t0 < timeoutMs) {
                    const sig = modal?.querySelector("tbody")?.textContent?.slice(0, 200) || "";
                    if (sig && sig !== prevSignature) return true;
                    await MEP.Utils.sleep(120);
                }
                return false;
            },

            async loadFromModal() {
                const ui = MEP.UI.ui;
                if (!ui) return;

                // toggle flags
                MEP.State.historyLoading = true;
                MEP.State.historyAbort = false;

                let nextClicks = 0;
                MEP.UI.setHistoryLoading(true, nextClicks);

                try {
                    // стопаем трекер на время загрузки (чтобы не мешал)
                    try {
                        MEP.Tracker.stop();
                    } catch (e) {}

                    // очистка нашей истории
                    MEP.State.list.length = 0;
                    MEP.State.map.clear();
                    MEP.State.lastAddedKey = "";

                    MEP.UI.render();

                    // если юзер успел нажать "стоп" мгновенно
                    if (MEP.State.historyAbort) return;

                    // открыть модалку + подождать
                    await this.openHistory();

                    // ждём появления root модалки
                    let modal = null;
                    const t0 = Date.now();
                    while (Date.now() - t0 < 4000) {
                        if (MEP.State.historyAbort) return;

                        modal = this.getModalRoot();
                        if (modal) break;
                        await MEP.Utils.sleep(120);
                    }

                    if (!modal) {
                        console.warn("[MEP.History] modal not found");
                        try {
                            MEP.Tracker.start();
                        } catch (e) {}
                        return;
                    }

                    // ждём появления строк (иногда модалка открывается мгновенно, а таблица дорисовывается позже)
                    const tRows0 = Date.now();
                    while (Date.now() - tRows0 < 4000) {
                        if (MEP.State.historyAbort) return;
                        const cnt = modal?.querySelectorAll("tbody tr")?.length || 0;
                        if (cnt > 0) break;
                        await MEP.Utils.sleep(120);
                    }

                    const seen = new Set();

                    // собираем текущую страницу (без reverse, просто копим)
                    const pushPage = () => {
                        const rows = this.readRows(modal);
                        for (const r of rows) {
                            if (seen.has(r.key)) continue;
                            seen.add(r.key);
                            MEP.State.list.push(r.clean);
                        }
                        MEP.UI.render();
                    };

                    // 1) первая страница
                    if (MEP.State.historyAbort) return;
                    pushPage();

                    // 2) сколько раз жать "Вперёд"
                    let steps = parseInt(ui.historySteps?.value || "0", 10);
                    if (!Number.isFinite(steps) || steps < 0) steps = 0;
                    const clickUntilDisabled = steps === 0;

                    let guard = 0;
                    while (guard++ < 200) {
                        if (MEP.State.historyAbort) break;

                        const nextBtn = this.getNextBtn(modal);
                        if (!nextBtn || nextBtn.disabled) break;

                        if (!clickUntilDisabled && steps <= 0) break;

                        const prevSig = modal.querySelector("tbody")?.textContent?.slice(0, 200) || "";

                        nextBtn.click();

                        // прогресс (кол-во нажатий "Вперёд")
                        nextClicks += 1;
                        MEP.UI.setHistoryProgress(nextClicks);

                        // Пауза после "Вперёд" (настраиваемая)
                        await MEP.Utils.sleep(MEP.Settings.getHistoryNextDelayMs());

                        if (MEP.State.historyAbort) break;

                        // ждём обновления таблицы
                        await this.waitForTableChange(modal, prevSig, 3500);

                        if (MEP.State.historyAbort) break;

                        // собираем страницу
                        pushPage();

                        if (!clickUntilDisabled) steps--;
                    }

                    // закрыть модалку (даже если aborted)
                    this.getCloseBtn(modal)?.click();

                    // перезапустить трекер
                    try {
                        MEP.Tracker.start();
                    } catch (e) {}

                    console.log("[MEP.History] loaded items:", MEP.State.list.length);
                } finally {
                    // сброс флагов и вернуть кнопку
                    MEP.State.historyLoading = false;
                    MEP.State.historyAbort = false;
                    MEP.UI.setHistoryLoading(false);
                }
            },
        };

        // -------------------------
        // Config module
        // -------------------------
        MEP.Config = {
            PANEL_ID: "mep-control-panel",
            STYLE_ID: "mep-control-style-min",
            SELECTORS: ["#main-content div.past-bets", "#main-content div.past-bets.svelte-3cv27h"],

            // реестр поддерживаемых игр (slug из URL /casino/games/<slug>)
            SUPPORTED_GAMES: ["crash"],

            MAX_ITEMS_DEFAULT: 0,
            TRACK_DEFAULT: { t1: 1.5, t2: 2.0, t3: 3.1 },
        };

        // -------------------------
        // Style module
        // -------------------------
        MEP.Style = {
            injectMinCss() {
                const { PANEL_ID, STYLE_ID } = MEP.Config;
                document.getElementById(STYLE_ID)?.remove();
                const style = document.createElement("style");
                style.id = STYLE_ID;
                style.textContent = `
				#${PANEL_ID}{
				position:fixed; top:0; right:0; height:100vh; width:400px;
				z-index:2147483647;
				background: rgba(16,22,30,0.92);
				border-left:1px solid rgba(255,255,255,0.08);
				box-shadow:-10px 0 30px rgba(0,0,0,0.35);
				color:#fff;
				font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
				display:flex; flex-direction:column;
				pointer-events:auto;
				backdrop-filter: blur(8px);
				}
				#${PANEL_ID} .mep-header{
				height:56px; display:flex; align-items:center; justify-content:space-between;
				padding:0 12px 0 14px;
				background: rgba(255,255,255,0.06);
				border-bottom:1px solid rgba(255,255,255,0.08);
				user-select:none;
				}
				#${PANEL_ID} .mep-title{ font-size:13px; font-weight:300; opacity:.95; }
				#${PANEL_ID} .mep-title b{ font-weight:700; }
				#${PANEL_ID} .mep-close{
				width:32px; height:32px; border-radius:10px;
				border:1px solid rgba(255,255,255,0.10);
				background: rgba(255,255,255,0.06);
				color:#fff; cursor:pointer; font-size:18px; line-height:1;
				}
				#${PANEL_ID} .mep-body{ flex:1 1 auto; padding:12px; overflow:auto; }
				#${PANEL_ID} .mep-block-title{ font-size:13px; font-weight:300; margin:4px 0 8px; }

				/* === Unsupported game mode (hide everything except message) === */
				#${PANEL_ID}.mep-unsupported .mep-diff-wrap,
				#${PANEL_ID}.mep-unsupported .mep-two-stat-wrap,
				#${PANEL_ID}.mep-unsupported .mep-graph-wrap,
				#${PANEL_ID}.mep-unsupported .mep-modal-overlay{
				display:none !important;
				}
				#${PANEL_ID}.mep-unsupported .mep-unsupported-msg{
				display:block !important;
				}
				#${PANEL_ID} textarea.mep-stats{
				width:100%; height:100px; resize:none; overflow:auto; box-sizing:border-box;
				border-radius:12px; border:1px solid rgba(255,255,255,0.10);
				background: rgba(255,255,255,0.06); color:#fff;
				padding:10px; font-size:13px; line-height:1.35; outline:none; white-space:pre;
				}
				#${PANEL_ID} .mep-actions{ margin-top:10px; }
				#${PANEL_ID} button.mep-copy,
				#${PANEL_ID} button.mep-send-db{
				width:100%; height:40px; border-radius:12px;
				border:1px solid rgba(255,255,255,0.10);
				background: rgba(255,255,255,0.08);
				color:#fff; cursor:pointer; font-weight:300;
				}
				#${PANEL_ID} .mep-divider{
				height:1px; background: rgba(255,255,255,0.08); margin:14px 0;
				}

				/* === Diff graph (Δ) === */
				#${PANEL_ID} .mep-diff-wrap{
				margin: 12px;
				border: 1px dashed rgba(255,255,255,0.22);
				border-radius: unset;
				padding: 12px;
				background: rgba(255,255,255,0.03);
				margin-bottom: 0px;
				padding-bottom: 0px;
				padding-top: 3px;
				}
				#${PANEL_ID} .mep-diff-box{
				width:100%;
				height:120px;
				border-radius:12px;
				border:1px solid rgba(255,255,255,0.10);
				background: rgba(0,0,0,0.18);
				overflow:hidden;
				box-sizing:border-box;
				}
				#${PANEL_ID} svg.mep-diff{
				width:100%;
				height:100%;
				display:block;
				}

				#${PANEL_ID} .mep-diff-lenrow{
				display: flex;
				justify-content: space-between;
				align-items: center;
				margin: 0 0 -2px 0;
				background-color: #04325b73;
				flex-direction: row-reverse;
				}

				#${PANEL_ID} .mep-diff-lvlwrap{
				display:flex;
				align-items:center;
				gap:6px;
				margin-left: 10px;
				}

				#${PANEL_ID} .mep-diff-lvl-sign{
				font-size: 13px;
				font-weight: 300;
				opacity: 0.9;
				font-variant-numeric: tabular-nums;
				}

				#${PANEL_ID} input.mep-diff-lvl-pos,
				#${PANEL_ID} input.mep-diff-lvl-neg{
				width: 46px;
				height: 24px;
				border-radius: 8px;
				border: 1px solid rgba(255,255,255,0.12);
				background: rgba(255,255,255,0.06);
				color:#fff;
				padding: 0 8px;
				box-sizing: border-box;
				font-size: 13px;
				font-weight: 300;
				outline:none;
				}
				#${PANEL_ID} .mep-diff-maxrow{
				display:flex;
				justify-content:center;
				align-items:center;
				margin: 0 0 -2px 0;
				}
				#${PANEL_ID} .mep-diff-minrow{
				display:flex;
				justify-content:center;
				align-items:center;
				margin: -2px 0 0 0;
				}
				#${PANEL_ID} .mep-diff-len,
				#${PANEL_ID} .mep-diff-max,
				#${PANEL_ID} .mep-diff-min{
				font-size: 13px;
				font-weight: 300;
				opacity: 0.92;
				font-variant-numeric: tabular-nums;
				}

				/* === >=2 / <2 stats bars === */
				#${PANEL_ID} .mep-two-stat-wrap{
				margin: 12px;
				border: 1px dashed rgba(255,255,255,0.22);
				border-radius: unset;
				padding: 12px;
				background: rgba(255,255,255,0.03);
				margin-bottom: 0px;
				}

				#${PANEL_ID} .mep-two-head{
				display:flex;
				flex-direction: column;
				align-items: stretch;
				gap: 8px;
				margin: 2px 0 10px;
				}

				#${PANEL_ID} .mep-two-topbar{
				display:flex;
				align-items:center;
				justify-content:space-between;
				gap:10px;
				}
				#${PANEL_ID} .mep-two-total{
				font-size: 18px;
				font-weight: 400;
				color: rgba(255,170,60,0.98);
				text-shadow: 0 0 10px rgba(255,170,60,0.18);
				letter-spacing: 0.2px;
				min-width: 40px;
				text-align: center;
				user-select:none;

				display:flex;
				align-items:center;
				justify-content:center;
				gap:8px;
				white-space:nowrap;
				}
				#${PANEL_ID} .mep-two-total-sep{
				opacity: 0.75;
				font-weight: 300;
				}
				#${PANEL_ID} .mep-two-diff{
				font-weight: 400;
				font-variant-numeric: tabular-nums;
				}
				#${PANEL_ID} .mep-two-diff.pos{ color: rgba(80,255,120,0.95); }
				#${PANEL_ID} .mep-two-diff.neg{ color: rgba(255,80,80,0.95); }
				#${PANEL_ID} .mep-two-diff.zero{ color: rgba(255,170,60,0.98); }

				#${PANEL_ID} .mep-two-head-left{
				display:flex;
				flex-direction: column;
				align-items:flex-start;
				gap:6px;
				font-size: 13px;
				font-weight: 300;
				opacity: 0.95;
				white-space: nowrap;
				}
				#${PANEL_ID} .mep-two-toprow{
				display:flex;
				align-items:center;
				gap:8px;
				}
				#${PANEL_ID} .mep-two-subrow{
				display:flex;
				align-items:center;
				gap:8px;
				}

				#${PANEL_ID} .mep-two-head-label{
				opacity: 0.9;
				font-size: 13px;
				width: 60px;
				}
				#${PANEL_ID} input.mep-two-lastn{
				width: 80px;
				border-radius: 10px;
				border: 1px solid rgba(255,255,255,0.10);
				background: rgba(255,255,255,0.06);
				color: #fff;
				padding: 0 10px;
				outline: none;
				box-sizing: border-box;
				font-size: 13px;
				}

				#${PANEL_ID} .mep-two-dens-label{
				opacity: 0.9;
				margin-left: 0px;
				font-size: 13px;
					width: 60px;
				}
				#${PANEL_ID} input.mep-diff-density{
				width: 80px;
				border-radius: 10px;
				border: 1px solid rgba(255,255,255,0.10);
				background: rgba(255,255,255,0.06);
				color: #fff;
				padding: 0 10px;
				outline: none;
				box-sizing: border-box;
				font-size: 13px;
				}

				#${PANEL_ID} .mep-diff-sync-label{
				display:inline-flex;
				align-items:center;
				gap:6px;
				margin-left: 6px;
				cursor:pointer;
				user-select:none;
				opacity: 0.95;
				}
				#${PANEL_ID} input.mep-diff-sync{
				width: 16px;
				height: 16px;
				cursor: pointer;
				-webkit-appearance: none;
				appearance: none;
				border-radius: 4px;
				border: 1px solid rgba(255,255,255,0.28);
				background: rgba(255,255,255,0.06);
				display: inline-grid;
				place-items: center;
				}
				#${PANEL_ID} input.mep-diff-sync:checked{
				background: rgba(255,255,255,0.22);
				border-color: rgba(255,255,255,0.45);
				}
				#${PANEL_ID} input.mep-diff-sync:checked::after{
				content: "✓";
				font-size: 12px;
				line-height: 1;
				color: rgba(255,255,255,0.92);
				font-weight: 400;
				}

				#${PANEL_ID} .mep-two-head-right{
				display:flex;
				align-items:center;
				gap:8px;
				font-size: 13px;
				font-weight: 300;
				opacity: 0.95;
				user-select:none;
				white-space: nowrap;
				cursor: pointer;
				}
				#${PANEL_ID} input.mep-two-all{
				width: 16px;
				height: 16px;
				cursor: pointer;
				-webkit-appearance: none;
				appearance: none;
				border-radius: 4px;
				border: 1px solid rgba(255,255,255,0.28);
				background: rgba(255,255,255,0.06);
				display: inline-grid;
				place-items: center;
				}
				#${PANEL_ID} input.mep-two-all:checked{
				background: rgba(255,255,255,0.22);
				border-color: rgba(255,255,255,0.45);
				}
				#${PANEL_ID} input.mep-two-all:checked::after{
				content: "✓";
				font-size: 12px;
				line-height: 1;
				color: rgba(255,255,255,0.92);
				font-weight: 400;
				}

				#${PANEL_ID} .mep-two-row{
				display:flex;
				align-items:center;
				gap:10px;
				margin: 8px 0;
				}
				#${PANEL_ID} .mep-two-left{
				width: 110px;
				font-size: 13px;
				font-weight: 300;
				opacity: 0.9;
				text-align: left;
				white-space: nowrap;

				/* 3 колонки: label(фикс) | (фикс) count(фикс) */
				display:grid;
				grid-template-columns: 42px 14px 46px;
				align-items:center;
				column-gap: 6px;

				/* чтобы число НЕ прилипало к графику */
				padding-right: 16px;
				box-sizing: border-box;
				}
				#${PANEL_ID} .mep-two-sep{
				display:inline-block;
				width: 14px;
				text-align:center;      /* слеш по центру */
				opacity: 0.95;
				font-variant-numeric: tabular-nums;
				}
				#${PANEL_ID} .mep-two-cnt{
				opacity: 0.95;
				min-width: 46px;

				/* ВАЖНО: теперь выравниваем по ЛЕВОМУ краю,
				   чтобы числа после слеша стояли на одной вертикали */
				text-align: left;
				padding-left: 6px;

				font-variant-numeric: tabular-nums;
				box-sizing: border-box;
				}
				#${PANEL_ID} .mep-two-bar{
				flex: 1 1 auto;
				height: 15px;
				border-radius: 8px;
				border: 1px solid rgb(255 157 0);
				overflow: hidden;
				background: rgba(255,255,255,0.05);
				}
				#${PANEL_ID} .mep-two-fill{
				height: 100%;
				width: 0%;
				background: rgba(190,170,40,0.95);
				transition: width 220ms ease;
				}
				#${PANEL_ID} .mep-two-right{
				width: 44px;
				font-size: 13px;
				font-weight: 300;
				opacity: 0.95;
				text-align: right;
				white-space: nowrap;
				}

				.mep-graph-head{
				display:flex; align-items:flex-start; justify-content:space-between;
				gap:10px;
				margin-bottom:8px;
				}
				.mep-graph-controls{
				display:flex;
				flex-direction: column;      /* как на втором скрине */
				align-items: flex-end;       /* прижать вправо */
				gap: 0px;
				}
				.mep-graph-label{
				display:flex;
				align-items:center;
				justify-content: space-between; /* текст слева, инпут справа */
				gap:10px;
				font-size:12px;
				width: 190px;                 /* фикс ширина колонки */
				white-space: nowrap;
				}
				.mep-graph-label input{
				width:40px;                   /* компактно как раньше */
				}
				.mep-graph-box{
				position:relative;
				height:190px;
				border-top:1px solid rgba(255,255,255,0.10);
				padding-top:10px;
				}
				.mep-graph{
				width:100%;
				height:170px;
				display:block;
				}
				.mep-graph-tip{
				position:absolute;
				left:10px;
				top:10px;
				max-width:240px;
				white-space:pre-line;
				font-size:12px;
				background: rgba(0,0,0,0.75);
				border:1px solid rgba(255,255,255,0.15);
				border-radius:10px;
				padding:6px 8px;
				pointer-events:none;
				}

				/* warn: порог-1 (мигаем медленно оранжевым) */
				.mep-warn{
				animation: mepWarnPulse 1600ms ease-in-out infinite;
				color: rgba(255,170,60,0.98);
				text-shadow: 0 0 10px rgba(255,170,60,0.28);
				}
				@keyframes mepWarnPulse{
				0%   { opacity: 1.00; }
				50%  { opacity: 0.35; }
				100% { opacity: 1.00; }
				}
				
				#mep-control-panel > div.mep-two-stat-wrap > div.mep-two-head > div.mep-two-subrow > label > span {
        font-size: 13px;
        }
        `;
                document.head.appendChild(style);
            },
        };

        // -------------------------
        // State module (храним данные)
        // -------------------------
        MEP.State = {
            // данные статистики
            map: MEP.map || new Map(),
            list: MEP.list || [], // newest-first, clean values
            maxItems: MEP.maxItems ?? MEP.Config.MAX_ITEMS_DEFAULT,
            graphMax: typeof MEP.graphMax === "number" ? MEP.graphMax : 10,
            graphDensity: typeof MEP.graphDensity === "number" ? MEP.graphDensity : 100,
            graphLine: typeof MEP.graphLine === "number" ? MEP.graphLine : 0,
            lastAddedKey: MEP._lastAddedKey || "",
            initialLoaded: MEP._initialLoaded || false,

            // отслеживание X
            // НОВАЯ модель: t1: { x, limit, sound }
            track: MEP.track || { ...MEP.Config.TRACK_DEFAULT },
            trackCount: MEP.trackCount ?? 3,

            // чтобы звук не "долбил" каждый рендер
            soundFired: MEP.soundFired || {},
            // чтобы warn (порог-1) играл 1 раз на раунд/строку
            warnFired: MEP.warnFired || {},

            // загрузка истории
            historySteps: MEP.historySteps ?? 0,
            historyLoading: false, // идёт ли загрузка истории
            historyAbort: false, // флаг остановки по повторному клику

            // Δ(<2 - >=2) history (oldest -> newest)
            diffHistory: MEP.diffHistory || [],
            diffFullHistory: MEP.diffFullHistory || [],

            // плотность второго графика (Diff)
            diffDensity: typeof MEP.diffDensity === "number" ? MEP.diffDensity : 81,
            diffDensityManual: typeof MEP.diffDensityManual === "number" ? MEP.diffDensityManual : 81,
            diffDensitySync: !!MEP.diffDensitySync,

            // уровни пунктирных линий (+ / -) на Diff-графике
            diffPosLevel: typeof MEP.diffPosLevel === "number" ? MEP.diffPosLevel : 0,
            diffNegLevel: typeof MEP.diffNegLevel === "number" ? MEP.diffNegLevel : 0,
        };

        // -------------------------
        // Utils module
        // -------------------------
        MEP.Utils = {
            normText(s) {
                return (s ?? "").toString().replace(/\s+/g, " ").trim();
            },

            parseMultiplier(txt) {
                const raw = MEP.Utils.normText(txt); // "1,63×" | "1 369×"
                const noSpaces = raw.replace(/\s+/g, ""); // "1369×"
                const cleanedDot = noSpaces.replace("×", "").replace(",", ".").trim(); // "1369" | "1.63"
                const num = Number.parseFloat(cleanedDot);
                const clean = cleanedDot.replace(".", ","); // "1369" | "1,63"
                return { raw, clean, num: Number.isFinite(num) ? num : null };
            },

            cleanToNum(cleanStr) {
                const s = MEP.Utils.normText(cleanStr).replace(/\s+/g, "").replace(",", ".");
                const n = Number.parseFloat(s);
                return Number.isFinite(n) ? n : null;
            },

            // streak: сколько последних значений подряд <= threshold
            countStreakLE(threshold) {
                const t = Number.parseFloat(String(threshold).replace(",", "."));
                if (!Number.isFinite(t)) return 0;

                let streak = 0;
                for (let i = 0; i < MEP.State.list.length; i++) {
                    const n = MEP.Utils.cleanToNum(MEP.State.list[i]);
                    if (n === null) break;
                    if (n <= t) streak++;
                    else break;
                }
                return streak;
            },

            sliceKey(entries) {
                return entries.map((e) => `${e.raw}|${e.status}`).join("||");
            },

            findRoot() {
                for (const sel of MEP.Config.SELECTORS) {
                    const el = document.querySelector(sel);
                    if (el) return el;
                }
                return null;
            },

            sleep(ms) {
                return new Promise((r) => setTimeout(r, ms));
            },

            // имя игры из URL: /ru/casino/games/<game>?...
            getGameName() {
                try {
                    const p = (location?.pathname || "").toString();
                    const m = p.match(/\/casino\/games\/([^\/?#]+)/i);
                    const slug = m && m[1] ? decodeURIComponent(m[1]) : "";
                    if (!slug) return "Game";

                    // crash -> Crash, dice-game -> Dice Game
                    const words = slug.replace(/[_-]+/g, " ").split(" ").filter(Boolean);
                    const title = words.map((w) => (w ? w[0].toUpperCase() + w.slice(1) : "")).join(" ");
                    return title || "Game";
                } catch (e) {
                    return "Game";
                }
            },

            // slug игры из URL: /ru/casino/games/<slug>?...
            getGameSlug() {
                try {
                    const p = (location?.pathname || "").toString();
                    const m = p.match(/\/casino\/games\/([^\/?#]+)/i);
                    const slug = m && m[1] ? decodeURIComponent(m[1]) : "";
                    return (slug || "").toString().trim().toLowerCase();
                } catch (e) {
                    return "";
                }
            },
        };

        // -------------------------
        // Net module (fetch helpers)
        // -------------------------
        MEP.Net = {
            async postJson(url, payload, timeoutMs = 6000) {
                const u = (url ?? "").toString().trim();
                if (!u) throw new Error("Empty endpoint url");

                const ctrl = new AbortController();
                const t = setTimeout(() => ctrl.abort(), timeoutMs);

                try {
                    const r = await fetch(u, {
                        method: "POST",
                        mode: "cors",
                        cache: "no-store",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload ?? {}),
                        signal: ctrl.signal,
                    });

                    const text = await r.text().catch(() => "");
                    let json = null;
                    try {
                        json = text ? JSON.parse(text) : null;
                    } catch (e) {}

                    return { ok: r.ok, status: r.status, text, json };
                } finally {
                    clearTimeout(t);
                }
            },

            // Fallback ping через <img> (часто проходит даже когда CSP режет fetch/connect-src)
            pingImage(url, timeoutMs = 6000) {
                const u = (url ?? "").toString().trim();
                if (!u) return Promise.reject(new Error("Empty endpoint url"));

                const hasQ = u.includes("?");
                const pingUrl = u + (hasQ ? "&" : "?") + "action=ping&_mep_img=1&ts=" + Date.now();

                return new Promise((resolve, reject) => {
                    const img = new Image();
                    let done = false;

                    const timer = setTimeout(() => {
                        if (done) return;
                        done = true;
                        reject(new Error("Ping timeout"));
                    }, timeoutMs);

                    img.onload = () => {
                        if (done) return;
                        done = true;
                        clearTimeout(timer);
                        resolve({ ok: true });
                    };

                    img.onerror = () => {
                        if (done) return;
                        done = true;
                        clearTimeout(timer);
                        reject(new Error("Ping image error"));
                    };

                    img.src = pingUrl;
                });
            },
        };

        // -------------------------
        // Sound module
        // -------------------------
        MEP.Sound = {
            _audios: {},
            _playingKey: "",

            _safeCreateAudio(url) {
                try {
                    const a = new Audio(url);
                    a.preload = "auto";
                    a.loop = false; // на всякий случай
                    return a;
                } catch (e) {
                    return null;
                }
            },

            stopAll() {
                try {
                    for (const k of Object.keys(this._audios || {})) {
                        const a = this._audios[k];
                        if (!a) continue;

                        try {
                            a.pause();
                        } catch (e) {}
                        try {
                            a.currentTime = 0;
                        } catch (e) {}
                    }
                } catch (e) {}

                this._playingKey = "";
            },

            isPlaying() {
                const k = (this._playingKey || "").toString();
                if (!k) return false;
                const a = this._audios[k];
                if (!a) return false;
                return !a.paused;
            },

            loadFromSettings() {
                // важно: перед пересборкой — стопаем всё, чтобы не было наложений
                this.stopAll();

                const sounds = MEP.Settings.parseSounds();
                const next = {};

                for (const k of Object.keys(sounds)) {
                    const url = sounds[k];
                    const a = this._safeCreateAudio(url);
                    if (a) next[k] = a;
                }

                this._audios = next;

                // если дефолт не задан — возьмём первый
                const curDefault = MEP.Settings.getSoundDefaultKey();
                if (!curDefault) {
                    const first = Object.keys(next)[0] || "";
                    if (first) MEP.Settings.setSoundDefaultKey(first);
                }
            },

            has(key) {
                return !!this._audios[(key ?? "").toString()];
            },

            stop(key) {
                const k = (key ?? "").toString().trim() || this._playingKey;
                if (!k) return;

                const a = this._audios[k];
                if (!a) return;

                try {
                    a.pause();
                } catch (e) {}
                try {
                    a.currentTime = 0;
                } catch (e) {}

                if (this._playingKey === k) this._playingKey = "";
            },

            play(key) {
                const k = (key ?? "").toString().trim() || MEP.Settings.getSoundDefaultKey();
                const a = this._audios[k];
                if (!a) return null;

                // 1) стопаем всё предыдущее
                this.stopAll();

                // 2) гарантируем без лупа
                try {
                    a.loop = false;
                } catch (e) {}

                // 3) играем
                try {
                    a.currentTime = 0;
                } catch (e) {}

                this._playingKey = k;

                try {
                    const p = a.play();
                    if (p && typeof p.catch === "function") p.catch(() => {});
                } catch (e) {}

                return a;
            },

            // играть не прерывая текущий "основной" звук (для warn)
            playOneShot(key) {
                const k = (key ?? "").toString().trim();
                const a = this._audios[k];
                if (!a) return null;

                try {
                    a.loop = false;
                } catch (e) {}
                try {
                    a.currentTime = 0;
                } catch (e) {}

                try {
                    const p = a.play();
                    if (p && typeof p.catch === "function") p.catch(() => {});
                } catch (e) {}

                return a;
            },
        };
        // -------------------------
        // Graph module (SVG bars)
        // -------------------------
        MEP.Graph = {
            _ui: null,
            init(ui) {
                this._ui = ui || null;
            },

            _toNum(v) {
                if (v == null) return NaN;
                const s = String(v).replace(",", ".").trim();
                const n = Number.parseFloat(s);
                return Number.isFinite(n) ? n : NaN;
            },

            _colorForX(x) {
                // match by tracking rows: x <= row.x
                const rows = [];
                for (const k of Object.keys(MEP.State.track || {})) {
                    const r = MEP.State.track[k];
                    if (!r || typeof r !== "object") continue;
                    const rx = Number(r.x);
                    if (!Number.isFinite(rx)) continue;
                    rows.push({ x: rx, color: typeof r.color === "string" ? r.color : "" });
                }

                const ok = rows.filter((r) => x <= r.x);
                if (!ok.length) return "#888888";

                // вариант B: брать самое жёсткое (минимальный X)
                ok.sort((a, b) => a.x - b.x);
                const c = ok[0].color;
                return c && c.trim() ? c : "#888888";
            },

            _setTip(text, xPx, yPx) {
                const ui = this._ui;
                if (!ui?.graphTip) return;
                if (!text) {
                    ui.graphTip.style.display = "none";
                    return;
                }
                ui.graphTip.textContent = text;
                ui.graphTip.style.display = "block";
                if (Number.isFinite(xPx)) ui.graphTip.style.left = `${Math.max(6, xPx)}px`;
                if (Number.isFinite(yPx)) ui.graphTip.style.top = `${Math.max(6, yPx)}px`;
            },

            render() {
                const ui = this._ui;
                if (!ui?.graphSvg) return;

                const maxClip = Number(MEP.State.graphMax ?? 10);
                const density = Math.floor(Number(MEP.State.graphDensity ?? 100) || 100);
                const N = Math.max(10, density);

                const list = Array.isArray(MEP.State.list) ? MEP.State.list : [];
                const slice = list.slice(0, N).slice().reverse(); // oldest -> newest

                const vals = slice.map((v) => this._toNum(v)).map((v) => (Number.isFinite(v) ? v : 0));
                const maxVal = Math.max(
                    1,
                    ...vals.map((v) => (Number.isFinite(maxClip) && maxClip > 0 ? Math.min(v, maxClip) : v))
                );

                // build bars in viewBox 0..100 x 0..60
                const vbW = 100;
                const vbH = 60;

                // Уплотнение как во 2-м графике:
                // 1) считаем barW из vbW/n
                // 2) если barW становится слишком маленьким — убираем gap и пересчитываем
                let gap = 0.2; // in vb units
                const n = Math.max(1, slice.length);

                let barW = (vbW - gap * (n - 1)) / n;
                if (!Number.isFinite(barW) || barW <= 0) barW = vbW / n;

                // если уже слишком плотно — убираем зазоры, чтобы ВСЁ влезло в vbW
                if (barW < 0.25) {
                    gap = 0;
                    barW = vbW / n;
                }

                // clear
                ui.graphSvg.innerHTML = "";

                // bars
                slice.forEach((raw, i) => {
                    const v0 = vals[i];
                    const v = Number.isFinite(maxClip) && maxClip > 0 ? Math.min(v0, maxClip) : v0;

                    const h = (v / maxVal) * (vbH - 1);
                    const x = i * (barW + gap);
                    const y = vbH - h;

                    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                    rect.setAttribute("x", String(x));
                    rect.setAttribute("y", String(y));
                    rect.setAttribute("width", String(barW));
                    rect.setAttribute("height", String(h));
                    rect.setAttribute("rx", "0.3");
                    rect.setAttribute("ry", "0.3");

                    const fill = this._colorForX(v0);
                    rect.setAttribute("fill", fill);

                    rect.addEventListener("mouseenter", (ev) => {
                        const txt = `X: ${String(raw)}\n#${slice.length - i}`;
                        const box = ui.graphSvg.getBoundingClientRect();
                        this._setTip(txt, ev.clientX - box.left + 10, ev.clientY - box.top + 10);
                    });
                    rect.addEventListener("mousemove", (ev) => {
                        const box = ui.graphSvg.getBoundingClientRect();
                        this._setTip(
                            ui.graphTip?.textContent || "",
                            ev.clientX - box.left + 10,
                            ev.clientY - box.top + 10
                        );
                    });
                    rect.addEventListener("mouseleave", () => this._setTip(""));

                    ui.graphSvg.appendChild(rect);
                });
				

                // horizontal line (threshold)
                const lineV0 = Number(MEP.State.graphLine ?? 0);
                const lineV =
                    Number.isFinite(lineV0) && lineV0 > 0
                        ? Number.isFinite(maxClip) && maxClip > 0
                            ? Math.min(lineV0, maxClip)
                            : lineV0
                        : 0;

                if (lineV > 0) {
                    const yLine = vbH - (lineV / maxVal) * (vbH - 1);
                    const ln = document.createElementNS("http://www.w3.org/2000/svg", "line");
                    ln.setAttribute("x1", "0");
                    ln.setAttribute("x2", String(vbW));
                    ln.setAttribute("y1", String(yLine));
                    ln.setAttribute("y2", String(yLine));
                    ln.setAttribute("stroke", "rgba(255,255,255,0.55)");
                    ln.setAttribute("stroke-width", "0.35");
                    ln.setAttribute("stroke-dasharray", "1.6 1.6");
                    ui.graphSvg.appendChild(ln);
                }
            },
        };

        // -------------------------
        // Diff graph (Δ)
        // -------------------------
        MEP.DiffGraph = {
            _ui: null,
            init(ui) {
                this._ui = ui || null;
            },

            _ensureTip() {
                const ui = this._ui;
                if (!ui?.diffSvg) return null;
                if (ui.diffTip) return ui.diffTip;

                const host = ui.diffSvg.parentElement;
                if (!host) return null;

                const cs = window.getComputedStyle(host);
                if (cs.position === "static") {
                    host.style.position = "relative";
                }

                const tip = document.createElement("div");
                tip.className = "mep-diff-tip";
                tip.style.position = "absolute";
                tip.style.left = "10px";
                tip.style.top = "10px";
                tip.style.maxWidth = "240px";
                tip.style.whiteSpace = "pre-line";
                tip.style.fontSize = "12px";
                tip.style.background = "rgba(0,0,0,0.75)";
                tip.style.border = "1px solid rgba(255,255,255,0.15)";
                tip.style.borderRadius = "10px";
                tip.style.padding = "6px 8px";
                tip.style.pointerEvents = "none";
                tip.style.display = "none";
                tip.style.zIndex = "3";

                host.appendChild(tip);
                ui.diffTip = tip;
                return tip;
            },

            _setTip(text, xPx, yPx) {
                const ui = this._ui;
                const tip = this._ensureTip();
                if (!ui?.diffSvg || !tip) return;

                if (!text) {
                    tip.style.display = "none";
                    return;
                }

                tip.textContent = text;
                tip.style.display = "block";

                // Всегда держим подсказку в самом верху блока,
                // чтобы она не уходила под нижние секции.
                tip.style.top = "6px";

                // По X можно немного двигать, но не выпускать за правую границу.
                const host = ui.diffSvg.parentElement;
                const hostW = host?.clientWidth || 0;
                const safeX = Number.isFinite(xPx) ? Math.max(6, xPx) : 6;

                // Сначала ставим, потом меряем реальную ширину tooltip
                tip.style.left = `${safeX}px`;

                const tipW = tip.offsetWidth || 0;
                if (hostW > 0 && tipW > 0) {
                    const maxLeft = Math.max(6, hostW - tipW - 6);
                    tip.style.left = `${Math.min(safeX, maxLeft)}px`;
                }
            },

            render() {
                const ui = this._ui;
                if (!ui?.diffSvg) return;

                const history = Array.isArray(MEP.State.diffHistory) ? MEP.State.diffHistory : [];

                // Плотность 2-го графика:
                // - если sync включен → берём плотность 1-го графика
                // - иначе → берём ручную плотность 2-го графика
                const effDensity = MEP.State.diffDensitySync
                    ? Math.max(10, Math.floor(Number(MEP.State.graphDensity || 100) || 100))
                    : Math.max(10, Math.floor(Number(MEP.State.diffDensity || MEP.State.diffDensityManual || 81) || 81));

                const maxBars = Math.max(10, Math.min((history.length || 0), effDensity));

                // ВАЖНО: min/max/len считаем по полной серии выбранного диапазона (history),
                // а рисуем — по ресемпленному массиву (series). Поэтому изменение плотности
                // не должно менять вычисляемые значения.
                const fullSeries = history.slice();

                // Плотность = КОЛ-ВО ВИДИМЫХ СТОЛБИКОВ (берём последние N значений разницы).
                // Никакого ресемплинга: при увеличении плотности добавляется слева новый столбик,
                // а уже видимые справа сохраняют те же значения (только ужимаются по ширине).
                const startIndex = Math.max(0, fullSeries.length - maxBars);
                let series = fullSeries.slice(startIndex);

                const vbW = 100;
                const vbH = 60;
                const midY = vbH / 2; // нулевая ось
                let gap = 0.25;
                const n = Math.max(1, series.length);

                // ВАЖНО:
                // Раньше стоял Math.max(0.35, ...) -> при большой плотности barW фиксировался,
                // и суммарная ширина выходила за vbW => последний столбик уезжал за границу.
                // Правильнее: если barW становится слишком маленьким - убираем gap,
                // а ширину считаем строго vbW/n (влезает всегда).
                let barW = (vbW - gap * (n - 1)) / n;
                if (!Number.isFinite(barW) || barW <= 0) barW = vbW / n;
                if (barW < 0.35) {
                    gap = 0;
                    barW = vbW / n;
                }

                // max abs for scaling
                let maxAbs = 1;
                for (const v of series) {
                    const a = Math.abs(Number(v) || 0);
                    if (a > maxAbs) maxAbs = a;
                }

                // min/max/len labels for FULL selected series (не зависит от плотности)
                {
                    let minV = 0;
                    let maxV = 0;
                    for (const v of fullSeries) {
                        const n0 = Number(v) || 0;
                        if (n0 < minV) minV = n0;
                        if (n0 > maxV) maxV = n0;
                    }
                    const lenV = Math.abs(minV) + Math.abs(maxV);

                    const wrap = ui.diffSvg.closest(".mep-diff-wrap");
                    if (wrap) {
                        const elMin = wrap.querySelector(".mep-diff-min");
                        const elMax = wrap.querySelector(".mep-diff-max");
                        const elLen = wrap.querySelector(".mep-diff-len");

                        if (elMin) elMin.textContent = `min: ${minV}`;
                        if (elMax) elMax.textContent = `max: ${maxV > 0 ? "+" : ""}${maxV}`;
                        if (elLen) elLen.textContent = `len: ${lenV}`;
                    }
                }

                ui.diffSvg.innerHTML = "";

                // 0 axis
                const axis = document.createElementNS("http://www.w3.org/2000/svg", "line");
                axis.setAttribute("x1", "0");
                axis.setAttribute("x2", String(vbW));
                axis.setAttribute("y1", String(midY));
                axis.setAttribute("y2", String(midY));
                axis.setAttribute("stroke", "rgba(255,255,255,0.65)");
                axis.setAttribute("stroke-width", "0.45");
                ui.diffSvg.appendChild(axis);

				// dashed guide lines (+ / -) (рисуем ПОСЛЕ столбиков, иначе их перекрывает rect)
				const appendDiffGuideLines = () => {
				const maxAbsSafe = maxAbs > 0 ? maxAbs : 1;
				const posLvl = Math.max(0, Math.floor(Number(MEP.State.diffPosLevel) || 0));
				const negLvl = Math.max(0, Math.floor(Number(MEP.State.diffNegLevel) || 0));

				  if (posLvl > 0) {
					const yPos = midY - (posLvl / maxAbsSafe) * (midY - 1);
					const g1 = document.createElementNS("http://www.w3.org/2000/svg", "line");
					g1.setAttribute("x1", "0");
					g1.setAttribute("x2", String(vbW));
					g1.setAttribute("y1", String(yPos));
					g1.setAttribute("y2", String(yPos));
					g1.setAttribute("stroke", "rgba(255,255,255,0.42)");
					g1.setAttribute("stroke-width", "0.7");
					g1.setAttribute("stroke-dasharray", "3 3");
					g1.setAttribute("class", "mep-diff-lvl-pos");
					g1.setAttribute("pointer-events", "none");
					ui.diffSvg.appendChild(g1);
				  }

				  if (negLvl > 0) {
					const yNeg = midY + (negLvl / maxAbsSafe) * (midY - 1);
					const g2 = document.createElementNS("http://www.w3.org/2000/svg", "line");
					g2.setAttribute("x1", "0");
					g2.setAttribute("x2", String(vbW));
					g2.setAttribute("y1", String(yNeg));
					g2.setAttribute("y2", String(yNeg));
					g2.setAttribute("stroke", "rgba(255,255,255,0.42)");
					g2.setAttribute("stroke-width", "0.7");
					g2.setAttribute("stroke-dasharray", "3 3");
					g2.setAttribute("class", "mep-diff-lvl-neg");
					g2.setAttribute("pointer-events", "none");
					ui.diffSvg.appendChild(g2);
				  }
				};

                // Hover по всей области SVG (даже если столбик слишком тонкий/не попал под курсор)
                ui.diffSvg.onmousemove = (ev) => {
                    const box = ui.diffSvg.getBoundingClientRect();
                    const relX = ev.clientX - box.left;
                    const w = Math.max(1, box.width);

                    // индекс столбика по X (0..series.length-1)
                    let i = Math.floor((relX / w) * series.length);
                    if (i < 0) i = 0;
                    if (i >= series.length) i = series.length - 1;

                    const dv = Number(series[i]) || 0;
                    const txt = `Δ: ${dv > 0 ? "+" : ""}${String(dv)}\nэтап: ${startIndex + i + 1}`;
                    this._setTip(txt, relX + 10, (ev.clientY - box.top) + 10);
                };
                ui.diffSvg.onmouseleave = () => this._setTip("");

                // bars (oldest -> newest)
                series.forEach((dv0, i) => {
                    const dv = Number(dv0) || 0;
                    const h = (Math.abs(dv) / maxAbs) * (midY - 1);

                    const x = i * (barW + gap);
                    const y = dv >= 0 ? midY - h : midY;
                    const height = h;

                    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                    rect.setAttribute("x", String(x));
                    rect.setAttribute("y", String(y));
                    rect.setAttribute("width", String(barW));
                    rect.setAttribute("height", String(height));
                    rect.setAttribute("rx", "0.25");
                    rect.setAttribute("ry", "0.25");

                    // dv > 0 => в пользу >=2 => зелёный
                    // dv < 0 => в пользу <2 => красный
                    rect.setAttribute(
                        "fill",
                        dv > 0 ? "rgba(70,255,120,0.95)" : dv < 0 ? "rgba(255,70,70,0.95)" : "rgba(255,170,60,0.95)"
                    );

                    rect.addEventListener("mouseenter", (ev) => {
                        const txt = `Δ: ${dv > 0 ? "+" : ""}${String(dv)}\nэтап: ${startIndex + i + 1}`;
                        const box = ui.diffSvg.getBoundingClientRect();
                        this._setTip(txt, ev.clientX - box.left + 10, ev.clientY - box.top + 10);
                    });
                    rect.addEventListener("mousemove", (ev) => {
                        const txt = `Δ: ${dv > 0 ? "+" : ""}${String(dv)}\nэтап: ${startIndex + i + 1}`;
                        const box = ui.diffSvg.getBoundingClientRect();
                        this._setTip(txt, ev.clientX - box.left + 10, ev.clientY - box.top + 10);
                    });
                    rect.addEventListener("mouseleave", () => this._setTip(""));

					ui.diffSvg.appendChild(rect);
					});

				  // пунктирные уровни (+ / -) — ПОСЛЕ rect, чтобы были поверх столбиков
				  appendDiffGuideLines();
            },
        };

        // -------------------------
        // Sync module (send to DB)
        // -------------------------
        MEP.Sync = {
            lastSentKey: "",

            // batch anti-duplicate (стабильный baseTs пока список не менялся)
            _batchBaseTs: 0,
            _batchSig: "",

            _endpoint() {
                return MEP.Settings.getEndpoint();
            },

            _asNumber(cleanStr) {
                return MEP.Utils.cleanToNum(cleanStr);
            },

            _ensureBatchBaseTs() {
                // Стабильная подпись списка: длина + первый + последний элемент
                // Этого достаточно, чтобы не плодить новые baseTs при повторном клике "Отправить в БД"
                const list = MEP.State.list || [];
                const sig = `${list.length}|${list[0] ?? ""}|${list[list.length - 1] ?? ""}`;

                if (sig !== this._batchSig) {
                    this._batchSig = sig;
                    this._batchBaseTs = Date.now();
                }

                if (!Number.isFinite(this._batchBaseTs) || this._batchBaseTs <= 0) {
                    this._batchBaseTs = Date.now();
                }

                return this._batchBaseTs;
            },

            async sendBatchFromList() {
                const url = this._endpoint();
                if (!url) throw new Error("Endpoint not set");

                // list хранится newest-first -> отправляем oldest-first
                const arr = MEP.State.list.slice().reverse();
                const items = [];

                const baseTs = this._ensureBatchBaseTs();

                for (let i = 0; i < arr.length; i++) {
                    const s = arr[i];
                    const x = this._asNumber(s);
                    if (!Number.isFinite(x)) continue;

                    // ВАЖНО: ts задаём на клиенте стабильно, чтобы повторный клик не плодил дубли
                    items.push({
                        x,
                        ts: baseTs + i,
                        payload: { src: "mep_batch", idx: i },
                    });
                }

                if (!items.length) return { ok: false, reason: "empty" };

                return await MEP.Net.postJson(url, {
                    action: "track",
                    items,
                    ver: MEP.ver,
                    ts: Date.now(),
                });
            },

            async sendEntry(entry) {
                const url = this._endpoint();

                const wsLast = window.MEP && window.MEP.WS && window.MEP.WS.last ? window.MEP.WS.last : {};
                const eventKey =
                    window.MEP && window.MEP.WSLink && typeof window.MEP.WSLink.pickEventKey === "function"
                        ? window.MEP.WSLink.pickEventKey(wsLast)
                        : (wsLast.roundLikeId ?? null);
                const gameId = wsLast.roundLikeId ?? null;

                const key = `${eventKey ?? gameId ?? "noid"}|${entry?.raw}|${entry?.status}`;
                const ts = entry?.ts ?? Date.now();

                console.groupCollapsed("%c[MEP.Sync][LIVE] sendEntry()", "color:#7dd3fc");
                console.log("endpoint:", url || "(empty)");
                console.log("entry:", entry);
                console.log("gameId:", gameId);
                console.log("dedup key:", key, "lastSentKey:", this.lastSentKey);

                if (!url) {
                    console.warn("SKIP: endpoint not set");
                    console.groupEnd();
                    return;
                }

                // межвкладочный дедуп по gameId
                if (gameId) {
                    const lockKey = `mep_sent_game_${gameId}`;
                    try {
                        if (localStorage.getItem(lockKey)) {
                            console.warn("SKIP: duplicate gameId (another tab)");
                            console.groupEnd();
                            return;
                        }
                        localStorage.setItem(lockKey, String(Date.now()));
                    } catch (e) {}
                }

                if (key === this.lastSentKey) {
                    console.warn("SKIP: duplicate key (same tab)");
                    console.groupEnd();
                    return;
                }

                // entry.num уже есть (число), если нет — попробуем из clean
                const x = Number.isFinite(entry?.num) ? entry.num : this._asNumber(entry?.clean);
                console.log("x parsed:", x);

                if (!Number.isFinite(x)) {
                    console.warn("SKIP: x is not finite");
                    console.groupEnd();
                    return;
                }

                this.lastSentKey = key;

                const payload = {
                    status: entry.status,
                    raw: entry.raw,
                    roundLikeId: gameId,
                    gameId,
                    event_key: eventKey,
                    src: "mep_live",
                };

                const p1 = {
                    action: "track",
                    event_key: eventKey,
                    items: [{ x, ts, payload }],
                    ver: MEP.ver,
                    ts: Date.now(),
                };
                console.log("payload#1 (batch-style):", p1);

                try {
                    const resp1 = await MEP.Net.postJson(url, p1);
                    console.log("resp#1:", {
                        ok: resp1?.ok,
                        status: resp1?.status,
                        json: resp1?.json,
                        text: resp1?.text,
                    });

                    const ok1 = !!(resp1?.ok && resp1?.json && resp1.json.ok === true);
                    if (ok1) {
                        console.log("DONE: saved via batch-style");
                        console.groupEnd();
                        return;
                    }

                    console.warn("WARN: batch-style not ok -> fallback legacy");

                    const p2 = {
                        action: "track",
                        event_key: eventKey,
                        x,
                        ts,
                        payload,
                        ver: MEP.ver,
                    };
                    console.log("payload#2 (legacy):", p2);

                    const resp2 = await MEP.Net.postJson(url, p2);
                    console.log("resp#2:", {
                        ok: resp2?.ok,
                        status: resp2?.status,
                        json: resp2?.json,
                        text: resp2?.text,
                    });

                    const ok2 = !!(resp2?.ok && resp2?.json && resp2.json.ok === true);
                    if (ok2) {
                        console.log("DONE: saved via legacy");
                    } else {
                        console.warn("FAIL: legacy not ok (see resp#2)");
                    }
                } catch (e) {
                    console.warn("ERROR: sendEntry exception:", e);
                } finally {
                    console.groupEnd();
                }
            },
        };

        // -------------------------
        // UI module
        // -------------------------
        MEP.UI = {
            ui: null,

            setHistoryLoading(isLoading, nextClicks = 0) {
                const ui = MEP.UI.ui;
                if (!ui?.historyBtn) return;

                // запоминаем дефолты один раз
                if (ui._historyBtnDefaultText == null) {
                    ui._historyBtnDefaultText = ui.historyBtn.textContent || "Загрузить с истории";
                }
                if (ui._historyBtnDefaultColor == null) {
                    ui._historyBtnDefaultColor = ui.historyBtn.style.color || "";
                }

                if (isLoading) {
                    ui.historyBtn.classList.add("is-loading");
                    ui.historyBtn.textContent = `Загрузка истории · ${nextClicks}`;
                } else {
                    ui.historyBtn.classList.remove("is-loading");
                    ui.historyBtn.textContent = ui._historyBtnDefaultText;

                    // возвращаем цвет только если он был
                    if (ui._historyBtnDefaultColor) {
                        ui.historyBtn.style.color = ui._historyBtnDefaultColor;
                    } else {
                        ui.historyBtn.style.removeProperty("color");
                    }
                }
            },

            setHistoryProgress(nextClicks) {
                const ui = MEP.UI.ui;
                if (!ui?.historyBtn) return;
                ui.historyBtn.textContent = `Загрузка истории  |  Загружаем - ${nextClicks}`;
            },

            rebuildTrackingTable() {
                const ui = MEP.UI.ui;
                if (!ui) return;

                const tbody = ui.panel.querySelector(".mep-track-table tbody");
                if (!tbody) return;

                tbody.innerHTML = "";

                const count = MEP.State.trackCount;

                const defColors = [
                    "#ff0000",
                    "#0066ff",
                    "#00ff00",
                    "#ffff00",
                    "#ff00ff",
                    "#00ffff",
                    "#ffffff",
                    "#ff8800",
                ];
                const getDefColor = (i) => defColors[(i - 1) % defColors.length];

                for (let i = 1; i <= count; i++) {
                    const key = `t${i}`;

                    // если строки ещё нет — создаём
                    if (!(key in MEP.State.track)) {
                        MEP.State.track[key] = { x: 1.5, color: getDefColor(i), limit: 0, soundKey: "" };
                    }

                    // миграция старого формата (число -> объект)
                    if (typeof MEP.State.track[key] === "number") {
                        MEP.State.track[key] = {
                            x: MEP.State.track[key],
                            color: getDefColor(i),
                            limit: 0,
                            soundKey: "",
                        };
                    }

                    // миграция bool sound -> soundKey
                    if (MEP.State.track[key] && typeof MEP.State.track[key] === "object") {
                        if ("sound" in MEP.State.track[key] && !("soundKey" in MEP.State.track[key])) {
                            const wasOn = !!MEP.State.track[key].sound;
                            const defK = MEP.Settings.getSoundDefaultKey();
                            MEP.State.track[key].soundKey = wasOn ? defK || "" : "";
                            try {
                                delete MEP.State.track[key].sound;
                            } catch (e) {}
                        }
                        if (typeof MEP.State.track[key].soundKey !== "string") MEP.State.track[key].soundKey = "";
                    }

                    const row = MEP.State.track[key] || { x: 1.5, color: getDefColor(i), limit: 0, soundKey: "" };

                    // добивка поля color, если пришло из старого состояния
                    if (row && typeof row === "object" && typeof row.color !== "string") {
                        row.color = getDefColor(i);
                        MEP.State.track[key] = row;
                    }

                    const tr = document.createElement("tr");
                    tr.setAttribute("data-key", key);
                    tr.innerHTML = `
				      <td class="col-idx">${i}</td>
				      <td class="col-color">
				        <input class="mep-color" data-key="${key}" type="color">
				      </td>
				      <td class="col-x">
				        <input class="mep-x" data-key="${key}" inputmode="decimal">
				      </td>
				      <td class="col-streak">
				        <span class="mep-streak" data-key="${key}">0</span>
				      </td>
				      <td class="col-limit">
				        <input class="mep-limit" data-key="${key}" type="number" min="0" step="1">
				      </td>
				      <td class="col-sound">
				        <select class="mep-soundkey" data-key="${key}"></select>
				      </td>
				    `;
                    tbody.appendChild(tr);
                }

                // обновляем ссылки на inputs
                ui.xInputs = [...tbody.querySelectorAll("input.mep-x")];
                ui.colorInputs = [...tbody.querySelectorAll("input.mep-color")];
                ui.limitInputs = [...tbody.querySelectorAll("input.mep-limit")];
                ui.soundSelects = [...tbody.querySelectorAll("select.mep-soundkey")];

                // Синхронизируем: гарантируем объектную модель
                for (const inp of ui.xInputs) {
                    const key = inp.dataset.key;
                    const row = MEP.State.track[key];

                    if (!row || typeof row !== "object") {
                        MEP.State.track[key] = { x: 1.5, color: "#ffffff", limit: 0, sound: false };
                    }

                    if (!Number.isFinite(MEP.State.track[key].x)) MEP.State.track[key].x = 1.5;
                    if (typeof MEP.State.track[key].color !== "string") MEP.State.track[key].color = "#ffffff";
                    if (!Number.isFinite(MEP.State.track[key].limit)) MEP.State.track[key].limit = 0;
                    if (typeof MEP.State.track[key].sound !== "boolean") MEP.State.track[key].sound = false;

                    inp.value = MEP.UI.formatForInput(MEP.State.track[key].x);
                }

                // color inputs
                for (const inp of ui.colorInputs || []) {
                    const key = inp.dataset.key;

                    if (!MEP.State.track[key] || typeof MEP.State.track[key] !== "object") {
                        MEP.State.track[key] = { x: 1.5, color: "#ffffff", limit: 0, soundKey: "" };
                    }

                    if (typeof MEP.State.track[key].color !== "string") MEP.State.track[key].color = "#ffffff";

                    // нормализуем формат
                    const c = (MEP.State.track[key].color || "#ffffff").toString().trim();
                    inp.value = c || "#ffffff";
                }

                for (const inp of ui.limitInputs) {
                    const key = inp.dataset.key;
                    if (!MEP.State.track[key] || typeof MEP.State.track[key] !== "object") {
                        MEP.State.track[key] = { x: 1.5, limit: 0, sound: false };
                    }
                    inp.value = String(Math.max(0, Math.floor(Number(MEP.State.track[key].limit) || 0)));
                }

                // миграция + заполнение селектов звука
                const soundMap = MEP.Settings.parseSounds();
                const soundKeys = Object.keys(soundMap);

                const ensureRow = (key) => {
                    if (!MEP.State.track[key] || typeof MEP.State.track[key] !== "object") {
                        MEP.State.track[key] = { x: 1.5, limit: 0, soundKey: "" };
                    }

                    // миграция старого формата {sound: boolean} -> {soundKey: string}
                    if ("sound" in MEP.State.track[key] && !("soundKey" in MEP.State.track[key])) {
                        const wasOn = !!MEP.State.track[key].sound;
                        const defK = MEP.Settings.getSoundDefaultKey();
                        MEP.State.track[key].soundKey = wasOn ? defK || soundKeys[0] || "" : "";
                        try {
                            delete MEP.State.track[key].sound;
                        } catch (e) {}
                    }

                    // если soundKey отсутствует/битый
                    if (typeof MEP.State.track[key].soundKey !== "string") {
                        MEP.State.track[key].soundKey = "";
                    }
                };

                for (const sel of ui.soundSelects || []) {
                    const key = sel.dataset.key;
                    ensureRow(key);

                    sel.innerHTML = "";

                    // первая позиция — без звука
                    const optNone = document.createElement("option");
                    optNone.value = "";
                    optNone.textContent = "—";
                    sel.appendChild(optNone);

                    for (const k of soundKeys) {
                        const opt = document.createElement("option");
                        opt.value = k;
                        opt.textContent = k;
                        sel.appendChild(opt);
                    }

                    sel.value = MEP.State.track[key].soundKey || "";
                }

                MEP.UI.initTrackingInputs();
                MEP.UI.updateTrackingTable();
            },

            mount() {
                const { PANEL_ID } = MEP.Config;

                document.getElementById(PANEL_ID)?.remove();

                const panel = document.createElement("div");
                panel.id = PANEL_ID;

                panel.innerHTML = `
<div class="mep-header">
    <div class="mep-title">
        GamePanel ver ${MEP.ver} | <b>${MEP.Utils.getGameName()}</b> | <span class="mep-title-stat">0</span>
    </div>
    <button class="mep-gear" title="Настройки" aria-label="Настройки">⚙</button>
</div>
<div class="mep-body">
    <button class="mep-history-toggle" type="button" data-open="0">
        <span class="mep-history-label">История</span>
        <span class="mep-history-arrow">▼</span>
    </button>
    <div class="mep-stats-wrap" style="display: none">
        <div class="mep-block-title">Статистика <span class="mep-count">(0)</span></div>
        <div class="mep-history-row">
            <button class="mep-history-load">Загрузить с истории</button>
            <input class="mep-history-steps" type="number" min="0" step="1" value="0" />
        </div>
        <textarea class="mep-stats" spellcheck="false" placeholder="Пока пусто..."></textarea>
        <div class="mep-actions-row">
            <button class="mep-copy mep-action-btn">Скопировать</button>
            <button class="mep-send-db mep-action-btn">Отправить в БД</button>
        </div>
    </div>
    <div class="mep-divider"></div>
    <div class="mep-section-head">
        <div class="mep-section-title">Отслеживание</div>
        <input class="mep-track-count" type="number" min="1" step="1" />
    </div>
    <div class="mep-track-wrap">
        <table class="mep-track-table">
            <thead>
                <tr>
                    <th class="col-idx">#</th>
                    <th class="col-color">Цвет</th>
                    <th class="col-x">X</th>
                    <th class="col-streak">Подряд&le;X</th>
                    <th class="col-limit">Порог</th>
                    <th class="col-sound">Звук</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td class="col-idx">1</td>
                    <td class="col-x">
                        <input class="mep-x" data-key="t1" inputmode="decimal" />
                    </td>
                    <td class="col-streak"><span class="mep-streak" data-key="t1">0</span></td>
                    <td class="col-limit">
                        <input class="mep-limit" data-key="t1" type="number" min="0" step="1" />
                    </td>
                    <td class="col-sound">
                        <input class="mep-sound" data-key="t1" type="checkbox" />
                    </td>
                </tr>
                <tr>
                    <td class="col-idx">2</td>
                    <td class="col-x">
                        <input class="mep-x" data-key="t2" inputmode="decimal" />
                    </td>
                    <td class="col-streak"><span class="mep-streak" data-key="t2">0</span></td>
                    <td class="col-limit">
                        <input class="mep-limit" data-key="t2" type="number" min="0" step="1" />
                    </td>
                    <td class="col-sound">
                        <input class="mep-sound" data-key="t2" type="checkbox" />
                    </td>
                </tr>
                <tr>
                    <td class="col-idx">3</td>
                    <td class="col-x">
                        <input class="mep-x" data-key="t3" inputmode="decimal" />
                    </td>
                    <td class="col-streak"><span class="mep-streak" data-key="t3">0</span></td>
                    <td class="col-limit">
                        <input class="mep-limit" data-key="t3" type="number" min="0" step="1" />
                    </td>
                    <td class="col-sound">
                        <input class="mep-sound" data-key="t3" type="checkbox" />
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</div>
<div class="mep-diff-wrap">
<div class="mep-diff-lenrow"><span class="mep-diff-len">len: 0</span><span class="mep-diff-lvlwrap"><span class="mep-diff-lvl-sign">+</span><input class="mep-diff-lvl-pos" type="number" min="0" step="1" value="0"><span class="mep-diff-lvl-sign">-</span><input class="mep-diff-lvl-neg" type="number" min="0" step="1" value="0"></span></div>
    <div class="mep-diff-maxrow"><span class="mep-diff-max">max: +0</span></div>
    <div class="mep-diff-box">
        <svg class="mep-diff" viewBox="0 0 100 60" preserveAspectRatio="none"></svg>
    </div>
    <div class="mep-diff-minrow"><span class="mep-diff-min">min: -0</span></div>
</div>
<div class="mep-two-stat-wrap">
    <div class="mep-two-head">

        <div class="mep-two-topbar">
            <div class="mep-two-toprow">
                <span class="mep-two-head-label">Последние</span>
                <input class="mep-two-lastn" type="number" min="1" step="1" value="250" />
            </div>

            <div class="mep-two-total">
                <span class="mep-two-total-n">0</span><span class="mep-two-total-sep">|</span
                ><span class="mep-two-diff zero">0</span>
            </div>

            <label class="mep-two-head-right">
                <input class="mep-two-all" type="checkbox" />
                <span>вся история</span>
            </label>
        </div>

        <div class="mep-two-subrow">
            <span class="mep-two-dens-label">плотность</span>
            <input class="mep-diff-density" type="number" min="10" step="1" value="81" />
            <label class="mep-diff-sync-label">
                <input class="mep-diff-sync" type="checkbox" />
                <span>синхр.</span>
            </label>
        </div>

    </div>
    <div class="mep-two-row">
        <div class="mep-two-left">&gt;= 2 <span class="mep-two-sep">|</span><span class="mep-two-cnt ge">0</span></div>
        <div class="mep-two-bar">
            <div class="mep-two-fill ge" style="width: 0%"></div>
        </div>
        <div class="mep-two-right"><span class="mep-two-pct ge">0%</span></div>
    </div>
    <div class="mep-two-row">
        <div class="mep-two-left">&lt; 2 <span class="mep-two-sep">|</span><span class="mep-two-cnt lt">0</span></div>
        <div class="mep-two-bar">
            <div class="mep-two-fill lt" style="width: 0%"></div>
        </div>
        <div class="mep-two-right"><span class="mep-two-pct lt">0%</span></div>
    </div>
</div>
<div class="mep-graph-wrap">
    <div class="mep-graph-head">
        <div class="mep-block-title">График</div>
        <div class="mep-graph-controls">
            <label class="mep-graph-label"
                >обрезать max
                <input class="mep-graph-max" type="number" min="0" step="0.1" />
            </label>
            <label class="mep-graph-label"
                >плотность
                <input class="mep-graph-density" type="number" min="10" step="1" />
            </label>
            <label class="mep-graph-label"
                >Гор.линия
                <input class="mep-graph-line" type="number" min="0" step="0.1" />
            </label>
        </div>
    </div>
    <div class="mep-graph-box">
        <svg class="mep-graph" viewBox="0 0 100 60" preserveAspectRatio="none"></svg>
        <div class="mep-graph-tip" style="display: none"></div>
    </div>
</div>
<!-- Settings modal -->
<div class="mep-modal-overlay" data-mep-modal="settings" style="display: none">
    <div class="mep-modal" role="dialog" aria-modal="true" aria-label="Настройки">
        <div class="mep-modal-head">
            <div class="mep-modal-title">Настройки</div>
            <button class="mep-modal-close" aria-label="Закрыть">×</button>
        </div>
        <div class="mep-form-row">
            <div class="mep-label">POST URL (PHP endpoint)</div>
            <input class="mep-input mep-endpoint" placeholder="https://site.com/track.php" />
        </div>
        <div class="mep-form-row">
            <div class="mep-label">Звуки (key=url, по одному в строке)</div>
            <textarea class="mep-input mep-sounds" style="height: 90px; resize: none"></textarea>
        </div>
        <div class="mep-form-row">
            <div class="mep-label">Звук по умолчанию</div>
            <select class="mep-input mep-sound-default"></select>
        </div>
        <div class="mep-form-row">
            <div class="mep-label">Подсветка при срабатывании (мс)</div>
            <input class="mep-input mep-hit-ms" type="number" min="500" step="100" />
        </div>
        <div class="mep-form-row">
            <div class="mep-label">Пауза между “Далее” при загрузке истории (мс)</div>
            <input class="mep-input mep-history-next-ms" type="number" min="0" step="100" />
        </div>
        <div class="mep-form-row">
            <div class="mep-label">Приоритет звука при одновременном срабатывании</div>
            <select class="mep-input mep-priority-mode">
                <option value="high">Высокий X (большее значение)</option>
                <option value="low">Низкий X (меньшее значение)</option>
            </select>
        </div>
        <div class="mep-form-row">
            <div class="mep-label">Реестр игр (slug, по одному в строке)</div>
            <textarea class="mep-input mep-games" spellcheck="false" placeholder="crash&#10;spribe-aviator"></textarea>
        </div>
        <div class="mep-modal-actions">
            <button class="mep-btn mep-test-endpoint">Тест</button>
            <button class="mep-btn mep-test-sound">Тест звука</button>
        </div>
        <div class="mep-modal-actions">
            <button class="mep-btn mep-load-settings">Загрузить с БД</button>
            <button class="mep-btn mep-save-settings">Сохранить</button>
            <button class="mep-btn mep-cancel-settings">Отмена</button>
        </div>
    </div>
</div>
`;

                document.body.appendChild(panel);
                document.body.classList.add("mep-panel-open");

                const settingsOverlay = panel.querySelector('.mep-modal-overlay[data-mep-modal="settings"]');

                MEP.UI.ui = {
                    panel,
                    textarea: panel.querySelector("textarea.mep-stats"),
                    copyBtn: panel.querySelector("button.mep-copy"),
                    sendDbBtn: panel.querySelector("button.mep-send-db"),
                    countEl: panel.querySelector(".mep-count"),
                    titleStat: panel.querySelector(".mep-title-stat"),

                    historyToggleBtn: panel.querySelector(".mep-history-toggle"),
                    historyArrow: panel.querySelector(".mep-history-arrow"),
                    statsWrap: panel.querySelector(".mep-stats-wrap"),

                    diffWrap: panel.querySelector(".mep-diff-wrap"),
                    diffSvg: panel.querySelector("svg.mep-diff"),
                    twoWrap: panel.querySelector(".mep-two-stat-wrap"),
                    twoLastN: panel.querySelector("input.mep-two-lastn"),
					diffDensityInput: panel.querySelector("input.mep-diff-density"),
					diffSyncInput: panel.querySelector("input.mep-diff-sync"),
					diffPosLevelInput: panel.querySelector("input.mep-diff-lvl-pos"),
					diffNegLevelInput: panel.querySelector("input.mep-diff-lvl-neg"),
                    twoAll: panel.querySelector("input.mep-two-all"),
                    twoTotal: panel.querySelector(".mep-two-total"),
                    twoTotalN: panel.querySelector(".mep-two-total-n"),
                    twoDiff: panel.querySelector(".mep-two-diff"),
                    twoGeCnt: panel.querySelector(".mep-two-cnt.ge"),
                    twoLtCnt: panel.querySelector(".mep-two-cnt.lt"),
                    twoGeFill: panel.querySelector(".mep-two-fill.ge"),
                    twoLtFill: panel.querySelector(".mep-two-fill.lt"),
                    twoGePct: panel.querySelector(".mep-two-pct.ge"),
                    twoLtPct: panel.querySelector(".mep-two-pct.lt"),

                    graphMaxInput: panel.querySelector("input.mep-graph-max"),
                    graphDensityInput: panel.querySelector("input.mep-graph-density"),
                    graphLineInput: panel.querySelector("input.mep-graph-line"),
                    graphSvg: panel.querySelector("svg.mep-graph"),
                    graphTip: panel.querySelector(".mep-graph-tip"),

                    xInputs: [...panel.querySelectorAll("input.mep-x")],
                    colorInputs: [...panel.querySelectorAll("input.mep-color")],
                    limitInputs: [...panel.querySelectorAll("input.mep-limit")],
                    soundSelects: [...panel.querySelectorAll("select.mep-soundkey")],

                    trackCountInput: panel.querySelector(".mep-track-count"),

                    historyBtn: panel.querySelector("button.mep-history-load"),
                    historySteps: panel.querySelector("input.mep-history-steps"),

                    gearBtn: panel.querySelector("button.mep-gear"),

                    // settings
                    settingsOverlay,
                    settingsCloseBtn: settingsOverlay?.querySelector(".mep-modal-close"),
                    settingsSaveBtn: settingsOverlay?.querySelector(".mep-save-settings"),
                    settingsCancelBtn: settingsOverlay?.querySelector(".mep-cancel-settings"),
                    settingsLoadBtn: settingsOverlay?.querySelector(".mep-load-settings"),
                    endpointInput: settingsOverlay?.querySelector("input.mep-endpoint"),
                    testEndpointBtn: settingsOverlay?.querySelector(".mep-test-endpoint"),
                    testSoundBtn: settingsOverlay?.querySelector(".mep-test-sound"),

                    soundsInput: settingsOverlay?.querySelector("textarea.mep-sounds"),
                    soundDefaultSelect: settingsOverlay?.querySelector("select.mep-sound-default"),
                    hitMsInput: settingsOverlay?.querySelector("input.mep-hit-ms"),
                    historyNextMsInput: settingsOverlay?.querySelector("input.mep-history-next-ms"),
                    priorityModeSelect: settingsOverlay?.querySelector("select.mep-priority-mode"),
                    gamesInput: settingsOverlay?.querySelector("textarea.mep-games"),
                };

                // применяем настройки к UI
                if (MEP.UI.ui.historySteps) {
                    MEP.UI.ui.historySteps.value = String(MEP.Settings.getHistorySteps());
                }

                MEP.UI.bind();
                // MEP.UI.initTrackingInputs();
                return MEP.UI.ui;
            },

            bind() {
                const ui = MEP.UI.ui;
                if (!ui) return;

                // -------------------------
                // Graph controls
                // -------------------------
                if (ui.graphMaxInput) {
                    ui.graphMaxInput.value = String(MEP.State.graphMax ?? 10);
                    ui.graphMaxInput.oninput = () => {
                        const n = Number(ui.graphMaxInput.value);
                        MEP.State.graphMax = Number.isFinite(n) ? n : 0;
                        MEP.Storage.save();
                        MEP.Graph?.render?.();
                    };
                }

                if (ui.graphDensityInput) {
                    ui.graphDensityInput.value = String(MEP.State.graphDensity ?? 100);
                    ui.graphDensityInput.oninput = () => {
                        let v = Math.floor(Number(ui.graphDensityInput.value) || 0);
                        if (!Number.isFinite(v) || v < 10) v = 10;
                        ui.graphDensityInput.value = String(v);
                        MEP.State.graphDensity = v;

                        // sync: 1-й график -> 2-й график
                        if (MEP.State.diffDensitySync) {
                            MEP.State.diffDensity = v;
                            if (ui.diffDensityInput) ui.diffDensityInput.value = String(v);
                            MEP.DiffGraph?.render?.();
                        }

                        MEP.Storage.save();
                        MEP.Graph?.render?.();
                    };
                }

                if (ui.graphLineInput) {
                    ui.graphLineInput.value = String(MEP.State.graphLine ?? 0);
                    ui.graphLineInput.oninput = () => {
                        const n = Number(ui.graphLineInput.value);
                        MEP.State.graphLine = Number.isFinite(n) ? Math.max(0, n) : 0;
                        ui.graphLineInput.value = String(MEP.State.graphLine);
                        MEP.Storage.save();
                        MEP.Graph?.render?.();
                    };
                }

                MEP.Graph?.init?.(ui);
                MEP.DiffGraph?.init?.(ui);

                // -------------------------
                // Diff density controls (2-й график)
                // -------------------------
                const applyDiffDensityUi = () => {
                    if (ui.diffSyncInput) ui.diffSyncInput.checked = !!MEP.State.diffDensitySync;

                    // sync ON:
                    //  - 2-й график (diffDensityInput) = мастер и ВСЕГДА активен
                    //  - 1-й график (graphDensityInput) = слейв и disabled
                    if (ui.graphDensityInput) {
                        ui.graphDensityInput.disabled = !!MEP.State.diffDensitySync;
                    }

                    if (ui.diffDensityInput) {
                        const base = (MEP.State.diffDensityManual || MEP.State.diffDensity || 81);
                        const v = Math.max(10, Math.floor(Number(base) || 81));
                        ui.diffDensityInput.value = String(v);
                        ui.diffDensityInput.disabled = false;
                    }

                    if (ui.diffPosInput) ui.diffPosInput.value = String(Math.max(0, Math.floor(Number(MEP.State.diffPosLevel) || 0)));
                    if (ui.diffNegInput) ui.diffNegInput.value = String(Math.max(0, Math.floor(Number(MEP.State.diffNegLevel) || 0)));
                };

                applyDiffDensityUi();

                if (ui.diffPosInput) {
                    ui.diffPosInput.addEventListener("input", () => {
                        const v = Math.max(0, Math.floor(Number(ui.diffPosInput.value) || 0));
                        ui.diffPosInput.value = String(v);
                        MEP.State.diffPosLevel = v;
                        MEP.Storage.save();
                        MEP.DiffGraph?.render?.();
                    });
                }

                if (ui.diffNegInput) {
                    ui.diffNegInput.addEventListener("input", () => {
                        const v = Math.max(0, Math.floor(Number(ui.diffNegInput.value) || 0));
                        ui.diffNegInput.value = String(v);
                        MEP.State.diffNegLevel = v;
                        MEP.Storage.save();
                        MEP.DiffGraph?.render?.();
                    });
                }

                if (ui.diffDensityInput) {
                    ui.diffDensityInput.addEventListener("input", () => {
                        let v = Math.floor(Number(ui.diffDensityInput.value) || 0);
                        if (!Number.isFinite(v) || v < 10) v = 10;
                        ui.diffDensityInput.value = String(v);

                        MEP.State.diffDensityManual = v;

                        if (MEP.State.diffDensitySync) {
                            // синхра ON: 2-й = мастер => назначаем плотность 1-му и 2-му
                            MEP.State.graphDensity = v;
                            if (ui.graphDensityInput) ui.graphDensityInput.value = String(v);

                            MEP.State.diffDensity = v;

                            applyDiffDensityUi();
                            MEP.Graph?.render?.();
                            MEP.DiffGraph?.render?.();
                        } else {
                            // синхра OFF: меняем только 2-й
                            MEP.State.diffDensity = v;
                            MEP.DiffGraph?.render?.();
                        }

                        MEP.Storage.save();
                    });
                }

                if (ui.diffSyncInput) {
                    ui.diffSyncInput.addEventListener("change", () => {
                        const on = !!ui.diffSyncInput.checked;
                        MEP.State.diffDensitySync = on;

                        if (on) {
                            // включили синхру:
                            // 1) плотность 2-го графика назначаем 1-му (один раз при включении)
                            // 2) дальше 1-й график главный, 2-й зеркалит плотность 1-го
                            // 3) ручную плотность 2-го сохраняем, чтобы вернуть при выключении

                            const manual = Math.max(10, Math.floor(Number(MEP.State.diffDensityManual || MEP.State.diffDensity || 81) || 81));
                            MEP.State.diffDensityManual = manual;

                            const v = Math.max(10, Math.floor(Number(manual) || 81));
                            MEP.State.graphDensity = v;
                            if (ui.graphDensityInput) ui.graphDensityInput.value = String(v);

                            MEP.State.diffDensity = v;

                            MEP.Graph?.render?.();
                            MEP.DiffGraph?.render?.();
                        } else {
                            // выключили синхру — возвращаем ручное значение 2-го
                            const v = Math.max(10, Math.floor(Number(MEP.State.diffDensityManual || 81) || 81));
                            MEP.State.diffDensity = v;
                            MEP.DiffGraph?.render?.();
                        }

                        applyDiffDensityUi();
                        MEP.Storage.save();
                    });
                }

                // -------------------------
                // Settings modal helpers
                // -------------------------
                const openSettings = async () => {
                    if (!ui.settingsOverlay) return;

                    // подтянуть актуальные настройки из БД перед показом
                    try {
                        await MEP.Settings.loadFromDb("open_settings");
                    } catch (e) {}

                    if (ui.endpointInput) ui.endpointInput.value = MEP.Settings.getEndpoint();
                    if (ui.historySteps) ui.historySteps.value = String(MEP.Settings.getHistorySteps());

                    // sounds
                    if (ui.soundsInput) ui.soundsInput.value = MEP.Settings.getSoundsText();

                    // rebuild select options
                    if (ui.soundDefaultSelect) {
                        const map = MEP.Settings.parseSounds();
                        const cur = MEP.Settings.getSoundDefaultKey();

                        ui.soundDefaultSelect.innerHTML = "";

                        const keys = Object.keys(map);
                        if (!keys.length) {
                            const opt = document.createElement("option");
                            opt.value = "";
                            opt.textContent = "(нет звуков)";
                            ui.soundDefaultSelect.appendChild(opt);
                        } else {
                            for (const k of keys) {
                                const opt = document.createElement("option");
                                opt.value = k;
                                opt.textContent = k;
                                ui.soundDefaultSelect.appendChild(opt);
                            }
                        }

                        ui.soundDefaultSelect.value = cur || keys[0] || "";
                    }

                    // hit ms
                    if (ui.hitMsInput) ui.hitMsInput.value = String(MEP.Settings.getHitFlashMs());

                    // history next delay
                    if (ui.historyNextMsInput)
                        ui.historyNextMsInput.value = String(MEP.Settings.getHistoryNextDelayMs());

                    // priority mode
                    if (ui.priorityModeSelect) ui.priorityModeSelect.value = MEP.Settings.getPriorityMode();
                    if (ui.gamesInput) ui.gamesInput.value = MEP.Settings.getSupportedGamesText();

                    ui.settingsOverlay.style.display = "flex";
                };

                const closeSettings = () => {
                    if (!ui.settingsOverlay) return;
                    ui.settingsOverlay.style.display = "none";
                };

                // open
                ui.gearBtn?.addEventListener("click", openSettings);

                // close buttons
                ui.settingsCloseBtn?.addEventListener("click", closeSettings);
                ui.settingsCancelBtn?.addEventListener("click", closeSettings);

                // click outside modal
                ui.settingsOverlay?.addEventListener("click", (e) => {
                    if (e.target === ui.settingsOverlay) closeSettings();
                });

                // save settings
                // load settings from DB (по endpoint из поля)
                ui.settingsLoadBtn?.addEventListener("click", async () => {
                    const btn = ui.settingsLoadBtn;
                    if (!btn) return;

                    const url = (ui.endpointInput?.value || "").trim();
                    MEP.Settings.setEndpoint(url); // сохраняем url перед запросом

                    const prevText = btn.textContent || "Загрузить с БД";
                    btn.textContent = "Загрузка...";
                    btn.disabled = true;

                    try {
                        if (!MEP.Settings?.loadFromDb) throw new Error("MEP.Settings.loadFromDb не найден");

                        const ok = await MEP.Settings.loadFromDb();

                        // обновим поля в модалке из текущего состояния Settings
                        if (ui.endpointInput) ui.endpointInput.value = MEP.Settings.getEndpoint();

                        if (ui.soundsInput) ui.soundsInput.value = MEP.Settings.getSoundsText();
                        if (ui.soundDefaultSelect) ui.soundDefaultSelect.value = MEP.Settings.getSoundDefaultKey();

                        if (ui.hitMsInput) ui.hitMsInput.value = String(MEP.Settings.getHitFlashMs());
                        if (ui.historyNextMsInput)
                            ui.historyNextMsInput.value = String(MEP.Settings.getHistoryNextDelayMs());

                        if (ui.priorityModeSelect) ui.priorityModeSelect.value = MEP.Settings.getPriorityMode();

                        if (ui.gamesInput) ui.gamesInput.value = MEP.Settings.getSupportedGamesText();

                        if (ui.historySteps) ui.historySteps.value = String(MEP.Settings.getHistorySteps());

                        // пересоберём звуки, если надо
                        try {
                            MEP.Sound?.loadFromSettings?.();
                        } catch (e) {}

                        btn.textContent = ok ? "OK" : "OK";
                    } catch (e) {
                        btn.textContent = "Ошибка";
                        console.warn("[MEP] settings_load failed:", e);
                    } finally {
                        setTimeout(() => {
                            btn.textContent = prevText;
                            btn.disabled = false;
                        }, 900);
                    }
                });

                // save settings
                ui.settingsSaveBtn?.addEventListener("click", async () => {
                    const url = (ui.endpointInput?.value || "").trim();
                    MEP.Settings.setEndpoint(url);

                    // sounds
                    if (ui.soundsInput) {
                        MEP.Settings.setSoundsText(ui.soundsInput.value || "");
                    }
                    if (ui.soundDefaultSelect) {
                        MEP.Settings.setSoundDefaultKey(ui.soundDefaultSelect.value || "");
                    }

                    if (ui.hitMsInput) {
                        let ms = parseInt(ui.hitMsInput.value, 10);
                        if (!Number.isFinite(ms) || ms < 500) ms = 500;
                        ui.hitMsInput.value = String(ms);
                        MEP.Settings.setHitFlashMs(ms);
                    }

                    if (ui.historyNextMsInput) {
                        let ms = parseInt(ui.historyNextMsInput.value, 10);
                        if (!Number.isFinite(ms) || ms < 0) ms = 0;
                        ui.historyNextMsInput.value = String(ms);
                        MEP.Settings.setHistoryNextDelayMs(ms);
                    }

                    if (ui.priorityModeSelect) {
                        MEP.Settings.setPriorityMode(ui.priorityModeSelect.value || "high");
                    }
                    if (ui.gamesInput) {
                        MEP.Settings.setSupportedGamesText(ui.gamesInput.value || "");
                    }

                    // historySteps тоже считаем настройкой (если поле есть)
                    if (ui.historySteps) {
                        let v = parseInt(ui.historySteps.value, 10);
                        if (!Number.isFinite(v) || v < 0) v = 0;
                        ui.historySteps.value = String(v);
                        MEP.Settings.setHistorySteps(v);
                    }

                    // пересобрать звуки
                    try {
                        MEP.Sound?.loadFromSettings?.();
                    } catch (e) {}

                    closeSettings();

                    // отправка настроек в БД (тихо, без блокировок UI)
                    try {
                        await MEP.Settings.syncToDb("settings_save");
                    } catch (e) {}
                });

                // test endpoint (ping) — если кнопка добавлена
                ui.testEndpointBtn?.addEventListener("click", async () => {
                    const btn = ui.testEndpointBtn;

                    const url = (ui.endpointInput?.value || "").trim();
                    MEP.Settings.setEndpoint(url); // сразу сохраняем

                    const prevText = btn.textContent || "Тест";
                    btn.textContent = "Тест...";
                    btn.disabled = true;

                    try {
                        if (!MEP.Net?.postJson) throw new Error("MEP.Net.postJson не найден");

                        const resp = await MEP.Net.postJson(url, {
                            action: "ping",
                            ver: MEP.ver,
                            ts: Date.now(),
                        });

                        // Успех только если HTTP ok И json.ok === true
                        const isOk = !!(resp?.ok && resp?.json && resp.json.ok === true);
                        if (isOk) {
                            btn.textContent = "OK";
                        } else {
                            // покажем причину
                            const code = resp?.status ? `HTTP ${resp.status}` : "NO_STATUS";
                            btn.textContent = code;
                            console.warn("[MEP] ping not ok:", resp);
                        }
                    } catch (e) {
                        // Fallback: ping через IMG (обходит часть CSP кейсов)
                        try {
                            if (!MEP.Net?.pingImage) throw e;

                            await MEP.Net.pingImage(url, 6000);
                            btn.textContent = "OK";
                        } catch (e2) {
                            btn.textContent = "CORS/NET";
                            console.warn("[MEP] endpoint test failed:", e);
                            console.warn("[MEP] endpoint test failed (fallback):", e2);
                        }
                    } finally {
                        setTimeout(() => {
                            btn.textContent = prevText;
                            btn.disabled = false;
                        }, 900);
                    }
                });

                // test sound — toggle: PLAY / STOP (чтобы не было бесконечности и наложений)
                ui.testSoundBtn?.addEventListener("click", async () => {
                    const btn = ui.testSoundBtn;

                    // если уже что-то играет — второй клик = STOP
                    if (MEP.Sound?.isPlaying?.()) {
                        try {
                            MEP.Sound?.stopAll?.();
                        } catch (e) {}
                        btn.textContent = "Тест звука";
                        return;
                    }

                    const prevText = btn.textContent || "Тест звука";

                    btn.textContent = "Звук...";
                    btn.disabled = true;

                    try {
                        // на всякий случай перечитаем то, что в полях (если юзер не нажал "Сохранить")
                        if (ui.soundsInput) MEP.Settings.setSoundsText(ui.soundsInput.value || "");
                        if (ui.soundDefaultSelect) MEP.Settings.setSoundDefaultKey(ui.soundDefaultSelect.value || "");

                        try {
                            MEP.Sound?.loadFromSettings?.();
                        } catch (e) {}

                        const k = MEP.Settings.getSoundDefaultKey();
                        const map = MEP.Settings.parseSounds();

                        if (!k || !map[k]) {
                            btn.textContent = "Нет звука";
                        } else {
                            // play всегда стопает всё предыдущее
                            MEP.Sound?.play?.(k);

                            // оставим кнопку в состоянии STOP, пока играет
                            btn.textContent = "Стоп";
                        }
                    } catch (e) {
                        btn.textContent = "Ошибка";
                        console.warn("[MEP] test sound failed:", e);
                        setTimeout(() => (btn.textContent = prevText), 900);
                    } finally {
                        btn.disabled = false;
                    }
                });

                // -------------------------
                // Core UI actions
                // -------------------------
                ui.copyBtn?.addEventListener("click", MEP.UI.copyOldestFirst);

                // >=2 / <2 controls
                if (ui.twoLastN) {
                    ui.twoLastN.addEventListener("input", () => {
                        MEP.UI.updateTwoStats();
                    });
                }
                if (ui.twoAll) {
                    ui.twoAll.addEventListener("change", () => {
                        MEP.UI.updateTwoStats();
                    });
                }

                // history toggle (collapsed by default)
                ui.historyToggleBtn?.addEventListener("click", () => {
                    const btn = ui.historyToggleBtn;
                    const wrap = ui.statsWrap;
                    const arrow = ui.historyArrow;
                    if (!btn || !wrap || !arrow) return;

                    const isOpen = btn.dataset.open === "1";
                    btn.dataset.open = isOpen ? "0" : "1";
                    wrap.style.display = isOpen ? "none" : "block";
                    arrow.textContent = isOpen ? "▼" : "▲";
                });

                // send all stats to DB (batch)
                ui.sendDbBtn?.addEventListener("click", async () => {
                    const btn = ui.sendDbBtn;
                    const prev = btn.textContent || "Отправить в БД";
                    btn.textContent = "Отправка...";
                    btn.disabled = true;

                    try {
                        const resp = await MEP.Sync.sendBatchFromList();

                        const isOk = !!(resp?.ok && resp?.json && resp.json.ok === true);
                        if (isOk) {
                            const saved = resp?.json?.saved ?? resp?.json?.ids?.length ?? "";
                            btn.textContent = saved ? `OK (${saved})` : "OK";
                        } else {
                            const code = resp?.status ? `HTTP ${resp.status}` : "NO_STATUS";
                            btn.textContent = code;
                            console.warn("[MEP] sendBatch not ok:", resp);
                        }
                    } catch (e) {
                        btn.textContent = "Ошибка";
                        console.warn("[MEP] sendBatch failed:", e);
                    } finally {
                        setTimeout(() => {
                            btn.textContent = prev;
                            btn.disabled = false;
                        }, 1200);
                    }
                });

                // steps input (живое сохранение, если поле есть)
                if (ui.historySteps) {
                    // гарантируем значение из Settings
                    ui.historySteps.value = String(MEP.Settings.getHistorySteps());

                    ui.historySteps.addEventListener("input", () => {
                        let v = parseInt(ui.historySteps.value, 10);
                        if (!Number.isFinite(v) || v < 0) v = 0;

                        ui.historySteps.value = String(v);
                        MEP.Settings.setHistorySteps(v);
                    });
                }

                // load button (toggle: start / stop)
                ui.historyBtn?.addEventListener("click", () => {
                    // если уже идёт загрузка — второй клик = остановить
                    if (MEP.State.historyLoading) {
                        MEP.State.historyAbort = true;
                        return;
                    }

                    // старт загрузки
                    MEP.HistoryLoader.loadFromModal();
                });

                // trackCount input
                const countInput = ui.trackCountInput;
                if (!countInput) return;

                countInput.value = String(MEP.State.trackCount);

                countInput.addEventListener("input", () => {
                    let v = parseInt(countInput.value, 10);
                    if (!Number.isFinite(v) || v < 1) v = 1;

                    MEP.State.trackCount = v;
                    MEP.UI.rebuildTrackingTable();
                    MEP.Storage.save();
                });
            },

            updateTwoStats() {
                const ui = MEP.UI.ui;
                if (!ui?.twoWrap || !ui.twoGeFill || !ui.twoLtFill || !ui.twoGePct || !ui.twoLtPct) return;

                const list = Array.isArray(MEP.State.list) ? MEP.State.list : [];

                // UI: последние N или вся история
                let sampleN = 250;

                const isAll = !!ui.twoAll?.checked;

                if (isAll) {
                    sampleN = list.length;
                    if (ui.twoLastN) ui.twoLastN.disabled = true;
                } else {
                    if (ui.twoLastN) ui.twoLastN.disabled = false;

                    if (ui.twoLastN) {
                        let v = parseInt(ui.twoLastN.value || "250", 10);
                        if (!Number.isFinite(v) || v < 1) v = 1;
                        ui.twoLastN.value = String(v);
                        sampleN = v;
                    }
                }

                // берём последние sampleN (list = newest-first)
                const slice = sampleN > 0 ? list.slice(0, sampleN) : [];

                let ge = 0; // >=2
                let lt = 0; // <2

                for (const v of slice) {
                    const n = Number.parseFloat(String(v).replace(",", "."));
                    if (!Number.isFinite(n)) continue;
                    if (n >= 2) ge++;
                    else lt++;
                }

                const total = ge + lt;

                // % до сотых
                const gePct = total ? ((ge / total) * 100) : 0;
                const ltPct = total ? ((lt / total) * 100) : 0;

                const gePctStr = total ? gePct.toFixed(2) : "0.00";
                const ltPctStr = total ? ltPct.toFixed(2) : "0.00";

                ui.twoGeFill.style.width = `${gePctStr}%`;
                ui.twoLtFill.style.width = `${ltPctStr}%`;

                ui.twoGePct.textContent = `${gePctStr}%`;
                ui.twoLtPct.textContent = `${ltPctStr}%`;

                if (ui.twoGeCnt) ui.twoGeCnt.textContent = `${ge}`;
                if (ui.twoLtCnt) ui.twoLtCnt.textContent = `${lt}`;

                // total + diff
                if (ui.twoTotalN) ui.twoTotalN.textContent = String(total);

                // Δ = (>=2) - (<2)
                const diff = ge - lt;

                if (ui.twoDiff) {
                    const sign = diff > 0 ? "+" : diff < 0 ? "" : "";
                    ui.twoDiff.textContent = `${sign}${diff}`;

                    ui.twoDiff.classList.remove("pos", "neg", "zero");
                    if (diff > 0) ui.twoDiff.classList.add("pos");
                    else if (diff < 0) ui.twoDiff.classList.add("neg");
                    else ui.twoDiff.classList.add("zero");
                }

                // history of diffs:
                // 1) полная глобальная история — храним отдельно
                // 2) отображаемая история — считаем по ТЕКУЩЕМУ окну slice,
                //    чтобы верхний график совпадал с текущими цифрами (<2 / >=2 / diff)
                {
                    const fullSeq = list.slice().reverse(); // oldest -> newest по ВСЕЙ истории

                    let geRunFull = 0;
                    let ltRunFull = 0;
                    const fullDiffs = [];

                    for (const v of fullSeq) {
                        const n = Number.parseFloat(String(v).replace(",", "."));
                        if (!Number.isFinite(n)) continue;

                        if (n >= 2) geRunFull++;
                        else ltRunFull++;

                        // Δ = (>=2) - (<2)
                        fullDiffs.push(geRunFull - ltRunFull);
                    }

                    MEP.State.diffFullHistory = fullDiffs;

                    // Для отображаемого графика считаем diff именно по текущему окну:
                    // если Последние=1 и значение <2, то график обязан показать -1 (красный),
                    // а не глобальный накопленный хвост.
                    const viewSeq = slice.slice().reverse(); // oldest -> newest внутри текущего окна

                    let geRunView = 0;
                    let ltRunView = 0;
                    const viewDiffs = [];

                    for (const v of viewSeq) {
                        const n = Number.parseFloat(String(v).replace(",", "."));
                        if (!Number.isFinite(n)) continue;

                        if (n >= 2) geRunView++;
                        else ltRunView++;

                        // Δ = (>=2) - (<2)
                        viewDiffs.push(geRunView - ltRunView);
                    }

                    MEP.State.diffHistory = isAll ? fullDiffs.slice() : viewDiffs;
                }

                // draw diff chart (oldest -> newest)
                MEP.DiffGraph?.render?.();
            },

            render() {
                const ui = MEP.UI.ui;
                if (!ui?.textarea) return;

                ui.textarea.value = MEP.State.list.join(" ");
                if (ui.countEl) ui.countEl.textContent = `(${MEP.State.list.length})`;
                if (ui.titleStat) ui.titleStat.textContent = String(MEP.State.list.length);

                MEP.UI.updateTrackingTable();
                MEP.UI.updateTwoStats();
                MEP.Graph?.render?.();
            },

            async copyOldestFirst() {
                const ui = MEP.UI.ui;
                if (!ui) return;

                const text = MEP.State.list.slice().reverse().join("\n");
                try {
                    await navigator.clipboard.writeText(text);
                    ui.copyBtn.textContent = "Скопировано ✓";
                    setTimeout(() => (ui.copyBtn.textContent = "Скопировать"), 900);
                } catch (e) {
                    ui.textarea.focus();
                    ui.textarea.select();
                    const ok = document.execCommand("copy");
                    ui.copyBtn.textContent = ok ? "Скопировано ✓" : "Не удалось";
                    setTimeout(() => (ui.copyBtn.textContent = "Скопировать"), 900);
                }
            },

            // ---- tracking submodule inside UI ----
            formatForInput(n) {
                return String(n).replace(".", ",");
            },

            normalizeInputValue(v) {
                return MEP.Utils.normText(v).replace(",", ".");
            },

            initTrackingInputs() {
                const ui = MEP.UI.ui;
                if (!ui) return;

                // x (коэффициент)
                for (const inp of ui.xInputs) {
                    const key = inp.dataset.key;

                    if (!MEP.State.track[key] || typeof MEP.State.track[key] !== "object") {
                        // миграция: число -> объект
                        const prev = MEP.State.track[key];
                        MEP.State.track[key] =
                            typeof prev === "number"
                                ? { x: prev, limit: 0, sound: false }
                                : { x: 1.5, limit: 0, sound: false };
                    }

                    inp.value = MEP.UI.formatForInput(MEP.State.track[key].x);

                    inp.oninput = () => {
                        const n = Number.parseFloat(MEP.UI.normalizeInputValue(inp.value));
                        if (Number.isFinite(n)) MEP.State.track[key].x = n;
                        MEP.UI.updateTrackingTable();
                        MEP.Storage.save();
                    };

                    inp.onblur = () => {
                        const n = Number.parseFloat(MEP.UI.normalizeInputValue(inp.value));
                        if (Number.isFinite(n)) inp.value = MEP.UI.formatForInput(n);
                    };
                }

                // limit (порог)
                for (const inp of ui.limitInputs || []) {
                    const key = inp.dataset.key;

                    inp.oninput = () => {
                        let v = Math.floor(Number(inp.value) || 0);
                        if (!Number.isFinite(v) || v < 0) v = 0;
                        inp.value = String(v);

                        if (!MEP.State.track[key] || typeof MEP.State.track[key] !== "object") {
                            MEP.State.track[key] = { x: 1.5, limit: 0, sound: false };
                        }

                        MEP.State.track[key].limit = v;

                        // если порог поменяли — сбросим "уже сработало"
                        delete MEP.State.soundFired[key];

                        MEP.UI.updateTrackingTable();
                        MEP.Storage.save();
                    };
                }

                // color (сохраняем выбранный цвет)
                for (const inp of ui.colorInputs || []) {
                    const key = inp.dataset.key;

                    inp.oninput = () => {
                        const v = (inp.value || "").toString().trim() || "#ffffff";

                        if (!MEP.State.track[key] || typeof MEP.State.track[key] !== "object") {
                            MEP.State.track[key] = { x: 1.5, color: v, limit: 0, soundKey: "" };
                        }

                        MEP.State.track[key].color = v;
                        MEP.Storage.save();
                    };
                }

                // sound select (первая опция = без звука)
                for (const sel of ui.soundSelects || []) {
                    const key = sel.dataset.key;

                    sel.onchange = () => {
                        if (!MEP.State.track[key] || typeof MEP.State.track[key] !== "object") {
                            MEP.State.track[key] = { x: 1.5, limit: 0, soundKey: "" };
                        }

                        // миграция, если вдруг остался bool
                        if ("sound" in MEP.State.track[key] && !("soundKey" in MEP.State.track[key])) {
                            MEP.State.track[key].soundKey = MEP.State.track[key].sound
                                ? MEP.Settings.getSoundDefaultKey() || ""
                                : "";
                            try {
                                delete MEP.State.track[key].sound;
                            } catch (e) {}
                        }

                        MEP.State.track[key].soundKey = (sel.value || "").toString().trim();

                        // смена звука/выключение — сбросим "уже сработало"
                        delete MEP.State.soundFired[key];

                        MEP.Storage.save();
                    };
                }
            },

            updateTrackingTable() {
                const ui = MEP.UI.ui;
                if (!ui) return;

                // helper: визуальный "хит" по строке (долго, пока играет звук / или по настройке)
                const startHit = (key, ms) => {
                    const tr = ui.panel.querySelector(`.mep-track-table tbody tr[data-key="${key}"]`);
                    if (!tr) return;

                    tr.classList.add("mep-hit");

                    MEP._hitTimers = MEP._hitTimers || {};
                    try {
                        clearTimeout(MEP._hitTimers[key]);
                    } catch (e) {}

                    const dur = Math.max(500, Math.floor(Number(ms) || 0));
                    MEP._hitTimers[key] = setTimeout(() => {
                        tr.classList.remove("mep-hit");
                    }, dur);
                };

                const stopHit = (key) => {
                    const tr = ui.panel.querySelector(`.mep-track-table tbody tr[data-key="${key}"]`);
                    if (!tr) return;

                    tr.classList.remove("mep-hit");

                    MEP._hitTimers = MEP._hitTimers || {};
                    try {
                        clearTimeout(MEP._hitTimers[key]);
                    } catch (e) {}
                    delete MEP._hitTimers[key];
                };

                const count = MEP.State.trackCount || 3;

                // кандидаты на звук в этом тике (чтобы выбрать 1 по приоритету)
                const candidates = [];

                for (let i = 1; i <= count; i++) {
                    const key = `t${i}`;
                    let row = MEP.State.track[key];

                    // миграция если вдруг остались числа
                    if (typeof row === "number") {
                        row = MEP.State.track[key] = { x: row, limit: 0, sound: false };
                    }
                    if (!row || typeof row !== "object") {
                        row = MEP.State.track[key] = { x: 1.5, limit: 0, sound: false };
                    }

                    const t = row.x;
                    const streak = MEP.Utils.countStreakLE(t);

                    const span = ui.panel.querySelector(`.mep-streak[data-key="${key}"]`);

                    // звук: если выбран soundKey и есть порог > 0
                    const limit = Math.max(0, Math.floor(Number(row.limit) || 0));

                    // warn: если подряд == порог-1 -> мигаем и играем wrn ОДНОКРАТНО
                    const shouldWarn = limit > 0 && streak === limit - 1;

                    if (span) {
                        span.textContent = String(streak);
                        if (shouldWarn) span.classList.add("mep-warn");
                        else span.classList.remove("mep-warn");
                    }

                    if (shouldWarn) {
                        const rid = (window.MEP?.WS?.last?.roundLikeId || "").toString();
                        if (rid && MEP.State._warnRound !== rid) {
                            MEP.State._warnRound = rid;
                            MEP.State.warnFired = {};
                        }

                        MEP.State.warnFired = MEP.State.warnFired || {};

                        const wk = `${MEP.State._warnRound || ""}|${key}`;
                        if (!MEP.State.warnFired[wk]) {
                            MEP.State.warnFired[wk] = true;
                            MEP.Sound?.playOneShot?.("wrn");
                        }
                    }

                    // миграция на лету (если вдруг остался bool)
                    if ("sound" in row && !("soundKey" in row)) {
                        const wasOn = !!row.sound;
                        const defK = MEP.Settings.getSoundDefaultKey();
                        row.soundKey = wasOn ? defK || "" : "";
                        try {
                            delete row.sound;
                        } catch (e) {}
                    }

                    const soundKey = (row.soundKey || "").toString().trim();
                    const shouldSound = !!soundKey && limit > 0;

                    if (shouldSound) {
                        const fired = !!MEP.State.soundFired[key];

                        // достигли порога в этом тике и ещё не срабатывали
                        if (streak >= limit && !fired) {
                            candidates.push({
                                key,
                                idx: i,
                                x: Number(row.x) || 0,
                                limit,
                                soundKey,
                            });
                        }

                        // если серия сбилась — разрешим следующее срабатывание
                        if (streak < limit && fired) {
                            delete MEP.State.soundFired[key];
                        }
                    } else {
                        if (MEP.State.soundFired[key]) delete MEP.State.soundFired[key];
                    }
                }

                // если есть несколько кандидатов — выбираем 1 по приоритету:
                // режим "high": 1) больший X, 2) больший порог, 3) меньший #
                // режим "low" : 1) меньший X, 2) больший порог, 3) меньший #
                const mutedUntil = Number(MEP.State.soundMutedUntil) || 0;
                const muted = mutedUntil > Date.now();

                // если есть кандидаты, но сейчас mute — ставим "автоповтор" сразу после mute,
                // иначе при отсутствии новых тиков звук может не сработать вообще
                if (candidates.length && muted) {
                    const wait = Math.max(0, mutedUntil - Date.now()) + 50;

                    try {
                        clearTimeout(MEP._muteRetryTimer);
                    } catch (e) {}
                    MEP._muteRetryTimer = setTimeout(() => {
                        try {
                            MEP.UI.updateTrackingTable();
                        } catch (e) {}
                    }, wait);

                    return;
                } else {
                    // если кандидатов нет — убираем таймер
                    try {
                        clearTimeout(MEP._muteRetryTimer);
                    } catch (e) {}
                    MEP._muteRetryTimer = null;
                }

                if (candidates.length && !muted) {
                    const mode = MEP.Settings.getPriorityMode();

                    candidates.sort((a, b) => {
                        if (a.x !== b.x) return mode === "low" ? a.x - b.x : b.x - a.x;
                        if (b.limit !== a.limit) return b.limit - a.limit;
                        return a.idx - b.idx;
                    });

                    const winner = candidates[0];

                    // помечаем fired ВСЕМ кандидатам (чтобы не долбило каждый рендер)
                    for (const c of candidates) {
                        MEP.State.soundFired[c.key] = true;
                    }

                    // играем только победителя (получим Audio, чтобы снять подсветку по окончанию)
                    const a = MEP.Sound?.play?.(winner.soundKey);

                    // мигаем минимум hitFlashMs, но если звук длиннее — мигаем пока играет
                    const baseMs = MEP.Settings.getHitFlashMs();
                    let audioMs = 0;
                    try {
                        if (a && Number.isFinite(a.duration) && a.duration > 0) {
                            audioMs = Math.ceil(a.duration * 1000) + 200;
                        }
                    } catch (e) {}

                    const ms = Math.max(baseMs, audioMs || 0);

                    startHit(winner.key, ms);

                    // если поймали событие конца — снимаем сразу (но не раньше baseMs)
                    try {
                        if (a) {
                            const minUntil = Date.now() + baseMs;
                            a.onended = () => {
                                if (Date.now() < minUntil) {
                                    setTimeout(() => stopHit(winner.key), Math.max(0, minUntil - Date.now()));
                                } else {
                                    stopHit(winner.key);
                                }
                            };
                        }
                    } catch (e) {}
                }
            },
        };

        // -------------------------
        // Tracker module
        // -------------------------
        MEP.Tracker = {
            state: { root: null, observer: null, last4Key: "" },

            stopIfRunning() {
                if (MEP.tracker?.state?.observer) {
                    try {
                        MEP.tracker.state.observer.disconnect();
                    } catch (e) {}
                }
                if (MEP.Tracker.state?.observer) {
                    try {
                        MEP.Tracker.state.observer.disconnect();
                    } catch (e) {}
                    MEP.Tracker.state.observer = null;
                }
            },

            getEntryFromWrap(wrapEl) {
                if (!wrapEl) return null;

                const btn = wrapEl.querySelector("button.button-tag");
                const span = wrapEl.querySelector("span");
                const { raw, clean, num } = MEP.Utils.parseMultiplier(span?.textContent);

                const cls = btn?.className || "";
                let status = "unknown";
                if (cls.includes("variant-positive")) status = "positive";
                else if (cls.includes("variant-neutral")) status = "neutral";

                if (!raw) return null;
                return { raw, clean, num, status, ts: Date.now() };
            },

            readAll(rootEl) {
                const out = [];
                const children = rootEl?.children;
                if (!children || !children.length) return out;

                for (let i = 0; i < children.length; i++) {
                    const entry = MEP.Tracker.getEntryFromWrap(children.item(i));
                    if (entry?.raw) out.push(entry);
                }
                return out; // newest-first
            },

            // reconcile: если трекер пропустил несколько игр (например, пока грузили историю),
            // то сверяем последние N из DOM и последние N у нас, и дозаполняем "дырку".
            reconcileLatestWindow(rootEl, N = 10) {
                try {
                    if (!rootEl) return 0;
                    if (MEP.State.historyLoading) return 0;

                    const entries = MEP.Tracker.readAll(rootEl).slice(0, Math.max(3, N));
                    if (!entries.length) return 0;

                    const dom = entries.map((e) => e.clean);
                    const ours = (MEP.State.list || []).slice(0, dom.length);

                    if (!ours.length) return 0;
                    if (dom[0] === ours[0]) return 0;

                    // ищем, где в DOM встречается наш текущий "самый новый"
                    const idx = dom.indexOf(ours[0]);
                    if (idx <= 0) return 0;

                    // значит dom[0..idx-1] — это недостающие новые значения
                    const missing = entries.slice(0, idx);

                    // во время backfill НЕ играем звук (и не даём триггерить пороги)
                    MEP.State.soundMutedUntil = Date.now() + 2000;

                    // добавляем "с конца", чтобы сохранить newest-first порядок
                    for (let j = missing.length - 1; j >= 0; j--) {
                        const e = missing[j];

                        const k = `${e.raw}|${e.status}`;
                        // вставляем только если это реально не наш текущий head
                        if (MEP.State.list[0] === e.clean) continue;

                        MEP.State.list.unshift(e.clean);

                        const limit = MEP.State.maxItems;
                        if (limit > 0 && MEP.State.list.length > limit) {
                            MEP.State.list.length = limit;
                        }

                        const prev = MEP.State.map.get(k);
                        if (prev) {
                            prev.count += 1;
                            prev.ts = e.ts;
                        } else {
                            MEP.State.map.set(k, { ...e, count: 1 });
                        }

                        // lastAddedKey подвинем на самое свежее из DOM
                        if (j === 0) MEP.State.lastAddedKey = k;
                    }

                    // чтобы не было двойного addNewest на этом же тике
                    const first4 = entries.slice(0, 4);
                    if (first4.length) MEP.Tracker.state.last4Key = MEP.Utils.sliceKey(first4);

                    MEP.UI.render();
                    console.log("[MEP] reconcile +", missing.length, "items");

                    // ВАЖНО: reconcile добавляет пропущенные игры, но раньше не отправлял их в БД.
                    // Отправим самый новый из missing (это реальная "одиночная" игра).
                    try {
                        const newestMissing = missing[0];
                        if (newestMissing) {
                            console.log("[MEP] reconcile LIVE->DB:", {
                                clean: newestMissing.clean,
                                raw: newestMissing.raw,
                                status: newestMissing.status,
                                ts: newestMissing.ts,
                            });
                            try {
                                MEP.Sync?.sendEntry?.(newestMissing);
                            } catch (e) {
                                console.warn("[MEP] reconcile sendEntry failed:", e);
                            }
                        }
                    } catch (e) {
                        console.warn("[MEP] reconcile LIVE->DB exception:", e);
                    }

                    return missing.length;
                } catch (e) {
                    return 0;
                }
            },

            addNewest(entry) {
                const key = `${entry.raw}|${entry.status}`;
                if (key === MEP.State.lastAddedKey) return;

                MEP.State.list.unshift(entry.clean);
                const limit = MEP.State.maxItems;
                if (limit > 0 && MEP.State.list.length > limit) {
                    MEP.State.list.length = limit;
                }

                const prev = MEP.State.map.get(key);
                if (prev) {
                    prev.count += 1;
                    prev.ts = entry.ts;
                } else {
                    MEP.State.map.set(key, { ...entry, count: 1 });
                }

                MEP.State.lastAddedKey = key;

                MEP.UI.render();
                console.log("[MEP] NEW:", entry.clean, entry.status, "total=", MEP.State.list.length);

                // авто-отправка каждого нового результата
                console.log("[MEP] LIVE->DB sendEntry call:", {
                    clean: entry.clean,
                    raw: entry.raw,
                    status: entry.status,
                    ts: entry.ts,
                });
                try {
                    MEP.Sync?.sendEntry?.(entry);
                } catch (e) {
                    console.warn("[MEP] sendEntry call failed:", e);
                }
            },

            handleUpdate() {
                const root = MEP.Tracker.state.root;
                if (!root) return;

                // дозаполнение пропусков по DOM (последние 10)
                try {
                    MEP.Tracker.reconcileLatestWindow(root, 10);
                } catch (e) {}

                const latest4 = [];
                for (let i = 0; i < 4; i++) {
                    const entry = MEP.Tracker.getEntryFromWrap(root?.children?.item(i));
                    if (entry) latest4.push(entry);
                }
                if (!latest4.length) return;

                const key = MEP.Utils.sliceKey(latest4);
                if (key !== MEP.Tracker.state.last4Key) {
                    MEP.Tracker.state.last4Key = key;
                    MEP.Tracker.addNewest(latest4[0]);
                }
            },

            initialLoadFromDom() {
                const root = MEP.Tracker.state.root;
                if (!root) return false;

                const all = MEP.Tracker.readAll(root);
                if (!all.length) return false;

                // Сколько значений считаем "минимумом" на старте: берем до 10 видимых
                const minNeed = Math.min(10, all.length);
                const hasEnough = (MEP.State.list?.length || 0) >= minNeed;

                // Если список пустой ИЛИ короче, чем видимые игры — подтягиваем DOM сразу (без кнопки)
                if (!hasEnough && !MEP.State.historyLoading) {
                    // на старте/автоподтяжке — не играем звук, чтобы не было ложных сигналов
                    MEP.State.soundMutedUntil = Date.now() + 2000;

                    const values = [];
                    let prev = "";
                    for (const e of all) {
                        if (e.clean && e.clean !== prev) values.push(e.clean);
                        prev = e.clean;
                    }

                    // перестраиваем целиком из DOM, потому что это "истина" при старте
                    MEP.State.list = MEP.State.maxItems > 0 ? values.slice(0, MEP.State.maxItems) : values;

                    // map тоже пересобираем заново под новую list
                    MEP.State.map.clear();
                    for (const e of all) {
                        const k = `${e.raw}|${e.status}`;
                        const p = MEP.State.map.get(k);
                        if (p) p.count += 1;
                        else MEP.State.map.set(k, { ...e, count: 1 });
                    }

                    const newest = all[0];
                    if (newest) MEP.State.lastAddedKey = `${newest.raw}|${newest.status}`;

                    const first4 = all.slice(0, 4);
                    if (first4.length) MEP.Tracker.state.last4Key = MEP.Utils.sliceKey(first4);

                    MEP.State.initialLoaded = true;
                    MEP.UI.render();
                    console.log("[MEP] initial DOM preload:", MEP.State.list.length, "(need>=", minNeed, ")");
                }

                return true;
            },

            start() {
                if (MEP.Tracker.state.observer && MEP.Tracker.state.root) return;

                const tryBind = () => {
                    const el = MEP.Utils.findRoot();
                    if (!el) return false;

                    MEP.Tracker.state.root = el;

                    // пробуем первичную загрузку
                    MEP.Tracker.initialLoadFromDom();

                    MEP.Tracker.state.observer = new MutationObserver(() => {
                        if (!MEP.State.initialLoaded) MEP.Tracker.initialLoadFromDom();
                        else queueMicrotask(MEP.Tracker.handleUpdate);
                    });

                    MEP.Tracker.state.observer.observe(el, {
                        childList: true,
                        subtree: true,
                        characterData: true,
                        attributes: true,
                    });

                    console.log("[MEP] observer started on root:", el);
                    return true;
                };

                if (tryBind()) return;

                const t0 = Date.now();
                const timer = setInterval(() => {
                    if (tryBind()) {
                        clearInterval(timer);
                        return;
                    }
                    if (Date.now() - t0 > 30000) {
                        clearInterval(timer);
                        console.warn("[MEP] root not found. Tried:", MEP.Config.SELECTORS);
                    }
                }, 250);
            },

            stop() {
                MEP.Tracker.state.observer?.disconnect?.();
                MEP.Tracker.state.observer = null;
                MEP.Tracker.state.root = null;
                console.log("[MEP] observer stopped");
            },
        };

        // -------------------------
        // Main module
        // -------------------------
        MEP.Main = {
            boot() {
                MEP.Storage.load();

                //загрузка настроек
                MEP.Settings.load();

                // определяем текущую игру и проверяем реестр поддерживаемых
                MEP.State.gameSlug = MEP.Utils.getGameSlug();
                MEP.State.gameName = MEP.Utils.getGameName();

                // если пользователь задал реестр игр в настройках — он главнее дефолта
                try {
                    const reg = MEP.Settings.parseSupportedGames();
                    if (Array.isArray(reg) && reg.length) {
                        MEP.Config.SUPPORTED_GAMES = reg;
                    }
                } catch (e) {}

                MEP.State.gameSupported = Array.isArray(MEP.Config.SUPPORTED_GAMES)
                    ? MEP.Config.SUPPORTED_GAMES.includes(MEP.State.gameSlug)
                    : false;

                // обновим "публичные" поля MEP (чтобы не ломать привычные обращения)
                MEP.map = MEP.State.map;
                MEP.list = MEP.State.list;
                MEP.maxItems = MEP.State.maxItems;
                MEP._lastAddedKey = MEP.State.lastAddedKey;
                MEP._initialLoaded = MEP.State.initialLoaded;
                MEP.track = MEP.State.track;

                // остановим старые версии наблюдателей
                MEP.Tracker.stopIfRunning();

                // CSS всегда
                MEP.Style.injectMinCss();

                // панель всегда (чтобы показать "в разработке")
                MEP.UI.mount();

                // если игра не поддерживается — показываем заглушку и выходим (никакой логики/трекера)
                if (!MEP.State.gameSupported) {
                    try {
                        const p = document.getElementById(MEP.Config.PANEL_ID);
                        if (p) p.classList.add("mep-unsupported");

                        const body = p?.querySelector(".mep-body");
                        if (body) {
                            body.innerHTML = `
                <div class="mep-unsupported-msg" style="padding:16px; border:1px dashed rgba(255,255,255,0.18); border-radius:12px; margin-top:10px; line-height:1.35; opacity:0.95;">
                  логика игры <b>${MEP.State.gameName}</b> в разработке
                </div>
              `;
                        }
                    } catch (e) {}
                    console.log(`[MEP] game not supported: ${MEP.State.gameSlug} (${MEP.State.gameName})`);
                    return;
                }

                // звуки из настроек (сразу при старте)
                try {
                    MEP.Sound?.loadFromSettings?.();
                } catch (e) {}

                MEP.UI.rebuildTrackingTable();
                MEP.UI.render();
                MEP.Tracker.start();

                // экспорт совместимого API
                MEP.tracker = {
                    state: MEP.Tracker.state,
                    start: MEP.Tracker.start,
                    stop: MEP.Tracker.stop,
                    forceTick: MEP.Tracker.handleUpdate,
                    render: MEP.UI.render,
                    copy: MEP.UI.copyOldestFirst,
                    reloadFromDom: () => {
                        MEP.State.list.length = 0;
                        MEP.State.map.clear();
                        MEP.State.lastAddedKey = "";
                        MEP.State.initialLoaded = false;
                        MEP.Tracker.initialLoadFromDom();
                        MEP.UI.render();
                        console.log("[MEP] reloaded from DOM");
                    },
                    clear: () => {
                        MEP.State.list.length = 0;
                        MEP.State.map.clear();
                        MEP.State.lastAddedKey = "";
                        MEP.State.initialLoaded = false;
                        MEP.UI.render();
                        console.log("[MEP] cleared");
                    },
                };
            },
        };

        // -------------------------
        // Boot
        // -------------------------
        MEP.Main.boot();
    } catch (err) {
        console.error("[MEP] boot error:", err);
    }
})();
