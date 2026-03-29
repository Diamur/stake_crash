// === crash.js 0.1.5.12  ====
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

        const buildStrategy1DefaultState = () => ({
            id: "strategy1",
            name: "Стратегия1",
            enabled: false,
            isExecuting: false,
            executionLocked: false,
            config: {
                riskPercent: 0,
                startStakeMode: "fixed",
                startStakeValue: 0,
                startStakeArrayText: "",
                stakeGrowthMode: "factor",
                stakeGrowthFactor: 1,
                stakeGrowthArrayText: "",
                targetMode: "fixed",
                targetMultiplierValue: 2,
                targetMultiplierArrayText: "",
                maxLosses: 0,
            },
            charterCheck: {
                allowed: true,
                blockReason: "",
                roundsHourAllowed: true,
                rounds6hAllowed: true,
                roundsDayAllowed: true,
                winsHourAllowed: true,
                wins6hAllowed: true,
                winsDayAllowed: true,
                lossesHourAllowed: true,
                losses6hAllowed: true,
                lossesDayAllowed: true,
                breakAllowed: true,
            },
            cycle: {
                cycleId: "",
                isActive: false,
                startBalance: 0,
                currentBalance: 0,
                cyclePnL: 0,
                totalStakeSum: 0,
                roundCount: 0,
                lossCount: 0,
                winCount: 0,
                stepIndex: 0,
                lastStake: 0,
                lastTargetMultiplier: 0,
                endReason: "",
            },
            counters: {
                startBalanceBeforeCycle: 0,
                currentBalanceAfterRound: 0,
                lastStake: 0,
                totalStakeSumInCycle: 0,
                lossRoundCount: 0,
                winRoundCount: 0,
            },
            timers: {
                nowTs: 0,
                cycleStartedAtTs: 0,
                cycleFinishedAtTs: 0,
                cycleDurationMs: 0,
                lastRoundStartedAtTs: 0,
                lastRoundFinishedAtTs: 0,
                lastRoundResultAtTs: 0,
                breakStartedAtTs: 0,
                breakEndsAtTs: 0,
                isBreakActive: false,
                hourKey: "",
                sixHourKey: "",
                dayKey: "",
            },
            conditions: {
                mode: "all",
                rules: [],
                lastResult: {
                    canBet: false,
                    shouldEndCycle: false,
                    reason: "",
                },
            },
            stakePlan: {
                betAmount: 0,
                targetMultiplier: 0,
                allowedByRisk: false,
                sourceStep: "",
                calcMode: "",
                ready: false,
            },
            runtime: {
                lastSignal: "",
                lastConditionResult: null,
                lastStakePlanResult: null,
                lastProcessedRoundId: "",
                lastProcessedBalanceTs: 0,
                waitingRoundResult: false,
                lastCycleAction: "",
                decisionState: {
                    canMakeBet: false,
                    shouldEndCycle: false,
                    branch: "",
                    waitReason: "",
                    statusCode: "idle",
                    statusText: "Стратегия в ожидании",
                    lastDecisionAtTs: 0,
                },
            },
            ui: {
                sectionExpanded: true,
                conditionsExpanded: true,
                stakeBuilderExpanded: true,
                cycleInfoExpanded: true,
            },
        });

        const buildStrategy2DefaultState = () => ({
            id: "strategy2",
            name: "Стратегия2",
            enabled: false,
            isExecuting: false,
            executionLocked: true,
            runtime: {},
        });
        MEP.ver = "0.1.5.12";

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
                    stakeGraphDensity: MEP.State.stakeGraphDensity,
                    stakeGraphDensitySync: MEP.State.stakeGraphDensitySync,
                    stakeGraphAutoHeight: MEP.State.stakeGraphAutoHeight,
                    stakeGraphPlayersScale: MEP.State.stakeGraphPlayersScale,
                    stakeGraphBetScale: MEP.State.stakeGraphBetScale,
                    stakeGraphShowPlayers: MEP.State.stakeGraphShowPlayers,
                    stakeGraphShowBet: MEP.State.stakeGraphShowBet,
                    balanceGraphDensity: MEP.State.balanceGraphDensity,
                    balanceGraphDensitySync: MEP.State.balanceGraphDensitySync,
                    balanceGraphAutoHeight: MEP.State.balanceGraphAutoHeight,
                    balanceGraphScale: MEP.State.balanceGraphScale,
                    charterRoundsPerHour: MEP.State.charterRoundsPerHour,
                    charterRoundsPer6Hours: MEP.State.charterRoundsPer6Hours,
                    charterRoundsPerDay: MEP.State.charterRoundsPerDay,
                    charterWinsPerHour: MEP.State.charterWinsPerHour,
                    charterWinsPer6Hours: MEP.State.charterWinsPer6Hours,
                    charterWinsPerDay: MEP.State.charterWinsPerDay,
                    charterMaxStakePercent: MEP.State.charterMaxStakePercent,
                    charterLossesPerHour: MEP.State.charterLossesPerHour,
                    charterLossesPer6Hours: MEP.State.charterLossesPer6Hours,
                    charterLossesPerDay: MEP.State.charterLossesPerDay,
                    charterBreakAfter3LossesMin: MEP.State.charterBreakAfter3LossesMin,
                    frequencyThreshold: MEP.State.frequencyThreshold,
                    frequencyPeriod: MEP.State.frequencyPeriod,
                    frequencyGraphDensity: MEP.State.frequencyGraphDensity,
                    frequencyGraphDensitySync: MEP.State.frequencyGraphDensitySync,
                    frequencyGraphLine: MEP.State.frequencyGraphLine,
                    frequencyVectorEnabled: MEP.State.frequencyVectorEnabled,
                    frequencyVectorPeriod: MEP.State.frequencyVectorPeriod,
                    frequencyVectorPhaseShift: MEP.State.frequencyVectorPhaseShift,
                    frequencyVectorFlatEpsilon: MEP.State.frequencyVectorFlatEpsilon,
                    frequencyVectorMainColor: MEP.State.frequencyVectorMainColor,
                    frequencyVectorShiftColor: MEP.State.frequencyVectorShiftColor,
                    frequencyVectorMainWidth: MEP.State.frequencyVectorMainWidth,
                    frequencyVectorShiftWidth: MEP.State.frequencyVectorShiftWidth,
                    graphLine: MEP.State.graphLine,
                    graphLine2: MEP.State.graphLine2,
                    graphLine3: MEP.State.graphLine3,

                    diffDensity: MEP.State.diffDensity,
                    diffDensityManual: MEP.State.diffDensityManual,
                    diffDensitySync: MEP.State.diffDensitySync,

                    diffPosLevel: MEP.State.diffPosLevel,
                    diffNegLevel: MEP.State.diffNegLevel,
                    diffStartIndex: MEP.State.diffStartIndex,
                    diffVectorEnabled: MEP.State.diffVectorEnabled,
                    diffVectorPeriod: MEP.State.diffVectorPeriod,
                    diffVectorPhaseShift: MEP.State.diffVectorPhaseShift,
                    diffVectorFlatEpsilon: MEP.State.diffVectorFlatEpsilon,
                    diffVectorMainColor: MEP.State.diffVectorMainColor,
                    diffVectorShiftColor: MEP.State.diffVectorShiftColor,
                    diffVectorMainWidth: MEP.State.diffVectorMainWidth,
                    diffVectorShiftWidth: MEP.State.diffVectorShiftWidth,
                    strategy1Enabled: !!MEP.State?.strategies?.strategy1?.enabled,
                    strategy1Config: { ...(MEP.State?.strategies?.strategy1?.config || {}) },
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
                        if (typeof data.stakeGraphDensity === "number") MEP.State.stakeGraphDensity = data.stakeGraphDensity;
                        if (typeof data.stakeGraphDensitySync === "boolean") MEP.State.stakeGraphDensitySync = data.stakeGraphDensitySync;
                        if (typeof data.stakeGraphAutoHeight === "boolean") MEP.State.stakeGraphAutoHeight = data.stakeGraphAutoHeight;
                        if (typeof data.stakeGraphPlayersScale === "number") MEP.State.stakeGraphPlayersScale = data.stakeGraphPlayersScale;
                        if (typeof data.stakeGraphBetScale === "number") MEP.State.stakeGraphBetScale = data.stakeGraphBetScale;
                        if (typeof data.stakeGraphShowPlayers === "boolean") MEP.State.stakeGraphShowPlayers = data.stakeGraphShowPlayers;
                        if (typeof data.stakeGraphShowBet === "boolean") MEP.State.stakeGraphShowBet = data.stakeGraphShowBet;
                        if (typeof data.balanceGraphDensity === "number") MEP.State.balanceGraphDensity = data.balanceGraphDensity;
                        if (typeof data.balanceGraphDensitySync === "boolean") MEP.State.balanceGraphDensitySync = data.balanceGraphDensitySync;
                        if (typeof data.balanceGraphAutoHeight === "boolean") MEP.State.balanceGraphAutoHeight = data.balanceGraphAutoHeight;
                        if (typeof data.balanceGraphScale === "number") MEP.State.balanceGraphScale = data.balanceGraphScale;
                        if (typeof data.charterRoundsPerHour === "number") MEP.State.charterRoundsPerHour = data.charterRoundsPerHour;
                        if (typeof data.charterRoundsPer6Hours === "number") MEP.State.charterRoundsPer6Hours = data.charterRoundsPer6Hours;
                        if (typeof data.charterRoundsPerDay === "number") MEP.State.charterRoundsPerDay = data.charterRoundsPerDay;
                        if (typeof data.charterWinsPerHour === "number") MEP.State.charterWinsPerHour = data.charterWinsPerHour;
                        if (typeof data.charterWinsPer6Hours === "number") MEP.State.charterWinsPer6Hours = data.charterWinsPer6Hours;
                        if (typeof data.charterWinsPerDay === "number") MEP.State.charterWinsPerDay = data.charterWinsPerDay;
                        if (typeof data.charterMaxStakePercent === "number") MEP.State.charterMaxStakePercent = data.charterMaxStakePercent;
                        if (typeof data.charterLossesPerHour === "number") MEP.State.charterLossesPerHour = data.charterLossesPerHour;
                        if (typeof data.charterLossesPer6Hours === "number") MEP.State.charterLossesPer6Hours = data.charterLossesPer6Hours;
                        if (typeof data.charterLossesPerDay === "number") MEP.State.charterLossesPerDay = data.charterLossesPerDay;
                        if (typeof data.charterBreakAfter3LossesMin === "number") MEP.State.charterBreakAfter3LossesMin = data.charterBreakAfter3LossesMin;
                        if (typeof data.frequencyThreshold === "number") MEP.State.frequencyThreshold = data.frequencyThreshold;
                        if (typeof data.frequencyPeriod === "number") MEP.State.frequencyPeriod = data.frequencyPeriod;
                        if (typeof data.frequencyGraphDensity === "number") MEP.State.frequencyGraphDensity = data.frequencyGraphDensity;
                        if (typeof data.frequencyGraphDensitySync === "boolean") MEP.State.frequencyGraphDensitySync = data.frequencyGraphDensitySync;
                        if (typeof data.frequencyGraphLine === "number") MEP.State.frequencyGraphLine = data.frequencyGraphLine;
                        if (typeof data.frequencyVectorEnabled === "boolean") MEP.State.frequencyVectorEnabled = data.frequencyVectorEnabled;
                        if (typeof data.frequencyVectorPeriod === "number") MEP.State.frequencyVectorPeriod = data.frequencyVectorPeriod;
                        if (typeof data.frequencyVectorPhaseShift === "number") MEP.State.frequencyVectorPhaseShift = data.frequencyVectorPhaseShift;
                        if (typeof data.frequencyVectorFlatEpsilon === "number") MEP.State.frequencyVectorFlatEpsilon = data.frequencyVectorFlatEpsilon;
                        if (typeof data.frequencyVectorMainColor === "string") MEP.State.frequencyVectorMainColor = data.frequencyVectorMainColor;
                        if (typeof data.frequencyVectorShiftColor === "string") MEP.State.frequencyVectorShiftColor = data.frequencyVectorShiftColor;
                        if (typeof data.frequencyVectorMainWidth === "number") MEP.State.frequencyVectorMainWidth = data.frequencyVectorMainWidth;
                        if (typeof data.frequencyVectorShiftWidth === "number") MEP.State.frequencyVectorShiftWidth = data.frequencyVectorShiftWidth;
                        if (typeof data.graphLine === "number") MEP.State.graphLine = data.graphLine;
                        if (typeof data.graphLine2 === "number") MEP.State.graphLine2 = data.graphLine2;
                        if (typeof data.graphLine3 === "number") MEP.State.graphLine3 = data.graphLine3;

                        if (typeof data.diffDensity === "number") MEP.State.diffDensity = data.diffDensity;
                        if (typeof data.diffDensityManual === "number") MEP.State.diffDensityManual = data.diffDensityManual;
                        if (typeof data.diffDensitySync === "boolean") MEP.State.diffDensitySync = data.diffDensitySync;

                        if (typeof data.diffPosLevel === "number") MEP.State.diffPosLevel = data.diffPosLevel;
                        if (typeof data.diffNegLevel === "number") MEP.State.diffNegLevel = data.diffNegLevel;
                        if (typeof data.diffStartIndex === "number") MEP.State.diffStartIndex = data.diffStartIndex;
                        if (typeof data.diffVectorEnabled === "boolean") MEP.State.diffVectorEnabled = data.diffVectorEnabled;
                        if (typeof data.diffVectorPeriod === "number") MEP.State.diffVectorPeriod = data.diffVectorPeriod;
                        if (typeof data.diffVectorPhaseShift === "number") MEP.State.diffVectorPhaseShift = data.diffVectorPhaseShift;
                        if (typeof data.diffVectorFlatEpsilon === "number") MEP.State.diffVectorFlatEpsilon = data.diffVectorFlatEpsilon;
                        if (typeof data.diffVectorMainColor === "string") MEP.State.diffVectorMainColor = data.diffVectorMainColor;
                        if (typeof data.diffVectorShiftColor === "string") MEP.State.diffVectorShiftColor = data.diffVectorShiftColor;
                        if (typeof data.diffVectorMainWidth === "number") MEP.State.diffVectorMainWidth = data.diffVectorMainWidth;
                        if (typeof data.diffVectorShiftWidth === "number") MEP.State.diffVectorShiftWidth = data.diffVectorShiftWidth;
                        if (MEP.State?.strategies?.strategy1) {
                            if (typeof data.strategy1Enabled === "boolean") MEP.State.strategies.strategy1.enabled = data.strategy1Enabled;
                            if (data.strategy1Config && typeof data.strategy1Config === "object") {
                                MEP.State.strategies.strategy1.config = {
                                    ...MEP.State.strategies.strategy1.config,
                                    ...data.strategy1Config,
                                };
                            }
                        }

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
                    if (typeof data.stakeGraphDensity === "number") MEP.State.stakeGraphDensity = data.stakeGraphDensity;
                    if (typeof data.stakeGraphDensitySync === "boolean") MEP.State.stakeGraphDensitySync = data.stakeGraphDensitySync;
                    if (typeof data.stakeGraphAutoHeight === "boolean") MEP.State.stakeGraphAutoHeight = data.stakeGraphAutoHeight;
                    if (typeof data.stakeGraphPlayersScale === "number") MEP.State.stakeGraphPlayersScale = data.stakeGraphPlayersScale;
                    if (typeof data.stakeGraphBetScale === "number") MEP.State.stakeGraphBetScale = data.stakeGraphBetScale;
                    if (typeof data.stakeGraphShowPlayers === "boolean") MEP.State.stakeGraphShowPlayers = data.stakeGraphShowPlayers;
                    if (typeof data.stakeGraphShowBet === "boolean") MEP.State.stakeGraphShowBet = data.stakeGraphShowBet;
                    if (typeof data.balanceGraphDensity === "number") MEP.State.balanceGraphDensity = data.balanceGraphDensity;
                    if (typeof data.balanceGraphDensitySync === "boolean") MEP.State.balanceGraphDensitySync = data.balanceGraphDensitySync;
                    if (typeof data.balanceGraphAutoHeight === "boolean") MEP.State.balanceGraphAutoHeight = data.balanceGraphAutoHeight;
                    if (typeof data.balanceGraphScale === "number") MEP.State.balanceGraphScale = data.balanceGraphScale;
                    if (typeof data.charterRoundsPerHour === "number") MEP.State.charterRoundsPerHour = data.charterRoundsPerHour;
                    if (typeof data.charterRoundsPer6Hours === "number") MEP.State.charterRoundsPer6Hours = data.charterRoundsPer6Hours;
                    if (typeof data.charterRoundsPerDay === "number") MEP.State.charterRoundsPerDay = data.charterRoundsPerDay;
                    if (typeof data.charterWinsPerHour === "number") MEP.State.charterWinsPerHour = data.charterWinsPerHour;
                    if (typeof data.charterWinsPer6Hours === "number") MEP.State.charterWinsPer6Hours = data.charterWinsPer6Hours;
                    if (typeof data.charterWinsPerDay === "number") MEP.State.charterWinsPerDay = data.charterWinsPerDay;
                    if (typeof data.charterMaxStakePercent === "number") MEP.State.charterMaxStakePercent = data.charterMaxStakePercent;
                    if (typeof data.charterLossesPerHour === "number") MEP.State.charterLossesPerHour = data.charterLossesPerHour;
                    if (typeof data.charterLossesPer6Hours === "number") MEP.State.charterLossesPer6Hours = data.charterLossesPer6Hours;
                    if (typeof data.charterLossesPerDay === "number") MEP.State.charterLossesPerDay = data.charterLossesPerDay;
                    if (typeof data.charterBreakAfter3LossesMin === "number") MEP.State.charterBreakAfter3LossesMin = data.charterBreakAfter3LossesMin;
                    if (typeof data.frequencyThreshold === "number") MEP.State.frequencyThreshold = data.frequencyThreshold;
                    if (typeof data.frequencyPeriod === "number") MEP.State.frequencyPeriod = data.frequencyPeriod;
                    if (typeof data.frequencyGraphDensity === "number") MEP.State.frequencyGraphDensity = data.frequencyGraphDensity;
                    if (typeof data.frequencyGraphDensitySync === "boolean") MEP.State.frequencyGraphDensitySync = data.frequencyGraphDensitySync;
                    if (typeof data.frequencyGraphLine === "number") MEP.State.frequencyGraphLine = data.frequencyGraphLine;
                    if (typeof data.frequencyVectorEnabled === "boolean") MEP.State.frequencyVectorEnabled = data.frequencyVectorEnabled;
                    if (typeof data.frequencyVectorPeriod === "number") MEP.State.frequencyVectorPeriod = data.frequencyVectorPeriod;
                    if (typeof data.frequencyVectorPhaseShift === "number") MEP.State.frequencyVectorPhaseShift = data.frequencyVectorPhaseShift;
                    if (typeof data.frequencyVectorFlatEpsilon === "number") MEP.State.frequencyVectorFlatEpsilon = data.frequencyVectorFlatEpsilon;
                    if (typeof data.frequencyVectorMainColor === "string") MEP.State.frequencyVectorMainColor = data.frequencyVectorMainColor;
                    if (typeof data.frequencyVectorShiftColor === "string") MEP.State.frequencyVectorShiftColor = data.frequencyVectorShiftColor;
                    if (typeof data.frequencyVectorMainWidth === "number") MEP.State.frequencyVectorMainWidth = data.frequencyVectorMainWidth;
                    if (typeof data.frequencyVectorShiftWidth === "number") MEP.State.frequencyVectorShiftWidth = data.frequencyVectorShiftWidth;
                    if (typeof data.graphLine === "number") MEP.State.graphLine = data.graphLine;
                    if (typeof data.graphLine2 === "number") MEP.State.graphLine2 = data.graphLine2;
                    if (typeof data.graphLine3 === "number") MEP.State.graphLine3 = data.graphLine3;

                    if (typeof data.diffDensity === "number") MEP.State.diffDensity = data.diffDensity;
                    if (typeof data.diffDensityManual === "number") MEP.State.diffDensityManual = data.diffDensityManual;
                    if (typeof data.diffDensitySync === "boolean") MEP.State.diffDensitySync = data.diffDensitySync;

                    if (typeof data.diffPosLevel === "number") MEP.State.diffPosLevel = data.diffPosLevel;
                    if (typeof data.diffNegLevel === "number") MEP.State.diffNegLevel = data.diffNegLevel;
                    if (typeof data.diffStartIndex === "number") MEP.State.diffStartIndex = data.diffStartIndex;
                    if (typeof data.diffVectorEnabled === "boolean") MEP.State.diffVectorEnabled = data.diffVectorEnabled;
                    if (typeof data.diffVectorPeriod === "number") MEP.State.diffVectorPeriod = data.diffVectorPeriod;
                    if (typeof data.diffVectorPhaseShift === "number") MEP.State.diffVectorPhaseShift = data.diffVectorPhaseShift;
                    if (typeof data.diffVectorFlatEpsilon === "number") MEP.State.diffVectorFlatEpsilon = data.diffVectorFlatEpsilon;
                    if (typeof data.diffVectorMainColor === "string") MEP.State.diffVectorMainColor = data.diffVectorMainColor;
                    if (typeof data.diffVectorShiftColor === "string") MEP.State.diffVectorShiftColor = data.diffVectorShiftColor;
                    if (typeof data.diffVectorMainWidth === "number") MEP.State.diffVectorMainWidth = data.diffVectorMainWidth;
                    if (typeof data.diffVectorShiftWidth === "number") MEP.State.diffVectorShiftWidth = data.diffVectorShiftWidth;
                    if (MEP.State?.strategies?.strategy1) {
                        if (typeof data.strategy1Enabled === "boolean") MEP.State.strategies.strategy1.enabled = data.strategy1Enabled;
                        if (data.strategy1Config && typeof data.strategy1Config === "object") {
                            MEP.State.strategies.strategy1.config = {
                                ...MEP.State.strategies.strategy1.config,
                                ...data.strategy1Config,
                            };
                        }
                    }

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
				#${PANEL_ID} .mep-main-tabs{
				display:flex;
				gap:8px;
				padding:10px 12px 8px;
				border-bottom:1px solid rgba(255,255,255,0.08);
				background: rgba(255,255,255,0.03);
				}
				#${PANEL_ID} .mep-main-tab-btn,
				#${PANEL_ID} .mep-game-tab-btn{
				height:30px;
				padding:0 12px;
				border-radius:8px;
				border:1px solid rgba(255,255,255,0.14);
				background: rgba(255,255,255,0.05);
				color:#fff;
				font-size:13px;
				cursor:pointer;
				}
				#${PANEL_ID} .mep-main-tab-btn.is-active,
				#${PANEL_ID} .mep-game-tab-btn.is-active{
				background: rgba(255,255,255,0.20);
				border-color: rgba(255,255,255,0.36);
				}
				#${PANEL_ID} .mep-tab-panel{
				display:none;
				}
				#${PANEL_ID} .mep-tab-panel.is-active{
				display:block;
				}
				#${PANEL_ID} .mep-tab-panel-main{
				flex:1 1 auto;
				min-height:0;
				overflow:auto;
				}
				#${PANEL_ID} .mep-main-content{
				padding-bottom:12px;
				}
				#${PANEL_ID} .mep-main-content > .mep-body{
				overflow:visible;
				flex:0 0 auto;
				}
				#${PANEL_ID} .mep-tab-panel-game{
				flex:1 1 auto;
				min-height:0;
				overflow:auto;
				padding:12px;
				}
				#${PANEL_ID} .mep-game-tabs{
				display:flex;
				gap:8px;
				margin-bottom:10px;
				}
				#${PANEL_ID} .mep-game-tab-panel{
				display:none;
				padding:12px;
				border:1px dashed rgba(255,255,255,0.22);
				background: rgba(255,255,255,0.03);
				}
				#${PANEL_ID} .mep-game-tab-panel.is-active{
				display:block;
				}
				#${PANEL_ID} .mep-charter-form{
				display:flex;
				flex-direction:column;
				gap:6px;
				}
				#${PANEL_ID} .mep-charter-sections{
				display:flex;
				flex-direction:column;
				gap:10px;
				}
				#${PANEL_ID} .mep-charter-section{
				border:1px solid rgba(255,255,255,0.14);
				background: rgba(255,255,255,0.02);
				padding:8px;
				}
				#${PANEL_ID} .mep-charter-section-title{
				font-size:12px;
				font-weight:400;
				opacity:0.95;
				margin:0 0 6px 0;
				}
				#${PANEL_ID} .mep-charter-note{
				font-size:12px;
				opacity:0.82;
				margin: 0 0 8px 0;
				padding: 4px 6px;
				border: 1px dashed rgba(255,255,255,0.16);
				background: rgba(255,255,255,0.02);
				}
				#${PANEL_ID} .mep-charter-row{
				display:grid;
				grid-template-columns: 1fr 60px auto;
				align-items:center;
				gap:10px;
				padding:4px 6px;
				border:1px solid rgba(255,255,255,0.12);
				background: rgba(255,255,255,0.03);
				}
				#${PANEL_ID} .mep-charter-label{
				font-size:12px;
				font-weight:300;
				opacity:0.95;
				}
				#${PANEL_ID} .mep-charter-input{
				width:100%;
				height:26px;
				border-radius:8px;
				border:1px solid rgba(255,255,255,0.14);
				background: rgba(255,255,255,0.06);
				color:#fff;
				padding:0 8px;
				box-sizing:border-box;
				font-size:12px;
				outline:none;
				}
				#${PANEL_ID} .mep-charter-suffix{
				font-size:12px;
				opacity:0.9;
				min-width:28px;
				text-align:left;
				}
				#${PANEL_ID} .mep-strategy-section{
				border:1px solid rgba(255,255,255,0.14);
				background: rgba(255,255,255,0.02);
				padding:8px;
				margin-bottom:10px;
				}
				#${PANEL_ID} .mep-strategy-section-title{
				font-size:12px;
				font-weight:400;
				opacity:0.95;
				margin:0 0 6px 0;
				}
				#${PANEL_ID} .mep-strategy-form{
				display:flex;
				flex-direction:column;
				gap:6px;
				}
				#${PANEL_ID} .mep-strategy-row{
				display:grid;
				grid-template-columns: 1fr 130px;
				align-items:center;
				gap:10px;
				padding:4px 6px;
				border:1px solid rgba(255,255,255,0.12);
				background: rgba(255,255,255,0.03);
				}
				#${PANEL_ID} .mep-strategy-label{
				font-size:12px;
				font-weight:300;
				opacity:0.95;
				}
				#${PANEL_ID} .mep-strategy-input{
				width:100%;
				height:26px;
				border-radius:8px;
				border:1px solid rgba(255,255,255,0.14);
				background: rgba(255,255,255,0.06);
				color:#fff;
				padding:0 8px;
				box-sizing:border-box;
				font-size:12px;
				outline:none;
				}
				#${PANEL_ID} .mep-strategy-status-grid{
				display:grid;
				grid-template-columns: 1fr 1fr;
				gap:6px;
				}
				#${PANEL_ID} .mep-strategy-status-grid > div{
				padding:4px 6px;
				border:1px solid rgba(255,255,255,0.12);
				background: rgba(255,255,255,0.03);
				font-size:12px;
				}
				#${PANEL_ID} .mep-strategy-placeholder{
				font-size:12px;
				opacity:0.85;
				line-height:1.35;
				white-space:pre-line;
				}
				#${PANEL_ID} .mep-strategy-state-grid{
				display:flex;
				flex-direction:column;
				gap:6px;
				}
				#${PANEL_ID} .mep-strategy-state-row{
				display:grid;
				grid-template-columns: 1fr 1fr;
				align-items:center;
				gap:10px;
				padding:4px 6px;
				border:1px solid rgba(255,255,255,0.12);
				background: rgba(255,255,255,0.03);
				}
				#${PANEL_ID} .mep-strategy-state-label{
				font-size:12px;
				opacity:0.86;
				}
				#${PANEL_ID} .mep-strategy-state-value{
				font-size:12px;
				font-weight:400;
				text-align:right;
				}
				#${PANEL_ID} .mep-game-placeholder{
				font-size:13px;
				opacity:0.9;
				}
				#${PANEL_ID} .mep-block-title{ font-size:13px; font-weight:300; margin:4px 0 8px; }

				/* === Unsupported game mode (hide everything except message) === */
				#${PANEL_ID}.mep-unsupported .mep-diff-wrap,
				#${PANEL_ID}.mep-unsupported .mep-two-stat-wrap,
				#${PANEL_ID}.mep-unsupported .mep-frequency-graph-wrap,
				#${PANEL_ID}.mep-unsupported .mep-stake-graph-wrap,
				#${PANEL_ID}.mep-unsupported .mep-balance-graph-wrap,
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
				padding: 10px 12px 12px;
				background: rgba(255,255,255,0.03);
				margin-bottom: 0px;
				padding-top: 0px;
				}
				#${PANEL_ID} .mep-diff-head{
				display:flex;
				align-items:center;
				justify-content:space-between;
				margin-bottom:6px;
				}
				#${PANEL_ID} .mep-diff-title{
				font-size:13px;
				font-weight:300;
				opacity:0.95;
				}
				#${PANEL_ID} .mep-diff-collapse{
				border: 1px solid rgba(255,255,255,0.16);
				background: rgba(255,255,255,0.07);
				color:#fff;
				border-radius: 8px;
				padding: 1px 8px 2px;
				font-size: 13px;
				line-height: 1.1;
				cursor: pointer;
				}
				#${PANEL_ID} .mep-diff-collapse:hover{
				background: rgba(255,255,255,0.14);
				}
				#${PANEL_ID} .mep-diff-wrap.mep-collapsed .mep-diff-params,
				#${PANEL_ID} .mep-diff-wrap.mep-collapsed .mep-two-stat-wrap,
				#${PANEL_ID} .mep-diff-wrap.mep-collapsed .mep-diff-lenrow{
				display:none;
				}
				#${PANEL_ID} .mep-diff-params{
				display:flex;
				flex-direction:column;
				gap:4px;
				margin-bottom:6px;
				}
				#${PANEL_ID} .mep-diff-graph-area{
				display:flex;
				flex-direction:column;
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
				margin: 0 0 4px 0;
				background-color: #04325b73;
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
				#${PANEL_ID} .mep-diff-vector-row{
				display:flex;
				align-items:center;
				gap:6px;
				margin: 0;
				flex-wrap: wrap;
				}
				#${PANEL_ID} .mep-diff-vector-label{
				display:inline-flex;
				align-items:center;
				gap:5px;
				font-size: 12px;
				font-weight: 300;
				opacity: 0.95;
				white-space: nowrap;
				}
				#${PANEL_ID} .mep-diff-vector-check{
				width: 15px;
				height: 15px;
				cursor: pointer;
				}
				#${PANEL_ID} input.mep-diff-vector-period,
				#${PANEL_ID} input.mep-diff-vector-shift,
				#${PANEL_ID} input.mep-diff-vector-flat{
				width: 54px;
				height: 24px;
				border-radius: 8px;
				border: 1px solid rgba(255,255,255,0.14);
				background: rgba(255,255,255,0.08);
				color:#fff;
				padding: 0 7px;
				box-sizing: border-box;
				font-size: 12px;
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
				margin-top: 0px;
        padding-top: 0px;
	        margin-top: 0px;
					
				}
				#${PANEL_ID} .mep-diff-wrap > .mep-two-stat-wrap{
				margin: 6px 0 6px;
				padding: 8px 10px 9px;
				border: 1px solid rgba(255,255,255,0.12);
				background: rgba(255,255,255,0.02);
				}
				#${PANEL_ID} .mep-diff-wrap > .mep-diff-params + .mep-two-stat-wrap{
				margin-top: 4px;
				}
				#${PANEL_ID} .mep-diff-wrap > .mep-two-stat-wrap + .mep-diff-graph-area{
				margin-top: 4px;
				}

				#${PANEL_ID} .mep-two-head{
				display:flex;
				justify-content:center;
				margin: 0 0 6px 0;
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
				#${PANEL_ID} .mep-two-params{
				display:flex;
				flex-direction:column;
				gap:4px;
				}

				#${PANEL_ID} .mep-two-head-label{
				opacity: 0.9;
				font-size: 13px;
				width: 60px;
				}
				#${PANEL_ID} .mep-two-head-label.start{
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
				#${PANEL_ID} input.mep-two-start{
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
				margin-bottom:0px;
				}
				#${PANEL_ID} .mep-stake-graph-wrap{
				margin: 12px;
				margin-bottom: 0;
				padding: 10px 12px 12px;
				border: 1px dashed rgba(255,255,255,0.22);
				background: rgba(255,255,255,0.03);
				margin-top: 0px;
				padding-top: 0px;
				}
				#${PANEL_ID} .mep-frequency-graph-wrap{
				margin: 12px;
				margin-bottom: 0;
				padding: 10px 12px 12px;
				border: 1px dashed rgba(255,255,255,0.22);
				background: rgba(255,255,255,0.03);
				margin-top: 0px;
				padding-top: 0px;
				}
				#${PANEL_ID} .mep-balance-graph-wrap{
				margin: 12px;
				margin-bottom: 0;
				padding: 10px 12px 12px;
				border: 1px dashed rgba(255,255,255,0.22);
				background: rgba(255,255,255,0.03);
				margin-top: 0px;
				padding-top: 0px;
				}
				#${PANEL_ID} .mep-stake-graph-wrap.mep-collapsed .mep-stake-params{
				display:none;
				}
				#${PANEL_ID} .mep-frequency-graph-wrap.mep-collapsed .mep-frequency-params{
				display:none;
				}
				#${PANEL_ID} .mep-balance-graph-wrap.mep-collapsed .mep-balance-params{
				display:none;
				}
				#${PANEL_ID} .mep-graph-wrap.mep-collapsed .mep-graph-controls{
				display:none;
				}
				#${PANEL_ID} .mep-frequency-collapse,
				#${PANEL_ID} .mep-stake-collapse,
				#${PANEL_ID} .mep-balance-collapse,
				#${PANEL_ID} .mep-main-graph-collapse{
				border: 1px solid rgba(255,255,255,0.16);
				background: rgba(255,255,255,0.07);
				color:#fff;
				border-radius: 8px;
				padding: 1px 8px 2px;
				font-size: 13px;
				line-height: 1.1;
				cursor: pointer;
				}
				#${PANEL_ID} .mep-frequency-collapse:hover,
				#${PANEL_ID} .mep-stake-collapse:hover,
				#${PANEL_ID} .mep-balance-collapse:hover,
				#${PANEL_ID} .mep-main-graph-collapse:hover{
				background: rgba(255,255,255,0.14);
				}
				#${PANEL_ID} .mep-frequency-params{
				margin-bottom: 2px;
				}
				#${PANEL_ID} .mep-frequency-controls{
				display:inline-flex;
				align-items:center;
				gap:10px;
				font-size:12px;
				flex-wrap: wrap;
				justify-content: flex-end;
				}
				#${PANEL_ID} .mep-frequency-label{
				display:inline-flex;
				align-items:center;
				gap:6px;
				}
				#${PANEL_ID} .mep-frequency-vector-row{
				display:inline-flex;
				align-items:center;
				gap:6px;
				flex-wrap:wrap;
				}
				#${PANEL_ID} .mep-frequency-vector-label{
				display:inline-flex;
				align-items:center;
				gap:5px;
				font-size:12px;
				white-space:nowrap;
				}
				#${PANEL_ID} input.mep-frequency-vector-enabled{
				width:15px;
				height:15px;
				cursor:pointer;
				}
				#${PANEL_ID} input.mep-frequency-threshold{
				width:52px;
				border-radius:8px;
				border: 1px solid rgba(255,255,255,0.10);
				background: rgba(255,255,255,0.06);
				color:#fff;
				padding: 0 8px;
				font-size:12px;
				outline:none;
				}
				#${PANEL_ID} input.mep-frequency-period,
				#${PANEL_ID} input.mep-frequency-density,
				#${PANEL_ID} input.mep-frequency-line,
				#${PANEL_ID} input.mep-frequency-vector-period,
				#${PANEL_ID} input.mep-frequency-vector-shift,
				#${PANEL_ID} input.mep-frequency-vector-flat{
				width:58px;
				border-radius:8px;
				border: 1px solid rgba(255,255,255,0.10);
				background: rgba(255,255,255,0.06);
				color:#fff;
				padding: 0 8px;
				font-size:12px;
				outline:none;
				}
				#${PANEL_ID} .mep-frequency-sync-label{
				display:inline-flex;
				align-items:center;
				gap:6px;
				cursor:pointer;
				user-select:none;
				}
				#${PANEL_ID} input.mep-frequency-sync{
				width:16px;
				height:16px;
				-webkit-appearance:none;
				appearance:none;
				border-radius:4px;
				border:1px solid rgba(255,255,255,0.28);
				background: rgba(255,255,255,0.06);
				display:inline-grid;
				place-items:center;
				cursor:pointer;
				}
				#${PANEL_ID} input.mep-frequency-sync:checked{
				background: rgba(255,255,255,0.22);
				border-color: rgba(255,255,255,0.45);
				}
				#${PANEL_ID} input.mep-frequency-sync:checked::after{
				content: "✓";
				font-size:12px;
				line-height:1;
				color: rgba(255,255,255,0.92);
				}
				#${PANEL_ID} .mep-frequency-graph-box{
				position:relative;
				height:92px;
				border-top:1px solid rgba(255,255,255,0.10);
				padding-top:0px;
				margin-top:0px;
				}
				#${PANEL_ID} .mep-frequency-graph{
				width:100%;
				height:100%;
				display:block;
				}
				#${PANEL_ID} .mep-frequency-tip{
				position:absolute;
				left:10px;
				top:6px;
				max-width:240px;
				white-space:pre-line;
				font-size:12px;
				background: rgba(0,0,0,0.75);
				border:1px solid rgba(255,255,255,0.15);
				border-radius:10px;
				padding:6px 8px;
				pointer-events:none;
				display:none;
				z-index:3;
				}
				#${PANEL_ID} .mep-stake-legend{
				display:flex;
				align-items:center;
				gap:12px;
				font-size: 12px;
				opacity: 0.92;
				}
				#${PANEL_ID} .mep-stake-controls{
				display:inline-flex;
				align-items:center;
				gap:10px;
				font-size:12px;
				flex-wrap: wrap;
				justify-content: flex-end;
				}
				#${PANEL_ID} .mep-stake-density-label{
				display:inline-flex;
				align-items:center;
				gap:6px;
				}
				#${PANEL_ID} input.mep-stake-density{
				width:52px;
				border-radius:8px;
				border: 1px solid rgba(255,255,255,0.10);
				background: rgba(255,255,255,0.06);
				color:#fff;
				padding: 0 8px;
				font-size:12px;
				outline:none;
				}
				#${PANEL_ID} input.mep-stake-scale-players,
				#${PANEL_ID} input.mep-stake-scale-bet{
				width:58px;
				border-radius:8px;
				border: 1px solid rgba(255,255,255,0.10);
				background: rgba(255,255,255,0.06);
				color:#fff;
				padding: 0 8px;
				font-size:12px;
				outline:none;
				}
				#${PANEL_ID} .mep-stake-sync-label{
				display:inline-flex;
				align-items:center;
				gap:6px;
				cursor:pointer;
				user-select:none;
				}
				#${PANEL_ID} input.mep-stake-sync{
				width:16px;
				height:16px;
				-webkit-appearance:none;
				appearance:none;
				border-radius:4px;
				border:1px solid rgba(255,255,255,0.28);
				background: rgba(255,255,255,0.06);
				display:inline-grid;
				place-items:center;
				cursor:pointer;
				}
				#${PANEL_ID} input.mep-stake-auto-height{
				width:16px;
				height:16px;
				-webkit-appearance:none;
				appearance:none;
				border-radius:4px;
				border:1px solid rgba(255,255,255,0.28);
				background: rgba(255,255,255,0.06);
				display:inline-grid;
				place-items:center;
				cursor:pointer;
				}
				#${PANEL_ID} input.mep-stake-sync:checked{
				background: rgba(255,255,255,0.22);
				border-color: rgba(255,255,255,0.45);
				}
				#${PANEL_ID} input.mep-stake-auto-height:checked{
				background: rgba(255,255,255,0.22);
				border-color: rgba(255,255,255,0.45);
				}
				#${PANEL_ID} input.mep-stake-sync:checked::after{
				content: "✓";
				font-size:12px;
				line-height:1;
				color: rgba(255,255,255,0.92);
				}
				#${PANEL_ID} input.mep-stake-auto-height:checked::after{
				content: "✓";
				font-size:12px;
				line-height:1;
				color: rgba(255,255,255,0.92);
				}
				#${PANEL_ID} .mep-stake-legend-item{
				display:inline-flex;
				align-items:center;
				gap:6px;
				cursor:pointer;
				}
				#${PANEL_ID} .mep-stake-legend-item input{
				margin:0;
				cursor:pointer;
				}
				#${PANEL_ID} input.mep-stake-show-players,
				#${PANEL_ID} input.mep-stake-show-bet{
				width:16px;
				height:16px;
				-webkit-appearance:none;
				appearance:none;
				border-radius:4px;
				border:1px solid rgba(255,255,255,0.28);
				background: rgba(255,255,255,0.06);
				display:inline-grid;
				place-items:center;
				cursor:pointer;
				}
				#${PANEL_ID} input.mep-stake-show-players:checked,
				#${PANEL_ID} input.mep-stake-show-bet:checked{
				background: rgba(255,255,255,0.22);
				border-color: rgba(255,255,255,0.45);
				}
				#${PANEL_ID} input.mep-stake-show-players:checked::after,
				#${PANEL_ID} input.mep-stake-show-bet:checked::after{
				content: "✓";
				font-size:12px;
				line-height:1;
				color: rgba(255,255,255,0.92);
				}
				#${PANEL_ID} .mep-stake-legend-line{
				display:inline-block;
				width:14px;
				height:2px;
				border-radius: 4px;
				}
				#${PANEL_ID} .mep-stake-legend-line.mep-stake-legend-players{
				background: rgba(112,206,255,0.95);
				}
				#${PANEL_ID} .mep-stake-legend-line.mep-stake-legend-bets{
				background: rgba(255,170,60,0.95);
				}
				#${PANEL_ID} .mep-stake-graph-box{
				position:relative;
				height:120px;
				border-top:1px solid rgba(255,255,255,0.10);
				padding-top:0px;
				margin-top:0px;
				}
				#${PANEL_ID} .mep-stake-graph{
				width:100%;
				height:100%;
				display:block;
				}
				#${PANEL_ID} .mep-stake-tip{
				position:absolute;
				left:10px;
				top:6px;
				max-width:240px;
				white-space:pre-line;
				font-size:12px;
				background: rgba(0,0,0,0.75);
				border:1px solid rgba(255,255,255,0.15);
				border-radius:10px;
				padding:6px 8px;
				pointer-events:none;
				display:none;
				z-index:3;
				}
				#${PANEL_ID} .mep-balance-params{
				margin-bottom: 2px;
				}
				#${PANEL_ID} .mep-balance-controls{
				display:inline-flex;
				align-items:center;
				gap:10px;
				font-size:12px;
				flex-wrap: wrap;
				justify-content: flex-end;
				}
				#${PANEL_ID} .mep-balance-density-label{
				display:inline-flex;
				align-items:center;
				gap:6px;
				}
				#${PANEL_ID} input.mep-balance-density{
				width:52px;
				border-radius:8px;
				border: 1px solid rgba(255,255,255,0.10);
				background: rgba(255,255,255,0.06);
				color:#fff;
				padding: 0 8px;
				font-size:12px;
				outline:none;
				}
				#${PANEL_ID} .mep-balance-sync-label{
				display:inline-flex;
				align-items:center;
				gap:6px;
				cursor:pointer;
				user-select:none;
				}
				#${PANEL_ID} input.mep-balance-sync,
				#${PANEL_ID} input.mep-balance-auto-height{
				width:16px;
				height:16px;
				-webkit-appearance:none;
				appearance:none;
				border-radius:4px;
				border:1px solid rgba(255,255,255,0.28);
				background: rgba(255,255,255,0.06);
				display:inline-grid;
				place-items:center;
				cursor:pointer;
				}
				#${PANEL_ID} input.mep-balance-sync:checked,
				#${PANEL_ID} input.mep-balance-auto-height:checked{
				background: rgba(255,255,255,0.22);
				border-color: rgba(255,255,255,0.45);
				}
				#${PANEL_ID} input.mep-balance-sync:checked::after,
				#${PANEL_ID} input.mep-balance-auto-height:checked::after{
				content: "✓";
				font-size:12px;
				line-height:1;
				color: rgba(255,255,255,0.92);
				}
				#${PANEL_ID} .mep-balance-graph-box{
				position:relative;
				height:92px;
				border-top:1px solid rgba(255,255,255,0.10);
				padding-top:0px;
				margin-top:0px;
				}
				#${PANEL_ID} .mep-balance-graph{
				width:100%;
				height:100%;
				display:block;
				}
				#${PANEL_ID} .mep-balance-tip{
				position:absolute;
				left:10px;
				top:6px;
				max-width:240px;
				white-space:pre-line;
				font-size:12px;
				background: rgba(0,0,0,0.75);
				border:1px solid rgba(255,255,255,0.15);
				border-radius:10px;
				padding:6px 8px;
				pointer-events:none;
				display:none;
				z-index:3;
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
            stakeGraphDensity: typeof MEP.stakeGraphDensity === "number" ? MEP.stakeGraphDensity : 81,
            stakeGraphDensitySync: !!MEP.stakeGraphDensitySync,
            stakeGraphAutoHeight: !!MEP.stakeGraphAutoHeight,
            stakeGraphPlayersScale: typeof MEP.stakeGraphPlayersScale === "number" ? MEP.stakeGraphPlayersScale : 1,
            stakeGraphBetScale: typeof MEP.stakeGraphBetScale === "number" ? MEP.stakeGraphBetScale : 10,
            stakeGraphShowPlayers: ("stakeGraphShowPlayers" in MEP) ? !!MEP.stakeGraphShowPlayers : true,
            stakeGraphShowBet: ("stakeGraphShowBet" in MEP) ? !!MEP.stakeGraphShowBet : true,
            balanceGraphDensity: typeof MEP.balanceGraphDensity === "number" ? MEP.balanceGraphDensity : 81,
            balanceGraphDensitySync: !!MEP.balanceGraphDensitySync,
            balanceGraphAutoHeight: !!MEP.balanceGraphAutoHeight,
            balanceGraphScale: typeof MEP.balanceGraphScale === "number" ? MEP.balanceGraphScale : 10000000,
            charterRoundsPerHour: typeof MEP.charterRoundsPerHour === "number" ? MEP.charterRoundsPerHour : 0,
            charterRoundsPer6Hours: typeof MEP.charterRoundsPer6Hours === "number" ? MEP.charterRoundsPer6Hours : 0,
            charterRoundsPerDay: typeof MEP.charterRoundsPerDay === "number" ? MEP.charterRoundsPerDay : 0,
            charterWinsPerHour: typeof MEP.charterWinsPerHour === "number" ? MEP.charterWinsPerHour : 0,
            charterWinsPer6Hours: typeof MEP.charterWinsPer6Hours === "number" ? MEP.charterWinsPer6Hours : 0,
            charterWinsPerDay: typeof MEP.charterWinsPerDay === "number" ? MEP.charterWinsPerDay : 0,
            charterMaxStakePercent: typeof MEP.charterMaxStakePercent === "number" ? MEP.charterMaxStakePercent : 0,
            charterLossesPerHour: typeof MEP.charterLossesPerHour === "number" ? MEP.charterLossesPerHour : 0,
            charterLossesPer6Hours: typeof MEP.charterLossesPer6Hours === "number" ? MEP.charterLossesPer6Hours : 0,
            charterLossesPerDay: typeof MEP.charterLossesPerDay === "number" ? MEP.charterLossesPerDay : 0,
            charterBreakAfter3LossesMin: typeof MEP.charterBreakAfter3LossesMin === "number" ? MEP.charterBreakAfter3LossesMin : 0,
            frequencyThreshold: typeof MEP.frequencyThreshold === "number" ? MEP.frequencyThreshold : 7,
            frequencyPeriod: typeof MEP.frequencyPeriod === "number" ? MEP.frequencyPeriod : 50,
            frequencyGraphDensity: typeof MEP.frequencyGraphDensity === "number" ? MEP.frequencyGraphDensity : 81,
            frequencyGraphDensitySync: !!MEP.frequencyGraphDensitySync,
            frequencyGraphLine: typeof MEP.frequencyGraphLine === "number" ? MEP.frequencyGraphLine : 0,
            frequencyVectorEnabled: ("frequencyVectorEnabled" in MEP) ? !!MEP.frequencyVectorEnabled : true,
            frequencyVectorPeriod: typeof MEP.frequencyVectorPeriod === "number" ? MEP.frequencyVectorPeriod : 9,
            frequencyVectorPhaseShift: typeof MEP.frequencyVectorPhaseShift === "number" ? MEP.frequencyVectorPhaseShift : 3,
            frequencyVectorFlatEpsilon: typeof MEP.frequencyVectorFlatEpsilon === "number" ? MEP.frequencyVectorFlatEpsilon : 0.15,
            frequencyVectorMainColor: typeof MEP.frequencyVectorMainColor === "string" ? MEP.frequencyVectorMainColor : "rgba(255,255,255,0.96)",
            frequencyVectorShiftColor: typeof MEP.frequencyVectorShiftColor === "string" ? MEP.frequencyVectorShiftColor : "rgba(80,210,255,0.92)",
            frequencyVectorMainWidth: typeof MEP.frequencyVectorMainWidth === "number" ? MEP.frequencyVectorMainWidth : 0.9,
            frequencyVectorShiftWidth: typeof MEP.frequencyVectorShiftWidth === "number" ? MEP.frequencyVectorShiftWidth : 0.7,
            frequencyVectorState: typeof MEP.frequencyVectorState === "string" ? MEP.frequencyVectorState : "flat",
            frequencyVectorSignal: typeof MEP.frequencyVectorSignal === "number" ? MEP.frequencyVectorSignal : 0,
            graphLine: typeof MEP.graphLine === "number" ? MEP.graphLine : 0,
            graphLine2: typeof MEP.graphLine2 === "number" ? MEP.graphLine2 : 0,
            graphLine3: typeof MEP.graphLine3 === "number" ? MEP.graphLine3 : 0,
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

            // фиксированная стартовая точка этапа для diff-расчёта (1-based от начала истории)
            // 0 = выключено (используется режим "Последние N")
            diffStartIndex: typeof MEP.diffStartIndex === "number" ? MEP.diffStartIndex : 0,
            diffVectorEnabled: ("diffVectorEnabled" in MEP) ? !!MEP.diffVectorEnabled : true,
            diffVectorPeriod: typeof MEP.diffVectorPeriod === "number" ? MEP.diffVectorPeriod : 9,
            diffVectorPhaseShift: typeof MEP.diffVectorPhaseShift === "number" ? MEP.diffVectorPhaseShift : 3,
            diffVectorFlatEpsilon: typeof MEP.diffVectorFlatEpsilon === "number" ? MEP.diffVectorFlatEpsilon : 0.15,
            diffVectorMainColor: typeof MEP.diffVectorMainColor === "string" ? MEP.diffVectorMainColor : "rgba(255,255,255,0.96)",
            diffVectorShiftColor: typeof MEP.diffVectorShiftColor === "string" ? MEP.diffVectorShiftColor : "rgba(80,210,255,0.92)",
            diffVectorMainWidth: typeof MEP.diffVectorMainWidth === "number" ? MEP.diffVectorMainWidth : 0.9,
            diffVectorShiftWidth: typeof MEP.diffVectorShiftWidth === "number" ? MEP.diffVectorShiftWidth : 0.7,
            diffVectorState: typeof MEP.diffVectorState === "string" ? MEP.diffVectorState : "flat",
            diffVectorSignal: typeof MEP.diffVectorSignal === "number" ? MEP.diffVectorSignal : 0,
            activeStrategyId: null,
            strategies: {
                strategy1: buildStrategy1DefaultState(),
                strategy2: buildStrategy2DefaultState(),
            },

            // История агрегатов ставок по раундам (oldest -> newest), runtime-only (SAFE MODE / MVP)
            roundPlayersCountHistory: Array.isArray(MEP.roundPlayersCountHistory) ? MEP.roundPlayersCountHistory : [],
            roundBetSumHistory: Array.isArray(MEP.roundBetSumHistory) ? MEP.roundBetSumHistory : [],
            balanceHistory: Array.isArray(MEP.balanceHistory) ? MEP.balanceHistory : [],
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
                    ln.setAttribute("stroke", "rgba(255,255,255,0.95)");
                    ln.setAttribute("stroke-width", "0.35");
                    ln.setAttribute("stroke-dasharray", "1.6 1.6");
                    ui.graphSvg.appendChild(ln);
                }

                // second horizontal line (threshold)
                const line2V0 = Number(MEP.State.graphLine2 ?? 0);
                const line2V =
                    Number.isFinite(line2V0) && line2V0 > 0
                        ? Number.isFinite(maxClip) && maxClip > 0
                            ? Math.min(line2V0, maxClip)
                            : line2V0
                        : 0;

                if (line2V > 0) {
                    const yLine2 = vbH - (line2V / maxVal) * (vbH - 1);
                    const ln2 = document.createElementNS("http://www.w3.org/2000/svg", "line");
                    ln2.setAttribute("x1", "0");
                    ln2.setAttribute("x2", String(vbW));
                    ln2.setAttribute("y1", String(yLine2));
                    ln2.setAttribute("y2", String(yLine2));
                    ln2.setAttribute("stroke", "rgba(80,210,255,0.92)");
                    ln2.setAttribute("stroke-width", "0.35");
                    ln2.setAttribute("stroke-dasharray", "3 1.4");
                    ui.graphSvg.appendChild(ln2);
                }

                // third horizontal line (threshold)
                const line3V0 = Number(MEP.State.graphLine3 ?? 0);
                const line3V =
                    Number.isFinite(line3V0) && line3V0 > 0
                        ? Number.isFinite(maxClip) && maxClip > 0
                            ? Math.min(line3V0, maxClip)
                            : line3V0
                        : 0;

                if (line3V > 0) {
                    const yLine3 = vbH - (line3V / maxVal) * (vbH - 1);
                    const ln3 = document.createElementNS("http://www.w3.org/2000/svg", "line");
                    ln3.setAttribute("x1", "0");
                    ln3.setAttribute("x2", String(vbW));
                    ln3.setAttribute("y1", String(yLine3));
                    ln3.setAttribute("y2", String(yLine3));
                    ln3.setAttribute("stroke", "rgba(255,120,220,0.9)");
                    ln3.setAttribute("stroke-width", "0.35");
                    ln3.setAttribute("stroke-dasharray", "1.4 2.2");
                    ui.graphSvg.appendChild(ln3);
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

            _calcEMA(values, period) {
                const src = Array.isArray(values) ? values : [];
                const p = Math.max(1, Math.floor(Number(period) || 1));
                const alpha = 2 / (p + 1);
                const out = [];
                let prev = null;
                for (let i = 0; i < src.length; i++) {
                    const v = Number(src[i]) || 0;
                    if (prev === null) prev = v;
                    else prev = alpha * v + (1 - alpha) * prev;
                    out.push(prev);
                }
                return out;
            },

            _buildVectorSeries(values, opts) {
                const src = Array.isArray(values) ? values : [];
                const o = opts && typeof opts === "object" ? opts : {};
                const clipFrom = Math.max(0, Math.floor(Number(o.clipFrom) || 0));
                const clipLenRaw = Math.floor(Number(o.clipLen) || src.length);
                const clipLen = Math.max(0, clipLenRaw);
                const period = Math.max(1, Math.floor(Number(MEP.State.diffVectorPeriod) || 9));
                const shift = Math.max(1, Math.floor(Number(MEP.State.diffVectorPhaseShift) || 3));
                const mainEMA = this._calcEMA(src, period);
                const shiftedEMA = new Array(mainEMA.length);
                for (let i = 0; i < mainEMA.length; i++) {
                    const j = i - shift;
                    shiftedEMA[i] = j >= 0 ? mainEMA[j] : null;
                }
                const from = Math.min(clipFrom, mainEMA.length);
                const to = Math.min(mainEMA.length, from + clipLen);
                return {
                    mainEMA: mainEMA.slice(from, to),
                    shiftedEMA: shiftedEMA.slice(from, to),
                    period,
                    shift,
                };
            },

            _updateVectorState(mainEMA, shiftedEMA) {
                if (!Array.isArray(mainEMA) || !mainEMA.length || !Array.isArray(shiftedEMA) || !shiftedEMA.length) {
                    MEP.State.diffVectorState = "flat";
                    MEP.State.diffVectorSignal = 0;
                    return;
                }
                const lastMain = Number(mainEMA[mainEMA.length - 1]) || 0;
                const lastShiftRaw = shiftedEMA[shiftedEMA.length - 1];
                const lastShift = Number.isFinite(Number(lastShiftRaw)) ? Number(lastShiftRaw) : lastMain;
                const signal = lastMain - lastShift;
                const eps = Math.max(0, Number(MEP.State.diffVectorFlatEpsilon) || 0);
                MEP.State.diffVectorSignal = signal;
                MEP.State.diffVectorState = signal > eps ? "up" : signal < -eps ? "down" : "flat";
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

                const period = Math.max(1, Math.floor(Number(MEP.State.diffVectorPeriod) || 9));
                const shift = Math.max(1, Math.floor(Number(MEP.State.diffVectorPhaseShift) || 3));
                const warmup = Math.max(period * 3, shift + period + 10);
                const extStart = Math.max(0, startIndex - warmup);
                const extEnd = Math.min(fullSeries.length, startIndex + series.length);
                const extendedSeries = fullSeries.slice(extStart, extEnd);
                const clipFrom = Math.max(0, startIndex - extStart);

                const vectorData = this._buildVectorSeries(extendedSeries, {
                    clipFrom,
                    clipLen: series.length,
                });
                this._updateVectorState(vectorData.mainEMA, vectorData.shiftedEMA);

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
                axis.setAttribute("stroke", "rgba(255,255,255,0.95)");
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
					g1.setAttribute("stroke", "rgba(255,255,255,0.95)");
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
					g2.setAttribute("stroke", "rgba(255,255,255,0.95)");
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

                  if (MEP.State.diffVectorEnabled !== false && n > 1) {
                    const toY = (v0) => {
                        const v = Number(v0) || 0;
                        return midY - (v / maxAbs) * (midY - 1);
                    };
                    const toPoints = (arr) => arr
                        .map((v, i) => Number.isFinite(Number(v)) ? `${(i * (barW + gap)) + (barW / 2)},${toY(v)}` : "")
                        .filter(Boolean)
                        .join(" ");

                    const mainPts = toPoints(vectorData.mainEMA);
                    const shiftPts = toPoints(vectorData.shiftedEMA);

                    if (mainPts) {
                        const mainLine = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
                        mainLine.setAttribute("fill", "none");
                        mainLine.setAttribute("stroke", (MEP.State.diffVectorMainColor || "rgba(255,255,255,0.96)").toString());
                        mainLine.setAttribute("stroke-width", String(Number(MEP.State.diffVectorMainWidth) || 0.9));
                        mainLine.setAttribute("stroke-linecap", "round");
                        mainLine.setAttribute("stroke-linejoin", "round");
                        mainLine.setAttribute("points", mainPts);
                        mainLine.setAttribute("pointer-events", "none");
                        ui.diffSvg.appendChild(mainLine);
                    }

                    if (shiftPts) {
                        const shiftLine = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
                        shiftLine.setAttribute("fill", "none");
                        shiftLine.setAttribute("stroke", (MEP.State.diffVectorShiftColor || "rgba(80,210,255,0.92)").toString());
                        shiftLine.setAttribute("stroke-width", String(Number(MEP.State.diffVectorShiftWidth) || 0.7));
                        shiftLine.setAttribute("stroke-linecap", "round");
                        shiftLine.setAttribute("stroke-linejoin", "round");
                        shiftLine.setAttribute("points", shiftPts);
                        shiftLine.setAttribute("pointer-events", "none");
                        ui.diffSvg.appendChild(shiftLine);
                    }
                  }

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
        // Stake graph (players + bet*10)
        // -------------------------
        MEP.StakeGraph = {
            _ui: null,
            init(ui) {
                this._ui = ui || null;
            },

            _toFiniteArray(arr) {
                if (!Array.isArray(arr)) return [];
                return arr.map((v) => Number(v)).filter((v) => Number.isFinite(v));
            },

            _getDiffVisibleLength() {
                const history = Array.isArray(MEP.State.diffHistory) ? MEP.State.diffHistory : [];
                const effDensity = MEP.State.diffDensitySync
                    ? Math.max(10, Math.floor(Number(MEP.State.graphDensity || 100) || 100))
                    : Math.max(10, Math.floor(Number(MEP.State.diffDensity || MEP.State.diffDensityManual || 81) || 81));
                if (!history.length) return 0;
                return Math.min(history.length, effDensity);
            },

            _tailWithDensity(arr, density) {
                if (!arr.length) return [];
                const d = Math.max(10, Math.floor(Number(density || 81) || 81));
                return arr.slice(Math.max(0, arr.length - d));
            },

            _syncToMasterLen(arr, masterLen) {
                if (!Array.isArray(arr) || !arr.length || masterLen <= 0) return [];
                if (arr.length >= masterLen) return arr.slice(arr.length - masterLen);
                const pad = new Array(masterLen - arr.length).fill(arr[0]);
                return pad.concat(arr);
            },

            _buildPoints(values, totalStages, yMax, vbW, vbH, autoHeight = false) {
                if (!values.length || totalStages <= 0 || yMax <= 0) return [];
                const out = [];
                const stepX = totalStages <= 1 ? 0 : vbW / (totalStages - 1);
                const startStage = Math.max(0, totalStages - values.length); // right-align
                let sMin = 0;
                let sMax = 0;
                if (autoHeight) {
                    sMin = Math.min(...values);
                    sMax = Math.max(...values);
                }
                for (let i = 0; i < values.length; i++) {
                    const stage = startStage + i;
                    const x = stepX * stage;
                    let y = 0;
                    if (autoHeight) {
                        if (sMax === sMin) y = vbH / 2;
                        else y = 1 + ((sMax - values[i]) / (sMax - sMin)) * (vbH - 2);
                    } else {
                        y = vbH - (values[i] / yMax) * (vbH - 2) - 1;
                    }
                    out.push({ stage, x, y: Math.max(1, Math.min(vbH - 1, y)), value: values[i] });
                }
                return out;
            },

            _ensureTip() {
                const ui = this._ui;
                if (!ui?.stakeGraphSvg) return null;
                if (ui.stakeTip) return ui.stakeTip;
                const host = ui.stakeGraphSvg.parentElement;
                if (!host) return null;
                const tip = document.createElement("div");
                tip.className = "mep-stake-tip";
                host.appendChild(tip);
                ui.stakeTip = tip;
                return tip;
            },

            _setTip(text, xPx) {
                const ui = this._ui;
                const tip = this._ensureTip();
                if (!ui?.stakeGraphSvg || !tip) return;
                if (!text) {
                    tip.style.display = "none";
                    return;
                }

                tip.textContent = text;
                tip.style.display = "block";
                tip.style.top = "6px";
                const host = ui.stakeGraphSvg.parentElement;
                const hostW = host?.clientWidth || 0;
                const safeX = Number.isFinite(xPx) ? Math.max(6, xPx) : 6;
                tip.style.left = `${safeX}px`;
                const tipW = tip.offsetWidth || 0;
                if (hostW > 0 && tipW > 0) {
                    const maxLeft = Math.max(6, hostW - tipW - 6);
                    tip.style.left = `${Math.min(safeX, maxLeft)}px`;
                }
            },

            _fmtBet(v) {
                if (!Number.isFinite(v)) return "—";
                return v.toFixed(8).replace(/\.?0+$/, "");
            },

            render() {
                const ui = this._ui;
                if (!ui?.stakeGraphSvg) return;
                const svg = ui.stakeGraphSvg;
                svg.innerHTML = "";
                this._setTip("");

                const playersRaw = this._toFiniteArray(MEP.State.roundPlayersCountHistory);
                const betsRealRaw = this._toFiniteArray(MEP.State.roundBetSumHistory);

                let playersView = [];
                let betsRealView = [];
                const syncOn = !!MEP.State.stakeGraphDensitySync;

                if (syncOn) {
                    const masterLen = this._getDiffVisibleLength();
                    playersView = this._syncToMasterLen(playersRaw, masterLen);
                    betsRealView = this._syncToMasterLen(betsRealRaw, masterLen);
                } else {
                    playersView = this._tailWithDensity(playersRaw, MEP.State.stakeGraphDensity);
                    betsRealView = this._tailWithDensity(betsRealRaw, MEP.State.stakeGraphDensity);
                }

                let playersScale = Number(MEP.State.stakeGraphPlayersScale);
                if (!Number.isFinite(playersScale) || playersScale < 0) playersScale = 1;
                let betScale = Number(MEP.State.stakeGraphBetScale);
                if (!Number.isFinite(betScale) || betScale < 0) betScale = 10;

                const playersScaledView = playersView.map((v) => v * playersScale); // только для рендера
                const betsScaledView = betsRealView.map((v) => v * betScale); // только для рендера
                const showPlayers = MEP.State.stakeGraphShowPlayers !== false;
                const showBet = MEP.State.stakeGraphShowBet !== false;
                const autoHeight = !!MEP.State.stakeGraphAutoHeight;
                const vbW = 100;
                const vbH = 60;
                const stageCount = Math.max(playersView.length, betsRealView.length);
                const scaleSeries = [];
                if (showPlayers) scaleSeries.push(...playersScaledView);
                if (showBet) scaleSeries.push(...betsScaledView);
                const yMax = Math.max(1, ...scaleSeries, 1);
                const stepX = stageCount <= 1 ? 0 : vbW / (stageCount - 1);

                // baseline
                const base = document.createElementNS("http://www.w3.org/2000/svg", "line");
                base.setAttribute("x1", "0");
                base.setAttribute("x2", String(vbW));
                base.setAttribute("y1", String(vbH - 1));
                base.setAttribute("y2", String(vbH - 1));
                base.setAttribute("stroke", "rgba(255,255,255,0.20)");
                base.setAttribute("stroke-width", "0.4");
                svg.appendChild(base);

                // vertical dashed stage lines
                for (let i = 0; i < stageCount; i++) {
                    const x = stepX * i;
                    const ln = document.createElementNS("http://www.w3.org/2000/svg", "line");
                    ln.setAttribute("x1", String(x));
                    ln.setAttribute("x2", String(x));
                    ln.setAttribute("y1", "0");
                    ln.setAttribute("y2", String(vbH));
                    ln.setAttribute("stroke", "rgba(255,255,255,0.13)");
                    ln.setAttribute("stroke-width", "0.25");
                    ln.setAttribute("stroke-dasharray", "1.4 1.4");
                    ln.setAttribute("pointer-events", "none");
                    svg.appendChild(ln);
                }

                const playersPts = this._buildPoints(playersScaledView, stageCount, yMax, vbW, vbH, autoHeight);
                const betsPts = this._buildPoints(betsScaledView, stageCount, yMax, vbW, vbH, autoHeight);

                const makePolyline = (pts, color) => {
                    if (!pts.length) return;
                    const pl = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
                    pl.setAttribute("points", pts.map((p) => `${p.x},${p.y}`).join(" "));
                    pl.setAttribute("fill", "none");
                    pl.setAttribute("stroke", color);
                    pl.setAttribute("stroke-width", "0.55");
                    pl.setAttribute("stroke-linejoin", "round");
                    pl.setAttribute("stroke-linecap", "round");
                    svg.appendChild(pl);
                };

                if (showPlayers) makePolyline(playersPts, "rgba(112,206,255,0.95)");
                if (showBet) makePolyline(betsPts, "rgba(255,170,60,0.95)");

                // tooltip hit targets per series
                const pPad = new Array(Math.max(0, stageCount - playersView.length)).fill(null).concat(playersView);
                const bPad = new Array(Math.max(0, stageCount - betsRealView.length)).fill(null).concat(betsRealView);

                if (showPlayers) for (const p of playersPts) {
                    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                    dot.setAttribute("cx", String(p.x));
                    dot.setAttribute("cy", String(p.y));
                    dot.setAttribute("r", "0.55");
                    dot.setAttribute("fill", "rgba(112,206,255,0.95)");
                    dot.setAttribute("pointer-events", "none");
                    svg.appendChild(dot);

                    const hit = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                    hit.setAttribute("cx", String(p.x));
                    hit.setAttribute("cy", String(p.y));
                    hit.setAttribute("r", "2.8");
                    hit.setAttribute("fill", "rgba(255,255,255,0.001)");
                    hit.setAttribute("stroke", "none");
                    hit.style.cursor = "crosshair";
                    hit.setAttribute("data-series", "players");

                    hit.addEventListener("mouseenter", (ev) => {
                        const box = svg.getBoundingClientRect();
                        const txt = `Этап: ${p.stage + 1}\nКлиенты: ${pPad[p.stage]}`;
                        this._setTip(txt, ev.clientX - box.left + 10);
                    });
                    hit.addEventListener("mousemove", (ev) => {
                        const box = svg.getBoundingClientRect();
                        this._setTip(ui.stakeTip?.textContent || "", ev.clientX - box.left + 10);
                    });
                    hit.addEventListener("mouseleave", () => this._setTip(""));
                    svg.appendChild(hit);
                }

                if (showBet) for (const b of betsPts) {
                    const realBet = bPad[b.stage];
                    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                    dot.setAttribute("cx", String(b.x));
                    dot.setAttribute("cy", String(b.y));
                    dot.setAttribute("r", "0.55");
                    dot.setAttribute("fill", "rgba(255,170,60,0.95)");
                    dot.setAttribute("pointer-events", "none");
                    svg.appendChild(dot);

                    const hit = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                    hit.setAttribute("cx", String(b.x));
                    hit.setAttribute("cy", String(b.y));
                    hit.setAttribute("r", "2.8");
                    hit.setAttribute("fill", "rgba(255,255,255,0.001)");
                    hit.setAttribute("stroke", "none");
                    hit.style.cursor = "crosshair";
                    hit.setAttribute("data-series", "bets");

                    hit.addEventListener("mouseenter", (ev) => {
                        const box = svg.getBoundingClientRect();
                        const txt = `Этап: ${b.stage + 1}\nСтавка: ${this._fmtBet(realBet)}`;
                        this._setTip(txt, ev.clientX - box.left + 10);
                    });
                    hit.addEventListener("mousemove", (ev) => {
                        const box = svg.getBoundingClientRect();
                        this._setTip(ui.stakeTip?.textContent || "", ev.clientX - box.left + 10);
                    });
                    hit.addEventListener("mouseleave", () => this._setTip(""));
                    svg.appendChild(hit);
                }
            },
        };

        // -------------------------
        // Balance graph
        // -------------------------
        MEP.BalanceGraph = {
            _ui: null,
            _lastDebugKey: "",
            init(ui) {
                this._ui = ui || null;
            },

            _toFiniteArray(arr) {
                if (!Array.isArray(arr)) return [];
                return arr.map((v) => Number(v)).filter((v) => Number.isFinite(v));
            },

            _getDiffVisibleLength() {
                const history = Array.isArray(MEP.State.diffHistory) ? MEP.State.diffHistory : [];
                const effDensity = MEP.State.diffDensitySync
                    ? Math.max(10, Math.floor(Number(MEP.State.graphDensity || 100) || 100))
                    : Math.max(10, Math.floor(Number(MEP.State.diffDensity || MEP.State.diffDensityManual || 81) || 81));
                if (!history.length) return 0;
                return Math.min(history.length, effDensity);
            },

            _tailWithDensity(arr, density) {
                if (!arr.length) return [];
                const d = Math.max(10, Math.floor(Number(density || 81) || 81));
                return arr.slice(Math.max(0, arr.length - d));
            },

            _syncToMasterLen(arr, masterLen) {
                if (!Array.isArray(arr) || !arr.length || masterLen <= 0) return [];
                if (arr.length >= masterLen) return arr.slice(arr.length - masterLen);
                const pad = new Array(masterLen - arr.length).fill(arr[0]);
                return pad.concat(arr);
            },

            _buildPoints(values, totalStages, yMin, yMax, vbW, vbH, autoHeight = false) {
                if (!values.length || totalStages <= 0) return [];
                const out = [];
                const stepX = totalStages <= 1 ? 0 : vbW / (totalStages - 1);
                const startStage = Math.max(0, totalStages - values.length);
                let sMin = yMin;
                let sMax = yMax;
                if (autoHeight) {
                    sMin = Math.min(...values);
                    sMax = Math.max(...values);
                }
                for (let i = 0; i < values.length; i++) {
                    const stage = startStage + i;
                    const x = stepX * stage;
                    let y = vbH / 2;
                    if (sMax !== sMin) {
                        y = 1 + ((sMax - values[i]) / (sMax - sMin)) * (vbH - 2);
                    }
                    out.push({ stage, x, y: Math.max(1, Math.min(vbH - 1, y)), value: values[i] });
                }
                return out;
            },

            _ensureTip() {
                const ui = this._ui;
                if (!ui?.balanceGraphSvg) return null;
                if (ui.balanceTip) return ui.balanceTip;
                const host = ui.balanceGraphSvg.parentElement;
                if (!host) return null;
                const tip = document.createElement("div");
                tip.className = "mep-balance-tip";
                host.appendChild(tip);
                ui.balanceTip = tip;
                return tip;
            },

            _setTip(text, xPx) {
                const ui = this._ui;
                const tip = this._ensureTip();
                if (!ui?.balanceGraphSvg || !tip) return;
                if (!text) {
                    tip.style.display = "none";
                    return;
                }
                tip.textContent = text;
                tip.style.display = "block";
                tip.style.top = "6px";
                const host = ui.balanceGraphSvg.parentElement;
                const hostW = host?.clientWidth || 0;
                const safeX = Number.isFinite(xPx) ? Math.max(6, xPx) : 6;
                tip.style.left = `${safeX}px`;
                const tipW = tip.offsetWidth || 0;
                if (hostW > 0 && tipW > 0) {
                    const maxLeft = Math.max(6, hostW - tipW - 6);
                    tip.style.left = `${Math.min(safeX, maxLeft)}px`;
                }
            },

            render() {
                const ui = this._ui;
                if (!ui?.balanceGraphSvg) return;
                if (!Array.isArray(MEP.State.balanceHistory)) MEP.State.balanceHistory = [];
                const svg = ui.balanceGraphSvg;
                svg.innerHTML = "";
                this._setTip("");

                const balanceRaw = this._toFiniteArray(MEP.State.balanceHistory);
                const syncOn = !!MEP.State.balanceGraphDensitySync;
                const autoHeight = !!MEP.State.balanceGraphAutoHeight;
                let graphScale = Number(MEP.State.balanceGraphScale);
                if (!Number.isFinite(graphScale) || graphScale <= 0) graphScale = 10000000;

                let balanceViewRaw = [];
                if (syncOn) {
                    const masterLen = this._getDiffVisibleLength();
                    balanceViewRaw = this._syncToMasterLen(balanceRaw, masterLen);
                } else {
                    balanceViewRaw = this._tailWithDensity(balanceRaw, MEP.State.balanceGraphDensity);
                }
                const balanceViewScaled = balanceViewRaw.map((v) => v * graphScale);

                const vbW = 100;
                const vbH = 60;
                const stageCount = balanceViewScaled.length;
                const scaledMin = balanceViewScaled.length ? Math.min(...balanceViewScaled) : 0;
                const scaledMax = balanceViewScaled.length ? Math.max(...balanceViewScaled) : 1;
                const points = this._buildPoints(balanceViewScaled, stageCount, scaledMin, scaledMax, vbW, vbH, autoHeight);
                const stepX = stageCount <= 1 ? 0 : vbW / (stageCount - 1);
                const rawByStage = new Array(Math.max(0, stageCount - balanceViewRaw.length)).fill(null).concat(balanceViewRaw);
                const dbg = `${balanceRaw.length}|${balanceViewRaw.length}|${scaledMin}|${scaledMax}|${points.length}|${graphScale}`;
                if (dbg !== this._lastDebugKey) {
                    console.debug("[MEP.BalanceGraph] history len:", balanceRaw.length);
                    console.debug("[MEP.BalanceGraph] visible raw len:", balanceViewRaw.length);
                    console.debug("[MEP.BalanceGraph] scaled min/max:", scaledMin, scaledMax);
                    console.debug("[MEP.BalanceGraph] balanceGraphScale:", graphScale);
                    console.debug("[MEP.BalanceGraph] points:", points.length);
                    this._lastDebugKey = dbg;
                }

                const base = document.createElementNS("http://www.w3.org/2000/svg", "line");
                base.setAttribute("x1", "0");
                base.setAttribute("x2", String(vbW));
                base.setAttribute("y1", String(vbH - 1));
                base.setAttribute("y2", String(vbH - 1));
                base.setAttribute("stroke", "rgba(255,255,255,0.20)");
                base.setAttribute("stroke-width", "0.4");
                svg.appendChild(base);

                for (let i = 0; i < stageCount; i++) {
                    const x = stepX * i;
                    const ln = document.createElementNS("http://www.w3.org/2000/svg", "line");
                    ln.setAttribute("x1", String(x));
                    ln.setAttribute("x2", String(x));
                    ln.setAttribute("y1", "0");
                    ln.setAttribute("y2", String(vbH));
                    ln.setAttribute("stroke", "rgba(255,255,255,0.13)");
                    ln.setAttribute("stroke-width", "0.25");
                    ln.setAttribute("stroke-dasharray", "1.4 1.4");
                    ln.setAttribute("pointer-events", "none");
                    svg.appendChild(ln);
                }

                if (!points.length) {
                    console.debug("[MEP.BalanceGraph] skipped: empty series");
                } else {
                    const pl = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
                    if (points.length >= 2) {
                        pl.setAttribute("points", points.map((p) => `${p.x},${p.y}`).join(" "));
                        pl.setAttribute("fill", "none");
                        pl.setAttribute("stroke", "rgba(180,241,126,0.95)");
                        pl.setAttribute("stroke-width", "0.65");
                        pl.setAttribute("stroke-linejoin", "round");
                        pl.setAttribute("stroke-linecap", "round");
                        svg.appendChild(pl);
                        console.debug("[MEP.BalanceGraph] polyline: yes");
                    } else {
                        const p = points[0];
                        const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                        dot.setAttribute("cx", String(p.x));
                        dot.setAttribute("cy", String(p.y));
                        dot.setAttribute("r", "1.25");
                        dot.setAttribute("fill", "rgba(180,241,126,0.95)");
                        dot.setAttribute("stroke", "rgba(180,241,126,0.95)");
                        dot.setAttribute("stroke-width", "0.2");
                        dot.setAttribute("pointer-events", "none");
                        svg.appendChild(dot);
                        console.debug("[MEP.BalanceGraph] polyline: no (single point fallback)");
                    }

                    for (const p of points) {
                        const hit = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                        hit.setAttribute("cx", String(p.x));
                        hit.setAttribute("cy", String(p.y));
                        hit.setAttribute("r", "2.8");
                        hit.setAttribute("fill", "rgba(255,255,255,0.001)");
                        hit.setAttribute("stroke", "none");
                        hit.style.cursor = "crosshair";

                        hit.addEventListener("mouseenter", (ev) => {
                            const box = svg.getBoundingClientRect();
                            const rawV = Number(rawByStage[p.stage]);
                            const txt = `Баланс: ${Number.isFinite(rawV) ? rawV.toFixed(8) : "—"}`;
                            this._setTip(txt, ev.clientX - box.left + 10);
                        });
                        hit.addEventListener("mousemove", (ev) => {
                            const box = svg.getBoundingClientRect();
                            this._setTip(ui.balanceTip?.textContent || "", ev.clientX - box.left + 10);
                        });
                        hit.addEventListener("mouseleave", () => this._setTip(""));
                        svg.appendChild(hit);
                    }
                }
            },
        };

        // -------------------------
        // Frequency graph (> threshold in rolling period)
        // -------------------------
        MEP.FrequencyGraph = {
            _ui: null,
            init(ui) {
                this._ui = ui || null;
            },

            _toOldestFirstNumbers() {
                const src = Array.isArray(MEP.State.list) ? MEP.State.list : [];
                const out = [];
                for (let i = src.length - 1; i >= 0; i--) {
                    const n = MEP.Utils.cleanToNum(src[i]);
                    if (Number.isFinite(n)) out.push(n);
                }
                return out;
            },

            _buildSeries(values, threshold, period) {
                if (!Array.isArray(values) || !values.length) return [];
                const p = Math.max(1, Math.floor(Number(period) || 1));
                const t = Number(threshold);
                const thr = Number.isFinite(t) ? t : 7;
                const prefix = new Array(values.length + 1).fill(0);
                for (let i = 0; i < values.length; i++) {
                    prefix[i + 1] = prefix[i] + (values[i] > thr ? 1 : 0);
                }
                const out = new Array(values.length);
                for (let i = 0; i < values.length; i++) {
                    const start = Math.max(0, i - p + 1);
                    out[i] = prefix[i + 1] - prefix[start];
                }
                return out;
            },

            _getDiffVisibleLength() {
                const history = Array.isArray(MEP.State.diffHistory) ? MEP.State.diffHistory : [];
                const effDensity = MEP.State.diffDensitySync
                    ? Math.max(10, Math.floor(Number(MEP.State.graphDensity || 100) || 100))
                    : Math.max(10, Math.floor(Number(MEP.State.diffDensity || MEP.State.diffDensityManual || 81) || 81));
                if (!history.length) return 0;
                return Math.min(history.length, effDensity);
            },

            _tailWithDensity(arr, density) {
                if (!arr.length) return [];
                const d = Math.max(10, Math.floor(Number(density || 81) || 81));
                return arr.slice(Math.max(0, arr.length - d));
            },

            _syncToMasterLen(arr, masterLen) {
                if (!Array.isArray(arr) || !arr.length || masterLen <= 0) return [];
                if (arr.length >= masterLen) return arr.slice(arr.length - masterLen);
                const pad = new Array(masterLen - arr.length).fill(arr[0] ?? 0);
                return pad.concat(arr);
            },

            _buildPoints(values, yMax, vbW, vbH) {
                if (!values.length || yMax <= 0) return [];
                if (values.length === 1) {
                    const y = vbH - (values[0] / yMax) * (vbH - 2) - 1;
                    return [{ stage: 0, x: 0, y: Math.max(1, Math.min(vbH - 1, y)), value: values[0] }];
                }

                const out = [];
                const stepX = vbW / (values.length - 1);
                for (let i = 0; i < values.length; i++) {
                    const x = stepX * i;
                    const y = vbH - (values[i] / yMax) * (vbH - 2) - 1;
                    out.push({ stage: i, x, y: Math.max(1, Math.min(vbH - 1, y)), value: values[i] });
                }
                return out;
            },

            _calcEMA(values, period) {
                const src = Array.isArray(values) ? values : [];
                const p = Math.max(1, Math.floor(Number(period) || 1));
                const alpha = 2 / (p + 1);
                const out = [];
                let prev = null;
                for (let i = 0; i < src.length; i++) {
                    const v = Number(src[i]) || 0;
                    if (prev === null) prev = v;
                    else prev = alpha * v + (1 - alpha) * prev;
                    out.push(prev);
                }
                return out;
            },

            _buildVectorSeries(values, opts) {
                const src = Array.isArray(values) ? values : [];
                const o = opts && typeof opts === "object" ? opts : {};
                const clipFrom = Math.max(0, Math.floor(Number(o.clipFrom) || 0));
                const clipLenRaw = Math.floor(Number(o.clipLen) || src.length);
                const clipLen = Math.max(0, clipLenRaw);
                const period = Math.max(1, Math.floor(Number(MEP.State.frequencyVectorPeriod) || 9));
                const shift = Math.max(1, Math.floor(Number(MEP.State.frequencyVectorPhaseShift) || 3));
                const mainEMA = this._calcEMA(src, period);
                const shiftedEMA = new Array(mainEMA.length);
                for (let i = 0; i < mainEMA.length; i++) {
                    const j = i - shift;
                    shiftedEMA[i] = j >= 0 ? mainEMA[j] : null;
                }
                const from = Math.min(clipFrom, mainEMA.length);
                const to = Math.min(mainEMA.length, from + clipLen);
                return {
                    mainEMA: mainEMA.slice(from, to),
                    shiftedEMA: shiftedEMA.slice(from, to),
                    period,
                    shift,
                };
            },

            _updateVectorState(mainEMA, shiftedEMA) {
                if (!Array.isArray(mainEMA) || !mainEMA.length || !Array.isArray(shiftedEMA) || !shiftedEMA.length) {
                    MEP.State.frequencyVectorState = "flat";
                    MEP.State.frequencyVectorSignal = 0;
                    return;
                }
                const lastMain = Number(mainEMA[mainEMA.length - 1]) || 0;
                const lastShiftRaw = shiftedEMA[shiftedEMA.length - 1];
                const lastShift = Number.isFinite(Number(lastShiftRaw)) ? Number(lastShiftRaw) : lastMain;
                const signal = lastMain - lastShift;
                const eps = Math.max(0, Number(MEP.State.frequencyVectorFlatEpsilon) || 0);
                MEP.State.frequencyVectorSignal = signal;
                MEP.State.frequencyVectorState = signal > eps ? "up" : signal < -eps ? "down" : "flat";
            },

            _ensureTip() {
                const ui = this._ui;
                if (!ui?.frequencyGraphSvg) return null;
                if (ui.frequencyTip) return ui.frequencyTip;
                const host = ui.frequencyGraphSvg.parentElement;
                if (!host) return null;
                const tip = document.createElement("div");
                tip.className = "mep-frequency-tip";
                host.appendChild(tip);
                ui.frequencyTip = tip;
                return tip;
            },

            _setTip(text, xPx) {
                const ui = this._ui;
                const tip = this._ensureTip();
                if (!ui?.frequencyGraphSvg || !tip) return;
                if (!text) {
                    tip.style.display = "none";
                    return;
                }

                tip.textContent = text;
                tip.style.display = "block";
                tip.style.top = "6px";
                const host = ui.frequencyGraphSvg.parentElement;
                const hostW = host?.clientWidth || 0;
                const safeX = Number.isFinite(xPx) ? Math.max(6, xPx) : 6;
                tip.style.left = `${safeX}px`;
                const tipW = tip.offsetWidth || 0;
                if (hostW > 0 && tipW > 0) {
                    const maxLeft = Math.max(6, hostW - tipW - 6);
                    tip.style.left = `${Math.min(safeX, maxLeft)}px`;
                }
            },

            render() {
                const ui = this._ui;
                if (!ui?.frequencyGraphSvg) return;
                const svg = ui.frequencyGraphSvg;
                svg.innerHTML = "";
                this._setTip("");

                const threshold = Math.max(0, Number(MEP.State.frequencyThreshold) || 0);
                const period = Math.max(1, Math.floor(Number(MEP.State.frequencyPeriod) || 1));
                const oldestFirst = this._toOldestFirstNumbers();
                const fullSeries = this._buildSeries(oldestFirst, threshold, period);

                let viewSeries = [];
                let viewStartIndex = 0;
                if (MEP.State.frequencyGraphDensitySync) {
                    const masterLen = this._getDiffVisibleLength();
                    if (fullSeries.length >= masterLen) {
                        viewStartIndex = Math.max(0, fullSeries.length - masterLen);
                    } else {
                        viewStartIndex = 0;
                    }
                    viewSeries = this._syncToMasterLen(fullSeries, masterLen);
                } else {
                    const density = Math.max(10, Math.floor(Number(MEP.State.frequencyGraphDensity || 81) || 81));
                    viewStartIndex = Math.max(0, fullSeries.length - density);
                    viewSeries = this._tailWithDensity(fullSeries, MEP.State.frequencyGraphDensity);
                }

                const vbW = 100;
                const vbH = 60;
                const stageCount = viewSeries.length;
                const yMax = Math.max(1, ...viewSeries, 1);
                const points = this._buildPoints(viewSeries, yMax, vbW, vbH);

                const vectorPeriod = Math.max(1, Math.floor(Number(MEP.State.frequencyVectorPeriod) || 9));
                const vectorShift = Math.max(1, Math.floor(Number(MEP.State.frequencyVectorPhaseShift) || 3));
                const warmup = Math.max(vectorPeriod * 3, vectorShift + vectorPeriod + 10);
                const extStart = Math.max(0, viewStartIndex - warmup);
                const extEnd = Math.min(fullSeries.length, viewStartIndex);
                const leftTail = fullSeries.slice(extStart, extEnd);
                const extendedSeries = leftTail.concat(viewSeries);
                const clipFrom = leftTail.length;
                const vectorData = this._buildVectorSeries(extendedSeries, {
                    clipFrom,
                    clipLen: viewSeries.length,
                });
                this._updateVectorState(vectorData.mainEMA, vectorData.shiftedEMA);

                const base = document.createElementNS("http://www.w3.org/2000/svg", "line");
                base.setAttribute("x1", "0");
                base.setAttribute("x2", String(vbW));
                base.setAttribute("y1", String(vbH - 1));
                base.setAttribute("y2", String(vbH - 1));
                base.setAttribute("stroke", "rgba(255,255,255,0.20)");
                base.setAttribute("stroke-width", "0.4");
                svg.appendChild(base);

                const lineValue = Math.max(0, Number(MEP.State.frequencyGraphLine) || 0);
                if (lineValue > 0) {
                    const y = vbH - (lineValue / yMax) * (vbH - 2) - 1;
                    const ySafe = Math.max(-vbH * 4, Math.min(vbH * 5, y));
                    const ln = document.createElementNS("http://www.w3.org/2000/svg", "line");
                    ln.setAttribute("x1", "0");
                    ln.setAttribute("x2", String(vbW));
                    ln.setAttribute("y1", String(ySafe));
                    ln.setAttribute("y2", String(ySafe));
                    ln.setAttribute("stroke", "rgba(255,240,140,0.70)");
                    ln.setAttribute("stroke-width", "0.45");
                    ln.setAttribute("stroke-dasharray", "2 1.6");
                    ln.setAttribute("pointer-events", "none");
                    svg.appendChild(ln);
                }

                if (stageCount > 1) {
                    const stepX = vbW / (stageCount - 1);
                    for (let i = 0; i < stageCount; i++) {
                        const x = stepX * i;
                        const ln = document.createElementNS("http://www.w3.org/2000/svg", "line");
                        ln.setAttribute("x1", String(x));
                        ln.setAttribute("x2", String(x));
                        ln.setAttribute("y1", "0");
                        ln.setAttribute("y2", String(vbH));
                        ln.setAttribute("stroke", "rgba(255,255,255,0.13)");
                        ln.setAttribute("stroke-width", "0.25");
                        ln.setAttribute("stroke-dasharray", "1.4 1.4");
                        ln.setAttribute("pointer-events", "none");
                        svg.appendChild(ln);
                    }
                }

                if (points.length) {
                    const pl = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
                    pl.setAttribute("points", points.map((p) => `${p.x},${p.y}`).join(" "));
                    pl.setAttribute("fill", "none");
                    pl.setAttribute("stroke", "rgba(180,241,126,0.95)");
                    pl.setAttribute("stroke-width", "0.65");
                    pl.setAttribute("stroke-linejoin", "round");
                    pl.setAttribute("stroke-linecap", "round");
                    svg.appendChild(pl);

                    if (MEP.State.frequencyVectorEnabled !== false) {
                        const makeVectorPolyline = (series, stroke, width) => {
                            if (!Array.isArray(series) || !series.length) return;
                            const stepX = series.length <= 1 ? 0 : vbW / (series.length - 1);
                            const pts = [];
                            for (let i = 0; i < series.length; i++) {
                                const raw = series[i];
                                const v = Number(raw);
                                if (!Number.isFinite(v)) continue;
                                const x = stepX * i;
                                const y = vbH - (v / yMax) * (vbH - 2) - 1;
                                pts.push(`${x},${Math.max(1, Math.min(vbH - 1, y))}`);
                            }
                            if (!pts.length) return;
                            const line = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
                            line.setAttribute("points", pts.join(" "));
                            line.setAttribute("fill", "none");
                            line.setAttribute("stroke", stroke);
                            line.setAttribute("stroke-width", String(width));
                            line.setAttribute("stroke-linejoin", "round");
                            line.setAttribute("stroke-linecap", "round");
                            line.setAttribute("pointer-events", "none");
                            svg.appendChild(line);
                        };

                        makeVectorPolyline(
                            vectorData.mainEMA,
                            (MEP.State.frequencyVectorMainColor || "rgba(255,255,255,0.96)").toString(),
                            Number(MEP.State.frequencyVectorMainWidth) || 0.9
                        );
                        makeVectorPolyline(
                            vectorData.shiftedEMA,
                            (MEP.State.frequencyVectorShiftColor || "rgba(80,210,255,0.92)").toString(),
                            Number(MEP.State.frequencyVectorShiftWidth) || 0.7
                        );
                    }

                    for (const p of points) {
                        const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                        dot.setAttribute("cx", String(p.x));
                        dot.setAttribute("cy", String(p.y));
                        dot.setAttribute("r", "0.5");
                        dot.setAttribute("fill", "rgba(180,241,126,0.95)");
                        dot.setAttribute("pointer-events", "none");
                        svg.appendChild(dot);

                        const hit = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                        hit.setAttribute("cx", String(p.x));
                        hit.setAttribute("cy", String(p.y));
                        hit.setAttribute("r", "2.8");
                        hit.setAttribute("fill", "rgba(255,255,255,0.001)");
                        hit.setAttribute("stroke", "none");
                        hit.style.cursor = "crosshair";

                        hit.addEventListener("mouseenter", (ev) => {
                            const box = svg.getBoundingClientRect();
                            const txt = `Этап: ${p.stage + 1}\nЧастотность: ${p.value}`;
                            this._setTip(txt, ev.clientX - box.left + 10);
                        });
                        hit.addEventListener("mousemove", (ev) => {
                            const box = svg.getBoundingClientRect();
                            this._setTip(ui.frequencyTip?.textContent || "", ev.clientX - box.left + 10);
                        });
                        hit.addEventListener("mouseleave", () => this._setTip(""));
                        svg.appendChild(hit);
                    }
                }
            },
        };

        // -------------------------
        // Strategy1 module (skeleton)
        // -------------------------
        MEP.Strategy1 = {
            DECISION_STATUS: {
                IDLE: "idle",
                WAITING_SIGNAL: "waiting_signal",
                BET_ALLOWED: "bet_allowed",
                CYCLE_SHOULD_END: "cycle_should_end",
                PAUSED_MANUAL: "paused_manual",
                WAITING_BALANCE_RECOVERY: "waiting_balance_recovery",
            },

            getState() {
                return MEP.State?.strategies?.strategy1 || null;
            },

            init() {
                const st = this.getState();
                if (!st) return;
                this.buildStakePlan();
                this.evaluateDecisionState();
                this.updateUiCounters();
            },

            resetCycle() {
                const st = this.getState();
                if (!st) return null;
                const d = buildStrategy1DefaultState();
                st.cycle = { ...d.cycle };
                st.counters = { ...d.counters };
                st.timers = { ...d.timers };
                st.runtime.waitingRoundResult = false;
                st.runtime.lastCycleAction = "resetCycle";
                this.evaluateDecisionState();
                this.updateUiCounters();
                return st.cycle;
            },

            startCycle() {
                const st = this.getState();
                if (!st) return false;
                if (MEP.State.activeStrategyId && MEP.State.activeStrategyId !== st.id) return false;
                st.isExecuting = true;
                st.executionLocked = false;
                MEP.State.activeStrategyId = st.id;
                st.cycle.isActive = true;
                st.cycle.cycleId = `s1_${Date.now()}`;
                st.cycle.endReason = "";
                st.timers.cycleStartedAtTs = Date.now();
                st.runtime.lastCycleAction = "startCycle";
                this.evaluateDecisionState();
                this.updateUiCounters();
                return true;
            },

            finishCycle(reason = "") {
                const st = this.getState();
                if (!st) return null;
                st.cycle.isActive = false;
                st.isExecuting = false;
                st.cycle.endReason = (reason || "manual").toString();
                st.timers.cycleFinishedAtTs = Date.now();
                st.timers.cycleDurationMs = Math.max(
                    0,
                    st.timers.cycleFinishedAtTs - (st.timers.cycleStartedAtTs || st.timers.cycleFinishedAtTs)
                );
                if (MEP.State.activeStrategyId === st.id) MEP.State.activeStrategyId = null;
                st.runtime.lastCycleAction = "finishCycle";
                this.evaluateDecisionState();
                this.updateUiCounters();
                return st.cycle.endReason;
            },

            checkCharter() {
                const st = this.getState();
                if (!st) return { allowed: false, blockReason: "strategy1_not_found" };
                st.charterCheck.allowed = true;
                st.charterCheck.blockReason = "";
                st.runtime.lastCycleAction = "checkCharter";
                return { ...st.charterCheck };
            },

            checkConditions() {
                const st = this.getState();
                if (!st) return { canBet: false, shouldEndCycle: false, reason: "strategy1_not_found" };
                const result = { ...st.conditions.lastResult };
                st.runtime.lastConditionResult = result;
                st.runtime.lastCycleAction = "checkConditions";
                this.updateUiCounters();
                return result;
            },

            buildStakePlan() {
                const st = this.getState();
                if (!st) return { betAmount: 0, targetMultiplier: 0, ready: false };
                st.stakePlan.calcMode = `${st.config.startStakeMode}:${st.config.stakeGrowthMode}`;
                st.stakePlan.targetMultiplier = Number(st.config.targetMultiplierValue) || 0;
                st.stakePlan.betAmount = Number(st.config.startStakeValue) || 0;
                st.stakePlan.ready = false;
                st.runtime.lastStakePlanResult = { ...st.stakePlan };
                st.runtime.lastCycleAction = "buildStakePlan";
                this.updateUiCounters();
                return { ...st.stakePlan };
            },

            updateDecisionState(partial = {}) {
                const st = this.getState();
                if (!st) return null;
                if (!st.runtime) st.runtime = {};
                if (!st.runtime.decisionState || typeof st.runtime.decisionState !== "object") {
                    const d = buildStrategy1DefaultState();
                    st.runtime.decisionState = { ...d.runtime.decisionState };
                }
                st.runtime.decisionState = {
                    ...st.runtime.decisionState,
                    ...(partial && typeof partial === "object" ? partial : {}),
                    lastDecisionAtTs: Date.now(),
                };
                this.updateUiCounters();
                return { ...st.runtime.decisionState };
            },

            evaluateDecisionState() {
                const st = this.getState();
                if (!st) return null;
                if (!st.enabled) {
                    return this.updateDecisionState({
                        canMakeBet: false,
                        shouldEndCycle: false,
                        statusCode: this.DECISION_STATUS.IDLE,
                        statusText: "Стратегия выключена",
                        branch: "",
                        waitReason: "",
                    });
                }
                if (!st.cycle?.isActive) {
                    return this.updateDecisionState({
                        canMakeBet: false,
                        shouldEndCycle: false,
                        statusCode: this.DECISION_STATUS.IDLE,
                        statusText: "Ожидание запуска цикла",
                        branch: "",
                        waitReason: "Цикл не активирован",
                    });
                }
                return this.updateDecisionState({
                    canMakeBet: false,
                    shouldEndCycle: false,
                    statusCode: this.DECISION_STATUS.WAITING_SIGNAL,
                    statusText: "Цикл активен — ожидание сигнала",
                    branch: "",
                    waitReason: "Нет входного сигнала",
                });
            },

            updateUiCounters() {
                const st = this.getState();
                const ui = MEP.UI?.ui;
                if (!st || !ui) return;
                const decision = st.runtime?.decisionState || {};

                if (ui.strategy1ConditionsModeEl) ui.strategy1ConditionsModeEl.textContent = st.conditions.mode || "all";
                if (ui.strategy1ConditionsCanBetEl)
                    ui.strategy1ConditionsCanBetEl.textContent = String(!!st.conditions.lastResult?.canBet);
                if (ui.strategy1ConditionsEndEl)
                    ui.strategy1ConditionsEndEl.textContent = String(!!st.conditions.lastResult?.shouldEndCycle);
                if (ui.strategy1ConditionsReasonEl)
                    ui.strategy1ConditionsReasonEl.textContent = (st.conditions.lastResult?.reason || "—").toString();
                if (ui.strategy1StakeCalcModeEl)
                    ui.strategy1StakeCalcModeEl.textContent = (
                        st.stakePlan.calcMode || `${st.config.startStakeMode}:${st.config.stakeGrowthMode}`
                    ).toString();
                if (ui.strategy1TargetCalcModeEl)
                    ui.strategy1TargetCalcModeEl.textContent = (st.config.targetMode || "fixed").toString();
                if (ui.strategy1LastBetAmountEl)
                    ui.strategy1LastBetAmountEl.textContent = String(Number(st.stakePlan.betAmount) || 0);
                if (ui.strategy1LastTargetMultiplierEl)
                    ui.strategy1LastTargetMultiplierEl.textContent = String(Number(st.stakePlan.targetMultiplier) || 0);
                if (ui.strategy1CycleStartBalanceEl)
                    ui.strategy1CycleStartBalanceEl.textContent = String(
                        Number(st.counters.startBalanceBeforeCycle) || Number(st.cycle.startBalance) || 0
                    );
                if (ui.strategy1CycleCurrentBalanceEl)
                    ui.strategy1CycleCurrentBalanceEl.textContent = String(
                        Number(st.counters.currentBalanceAfterRound) || Number(st.cycle.currentBalance) || 0
                    );
                if (ui.strategy1CycleLastStakeEl)
                    ui.strategy1CycleLastStakeEl.textContent = String(
                        Number(st.counters.lastStake) || Number(st.cycle.lastStake) || 0
                    );
                if (ui.strategy1CycleTotalStakeEl)
                    ui.strategy1CycleTotalStakeEl.textContent = String(
                        Number(st.counters.totalStakeSumInCycle) || Number(st.cycle.totalStakeSum) || 0
                    );
                if (ui.strategy1CycleLossCountEl)
                    ui.strategy1CycleLossCountEl.textContent = String(
                        Number(st.counters.lossRoundCount) || Number(st.cycle.lossCount) || 0
                    );
                if (ui.strategy1CycleWinCountEl)
                    ui.strategy1CycleWinCountEl.textContent = String(
                        Number(st.counters.winRoundCount) || Number(st.cycle.winCount) || 0
                    );
                if (ui.strategy1CycleStatusEl)
                    ui.strategy1CycleStatusEl.textContent = st.cycle.isActive ? "active" : st.isExecuting ? "executing" : "idle";
                if (ui.strategy1CycleEndReasonEl)
                    ui.strategy1CycleEndReasonEl.textContent = (st.cycle.endReason || "—").toString();
                if (ui.strategy1DecisionStatusTextEl)
                    ui.strategy1DecisionStatusTextEl.textContent = (decision.statusText || "—").toString();
                if (ui.strategy1DecisionStatusCodeEl)
                    ui.strategy1DecisionStatusCodeEl.textContent = (decision.statusCode || "—").toString();
                if (ui.strategy1DecisionCanBetEl)
                    ui.strategy1DecisionCanBetEl.textContent = String(!!decision.canMakeBet);
                if (ui.strategy1DecisionEndCycleEl)
                    ui.strategy1DecisionEndCycleEl.textContent = String(!!decision.shouldEndCycle);
                if (ui.strategy1DecisionBranchEl)
                    ui.strategy1DecisionBranchEl.textContent = (decision.branch || "—").toString();
                if (ui.strategy1DecisionWaitReasonEl)
                    ui.strategy1DecisionWaitReasonEl.textContent = (decision.waitReason || "—").toString();
            },
        };

        // -------------------------
        // UI module
        // -------------------------
        MEP.UI = {
            ui: null,

            setMainTab(tab) {
                const ui = MEP.UI.ui;
                if (!ui) return;
                const nextTab = tab === "game" ? "game" : "main";
                ui._mainTab = nextTab;

                if (ui.mainTabButtons?.length) {
                    for (const btn of ui.mainTabButtons) {
                        const isActive = (btn.dataset.tab || "") === nextTab;
                        btn.classList.toggle("is-active", isActive);
                    }
                }

                ui.mainPanel?.classList.toggle("is-active", nextTab === "main");
                ui.gamePanel?.classList.toggle("is-active", nextTab === "game");
            },

            setGameTab(tab) {
                const ui = MEP.UI.ui;
                if (!ui) return;
                const nextTab = tab === "charter" ? "charter" : tab === "strategy2" ? "strategy2" : "strategy1";
                ui._gameTab = nextTab;

                if (ui.gameTabButtons?.length) {
                    for (const btn of ui.gameTabButtons) {
                        const isActive = (btn.dataset.tab || "") === nextTab;
                        btn.classList.toggle("is-active", isActive);
                    }
                }

                ui.charterPanel?.classList.toggle("is-active", nextTab === "charter");
                ui.strategy1Panel?.classList.toggle("is-active", nextTab === "strategy1");
                ui.strategy2Panel?.classList.toggle("is-active", nextTab === "strategy2");
            },

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
    <div class="mep-diff-head">
        <div class="mep-diff-title">График разниц</div>
        <button class="mep-diff-collapse" type="button" title="Свернуть параметры">▲</button>
    </div>
    <div class="mep-diff-params">
        <div class="mep-diff-vector-row">
            <label class="mep-diff-vector-label"><input class="mep-diff-vector-enabled mep-diff-vector-check" type="checkbox" checked><span>Вектор</span></label>
            <label class="mep-diff-vector-label"><span>P</span><input class="mep-diff-vector-period" type="number" min="1" step="1" value="9"></label>
            <label class="mep-diff-vector-label"><span>S</span><input class="mep-diff-vector-shift" type="number" min="1" step="1" value="3"></label>
            <label class="mep-diff-vector-label"><span>Flat</span><input class="mep-diff-vector-flat" type="number" min="0" step="0.01" value="0.15"></label>
        </div>
        <div class="mep-two-params">
            <div class="mep-two-subrow">
                <span class="mep-two-head-label">Последние</span>
                <input class="mep-two-lastn" type="number" min="1" step="1" value="250" />
                <label class="mep-two-head-right">
                    <input class="mep-two-all" type="checkbox" />
                    <span>вся история</span>
                </label>
            </div>
            <div class="mep-two-subrow">
                <span class="mep-two-head-label start">Старт</span>
                <input class="mep-two-start" type="number" min="0" step="1" value="0" />
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
    </div>
    <div class="mep-two-stat-wrap">
        <div class="mep-two-head">
            <div class="mep-two-total">
                <span class="mep-two-total-n">0</span><span class="mep-two-total-sep">|</span
                ><span class="mep-two-diff zero">0</span>
            </div>
        </div>
        <div class="mep-two-body">
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
    </div>
    <div class="mep-diff-lenrow"><span class="mep-diff-len">len: 0</span><span class="mep-diff-lvlwrap"><span class="mep-diff-lvl-sign">+</span><input class="mep-diff-lvl-pos" type="number" min="0" step="1" value="0"><span class="mep-diff-lvl-sign">-</span><input class="mep-diff-lvl-neg" type="number" min="0" step="1" value="0"></span></div>
    <div class="mep-diff-graph-area">
        <div class="mep-diff-maxrow"><span class="mep-diff-max">max: +0</span></div>
        <div class="mep-diff-box">
            <svg class="mep-diff" viewBox="0 0 100 60" preserveAspectRatio="none"></svg>
        </div>
        <div class="mep-diff-minrow"><span class="mep-diff-min">min: -0</span></div>
    </div>
</div>
<div class="mep-frequency-graph-wrap">
    <div class="mep-graph-head">
        <div class="mep-block-title">График частотности</div>
        <button class="mep-frequency-collapse" type="button" title="Свернуть параметры">▲</button>
    </div>
    <div class="mep-frequency-params">
        <div class="mep-frequency-controls">
            <label class="mep-frequency-label">Множитель<input class="mep-frequency-threshold" type="number" min="0" step="0.01" value="7" /></label>
            <label class="mep-frequency-label">Период<input class="mep-frequency-period" type="number" min="1" step="1" value="50" /></label>
            <label class="mep-frequency-label">Плотн.<input class="mep-frequency-density" type="number" min="10" step="1" value="81" /></label>
            <label class="mep-frequency-label">Гор.линия<input class="mep-frequency-line" type="number" min="0" step="0.1" value="0" /></label>
            <label class="mep-frequency-sync-label"><input class="mep-frequency-sync" type="checkbox" /><span>Синхр.</span></label>
            <span class="mep-frequency-vector-row">
                <label class="mep-frequency-vector-label"><input class="mep-frequency-vector-enabled" type="checkbox" checked /><span>Вектор</span></label>
                <label class="mep-frequency-vector-label"><span>P</span><input class="mep-frequency-vector-period" type="number" min="1" step="1" value="9" /></label>
                <label class="mep-frequency-vector-label"><span>S</span><input class="mep-frequency-vector-shift" type="number" min="1" step="1" value="3" /></label>
                <label class="mep-frequency-vector-label"><span>Flat</span><input class="mep-frequency-vector-flat" type="number" min="0" step="0.01" value="0.15" /></label>
            </span>
        </div>
    </div>
    <div class="mep-frequency-graph-box">
        <svg class="mep-frequency-graph" viewBox="0 0 100 60" preserveAspectRatio="none"></svg>
        <div class="mep-frequency-tip" style="display: none"></div>
    </div>
</div>
<div class="mep-stake-graph-wrap">
    <div class="mep-graph-head">
        <div class="mep-block-title">График ставок</div>
        <button class="mep-stake-collapse" type="button" title="Свернуть параметры">▲</button>
    </div>
    <div class="mep-stake-params">
        <div class="mep-stake-controls">
            <label class="mep-stake-density-label">плотн.<input class="mep-stake-density" type="number" min="10" step="1" value="81" /></label>
            <label class="mep-stake-sync-label"><input class="mep-stake-sync" type="checkbox" /><span>Синхр.</span></label>
            <label class="mep-stake-sync-label"><input class="mep-stake-auto-height" type="checkbox" /><span>Автовысота</span></label>
            <label class="mep-stake-density-label">Клиенты масштаб<input class="mep-stake-scale-players" type="number" min="0" step="0.1" value="1" /></label>
            <label class="mep-stake-density-label">Ставки масштаб<input class="mep-stake-scale-bet" type="number" min="0" step="0.1" value="10" /></label>
        </div>
        <div class="mep-stake-legend">
            <label class="mep-stake-legend-item">
                <input class="mep-stake-show-players" type="checkbox" checked />
                <span class="mep-stake-legend-line mep-stake-legend-players"></span>
                <span>Клиенты</span>
            </label>
            <label class="mep-stake-legend-item">
                <input class="mep-stake-show-bet" type="checkbox" checked />
                <span class="mep-stake-legend-line mep-stake-legend-bets"></span>
                <span>Ставка x10</span>
            </label>
        </div>
        </div>
    <div class="mep-stake-graph-box">
        <svg class="mep-stake-graph" viewBox="0 0 100 60" preserveAspectRatio="none"></svg>
    </div>
</div>
<div class="mep-balance-graph-wrap">
    <div class="mep-graph-head">
        <div class="mep-block-title">График баланса</div>
        <button class="mep-balance-collapse" type="button" title="Свернуть параметры">▲</button>
    </div>
    <div class="mep-balance-params">
        <div class="mep-balance-controls">
            <label class="mep-balance-density-label">плотн.<input class="mep-balance-density" type="number" min="10" step="1" value="81" /></label>
            <label class="mep-balance-sync-label"><input class="mep-balance-sync" type="checkbox" /><span>Синхр.</span></label>
            <label class="mep-balance-sync-label"><input class="mep-balance-auto-height" type="checkbox" /><span>Автовысота</span></label>
        </div>
    </div>
    <div class="mep-balance-graph-box">
        <svg class="mep-balance-graph" viewBox="0 0 100 60" preserveAspectRatio="none"></svg>
    </div>
</div>
<div class="mep-graph-wrap">
    <div class="mep-graph-head">
        <div class="mep-block-title">График</div>
        <button class="mep-main-graph-collapse" type="button" title="Свернуть параметры">▲</button>
    </div>
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
        <label class="mep-graph-label"
            >Гор.линия 2
            <input class="mep-graph-line2" type="number" min="0" step="0.1" />
        </label>
        <label class="mep-graph-label"
            >Гор.линия 3
            <input class="mep-graph-line3" type="number" min="0" step="0.1" />
        </label>
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

                const header = panel.querySelector(".mep-header");
                const body = panel.querySelector(".mep-body");
                const diffWrap = panel.querySelector(".mep-diff-wrap");
                const twoWrap = panel.querySelector(".mep-two-stat-wrap");
                const frequencyWrap = panel.querySelector(".mep-frequency-graph-wrap");
                const stakeWrap = panel.querySelector(".mep-stake-graph-wrap");
                const balanceWrap = panel.querySelector(".mep-balance-graph-wrap");
                const graphWrap = panel.querySelector(".mep-graph-wrap");

                if (header) {
                    const mainTabs = document.createElement("div");
                    mainTabs.className = "mep-main-tabs";
                    mainTabs.innerHTML = `
<button class="mep-main-tab-btn is-active" type="button" data-tab="main">Главная</button>
<button class="mep-main-tab-btn" type="button" data-tab="game">Игра</button>
`;

                    const mainPanel = document.createElement("div");
                    mainPanel.className = "mep-tab-panel mep-tab-panel-main is-active";
                    const mainContent = document.createElement("div");
                    mainContent.className = "mep-main-content";
                    mainPanel.appendChild(mainContent);

                    const gamePanel = document.createElement("div");
                    gamePanel.className = "mep-tab-panel mep-tab-panel-game";
                    gamePanel.innerHTML = `
<div class="mep-game-tabs">
    <button class="mep-game-tab-btn is-active" type="button" data-tab="charter">Устав</button>
    <button class="mep-game-tab-btn" type="button" data-tab="strategy1">Стратегия1</button>
    <button class="mep-game-tab-btn" type="button" data-tab="strategy2">Стратегия2</button>
</div>
<div class="mep-game-tab-panel mep-game-tab-panel-charter is-active">
    <div class="mep-charter-note">0 = без ограничений</div>
    <div class="mep-charter-sections">
        <div class="mep-charter-section">
            <div class="mep-charter-section-title">Нагрузка</div>
            <div class="mep-charter-form">
                <div class="mep-charter-row"><span class="mep-charter-label">общее количество раундов в час</span><input class="mep-charter-input mep-charter-rounds-hour" type="number" min="0" step="1" title="0 = без ограничений" /><span class="mep-charter-suffix"></span></div>
                <div class="mep-charter-row"><span class="mep-charter-label">общее количество раундов за 6 часов</span><input class="mep-charter-input mep-charter-rounds-6h" type="number" min="0" step="1" title="0 = без ограничений" /><span class="mep-charter-suffix"></span></div>
                <div class="mep-charter-row"><span class="mep-charter-label">общее количество раундов за сутки</span><input class="mep-charter-input mep-charter-rounds-day" type="number" min="0" step="1" title="0 = без ограничений" /><span class="mep-charter-suffix"></span></div>
            </div>
        </div>
        <div class="mep-charter-section">
            <div class="mep-charter-section-title">Результативность</div>
            <div class="mep-charter-form">
                <div class="mep-charter-row"><span class="mep-charter-label">количество выигрышей в час</span><input class="mep-charter-input mep-charter-wins-hour" type="number" min="0" step="1" title="0 = без ограничений" /><span class="mep-charter-suffix"></span></div>
                <div class="mep-charter-row"><span class="mep-charter-label">количество выигрышей за 6 часов</span><input class="mep-charter-input mep-charter-wins-6h" type="number" min="0" step="1" title="0 = без ограничений" /><span class="mep-charter-suffix"></span></div>
                <div class="mep-charter-row"><span class="mep-charter-label">количество выигрышей за сутки</span><input class="mep-charter-input mep-charter-wins-day" type="number" min="0" step="1" title="0 = без ограничений" /><span class="mep-charter-suffix"></span></div>
            </div>
        </div>
        <div class="mep-charter-section">
            <div class="mep-charter-section-title">Ограничение потерь</div>
            <div class="mep-charter-form">
                <div class="mep-charter-row"><span class="mep-charter-label">количество проигрышей за час</span><input class="mep-charter-input mep-charter-losses-hour" type="number" min="0" step="1" title="0 = без ограничений" /><span class="mep-charter-suffix"></span></div>
                <div class="mep-charter-row"><span class="mep-charter-label">количество проигрышей за 6 часов</span><input class="mep-charter-input mep-charter-losses-6h" type="number" min="0" step="1" title="0 = без ограничений" /><span class="mep-charter-suffix"></span></div>
                <div class="mep-charter-row"><span class="mep-charter-label">количество проигрышей за день</span><input class="mep-charter-input mep-charter-losses-day" type="number" min="0" step="1" title="0 = без ограничений" /><span class="mep-charter-suffix"></span></div>
                <div class="mep-charter-row"><span class="mep-charter-label">время перерыва после трех подряд проигрышей</span><input class="mep-charter-input mep-charter-break-3loss-min" type="number" min="0" step="1" title="0 = без ограничений" /><span class="mep-charter-suffix">мин</span></div>
            </div>
        </div>
        <div class="mep-charter-section">
            <div class="mep-charter-section-title">Риск-менеджмент</div>
            <div class="mep-charter-form">
                <div class="mep-charter-row"><span class="mep-charter-label">процент макс от баланса для ставки</span><input class="mep-charter-input mep-charter-max-stake-percent" type="number" min="0" step="0.1" title="0 = без ограничений" /><span class="mep-charter-suffix">%</span></div>
            </div>
        </div>
    </div>
</div>
<div class="mep-game-tab-panel mep-game-tab-panel-strategy1">
    <div class="mep-strategy-section">
        <div class="mep-strategy-section-title">Стратегия1 · Управление</div>
        <div class="mep-strategy-row">
            <span class="mep-strategy-label">Вкл / Откл стратегии</span>
            <label class="mep-charter-label"><input class="mep-strategy1-enabled" type="checkbox" /> Включена</label>
        </div>
    </div>
    <div class="mep-strategy-section">
        <div class="mep-strategy-section-title">Текущее состояние стратегии</div>
        <div class="mep-strategy-state-grid">
            <div class="mep-strategy-state-row"><span class="mep-strategy-state-label">Статус:</span><span class="mep-strategy-state-value mep-strategy1-decision-status-text">Стратегия в ожидании</span></div>
            <div class="mep-strategy-state-row"><span class="mep-strategy-state-label">Код статуса:</span><span class="mep-strategy-state-value mep-strategy1-decision-status-code">idle</span></div>
            <div class="mep-strategy-state-row"><span class="mep-strategy-state-label">Ставка разрешена:</span><span class="mep-strategy-state-value mep-strategy1-decision-canbet">false</span></div>
            <div class="mep-strategy-state-row"><span class="mep-strategy-state-label">Нужно завершить цикл:</span><span class="mep-strategy-state-value mep-strategy1-decision-endcycle">false</span></div>
            <div class="mep-strategy-state-row"><span class="mep-strategy-state-label">Текущая ветка:</span><span class="mep-strategy-state-value mep-strategy1-decision-branch">—</span></div>
            <div class="mep-strategy-state-row"><span class="mep-strategy-state-label">Причина ожидания:</span><span class="mep-strategy-state-value mep-strategy1-decision-waitreason">—</span></div>
        </div>
    </div>
    <div class="mep-strategy-section">
        <div class="mep-strategy-section-title">Входные параметры</div>
        <div class="mep-strategy-form">
            <div class="mep-strategy-row"><span class="mep-strategy-label">Процент риска от баланса</span><input class="mep-strategy-input mep-strategy1-risk-percent" type="number" min="0" step="0.1" /></div>
            <div class="mep-strategy-row"><span class="mep-strategy-label">Режим начальной ставки</span><select class="mep-strategy-input mep-strategy1-start-stake-mode"><option value="fixed">fixed</option><option value="array">array</option></select></div>
            <div class="mep-strategy-row"><span class="mep-strategy-label">Начальная ставка</span><input class="mep-strategy-input mep-strategy1-start-stake-value" type="number" min="0" step="0.00000001" /></div>
            <div class="mep-strategy-row"><span class="mep-strategy-label">Массив начальных ставок</span><input class="mep-strategy-input mep-strategy1-start-stake-array" type="text" /></div>
            <div class="mep-strategy-row"><span class="mep-strategy-label">Режим приращения ставок</span><select class="mep-strategy-input mep-strategy1-stake-growth-mode"><option value="factor">factor</option><option value="array">array</option></select></div>
            <div class="mep-strategy-row"><span class="mep-strategy-label">Коэффициент приращения ставок</span><input class="mep-strategy-input mep-strategy1-stake-growth-factor" type="number" min="0" step="0.01" /></div>
            <div class="mep-strategy-row"><span class="mep-strategy-label">Массив приращения ставок</span><input class="mep-strategy-input mep-strategy1-stake-growth-array" type="text" /></div>
            <div class="mep-strategy-row"><span class="mep-strategy-label">Режим целевого множителя</span><select class="mep-strategy-input mep-strategy1-target-mode"><option value="fixed">fixed</option><option value="array">array</option></select></div>
            <div class="mep-strategy-row"><span class="mep-strategy-label">Целевой множитель игры</span><input class="mep-strategy-input mep-strategy1-target-multiplier" type="number" min="0" step="0.01" /></div>
            <div class="mep-strategy-row"><span class="mep-strategy-label">Массив целевых множителей</span><input class="mep-strategy-input mep-strategy1-target-multiplier-array" type="text" /></div>
            <div class="mep-strategy-row"><span class="mep-strategy-label">Макс. количество проигрышей</span><input class="mep-strategy-input mep-strategy1-max-losses" type="number" min="0" step="1" /></div>
        </div>
    </div>
    <div class="mep-strategy-section">
        <div class="mep-strategy-section-title">Конструктор условий</div>
        <div class="mep-strategy-placeholder">Проверка по Уставу + доп. проверки сущностей.
Режим: <span class="mep-strategy1-conditions-mode">all</span>
Rules: placeholder (будущий конструктор)
LastResult: canBet=<span class="mep-strategy1-conditions-canbet">false</span>, shouldEndCycle=<span class="mep-strategy1-conditions-end">false</span>, reason=<span class="mep-strategy1-conditions-reason">—</span></div>
    </div>
    <div class="mep-strategy-section">
        <div class="mep-strategy-section-title">Конструктор ставок</div>
        <div class="mep-strategy-placeholder">Режим ставки: <span class="mep-strategy1-stake-calc-mode">—</span>
Режим target: <span class="mep-strategy1-target-calc-mode">—</span>
Последний расчёт: betAmount=<span class="mep-strategy1-last-bet-amount">0</span>, targetMultiplier=<span class="mep-strategy1-last-target-multiplier">0</span></div>
    </div>
    <div class="mep-strategy-section">
        <div class="mep-strategy-section-title">Цикл стратегии</div>
        <div class="mep-strategy-status-grid">
            <div>Стартовый баланс: <span class="mep-strategy1-cycle-start-balance">0</span></div>
            <div>Текущий баланс: <span class="mep-strategy1-cycle-current-balance">0</span></div>
            <div>Последняя ставка: <span class="mep-strategy1-cycle-last-stake">0</span></div>
            <div>Сумма ставок цикла: <span class="mep-strategy1-cycle-total-stake">0</span></div>
            <div>Проигрышных раундов: <span class="mep-strategy1-cycle-loss-count">0</span></div>
            <div>Выигрышных раундов: <span class="mep-strategy1-cycle-win-count">0</span></div>
            <div>Статус цикла: <span class="mep-strategy1-cycle-status">idle</span></div>
            <div>Причина завершения: <span class="mep-strategy1-cycle-end-reason">—</span></div>
        </div>
    </div>
</div>
<div class="mep-game-tab-panel mep-game-tab-panel-strategy2">
    <div class="mep-game-placeholder">Контент стратегии 2</div>
</div>
`;

                    panel.insertBefore(mainTabs, header.nextSibling);
                    panel.insertBefore(mainPanel, mainTabs.nextSibling);
                    panel.insertBefore(gamePanel, mainPanel.nextSibling);

                    for (const node of [body, diffWrap, frequencyWrap, stakeWrap, balanceWrap, graphWrap]) {
                        if (node) mainContent.appendChild(node);
                    }
                }

                document.body.appendChild(panel);
                document.body.classList.add("mep-panel-open");

                const settingsOverlay = panel.querySelector('.mep-modal-overlay[data-mep-modal="settings"]');

                MEP.UI.ui = {
                    panel,
                    mainTabButtons: [...panel.querySelectorAll("button.mep-main-tab-btn")],
                    mainPanel: panel.querySelector(".mep-tab-panel-main"),
                    gamePanel: panel.querySelector(".mep-tab-panel-game"),
                    gameTabButtons: [...panel.querySelectorAll("button.mep-game-tab-btn")],
                    charterPanel: panel.querySelector(".mep-game-tab-panel-charter"),
                    strategy1Panel: panel.querySelector(".mep-game-tab-panel-strategy1"),
                    strategy2Panel: panel.querySelector(".mep-game-tab-panel-strategy2"),
                    charterRoundsPerHourInput: panel.querySelector("input.mep-charter-rounds-hour"),
                    charterRoundsPer6HoursInput: panel.querySelector("input.mep-charter-rounds-6h"),
                    charterRoundsPerDayInput: panel.querySelector("input.mep-charter-rounds-day"),
                    charterWinsPerHourInput: panel.querySelector("input.mep-charter-wins-hour"),
                    charterWinsPer6HoursInput: panel.querySelector("input.mep-charter-wins-6h"),
                    charterWinsPerDayInput: panel.querySelector("input.mep-charter-wins-day"),
                    charterMaxStakePercentInput: panel.querySelector("input.mep-charter-max-stake-percent"),
                    charterLossesPerHourInput: panel.querySelector("input.mep-charter-losses-hour"),
                    charterLossesPer6HoursInput: panel.querySelector("input.mep-charter-losses-6h"),
                    charterLossesPerDayInput: panel.querySelector("input.mep-charter-losses-day"),
                    charterBreakAfter3LossesMinInput: panel.querySelector("input.mep-charter-break-3loss-min"),
                    strategy1EnabledInput: panel.querySelector("input.mep-strategy1-enabled"),
                    strategy1RiskPercentInput: panel.querySelector("input.mep-strategy1-risk-percent"),
                    strategy1StartStakeModeInput: panel.querySelector("select.mep-strategy1-start-stake-mode"),
                    strategy1StartStakeValueInput: panel.querySelector("input.mep-strategy1-start-stake-value"),
                    strategy1StartStakeArrayInput: panel.querySelector("input.mep-strategy1-start-stake-array"),
                    strategy1StakeGrowthModeInput: panel.querySelector("select.mep-strategy1-stake-growth-mode"),
                    strategy1StakeGrowthFactorInput: panel.querySelector("input.mep-strategy1-stake-growth-factor"),
                    strategy1StakeGrowthArrayInput: panel.querySelector("input.mep-strategy1-stake-growth-array"),
                    strategy1TargetModeInput: panel.querySelector("select.mep-strategy1-target-mode"),
                    strategy1TargetMultiplierInput: panel.querySelector("input.mep-strategy1-target-multiplier"),
                    strategy1TargetMultiplierArrayInput: panel.querySelector("input.mep-strategy1-target-multiplier-array"),
                    strategy1MaxLossesInput: panel.querySelector("input.mep-strategy1-max-losses"),
                    strategy1ConditionsModeEl: panel.querySelector(".mep-strategy1-conditions-mode"),
                    strategy1ConditionsCanBetEl: panel.querySelector(".mep-strategy1-conditions-canbet"),
                    strategy1ConditionsEndEl: panel.querySelector(".mep-strategy1-conditions-end"),
                    strategy1ConditionsReasonEl: panel.querySelector(".mep-strategy1-conditions-reason"),
                    strategy1StakeCalcModeEl: panel.querySelector(".mep-strategy1-stake-calc-mode"),
                    strategy1TargetCalcModeEl: panel.querySelector(".mep-strategy1-target-calc-mode"),
                    strategy1LastBetAmountEl: panel.querySelector(".mep-strategy1-last-bet-amount"),
                    strategy1LastTargetMultiplierEl: panel.querySelector(".mep-strategy1-last-target-multiplier"),
                    strategy1CycleStartBalanceEl: panel.querySelector(".mep-strategy1-cycle-start-balance"),
                    strategy1CycleCurrentBalanceEl: panel.querySelector(".mep-strategy1-cycle-current-balance"),
                    strategy1CycleLastStakeEl: panel.querySelector(".mep-strategy1-cycle-last-stake"),
                    strategy1CycleTotalStakeEl: panel.querySelector(".mep-strategy1-cycle-total-stake"),
                    strategy1CycleLossCountEl: panel.querySelector(".mep-strategy1-cycle-loss-count"),
                    strategy1CycleWinCountEl: panel.querySelector(".mep-strategy1-cycle-win-count"),
                    strategy1CycleStatusEl: panel.querySelector(".mep-strategy1-cycle-status"),
                    strategy1CycleEndReasonEl: panel.querySelector(".mep-strategy1-cycle-end-reason"),
                    strategy1DecisionStatusTextEl: panel.querySelector(".mep-strategy1-decision-status-text"),
                    strategy1DecisionStatusCodeEl: panel.querySelector(".mep-strategy1-decision-status-code"),
                    strategy1DecisionCanBetEl: panel.querySelector(".mep-strategy1-decision-canbet"),
                    strategy1DecisionEndCycleEl: panel.querySelector(".mep-strategy1-decision-endcycle"),
                    strategy1DecisionBranchEl: panel.querySelector(".mep-strategy1-decision-branch"),
                    strategy1DecisionWaitReasonEl: panel.querySelector(".mep-strategy1-decision-waitreason"),
                    textarea: panel.querySelector("textarea.mep-stats"),
                    copyBtn: panel.querySelector("button.mep-copy"),
                    sendDbBtn: panel.querySelector("button.mep-send-db"),
                    countEl: panel.querySelector(".mep-count"),
                    titleStat: panel.querySelector(".mep-title-stat"),

                    historyToggleBtn: panel.querySelector(".mep-history-toggle"),
                    historyArrow: panel.querySelector(".mep-history-arrow"),
                    statsWrap: panel.querySelector(".mep-stats-wrap"),

                    diffWrap: panel.querySelector(".mep-diff-wrap"),
                    diffHead: panel.querySelector(".mep-diff-head"),
                    diffTitle: panel.querySelector(".mep-diff-title"),
                    diffCollapseBtn: panel.querySelector("button.mep-diff-collapse"),
                    diffParamsWrap: panel.querySelector(".mep-diff-params"),
                    diffGraphArea: panel.querySelector(".mep-diff-graph-area"),
                    diffSvg: panel.querySelector("svg.mep-diff"),
                    twoWrap: panel.querySelector(".mep-two-stat-wrap"),
                    twoHead: panel.querySelector(".mep-two-head"),
                    twoParamsWrap: panel.querySelector(".mep-two-params"),
                    twoLastN: panel.querySelector("input.mep-two-lastn"),
                    twoStartInput: panel.querySelector("input.mep-two-start"),
                    diffDensityInput: panel.querySelector("input.mep-diff-density"),
					diffSyncInput: panel.querySelector("input.mep-diff-sync"),
					diffPosInput: panel.querySelector("input.mep-diff-lvl-pos"),
					diffNegInput: panel.querySelector("input.mep-diff-lvl-neg"),
                    diffVectorEnabledInput: panel.querySelector("input.mep-diff-vector-enabled"),
                    diffVectorPeriodInput: panel.querySelector("input.mep-diff-vector-period"),
                    diffVectorShiftInput: panel.querySelector("input.mep-diff-vector-shift"),
                    diffVectorFlatInput: panel.querySelector("input.mep-diff-vector-flat"),
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
                    graphLine2Input: panel.querySelector("input.mep-graph-line2"),
                    graphLine3Input: panel.querySelector("input.mep-graph-line3"),
                    graphWrap: panel.querySelector(".mep-graph-wrap"),
                    graphControlsWrap: panel.querySelector(".mep-graph-controls"),
                    graphCollapseBtn: panel.querySelector("button.mep-main-graph-collapse"),
                    graphSvg: panel.querySelector("svg.mep-graph"),
                    graphTip: panel.querySelector(".mep-graph-tip"),
                    frequencyWrap: panel.querySelector(".mep-frequency-graph-wrap"),
                    frequencyParamsWrap: panel.querySelector(".mep-frequency-params"),
                    frequencyCollapseBtn: panel.querySelector("button.mep-frequency-collapse"),
                    frequencyGraphSvg: panel.querySelector("svg.mep-frequency-graph"),
                    frequencyThresholdInput: panel.querySelector("input.mep-frequency-threshold"),
                    frequencyPeriodInput: panel.querySelector("input.mep-frequency-period"),
                    frequencyDensityInput: panel.querySelector("input.mep-frequency-density"),
                    frequencyLineInput: panel.querySelector("input.mep-frequency-line"),
                    frequencySyncInput: panel.querySelector("input.mep-frequency-sync"),
                    frequencyVectorEnabledInput: panel.querySelector("input.mep-frequency-vector-enabled"),
                    frequencyVectorPeriodInput: panel.querySelector("input.mep-frequency-vector-period"),
                    frequencyVectorShiftInput: panel.querySelector("input.mep-frequency-vector-shift"),
                    frequencyVectorFlatInput: panel.querySelector("input.mep-frequency-vector-flat"),
                    frequencyTip: panel.querySelector(".mep-frequency-tip"),
                    stakeWrap: panel.querySelector(".mep-stake-graph-wrap"),
                    stakeParamsWrap: panel.querySelector(".mep-stake-params"),
                    stakeCollapseBtn: panel.querySelector("button.mep-stake-collapse"),
                    stakeGraphSvg: panel.querySelector("svg.mep-stake-graph"),
                    stakeDensityInput: panel.querySelector("input.mep-stake-density"),
                    stakeSyncInput: panel.querySelector("input.mep-stake-sync"),
                    stakeAutoHeightInput: panel.querySelector("input.mep-stake-auto-height"),
                    stakePlayersScaleInput: panel.querySelector("input.mep-stake-scale-players"),
                    stakeBetScaleInput: panel.querySelector("input.mep-stake-scale-bet"),
                    stakeShowPlayersInput: panel.querySelector("input.mep-stake-show-players"),
                    stakeShowBetInput: panel.querySelector("input.mep-stake-show-bet"),
                    balanceWrap: panel.querySelector(".mep-balance-graph-wrap"),
                    balanceParamsWrap: panel.querySelector(".mep-balance-params"),
                    balanceCollapseBtn: panel.querySelector("button.mep-balance-collapse"),
                    balanceGraphSvg: panel.querySelector("svg.mep-balance-graph"),
                    balanceDensityInput: panel.querySelector("input.mep-balance-density"),
                    balanceSyncInput: panel.querySelector("input.mep-balance-sync"),
                    balanceAutoHeightInput: panel.querySelector("input.mep-balance-auto-height"),

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

                ui._mainTab = "main";
                ui._gameTab = "charter";

                if (ui.mainTabButtons?.length) {
                    for (const btn of ui.mainTabButtons) {
                        btn.addEventListener("click", () => {
                            MEP.UI.setMainTab(btn.dataset.tab || "main");
                        });
                    }
                }
                if (ui.gameTabButtons?.length) {
                    for (const btn of ui.gameTabButtons) {
                        btn.addEventListener("click", () => {
                            MEP.UI.setGameTab(btn.dataset.tab || "charter");
                        });
                    }
                }
                MEP.UI.setMainTab(ui._mainTab);
                MEP.UI.setGameTab(ui._gameTab);

                const bindCharterInput = (inp, stateKey, step = 1) => {
                    if (!inp) return;
                    let current = Number(MEP.State[stateKey]);
                    if (!Number.isFinite(current) || current < 0) current = 0;
                    MEP.State[stateKey] = current;
                    inp.value = String(current);
                    inp.addEventListener("input", () => {
                        let v = Number(inp.value);
                        if (!Number.isFinite(v) || v < 0) v = 0;
                        if (step === 1) v = Math.floor(v);
                        MEP.State[stateKey] = v;
                        inp.value = String(v);
                        MEP.Storage.save();
                    });
                };
                bindCharterInput(ui.charterRoundsPerHourInput, "charterRoundsPerHour", 1);
                bindCharterInput(ui.charterRoundsPer6HoursInput, "charterRoundsPer6Hours", 1);
                bindCharterInput(ui.charterRoundsPerDayInput, "charterRoundsPerDay", 1);
                bindCharterInput(ui.charterWinsPerHourInput, "charterWinsPerHour", 1);
                bindCharterInput(ui.charterWinsPer6HoursInput, "charterWinsPer6Hours", 1);
                bindCharterInput(ui.charterWinsPerDayInput, "charterWinsPerDay", 1);
                bindCharterInput(ui.charterMaxStakePercentInput, "charterMaxStakePercent", 0.1);
                bindCharterInput(ui.charterLossesPerHourInput, "charterLossesPerHour", 1);
                bindCharterInput(ui.charterLossesPer6HoursInput, "charterLossesPer6Hours", 1);
                bindCharterInput(ui.charterLossesPerDayInput, "charterLossesPerDay", 1);
                bindCharterInput(ui.charterBreakAfter3LossesMinInput, "charterBreakAfter3LossesMin", 1);

                const s1 = MEP.State?.strategies?.strategy1;
                if (s1) {
                    const setNonNegNumber = (inp, key, step = 0.1) => {
                        if (!inp) return;
                        const n0 = Math.max(0, Number(s1.config[key]) || 0);
                        s1.config[key] = n0;
                        inp.value = String(n0);
                        inp.addEventListener("input", () => {
                            let v = Number(inp.value);
                            if (!Number.isFinite(v) || v < 0) v = 0;
                            if (step === 1) v = Math.floor(v);
                            s1.config[key] = v;
                            inp.value = String(v);
                            MEP.Storage.save();
                            MEP.Strategy1?.buildStakePlan?.();
                            MEP.Strategy1?.updateUiCounters?.();
                        });
                    };
                    const setModeSelect = (inp, key, allowed) => {
                        if (!inp) return;
                        const cur = allowed.includes(s1.config[key]) ? s1.config[key] : allowed[0];
                        s1.config[key] = cur;
                        inp.value = cur;
                        inp.addEventListener("change", () => {
                            const val = allowed.includes(inp.value) ? inp.value : allowed[0];
                            s1.config[key] = val;
                            inp.value = val;
                            MEP.Storage.save();
                            MEP.Strategy1?.buildStakePlan?.();
                            MEP.Strategy1?.updateUiCounters?.();
                        });
                    };
                    const setTextInput = (inp, key) => {
                        if (!inp) return;
                        inp.value = (s1.config[key] || "").toString();
                        inp.addEventListener("input", () => {
                            s1.config[key] = (inp.value || "").toString();
                            MEP.Storage.save();
                            MEP.Strategy1?.updateUiCounters?.();
                        });
                    };

                    if (ui.strategy1EnabledInput) {
                        ui.strategy1EnabledInput.checked = !!s1.enabled;
                        ui.strategy1EnabledInput.addEventListener("change", () => {
                            const next = !!ui.strategy1EnabledInput.checked;
                            const active = MEP.State.activeStrategyId;
                            if (next && active && active !== "strategy1") {
                                ui.strategy1EnabledInput.checked = false;
                                return;
                            }
                            s1.enabled = next;
                            if (!next && active === "strategy1" && !s1.isExecuting) {
                                MEP.State.activeStrategyId = null;
                            }
                            MEP.Storage.save();
                            MEP.Strategy1?.evaluateDecisionState?.();
                            MEP.Strategy1?.updateUiCounters?.();
                        });
                    }

                    setNonNegNumber(ui.strategy1RiskPercentInput, "riskPercent", 0.1);
                    setModeSelect(ui.strategy1StartStakeModeInput, "startStakeMode", ["fixed", "array"]);
                    setNonNegNumber(ui.strategy1StartStakeValueInput, "startStakeValue", 0.00000001);
                    setTextInput(ui.strategy1StartStakeArrayInput, "startStakeArrayText");
                    setModeSelect(ui.strategy1StakeGrowthModeInput, "stakeGrowthMode", ["factor", "array"]);
                    setNonNegNumber(ui.strategy1StakeGrowthFactorInput, "stakeGrowthFactor", 0.01);
                    setTextInput(ui.strategy1StakeGrowthArrayInput, "stakeGrowthArrayText");
                    setModeSelect(ui.strategy1TargetModeInput, "targetMode", ["fixed", "array"]);
                    setNonNegNumber(ui.strategy1TargetMultiplierInput, "targetMultiplierValue", 0.01);
                    setTextInput(ui.strategy1TargetMultiplierArrayInput, "targetMultiplierArrayText");
                    setNonNegNumber(ui.strategy1MaxLossesInput, "maxLosses", 1);

                    MEP.Strategy1?.buildStakePlan?.();
                    MEP.Strategy1?.updateUiCounters?.();
                }

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
                            if (MEP.State.stakeGraphDensitySync) MEP.StakeGraph?.render?.();
                            if (MEP.State.frequencyGraphDensitySync) MEP.FrequencyGraph?.render?.();
                            if (MEP.State.balanceGraphDensitySync) MEP.BalanceGraph?.render?.();
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

                if (ui.graphLine2Input) {
                    ui.graphLine2Input.value = String(MEP.State.graphLine2 ?? 0);
                    ui.graphLine2Input.oninput = () => {
                        const n = Number(ui.graphLine2Input.value);
                        MEP.State.graphLine2 = Number.isFinite(n) ? Math.max(0, n) : 0;
                        ui.graphLine2Input.value = String(MEP.State.graphLine2);
                        MEP.Storage.save();
                        MEP.Graph?.render?.();
                    };
                }

                if (ui.graphLine3Input) {
                    ui.graphLine3Input.value = String(MEP.State.graphLine3 ?? 0);
                    ui.graphLine3Input.oninput = () => {
                        const n = Number(ui.graphLine3Input.value);
                        MEP.State.graphLine3 = Number.isFinite(n) ? Math.max(0, n) : 0;
                        ui.graphLine3Input.value = String(MEP.State.graphLine3);
                        MEP.Storage.save();
                        MEP.Graph?.render?.();
                    };
                }

                if (ui.stakeDensityInput) {
                    ui.stakeDensityInput.value = String(Math.max(10, Math.floor(Number(MEP.State.stakeGraphDensity || 81) || 81)));
                    ui.stakeDensityInput.oninput = () => {
                        let v = Math.floor(Number(ui.stakeDensityInput.value) || 0);
                        if (!Number.isFinite(v) || v < 10) v = 10;
                        ui.stakeDensityInput.value = String(v);
                        MEP.State.stakeGraphDensity = v;
                        MEP.Storage.save();
                        MEP.StakeGraph?.render?.();
                    };
                }

                if (ui.frequencyThresholdInput) {
                    const current = Math.max(0, Number(MEP.State.frequencyThreshold) || 0);
                    MEP.State.frequencyThreshold = current;
                    ui.frequencyThresholdInput.value = String(current);
                    ui.frequencyThresholdInput.addEventListener("input", () => {
                        let v = Number(ui.frequencyThresholdInput.value);
                        if (!Number.isFinite(v) || v < 0) v = 0;
                        MEP.State.frequencyThreshold = v;
                        ui.frequencyThresholdInput.value = String(v);
                        MEP.Storage.save();
                        MEP.FrequencyGraph?.render?.();
                    });
                }

                if (ui.frequencyPeriodInput) {
                    const current = Math.max(1, Math.floor(Number(MEP.State.frequencyPeriod) || 1));
                    MEP.State.frequencyPeriod = current;
                    ui.frequencyPeriodInput.value = String(current);
                    ui.frequencyPeriodInput.addEventListener("input", () => {
                        let v = Math.floor(Number(ui.frequencyPeriodInput.value) || 0);
                        if (!Number.isFinite(v) || v < 1) v = 1;
                        MEP.State.frequencyPeriod = v;
                        ui.frequencyPeriodInput.value = String(v);
                        MEP.Storage.save();
                        MEP.FrequencyGraph?.render?.();
                    });
                }

                if (ui.frequencyDensityInput) {
                    const current = Math.max(10, Math.floor(Number(MEP.State.frequencyGraphDensity || 81) || 81));
                    MEP.State.frequencyGraphDensity = current;
                    ui.frequencyDensityInput.value = String(current);
                    ui.frequencyDensityInput.addEventListener("input", () => {
                        let v = Math.floor(Number(ui.frequencyDensityInput.value) || 0);
                        if (!Number.isFinite(v) || v < 10) v = 10;
                        MEP.State.frequencyGraphDensity = v;
                        ui.frequencyDensityInput.value = String(v);
                        MEP.Storage.save();
                        MEP.FrequencyGraph?.render?.();
                    });
                }

                if (ui.frequencyLineInput) {
                    const current = Math.max(0, Number(MEP.State.frequencyGraphLine) || 0);
                    MEP.State.frequencyGraphLine = current;
                    ui.frequencyLineInput.value = String(current);
                    ui.frequencyLineInput.addEventListener("input", () => {
                        let v = Number(ui.frequencyLineInput.value);
                        if (!Number.isFinite(v) || v < 0) v = 0;
                        MEP.State.frequencyGraphLine = v;
                        ui.frequencyLineInput.value = String(v);
                        MEP.Storage.save();
                        MEP.FrequencyGraph?.render?.();
                    });
                }

                if (ui.frequencySyncInput) {
                    ui.frequencySyncInput.checked = !!MEP.State.frequencyGraphDensitySync;
                    if (ui.frequencyDensityInput) ui.frequencyDensityInput.disabled = !!MEP.State.frequencyGraphDensitySync;
                    ui.frequencySyncInput.addEventListener("change", () => {
                        MEP.State.frequencyGraphDensitySync = !!ui.frequencySyncInput.checked;
                        if (ui.frequencyDensityInput) ui.frequencyDensityInput.disabled = !!MEP.State.frequencyGraphDensitySync;
                        MEP.Storage.save();
                        MEP.FrequencyGraph?.render?.();
                    });
                }

                if (ui.frequencyVectorEnabledInput) {
                    ui.frequencyVectorEnabledInput.checked = MEP.State.frequencyVectorEnabled !== false;
                    ui.frequencyVectorEnabledInput.addEventListener("change", () => {
                        MEP.State.frequencyVectorEnabled = !!ui.frequencyVectorEnabledInput.checked;
                        MEP.Storage.save();
                        MEP.FrequencyGraph?.render?.();
                    });
                }

                if (ui.frequencyVectorPeriodInput) {
                    const current = Math.max(1, Math.floor(Number(MEP.State.frequencyVectorPeriod) || 9));
                    MEP.State.frequencyVectorPeriod = current;
                    ui.frequencyVectorPeriodInput.value = String(current);
                    ui.frequencyVectorPeriodInput.addEventListener("input", () => {
                        const v = Math.max(1, Math.floor(Number(ui.frequencyVectorPeriodInput.value) || 1));
                        MEP.State.frequencyVectorPeriod = v;
                        ui.frequencyVectorPeriodInput.value = String(v);
                        MEP.Storage.save();
                        MEP.FrequencyGraph?.render?.();
                    });
                }

                if (ui.frequencyVectorShiftInput) {
                    const current = Math.max(1, Math.floor(Number(MEP.State.frequencyVectorPhaseShift) || 3));
                    MEP.State.frequencyVectorPhaseShift = current;
                    ui.frequencyVectorShiftInput.value = String(current);
                    ui.frequencyVectorShiftInput.addEventListener("input", () => {
                        const v = Math.max(1, Math.floor(Number(ui.frequencyVectorShiftInput.value) || 1));
                        MEP.State.frequencyVectorPhaseShift = v;
                        ui.frequencyVectorShiftInput.value = String(v);
                        MEP.Storage.save();
                        MEP.FrequencyGraph?.render?.();
                    });
                }

                if (ui.frequencyVectorFlatInput) {
                    const current = Math.max(0, Number(MEP.State.frequencyVectorFlatEpsilon) || 0);
                    MEP.State.frequencyVectorFlatEpsilon = current;
                    ui.frequencyVectorFlatInput.value = String(current);
                    ui.frequencyVectorFlatInput.addEventListener("input", () => {
                        const v = Math.max(0, Number(ui.frequencyVectorFlatInput.value) || 0);
                        MEP.State.frequencyVectorFlatEpsilon = v;
                        ui.frequencyVectorFlatInput.value = String(v);
                        MEP.Storage.save();
                        MEP.FrequencyGraph?.render?.();
                    });
                }

                if (ui.stakeSyncInput) {
                    ui.stakeSyncInput.checked = !!MEP.State.stakeGraphDensitySync;
                    if (ui.stakeDensityInput) ui.stakeDensityInput.disabled = !!MEP.State.stakeGraphDensitySync;
                    ui.stakeSyncInput.addEventListener("change", () => {
                        MEP.State.stakeGraphDensitySync = !!ui.stakeSyncInput.checked;
                        if (ui.stakeDensityInput) ui.stakeDensityInput.disabled = !!MEP.State.stakeGraphDensitySync;
                        MEP.Storage.save();
                        MEP.StakeGraph?.render?.();
                    });
                }

                if (ui.stakeAutoHeightInput) {
                    ui.stakeAutoHeightInput.checked = !!MEP.State.stakeGraphAutoHeight;
                    ui.stakeAutoHeightInput.addEventListener("change", () => {
                        MEP.State.stakeGraphAutoHeight = !!ui.stakeAutoHeightInput.checked;
                        MEP.Storage.save();
                        MEP.StakeGraph?.render?.();
                    });
                }

                if (ui.stakePlayersScaleInput) {
                    let v = Number(MEP.State.stakeGraphPlayersScale);
                    if (!Number.isFinite(v) || v < 0) v = 1;
                    MEP.State.stakeGraphPlayersScale = v;
                    ui.stakePlayersScaleInput.value = String(v);
                    ui.stakePlayersScaleInput.addEventListener("input", () => {
                        let n = Number(ui.stakePlayersScaleInput.value);
                        if (!Number.isFinite(n) || n < 0) n = 1;
                        ui.stakePlayersScaleInput.value = String(n);
                        MEP.State.stakeGraphPlayersScale = n;
                        MEP.Storage.save();
                        MEP.StakeGraph?.render?.();
                    });
                }

                if (ui.stakeBetScaleInput) {
                    let v = Number(MEP.State.stakeGraphBetScale);
                    if (!Number.isFinite(v) || v < 0) v = 10;
                    MEP.State.stakeGraphBetScale = v;
                    ui.stakeBetScaleInput.value = String(v);
                    ui.stakeBetScaleInput.addEventListener("input", () => {
                        let n = Number(ui.stakeBetScaleInput.value);
                        if (!Number.isFinite(n) || n < 0) n = 10;
                        ui.stakeBetScaleInput.value = String(n);
                        MEP.State.stakeGraphBetScale = n;
                        MEP.Storage.save();
                        MEP.StakeGraph?.render?.();
                    });
                }

                if (ui.stakeShowPlayersInput) {
                    ui.stakeShowPlayersInput.checked = MEP.State.stakeGraphShowPlayers !== false;
                    ui.stakeShowPlayersInput.addEventListener("change", () => {
                        MEP.State.stakeGraphShowPlayers = !!ui.stakeShowPlayersInput.checked;
                        MEP.Storage.save();
                        MEP.StakeGraph?.render?.();
                    });
                }

                if (ui.stakeShowBetInput) {
                    ui.stakeShowBetInput.checked = MEP.State.stakeGraphShowBet !== false;
                    ui.stakeShowBetInput.addEventListener("change", () => {
                        MEP.State.stakeGraphShowBet = !!ui.stakeShowBetInput.checked;
                        MEP.Storage.save();
                        MEP.StakeGraph?.render?.();
                    });
                }

                if (ui.balanceDensityInput) {
                    const current = Math.max(10, Math.floor(Number(MEP.State.balanceGraphDensity || 81) || 81));
                    MEP.State.balanceGraphDensity = current;
                    ui.balanceDensityInput.value = String(current);
                    ui.balanceDensityInput.addEventListener("input", () => {
                        let v = Math.floor(Number(ui.balanceDensityInput.value) || 0);
                        if (!Number.isFinite(v) || v < 10) v = 10;
                        MEP.State.balanceGraphDensity = v;
                        ui.balanceDensityInput.value = String(v);
                        MEP.Storage.save();
                        MEP.BalanceGraph?.render?.();
                    });
                }

                if (ui.balanceSyncInput) {
                    ui.balanceSyncInput.checked = !!MEP.State.balanceGraphDensitySync;
                    if (ui.balanceDensityInput) ui.balanceDensityInput.disabled = !!MEP.State.balanceGraphDensitySync;
                    ui.balanceSyncInput.addEventListener("change", () => {
                        MEP.State.balanceGraphDensitySync = !!ui.balanceSyncInput.checked;
                        if (ui.balanceDensityInput) ui.balanceDensityInput.disabled = !!MEP.State.balanceGraphDensitySync;
                        MEP.Storage.save();
                        MEP.BalanceGraph?.render?.();
                    });
                }

                if (ui.balanceAutoHeightInput) {
                    ui.balanceAutoHeightInput.checked = !!MEP.State.balanceGraphAutoHeight;
                    ui.balanceAutoHeightInput.addEventListener("change", () => {
                        MEP.State.balanceGraphAutoHeight = !!ui.balanceAutoHeightInput.checked;
                        MEP.Storage.save();
                        MEP.BalanceGraph?.render?.();
                    });
                }

                MEP.Graph?.init?.(ui);
                MEP.DiffGraph?.init?.(ui);
                MEP.FrequencyGraph?.init?.(ui);
                MEP.StakeGraph?.init?.(ui);
                MEP.BalanceGraph?.init?.(ui);

                const applyFrequencyParamsCollapse = () => {
                    if (!ui.frequencyWrap || !ui.frequencyCollapseBtn) return;
                    const collapsed = !!ui._frequencyParamsCollapsed;
                    ui.frequencyWrap.classList.toggle("mep-collapsed", collapsed);
                    ui.frequencyCollapseBtn.textContent = collapsed ? "▼" : "▲";
                    ui.frequencyCollapseBtn.title = collapsed ? "Развернуть параметры" : "Свернуть параметры";
                };
                applyFrequencyParamsCollapse();
                if (ui.frequencyCollapseBtn) {
                    ui.frequencyCollapseBtn.addEventListener("click", () => {
                        ui._frequencyParamsCollapsed = !ui._frequencyParamsCollapsed;
                        applyFrequencyParamsCollapse();
                    });
                }

                const applyStakeParamsCollapse = () => {
                    if (!ui.stakeWrap || !ui.stakeCollapseBtn) return;
                    const collapsed = !!ui._stakeParamsCollapsed;
                    ui.stakeWrap.classList.toggle("mep-collapsed", collapsed);
                    ui.stakeCollapseBtn.textContent = collapsed ? "▼" : "▲";
                    ui.stakeCollapseBtn.title = collapsed ? "Развернуть параметры" : "Свернуть параметры";
                };
                applyStakeParamsCollapse();
                if (ui.stakeCollapseBtn) {
                    ui.stakeCollapseBtn.addEventListener("click", () => {
                        ui._stakeParamsCollapsed = !ui._stakeParamsCollapsed;
                        applyStakeParamsCollapse();
                    });
                }

                const applyBalanceParamsCollapse = () => {
                    if (!ui.balanceWrap || !ui.balanceCollapseBtn) return;
                    const collapsed = !!ui._balanceParamsCollapsed;
                    ui.balanceWrap.classList.toggle("mep-collapsed", collapsed);
                    ui.balanceCollapseBtn.textContent = collapsed ? "▼" : "▲";
                    ui.balanceCollapseBtn.title = collapsed ? "Развернуть параметры" : "Свернуть параметры";
                };
                applyBalanceParamsCollapse();
                if (ui.balanceCollapseBtn) {
                    ui.balanceCollapseBtn.addEventListener("click", () => {
                        ui._balanceParamsCollapsed = !ui._balanceParamsCollapsed;
                        applyBalanceParamsCollapse();
                    });
                }

                const applyMainGraphParamsCollapse = () => {
                    if (!ui.graphWrap || !ui.graphCollapseBtn) return;
                    const collapsed = !!ui._mainGraphParamsCollapsed;
                    ui.graphWrap.classList.toggle("mep-collapsed", collapsed);
                    ui.graphCollapseBtn.textContent = collapsed ? "▼" : "▲";
                    ui.graphCollapseBtn.title = collapsed ? "Развернуть параметры" : "Свернуть параметры";
                };
                applyMainGraphParamsCollapse();
                if (ui.graphCollapseBtn) {
                    ui.graphCollapseBtn.addEventListener("click", () => {
                        ui._mainGraphParamsCollapsed = !ui._mainGraphParamsCollapsed;
                        applyMainGraphParamsCollapse();
                    });
                }

                const applyDiffParamsCollapse = () => {
                    if (!ui.diffWrap || !ui.diffCollapseBtn) return;
                    const collapsed = !!ui._diffParamsCollapsed;
                    ui.diffWrap.classList.toggle("mep-collapsed", collapsed);
                    ui.diffCollapseBtn.textContent = collapsed ? "▼" : "▲";
                    ui.diffCollapseBtn.title = collapsed ? "Развернуть параметры" : "Свернуть параметры";
                };
                applyDiffParamsCollapse();
                if (ui.diffCollapseBtn) {
                    ui.diffCollapseBtn.addEventListener("click", () => {
                        ui._diffParamsCollapsed = !ui._diffParamsCollapsed;
                        applyDiffParamsCollapse();
                    });
                }

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
                    if (ui.diffVectorEnabledInput) ui.diffVectorEnabledInput.checked = MEP.State.diffVectorEnabled !== false;
                    if (ui.diffVectorPeriodInput) {
                        const p = Math.max(1, Math.floor(Number(MEP.State.diffVectorPeriod) || 9));
                        MEP.State.diffVectorPeriod = p;
                        ui.diffVectorPeriodInput.value = String(p);
                    }
                    if (ui.diffVectorShiftInput) {
                        const s = Math.max(1, Math.floor(Number(MEP.State.diffVectorPhaseShift) || 3));
                        MEP.State.diffVectorPhaseShift = s;
                        ui.diffVectorShiftInput.value = String(s);
                    }
                    if (ui.diffVectorFlatInput) {
                        const f = Math.max(0, Number(MEP.State.diffVectorFlatEpsilon) || 0);
                        MEP.State.diffVectorFlatEpsilon = f;
                        ui.diffVectorFlatInput.value = String(f);
                    }
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

                if (ui.diffVectorEnabledInput) {
                    ui.diffVectorEnabledInput.addEventListener("change", () => {
                        MEP.State.diffVectorEnabled = !!ui.diffVectorEnabledInput.checked;
                        MEP.Storage.save();
                        MEP.DiffGraph?.render?.();
                    });
                }

                if (ui.diffVectorPeriodInput) {
                    ui.diffVectorPeriodInput.addEventListener("input", () => {
                        const v = Math.max(1, Math.floor(Number(ui.diffVectorPeriodInput.value) || 1));
                        ui.diffVectorPeriodInput.value = String(v);
                        MEP.State.diffVectorPeriod = v;
                        MEP.Storage.save();
                        MEP.DiffGraph?.render?.();
                    });
                }

                if (ui.diffVectorShiftInput) {
                    ui.diffVectorShiftInput.addEventListener("input", () => {
                        const v = Math.max(1, Math.floor(Number(ui.diffVectorShiftInput.value) || 1));
                        ui.diffVectorShiftInput.value = String(v);
                        MEP.State.diffVectorPhaseShift = v;
                        MEP.Storage.save();
                        MEP.DiffGraph?.render?.();
                    });
                }

                if (ui.diffVectorFlatInput) {
                    ui.diffVectorFlatInput.addEventListener("input", () => {
                        const v = Math.max(0, Number(ui.diffVectorFlatInput.value) || 0);
                        ui.diffVectorFlatInput.value = String(v);
                        MEP.State.diffVectorFlatEpsilon = v;
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
                            if (MEP.State.stakeGraphDensitySync) MEP.StakeGraph?.render?.();
                            if (MEP.State.frequencyGraphDensitySync) MEP.FrequencyGraph?.render?.();
                            if (MEP.State.balanceGraphDensitySync) MEP.BalanceGraph?.render?.();
                        } else {
                            // синхра OFF: меняем только 2-й
                            MEP.State.diffDensity = v;
                            MEP.DiffGraph?.render?.();
                            if (MEP.State.stakeGraphDensitySync) MEP.StakeGraph?.render?.();
                            if (MEP.State.frequencyGraphDensitySync) MEP.FrequencyGraph?.render?.();
                            if (MEP.State.balanceGraphDensitySync) MEP.BalanceGraph?.render?.();
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
                            if (MEP.State.stakeGraphDensitySync) MEP.StakeGraph?.render?.();
                            if (MEP.State.frequencyGraphDensitySync) MEP.FrequencyGraph?.render?.();
                            if (MEP.State.balanceGraphDensitySync) MEP.BalanceGraph?.render?.();
                        } else {
                            // выключили синхру — возвращаем ручное значение 2-го
                            const v = Math.max(10, Math.floor(Number(MEP.State.diffDensityManual || 81) || 81));
                            MEP.State.diffDensity = v;
                            MEP.DiffGraph?.render?.();
                            if (MEP.State.stakeGraphDensitySync) MEP.StakeGraph?.render?.();
                            if (MEP.State.frequencyGraphDensitySync) MEP.FrequencyGraph?.render?.();
                            if (MEP.State.balanceGraphDensitySync) MEP.BalanceGraph?.render?.();
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
                if (ui.twoStartInput) {
                    ui.twoStartInput.value = String(Math.max(0, Math.floor(Number(MEP.State.diffStartIndex) || 0)));
                    ui.twoStartInput.addEventListener("input", () => {
                        const raw = (ui.twoStartInput.value || "").trim();
                        if (!raw) {
                            MEP.State.diffStartIndex = 0;
                            MEP.Storage.save();
                            MEP.UI.updateTwoStats();
                            return;
                        }

                        let v = Math.floor(Number(raw) || 0);
                        if (!Number.isFinite(v) || v < 0) v = 0;
                        ui.twoStartInput.value = String(v);
                        MEP.State.diffStartIndex = v;
                        MEP.Storage.save();
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

                // UI: приоритет диапазона
                // 1) вся история
                // 2) фиксированный стартовый этап (от начала истории, 1-based)
                // 3) последние N
                let sampleN = 250;
                const isAll = !!ui.twoAll?.checked;
                const prevFixedStart = Math.max(0, Math.floor(Number(MEP.State.diffStartIndex) || 0));
                let fixedStartStage = prevFixedStart;
                let fixedStartActive = false;
                let slice = [];

                if (isAll) {
                    sampleN = list.length;
                    if (ui.twoLastN) ui.twoLastN.disabled = true;
                    if (ui.twoStartInput) ui.twoStartInput.disabled = true;
                    slice = sampleN > 0 ? list.slice(0, sampleN) : [];
                } else {
                    if (ui.twoLastN) ui.twoLastN.disabled = false;
                    if (ui.twoStartInput) ui.twoStartInput.disabled = false;

                    if (list.length > 0 && fixedStartStage > 0) {
                        if (fixedStartStage > list.length) fixedStartStage = list.length;
                        fixedStartActive = true;
                    }

                    if (ui.twoStartInput) {
                        if (fixedStartActive) ui.twoStartInput.value = String(fixedStartStage);
                        else if (fixedStartStage === 0) ui.twoStartInput.value = "0";
                    }
                    const nextFixedStart = fixedStartActive ? fixedStartStage : 0;
                    MEP.State.diffStartIndex = nextFixedStart;

                    if (!fixedStartActive && ui.twoLastN) {
                        let v = parseInt(ui.twoLastN.value || "250", 10);
                        if (!Number.isFinite(v) || v < 1) v = 1;
                        ui.twoLastN.value = String(v);
                        sampleN = v;
                    }
                    if (ui.twoLastN) ui.twoLastN.disabled = !!fixedStartActive;

                    if (fixedStartActive) {
                        // list = newest-first, поэтому от старта "от начала истории"
                        // переводим в диапазон oldest-first и обратно.
                        const fullOldest = list.slice().reverse(); // oldest -> newest
                        const startZeroBased = fixedStartStage - 1; // пользователь задаёт 1-based этап
                        const fixedOldest = fullOldest.slice(startZeroBased); // от фикс. старта до конца
                        slice = fixedOldest.reverse(); // обратно в newest-first для текущего пайплайна
                    } else {
                        // старая логика последних N
                        slice = sampleN > 0 ? list.slice(0, sampleN) : [];
                    }
                }

                // persist возможного clamp в UI/state
                if (Math.max(0, Math.floor(Number(MEP.State.diffStartIndex) || 0)) !== prevFixedStart) {
                    MEP.Storage.save();
                }

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
                MEP.FrequencyGraph?.render?.();
                MEP.StakeGraph?.render?.();
                MEP.BalanceGraph?.render?.();
                MEP.Graph?.render?.();
                MEP.Strategy1?.updateUiCounters?.();
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
        // Round stake capture module (SAFE MODE / MVP)
        // -------------------------
        MEP.RoundStakeCapture = {
            state: {
                observer: null,
                rebindTimer: null,
                captureInProgress: false,
                handledStartKey: "",
                lastStartSeen: false,
            },

            parseLocaleNumber(rawText) {
                const text = (rawText ?? "").toString().replace(/\u00a0/g, " ").trim();
                if (!text) return null;

                const cleaned = text.replace(/\s+/g, "").replace(/[^0-9,.\-]/g, "");
                if (!cleaned) return null;

                const hasComma = cleaned.includes(",");
                const hasDot = cleaned.includes(".");
                let normalized = cleaned;

                if (hasComma && hasDot) {
                    const lastComma = cleaned.lastIndexOf(",");
                    const lastDot = cleaned.lastIndexOf(".");
                    if (lastComma > lastDot) normalized = cleaned.replace(/\./g, "").replace(",", ".");
                    else normalized = cleaned.replace(/,/g, "");
                } else if (hasComma) {
                    normalized = cleaned.replace(",", ".");
                }

                const n = Number.parseFloat(normalized);
                return Number.isFinite(n) ? n : null;
            },

            readSnapshot() {
                const out = { playersCount: null, betSum: null };

                const header = document.querySelector(".dropdown-container .player-count-header");
                if (!header) return out;

                const playerEl = header.querySelector("span.ml-1");
                const playersText = playerEl?.textContent || "";
                out.playersCount = MEP.RoundStakeCapture.parseLocaleNumber(playersText);

                const fullText = (header.textContent || "").replace(/\u00a0/g, " ");
                const numMatches = fullText.match(/-?\d+(?:[.,]\d+)?/g) || [];
                const parsed = numMatches
                    .map((v) => MEP.RoundStakeCapture.parseLocaleNumber(v))
                    .filter((v) => Number.isFinite(v));

                if (parsed.length >= 2) out.betSum = parsed[parsed.length - 1];
                else if (parsed.length === 1 && playerEl) {
                    const only = parsed[0];
                    const p = out.playersCount;
                    if (p === null || Math.abs(only - p) > 0.0000001) out.betSum = only;
                }

                return out;
            },

            getStartMarkerActive() {
                const btn = document.querySelector('button[data-testid="bet-button"]');
                const text = MEP.Utils.normText(btn?.textContent || "");
                return text === "Начинается...";
            },

            async captureAfterStart(startKey) {
                if (MEP.RoundStakeCapture.state.captureInProgress) return;
                MEP.RoundStakeCapture.state.captureInProgress = true;

                const stableNeed = 5;
                const pollMs = 120;
                const timeoutMs = 5000;

                let stableCount = 0;
                let prevKey = "";
                let lastValid = null;
                const t0 = Date.now();

                while (Date.now() - t0 < timeoutMs) {
                    const snap = MEP.RoundStakeCapture.readSnapshot();
                    const hasBoth = snap.playersCount !== null && snap.betSum !== null;

                    if (hasBoth) {
                        lastValid = snap;
                        const nowKey = `${snap.playersCount ?? "na"}|${snap.betSum ?? "na"}`;
                        if (nowKey === prevKey) stableCount += 1;
                        else {
                            prevKey = nowKey;
                            stableCount = 1;
                        }
                        if (stableCount >= stableNeed) break;
                    }
                    await MEP.Utils.sleep(pollMs);
                }

                if (MEP.RoundStakeCapture.state.handledStartKey !== startKey) {
                    const finalSnap = lastValid;
                    if (finalSnap) {
                        const playersCount = Number(finalSnap.playersCount);
                        const betSum = Number(finalSnap.betSum);
                        if (Number.isFinite(playersCount) && Number.isFinite(betSum)) {
                            MEP.State.roundPlayersCountHistory.push(playersCount);
                            MEP.State.roundBetSumHistory.push(betSum);

                            console.log("[MEP][round-stake-snapshot]", {
                                playersCount,
                                betSum,
                                roundPlayersCountHistory: MEP.State.roundPlayersCountHistory,
                                roundBetSumHistory: MEP.State.roundBetSumHistory,
                            });

                            const stageKey = (startKey || "").toString().split("|")[0] || (window.MEP?.WS?.last?.roundLikeId ?? "");
                            MEP.BalanceCapture?.onRoundCommitted?.(stageKey);
                        }
                    }
                    MEP.RoundStakeCapture.state.handledStartKey = startKey;
                }

                MEP.RoundStakeCapture.state.captureInProgress = false;
            },

            onMutationTick() {
                const active = MEP.RoundStakeCapture.getStartMarkerActive();
                if (active && !MEP.RoundStakeCapture.state.lastStartSeen) {
                    const wsRound = window.MEP?.WS?.last?.roundLikeId ?? "no-round";
                    const startKey = `${wsRound}|${Date.now()}`;
                    MEP.RoundStakeCapture.captureAfterStart(startKey);
                }
                MEP.RoundStakeCapture.state.lastStartSeen = active;
            },

            stopIfRunning() {
                if (MEP.RoundStakeCapture.state.observer) {
                    try {
                        MEP.RoundStakeCapture.state.observer.disconnect();
                    } catch (e) {}
                    MEP.RoundStakeCapture.state.observer = null;
                }
                if (MEP.RoundStakeCapture.state.rebindTimer) {
                    clearInterval(MEP.RoundStakeCapture.state.rebindTimer);
                    MEP.RoundStakeCapture.state.rebindTimer = null;
                }
                MEP.RoundStakeCapture.state.captureInProgress = false;
                MEP.RoundStakeCapture.state.lastStartSeen = false;
            },

            start() {
                MEP.RoundStakeCapture.stopIfRunning();

                const body = document.body;
                if (!body) return;

                MEP.RoundStakeCapture.state.observer = new MutationObserver(() => {
                    queueMicrotask(MEP.RoundStakeCapture.onMutationTick);
                });
                MEP.RoundStakeCapture.state.observer.observe(body, {
                    childList: true,
                    subtree: true,
                    characterData: true,
                });

                MEP.RoundStakeCapture.onMutationTick();

                // fallback на случай полной замены контейнеров без мутаций текста
                MEP.RoundStakeCapture.state.rebindTimer = setInterval(() => {
                    MEP.RoundStakeCapture.onMutationTick();
                }, 600);
            },
        };

        // -------------------------
        // Balance capture module (DOM observer, runtime-only history)
        // -------------------------
        MEP.BalanceCapture = {
            state: {
                observer: null,
                rebindTimer: null,
                latestSeenBalance: null,
                seededInitialBalance: false,
                lastBalanceStageKey: "",
                initialSeedTimer: null,
                initialSeedAttempts: 0,
            },

            selectors: [
                'span[data-ds-text="true"].text-neutral-default.ds-body-md-strong',
                '[data-testid="wallet-balance"]',
                '[data-testid="user-balance"]',
                '[data-testid="balance-amount"]',
                '.wallet-balance',
                '.balance-amount',
                '.top-balance',
                '.account-balance',
                'header [class*="balance"]',
            ],

            parseLocaleNumber(rawText) {
                const text = (rawText ?? "").toString().replace(/\u00a0/g, " ").trim();
                if (!text) return null;
                const cleaned = text.replace(/\s+/g, "").replace(/[^0-9,.\-]/g, "");
                if (!cleaned) return null;

                const hasComma = cleaned.includes(",");
                const hasDot = cleaned.includes(".");
                let normalized = cleaned;
                if (hasComma && hasDot) {
                    const lastComma = cleaned.lastIndexOf(",");
                    const lastDot = cleaned.lastIndexOf(".");
                    if (lastComma > lastDot) normalized = cleaned.replace(/\./g, "").replace(",", ".");
                    else normalized = cleaned.replace(/,/g, "");
                } else if (hasComma) {
                    normalized = cleaned.replace(",", ".");
                }

                const n = Number.parseFloat(normalized);
                return Number.isFinite(n) ? n : null;
            },

            readCurrentBalance() {
                for (const sel of this.selectors) {
                    const el = document.querySelector(sel);
                    if (!el) continue;
                    const n = this.parseLocaleNumber(el.textContent || "");
                    if (Number.isFinite(n)) return n;
                }
                return null;
            },

            updateLatestSeenBalance() {
                const n = this.readCurrentBalance();
                if (!Number.isFinite(n)) return false;
                this.state.latestSeenBalance = n;
                return true;
            },

            ensureInitialBalance() {
                const hasLatest = this.updateLatestSeenBalance();
                if (!hasLatest) return false;
                const n = Number(this.state.latestSeenBalance);
                if (!Number.isFinite(n)) return false;
                if (!Array.isArray(MEP.State.balanceHistory)) MEP.State.balanceHistory = [];

                const arr = MEP.State.balanceHistory;
                if (!arr.length) {
                    arr.push(n);
                } else if (arr.length === 1 && Number(arr[0]) === 0) {
                    arr[0] = n; // fallback overwrite стартового 0
                } else {
                    return false;
                }

                this.state.seededInitialBalance = true;
                this.state.lastBalanceStageKey = "__initial__";
                console.debug("[MEP.BalanceCapture] initial seed", { value: n, len: arr.length });
                MEP.BalanceGraph?.render?.();
                return true;
            },

            stopInitialSeedFixTimer() {
                if (this.state.initialSeedTimer) {
                    clearInterval(this.state.initialSeedTimer);
                    this.state.initialSeedTimer = null;
                    console.debug("[MEP.BalanceCapture] initial seed timer stopped");
                }
            },

            tryFixInitialZero() {
                if (!Array.isArray(MEP.State.balanceHistory)) MEP.State.balanceHistory = [];
                const arr = MEP.State.balanceHistory;
                const first = arr.length ? Number(arr[0]) : null;
                const firstValidNonZero = Number.isFinite(first) && first !== 0;
                if (arr.length > 0 && firstValidNonZero) {
                    this.stopInitialSeedFixTimer();
                    return true;
                }

                this.updateLatestSeenBalance();
                const cur = Number(this.state.latestSeenBalance);
                if (Number.isFinite(cur) && cur > 0) {
                    if (!arr.length) {
                        arr.push(cur);
                        this.state.seededInitialBalance = true;
                        this.state.lastBalanceStageKey = "__initial__";
                        console.debug("[MEP.BalanceCapture] initial seed fixed by push", { value: cur });
                        MEP.BalanceGraph?.render?.();
                    } else if (arr.length >= 1 && Number(arr[0]) === 0) {
                        arr[0] = cur;
                        this.state.seededInitialBalance = true;
                        this.state.lastBalanceStageKey = "__initial__";
                        console.debug("[MEP.BalanceCapture] initial zero overwritten", { value: cur });
                        MEP.BalanceGraph?.render?.();
                    }
                }

                const firstAfter = arr.length ? Number(arr[0]) : null;
                if (arr.length > 0 && Number.isFinite(firstAfter) && firstAfter !== 0) {
                    this.stopInitialSeedFixTimer();
                    return true;
                }
                return false;
            },

            startInitialSeedFixTimer() {
                this.stopInitialSeedFixTimer();
                this.state.initialSeedAttempts = 0;
                console.debug("[MEP.BalanceCapture] initial seed timer started");
                this.state.initialSeedTimer = setInterval(() => {
                    this.state.initialSeedAttempts += 1;
                    const fixed = this.tryFixInitialZero();
                    if (fixed) return;
                    if (this.state.initialSeedAttempts >= 40) {
                        this.stopInitialSeedFixTimer();
                        console.warn("[MEP.BalanceCapture] initial seed timer timeout");
                    }
                }, 400);
            },

            pushCurrentBalanceToHistory(stageKey, reason = "round") {
                const n = Number(this.state.latestSeenBalance);
                if (!Number.isFinite(n)) return false;
                if (!Array.isArray(MEP.State.balanceHistory)) MEP.State.balanceHistory = [];
                const sk = (stageKey ?? "").toString().trim();
                if (!sk) return false;
                if (this.state.lastBalanceStageKey === sk) return false;

                const arr = MEP.State.balanceHistory;
                arr.push(n);
                this.state.lastBalanceStageKey = sk;
                if (reason === "initial") this.state.seededInitialBalance = true;
                console.debug("[MEP.BalanceCapture] push", { value: n, stageKey: sk, reason, len: arr.length });
                MEP.BalanceGraph?.render?.();
                return true;
            },

            onMutationTick() {
                this.updateLatestSeenBalance();
            },

            onRoundCommitted(stageKey) {
                this.pushCurrentBalanceToHistory(stageKey, "round");
            },

            stopIfRunning() {
                this.stopInitialSeedFixTimer();
                if (this.state.observer) {
                    try {
                        this.state.observer.disconnect();
                    } catch (e) {}
                    this.state.observer = null;
                }
                if (this.state.rebindTimer) {
                    clearInterval(this.state.rebindTimer);
                    this.state.rebindTimer = null;
                }
            },

            start() {
                this.stopIfRunning();
                if (!Array.isArray(MEP.State.balanceHistory)) MEP.State.balanceHistory = [];
                this.state.lastBalanceStageKey = "";
                this.state.seededInitialBalance = false;
                this.state.latestSeenBalance = null;

                this.ensureInitialBalance();

                const body = document.body;
                if (!body) return;

                this.state.observer = new MutationObserver(() => {
                    queueMicrotask(() => this.onMutationTick());
                });
                this.state.observer.observe(body, {
                    childList: true,
                    subtree: true,
                    characterData: true,
                });

                this.onMutationTick();
                this.state.rebindTimer = setInterval(() => this.onMutationTick(), 700);
                this.startInitialSeedFixTimer();
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
                MEP.Strategy1?.init?.();

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
                MEP.RoundStakeCapture.stopIfRunning();
                MEP.BalanceCapture.stopIfRunning();

                // CSS всегда
                MEP.Style.injectMinCss();

                // панель всегда (чтобы показать "в разработке")
                MEP.UI.mount();
                MEP.Strategy1?.init?.();
                MEP.Strategy1?.evaluateDecisionState?.();
                MEP.Strategy1?.updateUiCounters?.();

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
                MEP.RoundStakeCapture.start();
                MEP.BalanceCapture.start();

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
