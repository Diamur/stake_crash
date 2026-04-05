// === crash.js ====

// === MEP Control Panel + Crash Stats Tracker  ===
(() => {
    try {
        const MEP = (window.MEP = window.MEP || {});
        
		MEP.ver = "0.1.5.99";
        // -------------------------
        // Static code-priority settings
        // -------------------------

		MEP.CodeSettings = {
			// Если непусто -> приоритет над localStorage / DB / UI
			endpointUrl: "https://tc-ab.ru/scate/index.php?action=ping",

			// Формат: key=url (по одному на строку)
			soundsText: `ping1=https://tc-ab.ru/scate/sound/ping1.mp3
		ping2=https://tc-ab.ru/scate/sound/ping2.mp3
		ping3=https://tc-ab.ru/scate/sound/ping3.mp3
		ping4=https://tc-ab.ru/scate/sound/ping4.mp3
		ping5=https://tc-ab.ru/scate/sound/ping5.mp3
		ping6=https://tc-ab.ru/scate/sound/ping6.mp3
		ping7=https://tc-ab.ru/scate/sound/ping7.mp3
		ping8=https://tc-ab.ru/scate/sound/ping8.mp3
		ping9=https://tc-ab.ru/scate/sound/ping9.mp3
		ping10=https://tc-ab.ru/scate/sound/ping10.mp3
		ping11=https://tc-ab.ru/scate/sound/ping11.mp3
		ping12=https://tc-ab.ru/scate/sound/ping12.mp3
		ping13=https://tc-ab.ru/scate/sound/ping13.mp3
		ping14=https://tc-ab.ru/scate/sound/ping14.mp3
		wrn=https://tc-ab.ru/scate/sound/wrn.mp3`,

			// Если непусто -> дефолтный звук в коде
			soundDefaultKey: "",

			// Если > 0 -> приоритет над UI / localStorage / DB
			historySteps: 0,

			// Если > 0 -> приоритет над UI / localStorage / DB
			hitFlashMs: 0,

			// Если >= 0 -> приоритет над UI / localStorage / DB
			historyNextDelayMs: -1,

			// "high" | "low", если пусто -> обычная логика
			priorityMode: "",

			// slug'и по одному в строке, если пусто -> обычная логика
			supportedGamesText: "",

			// Если > 0 -> приоритет над trackCount из storage/UI
			trackCount: 6,

			// Первичная конфигурация строк отслеживания
			// limit = Порог, x = X, sound = ключ звука, color = опционально
			track: {
				t1: { x: 2, limit: 2, sound: "ping3", color: "#ff3b30" },
				t2: { x: 2, limit: 3, sound: "ping3", color: "#ff3b30" },
				t3: { x: 2, limit: 4, sound: "ping3", color: "#ff3b30" },
				t4: { x: 2, limit: 5, sound: "ping3", color: "#ff3b30" },
				t5: { x: 2, limit: 6, sound: "ping3", color: "#ff3b30" },
				t6: { x: 2, limit: 7, sound: "ping3", color: "#ff3b30" },
			},
		};

        const buildStrategy1ConditionBlocksDefault = () => ({
            charter: {
                type: "charter",
                enabled: true,
                label: "Устав",
                params: {},
            },
            streak_lt: {
                type: "streak_lt",
                enabled: true,
                label: "Подряд",
                params: { threshold: 3 },
            },
            diff_vector_state: {
                type: "diff_vector_state",
                enabled: false,
                label: "Diff",
                params: { mode: "gt" },
            },
            frequency_vector_state: {
                type: "frequency_vector_state",
                enabled: false,
                label: "Freq",
                params: { mode: "gt" },
            },
            frequency_line_gt: {
                type: "frequency_line_gt",
                enabled: false,
                label: "FreqL",
                params: { threshold: 3 },
            },
            stake_players_vector_state: {
                type: "stake_players_vector_state",
                enabled: false,
                label: "Clients",
                params: { mode: "gt" },
            },
            stake_bet_vector_state: {
                type: "stake_bet_vector_state",
                enabled: false,
                label: "Bet",
                params: { mode: "gt" },
            },
            stake_players_line_gte: {
                type: "stake_players_line_gte",
                enabled: false,
                label: "ClientsL",
                params: { threshold: 300 },
            },
            stake_bet_line_gte: {
                type: "stake_bet_line_gte",
                enabled: false,
                label: "BetL",
                params: { threshold: 300 },
            },
        });

        const buildStrategy1ConditionBlocksDisabledDefault = () => {
            const src = buildStrategy1ConditionBlocksDefault();
            const out = {};
            for (const k of Object.keys(src)) {
                out[k] = {
                    ...src[k],
                    enabled: false,
                    params: src[k]?.params && typeof src[k].params === "object" ? { ...src[k].params } : {},
                };
            }
            return out;
        };

        const buildStrategy1DefaultState = () => ({
            id: "strategy1",
            name: "Стратегия1",
            enabled: false,
            isExecuting: false,
            executionLocked: false,
            config: {
                riskPercent: 0,
                conditionPoolIds: [],
                conditionBlocks: buildStrategy1ConditionBlocksDefault(),
                conditionBranches: {
                    plus: buildStrategy1ConditionBlocksDefault(),
                    minus: buildStrategy1ConditionBlocksDisabledDefault(),
                },
                conditionSelectedBranch: "plus",
                startStakeMode: "fixed",
                startStakeValue: 0,
                startStakeArrayText: "",
                stakeGrowthMode: "factor",
                stakeGrowthFactor: 1,
                stakeGrowthArrayText: "",
                targetMode: "fixed",
                targetMultiplierValue: 2,
                targetMultiplierArrayText: "",
                stopMinusCount: 0,
                maxLosses: 0,
                firstCondLt2StreakEnabled: true,
                firstCondDiffVectorEnabled: true,
                firstCondFrequencyVectorEnabled: true,
                firstCondStakeBetVectorEnabled: true,
                firstCondStakePlayersVectorEnabled: true,
                firstCondExtraEnabled: false,
                secondCondMaxLossesEnabled: true,
                secondCondMaxStakeEnabled: true,
                secondCondDiffVectorEnabled: true,
                secondCondFrequencyVectorEnabled: true,
                voiceEnabled: true,
                statusEventsEnabled: true,
                voiceCooldownMs: 1500,
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
                cycleNumber: 0,
                startBalance: 0,
                currentBalance: 0,
                cyclePnL: 0,
                totalStakeSum: 0,
                roundCount: 0,
                betCount: 0,
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
                maxAllowedStake: 0,
                riskCap: 0,
                allowedByRisk: false,
                sourceStep: "",
                calcMode: "",
                ready: false,
                invalidReason: "",
            },
            runtime: {
                lastSignal: "",
                lastConditionResult: null,
                lastConditionBranchResults: null,
                activeBranch: "",
                lastStakePlanResult: null,
                lastProcessedRoundId: "",
                lastProcessedBalanceTs: 0,
                waitingRoundResult: false,
                lastCycleAction: "",
                eventLog: [],
                lastBranchInfo: null,
                lastFirstBranchResult: null,
                lastSecondBranchResult: null,
                lastBetPermissionResult: null,
                lastRoundOutcome: "",
                lastRoundResult: null,
                lastCycleSnapshot: null,
                manualPauseActive: false,
                manualPauseReason: "",
                manualPauseAtTs: 0,
                manualResumeAtTs: 0,
                hardExitRequested: false,
                hardExitAtTs: 0,
                hardExitReason: "",
                waitingBalanceRecoveryActive: false,
                waitingBalanceRecoveryReason: "",
                waitingBalanceRecoveryStartedAtTs: 0,
                waitingBalanceRecoveryTargetBalance: 0,
                waitingBalanceRecoveryCurrentBalance: 0,
                waitingBalanceRecoveryReached: false,
                waitingBalanceRecoveryReachedAtTs: 0,
                debugExecution: true,
                voiceEventsEnabled: true,
                statusEventsEnabled: true,
                lastVoiceEventCode: "",
                lastVoiceEventAtTs: 0,
                lastStatusEventCode: "",
                lastStatusEventAtTs: 0,
                lastAnnouncedDecisionCode: "",
                lastAnnouncedCycleState: "",
                lastAnnouncedBranchState: "",
                lastAnnouncedWaitingState: "",
                lastAnnouncedPermissionReason: "",
                executionState: "idle",
                lastExecutionAtTs: 0,
                lastExecutionReason: "",
                lastExecutionResult: "",
                lastExecutionRoundId: "",
                pendingBetAmount: 0,
                pendingTargetMultiplier: 0,
                pendingExecutionPayload: null,
                lastDomSyncAtTs: 0,
                startBalanceSnapshot: 0,
                copiedRiskAmount: 0,
                systemMessages: [],
                lastActionResponse: null,
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
            config: {
                riskPercent: 5,
                conditionPoolIds: [],
            },
            timers: {
                enabledAtTs: 0,
            },
            runtime: {
                startBalanceSnapshot: 0,
                copiedRiskAmount: 0,
            },
        });



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

            getCodeSoundsText() {
                return (MEP.CodeSettings?.soundsText ?? "").toString();
            },

            hasCodeSoundsText() {
                return !!this.getCodeSoundsText().trim();
            },

            getSoundsText() {
                const codeValue = this.getCodeSoundsText();
                if (codeValue.trim()) return codeValue;
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

            getCodeEndpoint() {
                return (MEP.CodeSettings?.endpointUrl ?? "").toString().trim();
            },

            hasCodeEndpoint() {
                return !!this.getCodeEndpoint();
            },

            getEndpoint() {
                const codeValue = this.getCodeEndpoint();
                if (codeValue) return codeValue;
                return (this.state.endpointUrl ?? "").toString().trim();
            },
        };

        // -------------------------
        // Condition Objects registry + storage
        // -------------------------
        MEP.ConditionObjects = {
            cache: new Map(),
            loadedAtTs: 0,
            DEBUG_TAG: "[MEP][ConditionObjects]",

            SOURCES: [
                { key: "lt2_streak", label: "Подряд x < 2", valueType: "number" },
                { key: "diff.vector.state", label: "Разницы: состояние вектора MA", valueType: "string" },
                { key: "charter.allowed", label: "Устав: разрешено", valueType: "boolean" },
                { key: "balance.current", label: "Баланс: текущий", valueType: "number" },
                { key: "balance.start", label: "Баланс: старт", valueType: "number" },
                { key: "ema.diff.state", label: "EMA Diff: state", valueType: "string" },
                { key: "ema.frequency.state", label: "EMA Frequency: state", valueType: "string" },
                { key: "stake.players.state", label: "Stake Players: state", valueType: "string" },
                { key: "stake.bet.state", label: "Stake Bet: state", valueType: "string" },
            ],

            typeRegistry: {
                charter: {
                    requiredParams: [],
                    sourceRequired: true,
                    defaultSource: "charter.allowed",
                    allowedSources: ["charter.allowed"],
                },
                streak_lt: {
                    requiredParams: ["threshold"],
                    sourceRequired: true,
                    defaultSource: "lt2_streak",
                    allowedSources: ["lt2_streak"],
                },
                ema_above: {
                    requiredParams: ["period"],
                    sourceRequired: true,
                    allowedSources: ["ema.diff.state", "ema.frequency.state"],
                },
                diff_vector_state: {
                    requiredParams: ["mode"],
                    sourceRequired: true,
                    defaultSource: "diff.vector.state",
                    allowedSources: ["diff.vector.state", "ema.diff.state"],
                },
            },

            makeDefault() {
                return {
                    id: "",
                    type: "streak_lt",
                    label: "",
                    enabled: true,
                    strategyId: "strategy1",
                    source: "lt2_streak",
                    groupId: "",
                    groupMode: "single",
                    params: {},
                    ui: { order: 0, visible: true },
                    runtimeDefaults: {
                        currentValue: 0,
                        reached: false,
                        result: false,
                        resultText: "",
                    },
                };
            },

            _clone(v) {
                return JSON.parse(JSON.stringify(v));
            },

            getSourceRegistryMap() {
                const map = Object.create(null);
                for (const it of this.SOURCES || []) {
                    const key = (it?.key ?? "").toString().trim();
                    if (!key) continue;
                    map[key] = { ...it, key };
                }
                return map;
            },

            getTypeDef(type) {
                const k = (type ?? "").toString().trim().toLowerCase();
                return this.typeRegistry[k] || null;
            },

            getDefaultSourceForType(type) {
                const def = this.getTypeDef(type);
                return (def?.defaultSource ?? "").toString().trim();
            },

            isKnownSource(sourceKey) {
                const key = (sourceKey ?? "").toString().trim();
                if (!key) return false;
                return !!this.getSourceRegistryMap()[key];
            },

            normalizeConditionObject(obj) {
                const src = obj && typeof obj === "object" ? obj : {};
                const base = this.makeDefault();
                const out = { ...base, ...src };

                out.id = (out.id ?? "").toString().trim();
                out.type = (out.type ?? "").toString().trim().toLowerCase();
                out.label = (out.label ?? "").toString().trim();
                out.strategyId = (out.strategyId ?? "").toString().trim().toLowerCase();
                out.source = (out.source ?? "").toString().trim();
                out.groupId = (out.groupId ?? "").toString().trim();
                out.groupMode = (out.groupMode ?? "").toString().trim().toLowerCase() || "single";
                out.enabled = !!out.enabled;
                out.params = out.params && typeof out.params === "object" && !Array.isArray(out.params) ? out.params : {};
                out.ui = out.ui && typeof out.ui === "object" && !Array.isArray(out.ui) ? out.ui : {};
                out.runtimeDefaults =
                    out.runtimeDefaults && typeof out.runtimeDefaults === "object" && !Array.isArray(out.runtimeDefaults)
                        ? out.runtimeDefaults
                        : {};

                if (!out.label) out.label = out.id || out.type || "Object";
                if (!out.strategyId || (out.strategyId !== "strategy1" && out.strategyId !== "strategy2")) out.strategyId = "strategy1";
                if (!out.source) out.source = this.getDefaultSourceForType(out.type) || "";
                if (out.type === "diff_vector_state") {
                    const rawMode = (out?.params?.mode ?? "").toString().trim().toLowerCase();
                    let mode = rawMode;
                    if (mode !== "gt" && mode !== "lt" && mode !== "flat") {
                        const id = (out.id || "").toString().toLowerCase();
                        if (id.endsWith("_lt")) mode = "lt";
                        else if (id.endsWith("_flat")) mode = "flat";
                        else mode = "gt";
                    }
                    out.params.mode = mode;
                    if (!out.source) out.source = "diff.vector.state";
                }

                const uiOrder = Number(out.ui.order);
                out.ui.order = Number.isFinite(uiOrder) ? Math.floor(uiOrder) : 0;
                out.ui.visible = out.ui.visible !== false;
                return out;
            },

            validateConditionObject(obj) {
                const out = this.normalizeConditionObject(obj);
                if (!out.id) return { ok: false, error: "id is required" };
                if (!out.type) return { ok: false, error: "type is required" };
                if (!out.strategyId) return { ok: false, error: "strategyId is required" };
                if (out.strategyId !== "strategy1" && out.strategyId !== "strategy2") return { ok: false, error: "strategyId must be strategy1/strategy2" };
                if (!/^[a-z0-9._-]+$/i.test(out.id)) return { ok: false, error: "id has invalid chars" };

                const typeDef = this.typeRegistry[out.type] || null;
                if (typeDef?.sourceRequired && !out.source) {
                    return { ok: false, error: `source is required for type ${out.type}` };
                }
                if (out.source) {
                    if (!this.isKnownSource(out.source)) return { ok: false, error: `unknown source: ${out.source}` };
                    if (typeDef?.allowedSources?.length && !typeDef.allowedSources.includes(out.source)) {
                        return { ok: false, error: `source ${out.source} is not allowed for type ${out.type}` };
                    }
                }
                if (typeDef && Array.isArray(typeDef.requiredParams)) {
                    for (const key of typeDef.requiredParams) {
                        if (!(key in out.params)) return { ok: false, error: `params.${key} is required for type ${out.type}` };
                    }
                }
                return { ok: true, value: out };
            },

            decodeConditionObject(obj) {
                const vr = this.validateConditionObject(obj);
                if (!vr.ok) return vr;
                return { ok: true, value: vr.value, typeDef: this.typeRegistry[vr.value.type] || null };
            },

            makeRuntimeContext(ctx = {}) {
                const src = ctx && typeof ctx === "object" ? ctx : {};
                const toNum = (v, fallback = 0) => {
                    const n = Number(v);
                    return Number.isFinite(n) ? n : fallback;
                };
                return {
                    lt2_streak: toNum(src?.lt2_streak, 0),
                    charter: {
                        allowed: src?.charter?.allowed !== false,
                    },
                    balance: {
                        start: toNum(src?.balance?.start, 0),
                        current: toNum(src?.balance?.current, 0),
                    },
                    ema: {
                        diff: { state: (src?.ema?.diff?.state ?? "flat").toString() },
                        frequency: { state: (src?.ema?.frequency?.state ?? "flat").toString() },
                    },
                    diff: {
                        vector: { state: (src?.diff?.vector?.state ?? src?.ema?.diff?.state ?? "flat").toString() },
                    },
                    stake: {
                        players: { state: (src?.stake?.players?.state ?? "flat").toString() },
                        bet: { state: (src?.stake?.bet?.state ?? "flat").toString() },
                    },
                };
            },

            resolveConditionSource(source, context = {}) {
                const srcKey = (source ?? "").toString().trim();
                if (!srcKey) return { ok: false, error: "source is empty", value: undefined };
                const ctx = this.makeRuntimeContext(context);
                const parts = srcKey.split(".");
                let cur = ctx;
                for (const p of parts) {
                    if (!p) continue;
                    if (cur && typeof cur === "object" && p in cur) {
                        cur = cur[p];
                    } else {
                        return { ok: false, error: `source not found in context: ${srcKey}`, value: undefined };
                    }
                }
                return { ok: true, value: cur };
            },

            evaluateConditionObject(object, context = {}) {
                const dec = this.decodeConditionObject(object);
                if (!dec.ok) return { ok: false, error: dec.error || "invalid object" };
                const obj = dec.value;
                const src = this.resolveConditionSource(obj.source, context);
                if (!src.ok) return { ok: false, error: src.error, object: obj };

                let result = false;
                let resultText = "noop";
                let sourceValue = src.value;
                if (obj.type === "streak_lt") {
                    const threshold = Number(obj?.params?.threshold);
                    const v = MEP.Utils.countStreakLT(threshold);
                    sourceValue = v;
                    if (Number.isFinite(v) && Number.isFinite(threshold) && threshold > 0) {
                        result = v >= threshold;
                        resultText = `${v} / need ${threshold}`;
                    } else if (Number.isFinite(v) && Number.isFinite(threshold)) {
                        result = v >= threshold;
                        resultText = `${v} >= ${threshold}`;
                    }
                } else if (obj.type === "charter") {
                    result = !!src.value;
                    resultText = result ? "allowed" : "blocked";
                } else if (obj.type === "ema_above") {
                    const expected = (obj?.params?.state ?? "up").toString().trim().toLowerCase();
                    const current = (src.value ?? "").toString().trim().toLowerCase();
                    result = !!current && current === expected;
                    resultText = `${current} === ${expected}`;
                } else if (obj.type === "diff_vector_state") {
                    const mode = (obj?.params?.mode ?? "gt").toString().trim().toLowerCase();
                    const current = (src.value ?? "").toString().trim().toLowerCase();
                    if (mode === "gt") {
                        result = current === "up";
                        resultText = `mainEMA > shiftedEMA (${current})`;
                    } else if (mode === "lt") {
                        result = current === "down";
                        resultText = `mainEMA < shiftedEMA (${current})`;
                    } else {
                        result = current === "flat";
                        resultText = `mainEMA ? shiftedEMA = flat (${current})`;
                    }
                }
                return { ok: true, object: obj, sourceValue, result, resultText };
            },

            list() {
                const arr = Array.from(this.cache.values()).map((v) => this._clone(v));
                arr.sort((a, b) => {
                    const ao = Number(a?.ui?.order || 0);
                    const bo = Number(b?.ui?.order || 0);
                    if (ao !== bo) return ao - bo;
                    return String(a.id).localeCompare(String(b.id));
                });
                return arr;
            },

            get(id) {
                return this.cache.has(id) ? this._clone(this.cache.get(id)) : null;
            },

            normalizeDbListItem(raw) {
                if (raw && typeof raw === "object" && !Array.isArray(raw)) {
                    if (raw.object_json && typeof raw.object_json === "string") {
                        try {
                            const parsed = JSON.parse(raw.object_json);
                            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
                        } catch (e) {
                            console.warn(`${this.DEBUG_TAG} normalizeDbListItem: object_json parse failed`, {
                                error: e?.message || e,
                                raw,
                            });
                        }
                    }
                    if (raw.item && typeof raw.item === "object" && !Array.isArray(raw.item)) return raw.item;
                    return raw;
                }
                return raw;
            },

            async loadFromDb(reason = "objects_list") {
                const url = (MEP.Settings.getEndpoint?.() ?? "").toString().trim();
                if (!url || !MEP.Net?.postJson) {
                    console.warn(`${this.DEBUG_TAG} loadFromDb skipped: endpoint or Net.postJson missing`, {
                        url,
                        hasPostJson: !!MEP.Net?.postJson,
                        reason,
                    });
                    return [];
                }
                const payload = {
                    action: "objects_list",
                    ts: Date.now(),
                    ver: MEP.ver,
                    reason: (reason ?? "").toString(),
                    game_slug: (MEP.State?.gameSlug ?? "").toString(),
                    device_id: MEP.Settings.getDeviceId(),
                };
                console.debug(`${this.DEBUG_TAG} loadFromDb start`, { endpoint: url, payload });
                const resp = await MEP.Net.postJson(url, payload, 9000);
                console.debug(`${this.DEBUG_TAG} loadFromDb response`, {
                    ok: !!resp?.ok,
                    status: resp?.status,
                    json: resp?.json,
                    text: resp?.text,
                    error: resp?.error,
                });
                if (!(resp?.ok && resp?.json?.ok === true)) {
                    console.warn(`${this.DEBUG_TAG} loadFromDb failed`, { response: resp });
                    return [];
                }
                const rootItems = Array.isArray(resp?.json?.items)
                    ? resp.json.items
                    : Array.isArray(resp?.json?.data?.items)
                      ? resp.json.data.items
                      : [];
                if (!Array.isArray(resp?.json?.items)) {
                    console.warn(`${this.DEBUG_TAG} loadFromDb: items are not in json.items`, {
                        hasDataItems: Array.isArray(resp?.json?.data?.items),
                        jsonKeys: Object.keys(resp?.json || {}),
                    });
                }
                console.debug(`${this.DEBUG_TAG} loadFromDb items received`, {
                    count: rootItems.length,
                    ids: rootItems.map((it) => (it?.id ?? it?.object_id ?? "")).filter(Boolean),
                    types: rootItems.map((it) => (it?.type ?? "")).filter(Boolean),
                });
                this.cache.clear();
                const skipped = [];
                const added = [];
                for (const raw of rootItems) {
                    const normalizedRaw = this.normalizeDbListItem(raw);
                    const preVr = this.validateConditionObject(normalizedRaw);
                    console.debug(`${this.DEBUG_TAG} loadFromDb item trace`, {
                        raw,
                        normalizedRaw,
                        rawId: raw?.id ?? raw?.object_id ?? "",
                        rawType: raw?.type ?? "",
                        validateOk: preVr?.ok === true,
                        validateError: preVr?.error || "",
                    });
                    const dec = this.decodeConditionObject(normalizedRaw);
                    if (!dec.ok) {
                        skipped.push({
                            id: normalizedRaw?.id ?? raw?.id ?? raw?.object_id ?? "",
                            type: normalizedRaw?.type ?? raw?.type ?? "",
                            error: dec.error || preVr?.error || "decode failed",
                        });
                        console.warn(`${this.DEBUG_TAG} loadFromDb item skipped`, skipped[skipped.length - 1]);
                        continue;
                    }
                    this.cache.set(dec.value.id, dec.value);
                    added.push({ id: dec.value.id, type: dec.value.type });
                    console.debug(`${this.DEBUG_TAG} loadFromDb item added to cache`, added[added.length - 1]);
                }
                this.loadedAtTs = Date.now();
                console.debug(`${this.DEBUG_TAG} loadFromDb completed`, {
                    cacheSize: this.cache.size,
                    added,
                    skipped,
                });
                if (rootItems.length > 0 && added.length === 0) {
                    console.warn(`${this.DEBUG_TAG} loadFromDb: all items skipped`, {
                        itemsCount: rootItems.length,
                        skipped,
                    });
                }
                return this.list();
            },

            async saveToDb(obj, reason = "object_save") {
                console.debug(`${this.DEBUG_TAG} saveToDb start`, { reason, objectBeforeDecode: obj });
                const dec = this.decodeConditionObject(obj);
                if (!dec.ok) throw new Error(dec.error || "invalid object");
                const url = (MEP.Settings.getEndpoint?.() ?? "").toString().trim();
                if (!url || !MEP.Net?.postJson) throw new Error("endpoint or Net.postJson is not available");
                const payload = {
                    action: "object_save",
                    ts: Date.now(),
                    ver: MEP.ver,
                    reason: (reason ?? "").toString(),
                    game_slug: (MEP.State?.gameSlug ?? "").toString(),
                    device_id: MEP.Settings.getDeviceId(),
                    object: dec.value,
                };
                console.debug(`${this.DEBUG_TAG} saveToDb payload`, {
                    endpoint: url,
                    decodeResult: dec,
                    payload,
                });
                const resp = await MEP.Net.postJson(url, payload, 9000);
                console.debug(`${this.DEBUG_TAG} saveToDb response`, {
                    ok: !!resp?.ok,
                    status: resp?.status,
                    json: resp?.json,
                    text: resp?.text,
                    error: resp?.error,
                });
                if (!(resp?.ok && resp?.json?.ok === true)) throw new Error(resp?.json?.error || "save failed");
                this.cache.set(dec.value.id, dec.value);
                console.debug(`${this.DEBUG_TAG} saveToDb cache updated`, {
                    id: dec.value.id,
                    inCache: this.cache.has(dec.value.id),
                    cacheSize: this.cache.size,
                });
                return this.get(dec.value.id);
            },

            async create(obj) {
                return this.saveToDb(obj, "object_create");
            },

            async update(obj) {
                return this.saveToDb(obj, "object_update");
            },

            async remove(id) {
                const objectId = (id ?? "").toString().trim();
                if (!objectId) return false;
                const url = (MEP.Settings.getEndpoint?.() ?? "").toString().trim();
                if (!url || !MEP.Net?.postJson) return false;
                const resp = await MEP.Net.postJson(
                    url,
                    {
                        action: "object_delete",
                        ts: Date.now(),
                        ver: MEP.ver,
                        device_id: MEP.Settings.getDeviceId(),
                        object_id: objectId,
                    },
                    9000
                );
                if (resp?.ok && resp?.json?.ok === true) {
                    this.cache.delete(objectId);
                    return true;
                }
                return false;
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
                    trackingCollapsed: MEP.State.trackingCollapsed,
                    track: MEP.State.track,
                    graphMax: MEP.State.graphMax,
                    graphDensity: MEP.State.graphDensity,
                    stakeGraphDensity: MEP.State.stakeGraphDensity,
                    stakeGraphDensitySync: MEP.State.stakeGraphDensitySync,
                    stakeGraphAutoHeight: MEP.State.stakeGraphAutoHeight,
                    stakeGraphPlayersScale: MEP.State.stakeGraphPlayersScale,
                    stakeGraphBetScale: MEP.State.stakeGraphBetScale,
                    stakeGraphPlayersColor: MEP.State.stakeGraphPlayersColor,
                    stakeGraphBetColor: MEP.State.stakeGraphBetColor,
                    stakeGraphShowPlayers: MEP.State.stakeGraphShowPlayers,
                    stakeGraphShowBet: MEP.State.stakeGraphShowBet,
                    stakePlayersVectorEnabled: MEP.State.stakePlayersVectorEnabled,
                    stakePlayersVectorPeriod: MEP.State.stakePlayersVectorPeriod,
                    stakePlayersVectorPhaseShift: MEP.State.stakePlayersVectorPhaseShift,
                    stakePlayersVectorFlatEpsilon: MEP.State.stakePlayersVectorFlatEpsilon,
                    stakePlayersVectorMainColor: MEP.State.stakePlayersVectorMainColor,
                    stakePlayersVectorShiftColor: MEP.State.stakePlayersVectorShiftColor,
                    stakePlayersVectorMainWidth: MEP.State.stakePlayersVectorMainWidth,
                    stakePlayersVectorShiftWidth: MEP.State.stakePlayersVectorShiftWidth,
                    stakeBetVectorEnabled: MEP.State.stakeBetVectorEnabled,
                    stakeBetVectorPeriod: MEP.State.stakeBetVectorPeriod,
                    stakeBetVectorPhaseShift: MEP.State.stakeBetVectorPhaseShift,
                    stakeBetVectorFlatEpsilon: MEP.State.stakeBetVectorFlatEpsilon,
                    stakeBetVectorMainColor: MEP.State.stakeBetVectorMainColor,
                    stakeBetVectorShiftColor: MEP.State.stakeBetVectorShiftColor,
                    stakeBetVectorMainWidth: MEP.State.stakeBetVectorMainWidth,
                    stakeBetVectorShiftWidth: MEP.State.stakeBetVectorShiftWidth,
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
                    strategy2Enabled: !!MEP.State?.strategies?.strategy2?.enabled,
                    strategy2Config: { ...(MEP.State?.strategies?.strategy2?.config || {}) },
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
                        if (typeof data.trackingCollapsed === "boolean") MEP.State.trackingCollapsed = data.trackingCollapsed;
                        if (data.track && typeof data.track === "object") MEP.State.track = data.track;
                        if (typeof data.graphMax === "number") MEP.State.graphMax = data.graphMax;
                        if (typeof data.graphDensity === "number") MEP.State.graphDensity = data.graphDensity;
                        if (typeof data.stakeGraphDensity === "number") MEP.State.stakeGraphDensity = data.stakeGraphDensity;
                        if (typeof data.stakeGraphDensitySync === "boolean") MEP.State.stakeGraphDensitySync = data.stakeGraphDensitySync;
                        if (typeof data.stakeGraphAutoHeight === "boolean") MEP.State.stakeGraphAutoHeight = data.stakeGraphAutoHeight;
                        if (typeof data.stakeGraphPlayersScale === "number") MEP.State.stakeGraphPlayersScale = data.stakeGraphPlayersScale;
                        if (typeof data.stakeGraphBetScale === "number") MEP.State.stakeGraphBetScale = data.stakeGraphBetScale;
                        if (typeof data.stakeGraphPlayersColor === "string") MEP.State.stakeGraphPlayersColor = data.stakeGraphPlayersColor;
                        if (typeof data.stakeGraphBetColor === "string") MEP.State.stakeGraphBetColor = data.stakeGraphBetColor;
                        if (typeof data.stakeGraphShowPlayers === "boolean") MEP.State.stakeGraphShowPlayers = data.stakeGraphShowPlayers;
                        if (typeof data.stakeGraphShowBet === "boolean") MEP.State.stakeGraphShowBet = data.stakeGraphShowBet;
                        if (typeof data.stakePlayersVectorEnabled === "boolean") MEP.State.stakePlayersVectorEnabled = data.stakePlayersVectorEnabled;
                        if (typeof data.stakePlayersVectorPeriod === "number") MEP.State.stakePlayersVectorPeriod = data.stakePlayersVectorPeriod;
                        if (typeof data.stakePlayersVectorPhaseShift === "number") MEP.State.stakePlayersVectorPhaseShift = data.stakePlayersVectorPhaseShift;
                        if (typeof data.stakePlayersVectorFlatEpsilon === "number") MEP.State.stakePlayersVectorFlatEpsilon = data.stakePlayersVectorFlatEpsilon;
                        if (typeof data.stakePlayersVectorMainColor === "string") MEP.State.stakePlayersVectorMainColor = data.stakePlayersVectorMainColor;
                        if (typeof data.stakePlayersVectorShiftColor === "string") MEP.State.stakePlayersVectorShiftColor = data.stakePlayersVectorShiftColor;
                        if (typeof data.stakePlayersVectorMainWidth === "number") MEP.State.stakePlayersVectorMainWidth = data.stakePlayersVectorMainWidth;
                        if (typeof data.stakePlayersVectorShiftWidth === "number") MEP.State.stakePlayersVectorShiftWidth = data.stakePlayersVectorShiftWidth;
                        if (typeof data.stakeBetVectorEnabled === "boolean") MEP.State.stakeBetVectorEnabled = data.stakeBetVectorEnabled;
                        if (typeof data.stakeBetVectorPeriod === "number") MEP.State.stakeBetVectorPeriod = data.stakeBetVectorPeriod;
                        if (typeof data.stakeBetVectorPhaseShift === "number") MEP.State.stakeBetVectorPhaseShift = data.stakeBetVectorPhaseShift;
                        if (typeof data.stakeBetVectorFlatEpsilon === "number") MEP.State.stakeBetVectorFlatEpsilon = data.stakeBetVectorFlatEpsilon;
                        if (typeof data.stakeBetVectorMainColor === "string") MEP.State.stakeBetVectorMainColor = data.stakeBetVectorMainColor;
                        if (typeof data.stakeBetVectorShiftColor === "string") MEP.State.stakeBetVectorShiftColor = data.stakeBetVectorShiftColor;
                        if (typeof data.stakeBetVectorMainWidth === "number") MEP.State.stakeBetVectorMainWidth = data.stakeBetVectorMainWidth;
                        if (typeof data.stakeBetVectorShiftWidth === "number") MEP.State.stakeBetVectorShiftWidth = data.stakeBetVectorShiftWidth;
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
                        if (MEP.State?.strategies?.strategy2) {
                            if (typeof data.strategy2Enabled === "boolean") MEP.State.strategies.strategy2.enabled = data.strategy2Enabled;
                            if (data.strategy2Config && typeof data.strategy2Config === "object") {
                                MEP.State.strategies.strategy2.config = {
                                    ...MEP.State.strategies.strategy2.config,
                                    ...data.strategy2Config,
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
                    if (typeof data.trackingCollapsed === "boolean") MEP.State.trackingCollapsed = data.trackingCollapsed;
                    if (data.track && typeof data.track === "object") MEP.State.track = data.track;
                    if (typeof data.graphMax === "number") MEP.State.graphMax = data.graphMax;
                    if (typeof data.graphDensity === "number") MEP.State.graphDensity = data.graphDensity;
                    if (typeof data.stakeGraphDensity === "number") MEP.State.stakeGraphDensity = data.stakeGraphDensity;
                    if (typeof data.stakeGraphDensitySync === "boolean") MEP.State.stakeGraphDensitySync = data.stakeGraphDensitySync;
                    if (typeof data.stakeGraphAutoHeight === "boolean") MEP.State.stakeGraphAutoHeight = data.stakeGraphAutoHeight;
                    if (typeof data.stakeGraphPlayersScale === "number") MEP.State.stakeGraphPlayersScale = data.stakeGraphPlayersScale;
                    if (typeof data.stakeGraphBetScale === "number") MEP.State.stakeGraphBetScale = data.stakeGraphBetScale;
                    if (typeof data.stakeGraphPlayersColor === "string") MEP.State.stakeGraphPlayersColor = data.stakeGraphPlayersColor;
                    if (typeof data.stakeGraphBetColor === "string") MEP.State.stakeGraphBetColor = data.stakeGraphBetColor;
                    if (typeof data.stakeGraphShowPlayers === "boolean") MEP.State.stakeGraphShowPlayers = data.stakeGraphShowPlayers;
                    if (typeof data.stakeGraphShowBet === "boolean") MEP.State.stakeGraphShowBet = data.stakeGraphShowBet;
                    if (typeof data.stakePlayersVectorEnabled === "boolean") MEP.State.stakePlayersVectorEnabled = data.stakePlayersVectorEnabled;
                    if (typeof data.stakePlayersVectorPeriod === "number") MEP.State.stakePlayersVectorPeriod = data.stakePlayersVectorPeriod;
                    if (typeof data.stakePlayersVectorPhaseShift === "number") MEP.State.stakePlayersVectorPhaseShift = data.stakePlayersVectorPhaseShift;
                    if (typeof data.stakePlayersVectorFlatEpsilon === "number") MEP.State.stakePlayersVectorFlatEpsilon = data.stakePlayersVectorFlatEpsilon;
                    if (typeof data.stakePlayersVectorMainColor === "string") MEP.State.stakePlayersVectorMainColor = data.stakePlayersVectorMainColor;
                    if (typeof data.stakePlayersVectorShiftColor === "string") MEP.State.stakePlayersVectorShiftColor = data.stakePlayersVectorShiftColor;
                    if (typeof data.stakePlayersVectorMainWidth === "number") MEP.State.stakePlayersVectorMainWidth = data.stakePlayersVectorMainWidth;
                    if (typeof data.stakePlayersVectorShiftWidth === "number") MEP.State.stakePlayersVectorShiftWidth = data.stakePlayersVectorShiftWidth;
                    if (typeof data.stakeBetVectorEnabled === "boolean") MEP.State.stakeBetVectorEnabled = data.stakeBetVectorEnabled;
                    if (typeof data.stakeBetVectorPeriod === "number") MEP.State.stakeBetVectorPeriod = data.stakeBetVectorPeriod;
                    if (typeof data.stakeBetVectorPhaseShift === "number") MEP.State.stakeBetVectorPhaseShift = data.stakeBetVectorPhaseShift;
                    if (typeof data.stakeBetVectorFlatEpsilon === "number") MEP.State.stakeBetVectorFlatEpsilon = data.stakeBetVectorFlatEpsilon;
                    if (typeof data.stakeBetVectorMainColor === "string") MEP.State.stakeBetVectorMainColor = data.stakeBetVectorMainColor;
                    if (typeof data.stakeBetVectorShiftColor === "string") MEP.State.stakeBetVectorShiftColor = data.stakeBetVectorShiftColor;
                    if (typeof data.stakeBetVectorMainWidth === "number") MEP.State.stakeBetVectorMainWidth = data.stakeBetVectorMainWidth;
                    if (typeof data.stakeBetVectorShiftWidth === "number") MEP.State.stakeBetVectorShiftWidth = data.stakeBetVectorShiftWidth;
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
                    if (MEP.State?.strategies?.strategy2) {
                        if (typeof data.strategy2Enabled === "boolean") MEP.State.strategies.strategy2.enabled = data.strategy2Enabled;
                        if (data.strategy2Config && typeof data.strategy2Config === "object") {
                            MEP.State.strategies.strategy2.config = {
                                ...MEP.State.strategies.strategy2.config,
                                ...data.strategy2Config,
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
				position:fixed; top:0; right:0; height:100vh; width:450px;
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
				#${PANEL_ID} .mep-game-phase-row{
				display:grid;
				grid-template-columns:1fr 1fr 1fr;
				gap:8px;
				margin-bottom:10px;
				}
				#${PANEL_ID} .mep-game-phase-cell{
				border:1px solid rgba(255,255,255,.25);
				border-radius:6px;
				height:16px;
				display:flex;
				align-items:center;
				justify-content:center;
				font-size:12px;
				color:#d7dde5;
				background:rgba(255,255,255,.08);
				transition:all .15s ease;
				}
				#${PANEL_ID} .mep-game-phase-cell.is-active{
				color:#d9ffe5;
				background:rgba(0,255,87,.22);
				border-color:rgba(0,255,87,.85);
				box-shadow:0 0 12px rgba(0,255,87,.48), inset 0 0 8px rgba(0,255,87,.12);
				text-shadow:0 0 6px rgba(0,255,87,.55);
				}
				#${PANEL_ID} .mep-game-phase-cell-game.is-active{
				color:#ffd9d9;
				background:rgba(255,34,34,.22);
				border-color:rgba(255,34,34,.9);
				box-shadow:0 0 12px rgba(255,34,34,.5), inset 0 0 8px rgba(255,34,34,.14);
				text-shadow:0 0 6px rgba(255,34,34,.55);
				}
				#${PANEL_ID} .mep-game-phase-cell-launch.is-active{
				color:#ffe8cf;
				background:rgba(255,136,0,.24);
				border-color:rgba(255,136,0,.92);
				box-shadow:0 0 12px rgba(255,136,0,.52), inset 0 0 8px rgba(255,136,0,.14);
				text-shadow:0 0 6px rgba(255,136,0,.55);
				}
				#${PANEL_ID} .mep-game-tab-panel{
				display:none;
				padding:12px;
				border:1px dashed rgba(255,255,255,0.22);
				background: rgba(255,255,255,0.03);
				padding-top:0px;
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
				#${PANEL_ID} .mep-actions-row {
				display: flex;
				gap: 8px;
				margin-top: 8px;
				flex-wrap: wrap;
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
				#${PANEL_ID} .mep-tracking-wrap.mep-collapsed .mep-track-wrap,
				#${PANEL_ID} .mep-tracking-wrap.mep-collapsed .mep-track-count{
				display:none;
				}
				#${PANEL_ID} .mep-frequency-collapse,
				#${PANEL_ID} .mep-track-collapse,
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
				#${PANEL_ID} .mep-track-collapse:hover,
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
				#${PANEL_ID} .mep-stake-vector-row{
				display:inline-flex;
				align-items:center;
				gap:8px;
				flex-wrap:wrap;
				font-size:12px;
				opacity:0.95;
				}
				#${PANEL_ID} .mep-stake-vector-label{
				display:inline-flex;
				align-items:center;
				gap:5px;
				}
				#${PANEL_ID} .mep-stake-vector-label input[type="number"]{
				width:50px;
				border-radius:8px;
				border:1px solid rgba(255,255,255,0.10);
				background: rgba(255,255,255,0.06);
				color:#fff;
				padding:0 8px;
				font-size:12px;
				outline:none;
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
				#${PANEL_ID} input.mep-stake-scale-bet,
				#${PANEL_ID} input.mep-stake-color-players,
				#${PANEL_ID} input.mep-stake-color-bet{
				width:58px;
				border-radius:8px;
				border: 1px solid rgba(255,255,255,0.10);
				background: rgba(255,255,255,0.06);
				color:#fff;
				padding: 0 8px;
				font-size:12px;
				outline:none;
				}
				#${PANEL_ID} input.mep-stake-color-players,
				#${PANEL_ID} input.mep-stake-color-bet{
				padding: 0;
				height: 24px;
				width: 36px;
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
        #${PANEL_ID} .mep-game-tab-btn.mep-strategy1-tab-live,
        #${PANEL_ID} .mep-game-tab-btn.mep-strategy1-tab-live.is-active,
        #${PANEL_ID} .mep-game-tab-btn.mep-strategy1-tab-live:hover{
        background:#00e51f !important;
        color:#021007 !important;
        border-color:rgba(2,16,7,.82) !important;
        box-shadow:0 0 0 1px rgba(255,255,255,.35) inset, 0 0 12px rgba(0,229,31,.45);
        }
        .mep-strategy1-minimal-root{
        display:flex;
        flex-direction:column;
        gap:5px;
        }
        .mep-strategy1-info-bar{
        height:24px;
        background:rgba(146,146,146,.9);
        color:#fff;
        display:flex;
        align-items:center;
        overflow:hidden;
        padding:0 8px;
        box-sizing:border-box;
        }
        .mep-strategy1-info-track{
        width:100%;
        overflow:hidden;
        white-space:nowrap;
        }
        .mep-strategy1-info-ticker{
        display:inline-block;
        will-change:transform;
        transform:translateX(0);
        font-size:12px;
        line-height:1;
        }
        .mep-strategy1-info-ticker.is-running{
        animation:mepS1Ticker var(--mep-s1-ticker-duration,3200ms) linear 1 forwards;
        }
        @keyframes mepS1Ticker{
        from{transform:translateX(var(--mep-s1-ticker-start, 18px));}
        to{transform:translateX(calc(-1 * var(--mep-s1-ticker-shift, 0px)));}
        }
        .mep-strategy1-control-row{
        display:flex;
        align-items:center;
        gap:10px;
        padding:0px 0px 0;
        }
        .mep-strategy1-control-label,.mep-strategy1-work-timer{
        color:#f4f7fb;
        font-size:18px;
        line-height:1;
        white-space:nowrap;
        }
        .mep-strategy1-right-meta{
        margin-left:auto;
        display:inline-flex;
        align-items:center;
        justify-content:space-between;
        gap:8px;
        flex:1 1 auto;
        min-width:0;
        }
        .mep-strategy1-current-date{
        color:rgba(240,246,255,.9);
        font-size:13px;
        line-height:1;
        white-space:nowrap;
        overflow:hidden;
        text-overflow:ellipsis;
        }
        .mep-strategy1-current-time{
        color:#f7e7a2;
        font-size:13px;
        line-height:1;
        white-space:nowrap;
        flex:0 0 auto;
        }
        .mep-strategy1-work-timer{
        font-size:13px;
        line-height:1;
        white-space:nowrap;
        flex:0 0 auto;
        }
        .mep-strategy1-work-timer.is-active{color:#00ff57;}
        .mep-strategy1-work-timer.is-inactive{color:#8f9aa8;}
        .mep-strategy1-balance-row{
        margin-top:0;
        display:flex;
        align-items:center;
        gap:6px;
        border-top:1px dashed rgba(255,255,255,.28);
        border-bottom:1px dashed rgba(255,255,255,.28);
        padding:6px 10px;
        font-size:12px;
        min-width:0;
        overflow:hidden;
        flex-wrap:nowrap;
        }
        .mep-strategy1-coin-icon svg{width:18px;height:18px;display:block;}
        .mep-strategy1-start-balance{color:#9aa3ad;max-width:82px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .mep-strategy1-current-balance{color:#fff;font-weight:700;max-width:96px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .mep-strategy1-balance-divider,
        .mep-strategy1-start-divider{width:1px;height:24px;background:rgba(255,255,255,.65);}
        .mep-strategy1-pnl.is-pos{color:#00ff57;}
        .mep-strategy1-pnl.is-neg{color:#ff6f9f;}
        .mep-strategy1-pnl.is-neutral{color:#a9b2bc;}
        .mep-strategy1-pnl{max-width:56px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .mep-strategy1-risk-amount{color:#d7dde5;cursor:pointer;max-width:92px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .mep-strategy1-risk-percent{width:36px;height:24px;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.4);color:#fff;text-align:center;}
        .mep-strategy1-risk-percent-sign{font-size:48px;transform:scale(.26);transform-origin:left center;color:#fff;}
        .mep-strategy1-conditions-wrap{
        margin-top:8px;
        display:flex;
        flex-direction:column;
        gap:6px;
        }
        .mep-strategy1-branch-tabs{display:flex;gap:6px;}
        .mep-strategy1-branch-tab{
        min-width:74px;height:24px;border-radius:6px;
        border:1px solid rgba(255,255,255,.22);
        background:rgba(255,255,255,.08);color:#d8dde6;font-size:12px;cursor:pointer;
        }
        .mep-strategy1-branch-tab.is-selected{background:rgba(255,255,255,.28);color:#fff;}
        .mep-strategy1-branch-tab.is-runtime-active{
        background:rgba(0,255,87,.2);border-color:rgba(0,255,87,.75);color:#b5ffca;box-shadow:0 0 10px rgba(0,255,87,.45);
        }
        .mep-strategy1-cond-summary{
        font-size:11px;
        line-height:1.1;
        border:1px dashed rgba(255,255,255,.2);
        border-radius:8px;
        padding:5px 8px;
        background:rgba(255,255,255,.03);
        color:#a9b2bc;
        display:flex;
        justify-content:flex-end;
        text-align:right;
        transition:all .15s ease;
        }
        .mep-strategy1-cond-summary.is-true{
        color:#d9ffe5;
        background:rgba(0,255,87,.22);
        border-color:rgba(0,255,87,.85);
        box-shadow:0 0 12px rgba(0,255,87,.48), inset 0 0 10px rgba(0,255,87,.15);
        text-shadow:0 0 6px rgba(0,255,87,.55);
        }
        .mep-strategy1-cond-summary.is-false{
        color:#ff6f9f;
        background:rgba(255,255,255,.03);
        border-color:rgba(255,255,255,.2);
        box-shadow:none;
        }
        .mep-strategy1-cond-summary.is-idle{
        color:#a9b2bc;
        background:rgba(255,255,255,.03);
        border-color:rgba(255,255,255,.2);
        box-shadow:none;
        }
        .mep-strategy1-stake-service-wrap{display:flex;flex-direction:column;gap:5px;}
        .mep-strategy1-stake-row{
        margin-top:0;
        display:grid;
        grid-template-columns:34px minmax(88px,1fr) 86px 42px 86px;
        align-items:center;
        gap:0;
        border:1px dashed rgba(255,255,255,.24);
        border-radius:0;
        padding:0;
        font-size:11px;
        background:rgba(255,255,255,.04);
        }
        .mep-strategy1-stake-row.is-active{border-color:rgba(0,255,87,.5);background:rgba(0,255,87,.08);}
        .mep-strategy1-stake-row.is-inactive{opacity:.86;}
        .mep-strategy1-stake-mode-toggle{width:16px;height:16px;accent-color:#00e51f;}
        .mep-strategy1-stake-col{padding:4px 8px;white-space:nowrap;overflow:visible;text-overflow:clip;word-break:normal;line-height:1.2;}
        .mep-strategy1-stake-col.label{color:#f0f4fb;}
        .mep-strategy1-stake-col.start{color:#d7dde5;text-align:right;}
        .mep-strategy1-stake-col.loss{color:#9eb3d7;text-align:center;}
        .mep-strategy1-stake-col.next{color:#9ef5b4;text-align:right;}
        .mep-strategy1-click-apply{
        cursor:pointer;
        text-decoration:underline;
        text-decoration-color:rgba(158,245,180,.6);
        text-underline-offset:2px;
        transition:all .15s ease;
        }
        .mep-strategy1-click-apply:hover{
        color:#fff;
        text-decoration-color:#fff;
        text-shadow:0 0 8px rgba(158,245,180,.55);
        }
        .mep-strategy1-cycle-info-row{
        display:grid;
        grid-template-columns:1fr 1fr 1fr 1fr;
        align-items:center;
        gap:0;
        border:1px dashed rgba(255,255,255,.24);
        border-radius:0;
        background:rgba(255,255,255,.04);
        margin-top:0;
        }
        .mep-strategy1-cycle-info-cell{
        padding:6px 8px;
        font-size:12px;
        color:#dce4f0;
        text-align:center;
        white-space:nowrap;
        }
        .mep-strategy1-cycle-info-cell b{color:#fff;font-weight:700;}
        .mep-strategy1-service-array-row{
        margin-top:0;
        display:grid;
        grid-template-columns:34px 92px minmax(86px,1fr) 86px;
        align-items:center;
        gap:0;
        border:1px dashed rgba(255,255,255,.24);
        border-radius:0;
        font-size:11px;
        background:rgba(255,255,255,.04);
        }
        .mep-strategy1-service-array-spacer{display:inline-block;}
        .mep-strategy1-service-array-input{
        width:100%;
        height:22px;
        border:1px solid rgba(255,255,255,.26);
        background:rgba(255,255,255,.08);
        color:#fff;
        padding:0 6px;
        font-size:11px;
        box-sizing:border-box;
        outline:none;
        }
        .mep-strategy1-service-array-input:focus{border-color:rgba(0,255,87,.55);}
        .mep-strategy1-stake-col.active{color:#f7e7a2;text-align:right;}
        .mep-strategy1-cond-list{display:flex;flex-direction:column;gap:5px;}
        .mep-strategy1-cond-empty{
        font-size:11px;
        opacity:.75;
        border:1px dashed rgba(255,255,255,.14);
        border-radius:8px;
        padding:6px 8px;
        }
        .mep-strategy1-condition-row{
        margin-top:0px;
        display:grid;
        grid-template-columns: 34px 1fr 1fr 0.3fr;
        align-items:center;
        gap:0px;
        border:1px dashed rgba(255,255,255,.24);
        border-radius:0px;
        padding:0px 0px;
        font-size:11px;
        background:rgba(255,255,255,.04);
        }
        .mep-strategy1-condition-row.is-diff{
        grid-template-columns:34px 72px 1fr 1fr 0.3fr;
        }
        .mep-strategy1-cond-toggle-wrap{
        display:inline-flex;
        align-items:center;
        gap:0px;
        color:#e7edf6;
        font-size:11px;
        line-height:1;
        white-space:nowrap;
        min-width:0;
        }
        .mep-strategy1-cond-toggle-wrap.is-locked{
        justify-content:center;
        }
        .mep-strategy1-cond-lock-indicator{
        width:18px;
        height:18px;
        border-radius:4px;
        border:1px solid rgba(255,255,255,.6);
        background:rgba(255,255,255,.08);
        display:inline-block;
        position:relative;
        }
        .mep-strategy1-cond-lock-indicator.is-on{
        background:#00e51f;
        border-color:#00e51f;
        box-shadow:0 0 8px rgba(0,229,31,.28);
        }
        .mep-strategy1-cond-lock-indicator.is-on::after{
        content:"";
        position:absolute;
        left:5px;
        top:2px;
        width:6px;
        height:10px;
        border-right:2px solid #fff;
        border-bottom:2px solid #fff;
        transform:rotate(45deg);
        }
        .mep-strategy1-cond-lock-indicator.is-off{
        background:rgba(255,255,255,.03);
        border-color:rgba(255,255,255,.55);
        }
        .mep-strategy1-cond-toggle-wrap input{
        appearance:none;
        -webkit-appearance:none;
        width:18px;
        height:18px;
        display:inline-grid;
        place-items:center;
        border:1px solid rgba(255,255,255,.75);
        border-radius:4px;
        background:rgba(255,255,255,.04);
        box-shadow:0 0 0 1px rgba(0,0,0,.45) inset;
        cursor:pointer;
        transition:background-color .12s ease,border-color .12s ease,box-shadow .12s ease,opacity .12s ease;
        position:relative;
        }
        .mep-strategy1-cond-toggle-wrap input::after{
        content:"";
        width:6px;
        height:10px;
        border-right:2px solid #fff;
        border-bottom:2px solid #fff;
        transform:rotate(45deg) scale(0);
        transform-origin:center;
        transition:transform .12s ease;
        }
        .mep-strategy1-cond-toggle-wrap input:checked{
        background:#00e51f;
        border-color:#00e51f;
        box-shadow:0 0 0 1px rgba(0,0,0,.2) inset,0 0 8px rgba(0,229,31,.28);
        }
        .mep-strategy1-cond-toggle-wrap input:checked::after{
        transform:rotate(45deg) scale(1);
        }
        .mep-strategy1-cond-toggle-wrap input:disabled{
        opacity:.48;
        border-color:rgba(255,255,255,.55);
        background:rgba(255,255,255,.03);
        cursor:not-allowed;
        }
        .mep-strategy1-cond-toggle-txt{
        color:rgba(231,237,246,.92);
        font-size:11px;
        letter-spacing:.15px;
        }
        .mep-strategy1-cond-text{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#f5f8fc;}
        .mep-strategy1-cond-control{
        display:inline-flex;
        align-items:center;
        min-width:0;
        }
        .mep-strategy1-cond-title{display:inline-block;min-width:46px;}
        .mep-strategy1-cond-inline{display:inline-block;margin:0 6px 0 2px;color:#f5f8fc;}
        .mep-strategy1-cond-threshold{
        width:56px;
        height:24px;
        background:rgba(255,255,255,.16);
        border:1px solid rgba(255,255,255,.42);
        color:#fff;
        text-align:center;
        }
        .mep-strategy1-cond-vector-mode{
        width:150px;
        min-width:92px;
        height:24px;
        padding:0 14px 0 4px;
        appearance:auto;
        -webkit-appearance:menulist;
        background:rgba(255,255,255,.16);
        border:1px solid rgba(255,255,255,.42);
        color:#fff;
        cursor:pointer;
        position:relative;
        z-index:3;
        pointer-events:auto;
        }
        .mep-strategy1-cond-vector-mode option{
        color:#111;
        background:#fff;
        }
        .mep-strategy1-cond-current{color:#ffd98f;text-align:right;justify-self:end;padding-right:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .mep-strategy1-cond-result{text-align:right;font-weight:700;white-space:nowrap;}
        .mep-strategy1-cond-result.is-true{color:#00ff57;}
        .mep-strategy1-cond-result.is-false{color:#ff6f9f;}
        .mep-strategy1-cond-result.is-idle{color:#a9b2bc;}
        .mep-strategy1-toggle{
        position:relative;
        width:44px;
        height:24px;
        display:inline-flex;
        }
        .mep-strategy1-toggle input{position:absolute;opacity:0;pointer-events:none;}
        .mep-strategy1-toggle-ui{
        width:44px;height:24px;border-radius:999px;border:1px solid rgba(255,255,255,.95);background:#080808;position:relative;
        }
        .mep-strategy1-toggle-ui::after{
        content:"";position:absolute;top:1px;left:1px;width:20px;height:20px;border-radius:50%;background:#ff1717;transition:transform .18s ease,background .18s ease;
        }
        .mep-strategy1-toggle input:checked + .mep-strategy1-toggle-ui::after{transform:translateX(20px);background:#00ff00;}
        .mep-strategy1-toggle input:disabled + .mep-strategy1-toggle-ui,
        .mep-strategy2-toggle input:disabled + .mep-strategy2-toggle-ui{
        opacity:.45;
        cursor:not-allowed;
        }
        .mep-strategy1-control-divider{
        width:1px;
        height:40px;
        background:rgba(255,255,255,.82);
        transform:scaleY(.65);
        }
        #${PANEL_ID} .mep-game-tab-btn.mep-strategy2-tab-live,
        #${PANEL_ID} .mep-game-tab-btn.mep-strategy2-tab-live.is-active,
        #${PANEL_ID} .mep-game-tab-btn.mep-strategy2-tab-live:hover{
        background:#00e51f !important;
        color:#021007 !important;
        border-color:rgba(2,16,7,.82) !important;
        box-shadow:0 0 0 1px rgba(255,255,255,.35) inset, 0 0 12px rgba(0,229,31,.45);
        }
        .mep-strategy2-minimal-root{
        display:flex;
        flex-direction:column;
        gap:5px;
        }
        .mep-strategy2-info-bar{
        height:24px;
        background:rgba(146,146,146,.9);
        color:#fff;
        display:flex;
        align-items:center;
        overflow:hidden;
        padding:0 8px;
        box-sizing:border-box;
        }
        .mep-strategy2-info-track{
        width:100%;
        overflow:hidden;
        white-space:nowrap;
        }
        .mep-strategy2-info-ticker{
        display:inline-block;
        will-change:transform;
        transform:translateX(0);
        font-size:12px;
        line-height:1;
        }
        .mep-strategy2-info-ticker.is-running{
        animation:mepS1Ticker var(--mep-s1-ticker-duration,3200ms) linear 1 forwards;
        }
        .mep-strategy2-control-row{
        display:flex;
        align-items:center;
        gap:10px;
        padding:8px 10px 0;
        }
        .mep-strategy2-control-label,.mep-strategy2-work-timer{
        color:#f4f7fb;
        font-size:18px;
        line-height:1;
        white-space:nowrap;
        }
        .mep-strategy2-right-meta{
        margin-left:auto;
        display:inline-flex;
        align-items:center;
        justify-content:space-between;
        gap:8px;
        flex:1 1 auto;
        min-width:0;
        }
        .mep-strategy2-current-date{
        color:rgba(240,246,255,.9);
        font-size:13px;
        line-height:1;
        white-space:nowrap;
        overflow:hidden;
        text-overflow:ellipsis;
        }
        .mep-strategy2-current-time{
        color:#f7e7a2;
        font-size:13px;
        line-height:1;
        white-space:nowrap;
        flex:0 0 auto;
        }
        .mep-strategy2-work-timer{
        font-size:13px;
        line-height:1;
        white-space:nowrap;
        flex:0 0 auto;
        }
        .mep-strategy2-work-timer.is-active{color:#00ff57;}
        .mep-strategy2-work-timer.is-inactive{color:#8f9aa8;}
        .mep-strategy2-balance-row{
        margin-top:8px;
        display:flex;
        align-items:center;
        gap:6px;
        border-top:1px dashed rgba(255,255,255,.28);
        border-bottom:1px dashed rgba(255,255,255,.28);
        padding:6px 10px;
        font-size:12px;
        min-width:0;
        overflow:hidden;
        flex-wrap:nowrap;
        }
        .mep-strategy2-coin-icon svg{width:18px;height:18px;display:block;}
        .mep-strategy2-start-balance{color:#9aa3ad;max-width:82px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .mep-strategy2-current-balance{color:#fff;font-weight:700;max-width:96px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .mep-strategy2-balance-divider,
        .mep-strategy2-start-divider{width:1px;height:24px;background:rgba(255,255,255,.65);}
        .mep-strategy2-pnl.is-pos{color:#00ff57;}
        .mep-strategy2-pnl.is-neg{color:#ff6f9f;}
        .mep-strategy2-pnl.is-neutral{color:#a9b2bc;}
        .mep-strategy2-pnl{max-width:56px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .mep-strategy2-risk-amount{color:#d7dde5;cursor:pointer;max-width:92px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .mep-strategy2-risk-percent{width:36px;height:24px;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.4);color:#fff;text-align:center;}
        .mep-strategy2-risk-percent-sign{font-size:48px;transform:scale(.26);transform-origin:left center;color:#fff;}
        .mep-strategy2-toggle{
        position:relative;
        width:44px;
        height:24px;
        display:inline-flex;
        }
        .mep-strategy2-toggle input{position:absolute;opacity:0;pointer-events:none;}
        .mep-strategy2-toggle-ui{
        width:44px;height:24px;border-radius:999px;border:1px solid rgba(255,255,255,.95);background:#080808;position:relative;
        }
        .mep-strategy2-toggle-ui::after{
        content:"";position:absolute;top:1px;left:1px;width:20px;height:20px;border-radius:50%;background:#ff1717;transition:transform .18s ease,background .18s ease;
        }
        .mep-strategy2-toggle input:checked + .mep-strategy2-toggle-ui::after{transform:translateX(20px);background:#00ff00;}
        .mep-strategy2-control-divider{
        width:1px;
        height:40px;
        background:rgba(255,255,255,.82);
        transform:scaleY(.65);
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
            gamePhase: typeof MEP.gamePhase === "string" ? MEP.gamePhase : "",
            maxItems: MEP.maxItems ?? MEP.Config.MAX_ITEMS_DEFAULT,
            graphMax: typeof MEP.graphMax === "number" ? MEP.graphMax : 10,
            graphDensity: typeof MEP.graphDensity === "number" ? MEP.graphDensity : 100,
            stakeGraphDensity: typeof MEP.stakeGraphDensity === "number" ? MEP.stakeGraphDensity : 81,
            stakeGraphDensitySync: !!MEP.stakeGraphDensitySync,
            stakeGraphAutoHeight: !!MEP.stakeGraphAutoHeight,
            stakeGraphPlayersScale: typeof MEP.stakeGraphPlayersScale === "number" ? MEP.stakeGraphPlayersScale : 1,
            stakeGraphBetScale: typeof MEP.stakeGraphBetScale === "number" ? MEP.stakeGraphBetScale : 10,
            stakeGraphPlayersColor: typeof MEP.stakeGraphPlayersColor === "string" ? MEP.stakeGraphPlayersColor : "#52d56a",
            stakeGraphBetColor: typeof MEP.stakeGraphBetColor === "string" ? MEP.stakeGraphBetColor : "#ffad3c",
            stakeGraphShowPlayers: ("stakeGraphShowPlayers" in MEP) ? !!MEP.stakeGraphShowPlayers : true,
            stakeGraphShowBet: ("stakeGraphShowBet" in MEP) ? !!MEP.stakeGraphShowBet : true,
            stakePlayersVectorEnabled: ("stakePlayersVectorEnabled" in MEP) ? !!MEP.stakePlayersVectorEnabled : true,
            stakePlayersVectorPeriod: typeof MEP.stakePlayersVectorPeriod === "number" ? MEP.stakePlayersVectorPeriod : 9,
            stakePlayersVectorPhaseShift: typeof MEP.stakePlayersVectorPhaseShift === "number" ? MEP.stakePlayersVectorPhaseShift : 3,
            stakePlayersVectorFlatEpsilon: typeof MEP.stakePlayersVectorFlatEpsilon === "number" ? MEP.stakePlayersVectorFlatEpsilon : 0.15,
            stakePlayersVectorMainColor: typeof MEP.stakePlayersVectorMainColor === "string" ? MEP.stakePlayersVectorMainColor : "rgba(255,255,255,0.96)",
            stakePlayersVectorShiftColor: typeof MEP.stakePlayersVectorShiftColor === "string" ? MEP.stakePlayersVectorShiftColor : "rgba(80,210,255,0.92)",
            stakePlayersVectorMainWidth: typeof MEP.stakePlayersVectorMainWidth === "number" ? MEP.stakePlayersVectorMainWidth : 0.9,
            stakePlayersVectorShiftWidth: typeof MEP.stakePlayersVectorShiftWidth === "number" ? MEP.stakePlayersVectorShiftWidth : 0.7,
            stakePlayersVectorState: typeof MEP.stakePlayersVectorState === "string" ? MEP.stakePlayersVectorState : "flat",
            stakePlayersVectorSignal: typeof MEP.stakePlayersVectorSignal === "number" ? MEP.stakePlayersVectorSignal : 0,
            stakeBetVectorEnabled: ("stakeBetVectorEnabled" in MEP) ? !!MEP.stakeBetVectorEnabled : true,
            stakeBetVectorPeriod: typeof MEP.stakeBetVectorPeriod === "number" ? MEP.stakeBetVectorPeriod : 9,
            stakeBetVectorPhaseShift: typeof MEP.stakeBetVectorPhaseShift === "number" ? MEP.stakeBetVectorPhaseShift : 3,
            stakeBetVectorFlatEpsilon: typeof MEP.stakeBetVectorFlatEpsilon === "number" ? MEP.stakeBetVectorFlatEpsilon : 0.15,
            stakeBetVectorMainColor: typeof MEP.stakeBetVectorMainColor === "string" ? MEP.stakeBetVectorMainColor : "rgba(245,245,245,0.82)",
            stakeBetVectorShiftColor: typeof MEP.stakeBetVectorShiftColor === "string" ? MEP.stakeBetVectorShiftColor : "rgba(68,192,255,0.78)",
            stakeBetVectorMainWidth: typeof MEP.stakeBetVectorMainWidth === "number" ? MEP.stakeBetVectorMainWidth : 0.8,
            stakeBetVectorShiftWidth: typeof MEP.stakeBetVectorShiftWidth === "number" ? MEP.stakeBetVectorShiftWidth : 0.65,
            stakeBetVectorState: typeof MEP.stakeBetVectorState === "string" ? MEP.stakeBetVectorState : "flat",
            stakeBetVectorSignal: typeof MEP.stakeBetVectorSignal === "number" ? MEP.stakeBetVectorSignal : 0,
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
            trackingCollapsed: !!MEP.trackingCollapsed,

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

            // streak: сколько последних ЗАВЕРШЕННЫХ значений подряд < threshold
            countStreakLT(threshold) {
                const t = Number.parseFloat(String(threshold).replace(",", "."));
                if (!Number.isFinite(t)) return 0;

                const toRoundX = (entry) => {
                    if (entry && typeof entry === "object" && !Array.isArray(entry)) {
                        if (typeof entry.x === "number" && Number.isFinite(entry.x)) return entry.x;
                        if (typeof entry.val === "number" && Number.isFinite(entry.val)) return entry.val;
                        if (typeof entry.raw === "string") return MEP.Utils.cleanToNum(entry.raw);
                    }
                    if (typeof entry === "number" && Number.isFinite(entry)) return entry;
                    return MEP.Utils.cleanToNum(entry);
                };

                let streak = 0;
                for (let i = 0; i < MEP.State.list.length; i++) {
                    const n = toRoundX(MEP.State.list[i]);
                    if (!Number.isFinite(n)) break;
                    if (n < t) streak++;
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

            _calcEMA(values, period) {
                const p = Math.max(1, Math.floor(Number(period) || 1));
                if (!Array.isArray(values) || !values.length) return [];
                const out = new Array(values.length).fill(null);
                let prev = null;
                const k = 2 / (p + 1);
                for (let i = 0; i < values.length; i++) {
                    const v = Number(values[i]);
                    if (!Number.isFinite(v)) continue;
                    if (prev === null) prev = v;
                    else prev = v * k + prev * (1 - k);
                    out[i] = prev;
                }
                return out;
            },

            _buildVectorSeries(values, opts = {}) {
                const src = this._toFiniteArray(values);
                if (!src.length) return { main: [], shifted: [] };
                const period = Math.max(1, Math.floor(Number(opts.period) || 1));
                const phaseShift = Math.max(1, Math.floor(Number(opts.phaseShift) || 1));
                const visibleLen = Math.max(1, Math.floor(Number(opts.visibleLen) || src.length));
                const visStart = Math.max(0, src.length - visibleLen);
                const warmup = Math.max(period * 3, phaseShift + period + 10);
                const extStart = Math.max(0, visStart - warmup);
                const ext = src.slice(extStart);
                const ema = this._calcEMA(ext, period);
                const shifted = ema.map((v, i) => (i - phaseShift >= 0 ? ema[i - phaseShift] : null));
                const clipOffset = visStart - extStart;
                return {
                    main: ema.slice(clipOffset),
                    shifted: shifted.slice(clipOffset),
                };
            },

            _updateStakeVectorState(mainEMA, shiftedEMA, kind) {
                const lastMain = (() => {
                    for (let i = mainEMA.length - 1; i >= 0; i--) if (Number.isFinite(mainEMA[i])) return Number(mainEMA[i]);
                    return null;
                })();
                const lastShift = (() => {
                    for (let i = shiftedEMA.length - 1; i >= 0; i--) if (Number.isFinite(shiftedEMA[i])) return Number(shiftedEMA[i]);
                    return null;
                })();
                const signal = Number.isFinite(lastMain) && Number.isFinite(lastShift) ? lastMain - lastShift : 0;
                const eps =
                    kind === "players"
                        ? Math.max(0, Number(MEP.State.stakePlayersVectorFlatEpsilon) || 0)
                        : Math.max(0, Number(MEP.State.stakeBetVectorFlatEpsilon) || 0);
                const state = signal > eps ? "up" : signal < -eps ? "down" : "flat";
                if (kind === "players") {
                    MEP.State.stakePlayersVectorSignal = signal;
                    MEP.State.stakePlayersVectorState = state;
                } else {
                    MEP.State.stakeBetVectorSignal = signal;
                    MEP.State.stakeBetVectorState = state;
                }
            },

            _buildVectorPoints(values, totalStages, yMax, vbW, vbH, autoHeight = false) {
                if (!Array.isArray(values) || !values.length || totalStages <= 0 || yMax <= 0) return [];
                const out = [];
                const stepX = totalStages <= 1 ? 0 : vbW / (totalStages - 1);
                const startStage = Math.max(0, totalStages - values.length);
                const finiteVals = values.filter((v) => Number.isFinite(v));
                const sMin = finiteVals.length ? Math.min(...finiteVals) : 0;
                const sMax = finiteVals.length ? Math.max(...finiteVals) : 0;
                for (let i = 0; i < values.length; i++) {
                    const v = Number(values[i]);
                    if (!Number.isFinite(v)) continue;
                    const stage = startStage + i;
                    const x = stepX * stage;
                    let y = 0;
                    if (autoHeight) {
                        if (sMax === sMin) y = vbH / 2;
                        else y = 1 + ((sMax - v) / (sMax - sMin)) * (vbH - 2);
                    } else {
                        y = vbH - (v / yMax) * (vbH - 2) - 1;
                    }
                    out.push({ stage, x, y: Math.max(1, Math.min(vbH - 1, y)), value: v });
                }
                return out;
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
                const playersLineColor = (MEP.State.stakeGraphPlayersColor || "#52d56a").toString();
                const betLineColor = (MEP.State.stakeGraphBetColor || "#ffad3c").toString();
                if (ui.stakeLegendPlayersLine) ui.stakeLegendPlayersLine.style.background = playersLineColor;
                if (ui.stakeLegendBetLine) ui.stakeLegendBetLine.style.background = betLineColor;
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

                const visibleLen = stageCount;
                const playersMainRaw = this._buildVectorSeries(playersRaw, {
                    period: MEP.State.stakePlayersVectorPeriod,
                    phaseShift: MEP.State.stakePlayersVectorPhaseShift,
                    visibleLen,
                });
                const betMainRaw = this._buildVectorSeries(betsRealRaw, {
                    period: MEP.State.stakeBetVectorPeriod,
                    phaseShift: MEP.State.stakeBetVectorPhaseShift,
                    visibleLen,
                });
                this._updateStakeVectorState(playersMainRaw.main, playersMainRaw.shifted, "players");
                this._updateStakeVectorState(betMainRaw.main, betMainRaw.shifted, "bet");

                const leftPadNullable = (arr, len) => {
                    const base = Array.isArray(arr) ? arr.slice(-len) : [];
                    if (base.length >= len) return base;
                    return new Array(len - base.length).fill(null).concat(base);
                };
                const playersMainScaled = leftPadNullable(playersMainRaw.main, stageCount).map((v) =>
                    Number.isFinite(v) ? v * playersScale : null
                );
                const playersShiftScaled = leftPadNullable(playersMainRaw.shifted, stageCount).map((v) =>
                    Number.isFinite(v) ? v * playersScale : null
                );
                const betMainScaled = leftPadNullable(betMainRaw.main, stageCount).map((v) =>
                    Number.isFinite(v) ? v * betScale : null
                );
                const betShiftScaled = leftPadNullable(betMainRaw.shifted, stageCount).map((v) =>
                    Number.isFinite(v) ? v * betScale : null
                );
                const playersMainPts = this._buildVectorPoints(playersMainScaled, stageCount, yMax, vbW, vbH, autoHeight);
                const playersShiftPts = this._buildVectorPoints(playersShiftScaled, stageCount, yMax, vbW, vbH, autoHeight);
                const betMainPts = this._buildVectorPoints(betMainScaled, stageCount, yMax, vbW, vbH, autoHeight);
                const betShiftPts = this._buildVectorPoints(betShiftScaled, stageCount, yMax, vbW, vbH, autoHeight);

                const makePolyline = (pts, color, width = 0.55) => {
                    if (!pts.length) return;
                    const pl = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
                    pl.setAttribute("points", pts.map((p) => `${p.x},${p.y}`).join(" "));
                    pl.setAttribute("fill", "none");
                    pl.setAttribute("stroke", color);
                    pl.setAttribute("stroke-width", String(width));
                    pl.setAttribute("stroke-linejoin", "round");
                    pl.setAttribute("stroke-linecap", "round");
                    pl.setAttribute("pointer-events", "none");
                    svg.appendChild(pl);
                };

                if (showPlayers) makePolyline(playersPts, playersLineColor);
                if (showBet) makePolyline(betsPts, betLineColor);
                const renderPlayersVectors = showPlayers && MEP.State.stakePlayersVectorEnabled;
                const renderBetVectors = showBet && MEP.State.stakeBetVectorEnabled;
                if (renderPlayersVectors) {
                    makePolyline(
                        playersMainPts,
                        (MEP.State.stakePlayersVectorMainColor || "rgba(255,255,255,0.96)").toString(),
                        Number(MEP.State.stakePlayersVectorMainWidth) || 0.9
                    );
                    const shiftPl = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
                    if (playersShiftPts.length) {
                        shiftPl.setAttribute("points", playersShiftPts.map((p) => `${p.x},${p.y}`).join(" "));
                        shiftPl.setAttribute("fill", "none");
                        shiftPl.setAttribute("stroke", (MEP.State.stakePlayersVectorShiftColor || "rgba(80,210,255,0.92)").toString());
                        shiftPl.setAttribute("stroke-width", String(Number(MEP.State.stakePlayersVectorShiftWidth) || 0.7));
                        shiftPl.setAttribute("stroke-linejoin", "round");
                        shiftPl.setAttribute("stroke-linecap", "round");
                        shiftPl.setAttribute("pointer-events", "none");
                        svg.appendChild(shiftPl);
                    }
                }
                if (renderBetVectors) {
                    const mainPl = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
                    if (betMainPts.length) {
                        mainPl.setAttribute("points", betMainPts.map((p) => `${p.x},${p.y}`).join(" "));
                        mainPl.setAttribute("fill", "none");
                        mainPl.setAttribute("stroke", (MEP.State.stakeBetVectorMainColor || "rgba(245,245,245,0.82)").toString());
                        mainPl.setAttribute("stroke-width", String(Number(MEP.State.stakeBetVectorMainWidth) || 0.8));
                        mainPl.setAttribute("stroke-linejoin", "round");
                        mainPl.setAttribute("stroke-linecap", "round");
                        mainPl.setAttribute("pointer-events", "none");
                        svg.appendChild(mainPl);
                    }
                    const shiftPl = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
                    if (betShiftPts.length) {
                        shiftPl.setAttribute("points", betShiftPts.map((p) => `${p.x},${p.y}`).join(" "));
                        shiftPl.setAttribute("fill", "none");
                        shiftPl.setAttribute("stroke", (MEP.State.stakeBetVectorShiftColor || "rgba(68,192,255,0.78)").toString());
                        shiftPl.setAttribute("stroke-width", String(Number(MEP.State.stakeBetVectorShiftWidth) || 0.65));
                        shiftPl.setAttribute("stroke-linejoin", "round");
                        shiftPl.setAttribute("stroke-linecap", "round");
                        shiftPl.setAttribute("pointer-events", "none");
                        svg.appendChild(shiftPl);
                    }
                }

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
                MEP.Strategy1?.updateUiCounters?.();
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
                CHARTER_BLOCKED: "charter_blocked",
            },
            EVENT_CODES: {
                CYCLE_STARTED: "cycle_started",
                CYCLE_FINISHED_PROFIT: "cycle_finished_profit",
                CYCLE_FINISHED_MAX_LOSSES: "cycle_finished_max_losses",
                CYCLE_FINISHED_MANUAL: "cycle_finished_manual",
                CYCLE_FINISHED_HARD_EXIT: "cycle_finished_hard_exit",
                MANUAL_PAUSE_ON: "manual_pause_on",
                MANUAL_PAUSE_OFF: "manual_pause_off",
                WAITING_RECOVERY_ON: "waiting_recovery_on",
                WAITING_RECOVERY_OFF: "waiting_recovery_off",
                WAITING_RECOVERY_REACHED: "waiting_recovery_reached",
                CHARTER_BLOCKED: "charter_blocked",
                BET_ALLOWED: "bet_allowed",
                BET_DENIED: "bet_denied",
                BRANCH_FIRST: "branch_first",
                BRANCH_SECOND: "branch_second",
                FIRST_BRANCH_PASS: "first_branch_pass",
                FIRST_BRANCH_FAIL: "first_branch_fail",
                SECOND_BRANCH_PASS: "second_branch_pass",
                SECOND_BRANCH_FAIL: "second_branch_fail",
                SECOND_BRANCH_SHOULD_END: "second_branch_should_end",
                ROUND_WIN: "round_win",
                ROUND_LOSS: "round_loss",
                ROUND_UNKNOWN: "round_unknown",
                NEW_CYCLE_STARTED: "new_cycle_started",
                EXECUTION_STARTED: "execution_started",
                EXECUTION_REJECTED: "execution_rejected",
                EXECUTION_ROUND_WAIT: "execution_round_wait",
                EXECUTION_ROUND_PROCESSED: "execution_round_processed",
                EXECUTION_TIMEOUT: "execution_timeout",
            },

            getState() {
                return MEP.State?.strategies?.strategy1 || null;
            },

            ensureConditionBlocks(st = null, branch = "plus") {
                const state = st || this.getState();
                if (!state) return buildStrategy1ConditionBlocksDefault();
                const cfg = state.config && typeof state.config === "object" ? state.config : (state.config = {});
                const d = buildStrategy1ConditionBlocksDefault();
                const dMinus = buildStrategy1ConditionBlocksDisabledDefault();
                const legacySrc = cfg.conditionBlocks && typeof cfg.conditionBlocks === "object" ? cfg.conditionBlocks : {};
                const key = (branch || "").toString().trim().toLowerCase() === "minus" ? "minus" : "plus";
                const toBool = (v, fallback) => (v === undefined ? !!fallback : !!v);
                const toThreshold = (v) => {
                    const n = Math.floor(Number(v));
                    return Number.isFinite(n) ? Math.max(0, n) : 3;
                };
                const toFrequencyLineThreshold = (v) => {
                    const n = Math.floor(Number(v));
                    return Number.isFinite(n) ? Math.max(0, n) : 3;
                };
                const toStakeLineThreshold = (v) => {
                    const n = Number(v);
                    return Number.isFinite(n) ? Math.max(0, n) : 300;
                };
                const toMode = (v) => {
                    const m = (v ?? "gt").toString().trim().toLowerCase();
                    return m === "lt" || m === "flat" ? m : "gt";
                };
                const normalizeBranch = (src = {}, defaults = d) => ({
                    charter: {
                        type: "charter",
                        enabled: toBool(src?.charter?.enabled, defaults.charter.enabled),
                        label: "Устав",
                        params: {},
                    },
                    streak_lt: {
                        type: "streak_lt",
                        enabled: toBool(src?.streak_lt?.enabled, defaults.streak_lt.enabled),
                        label: "Подряд",
                        params: { threshold: toThreshold(src?.streak_lt?.params?.threshold ?? defaults.streak_lt.params.threshold) },
                    },
                    diff_vector_state: {
                        type: "diff_vector_state",
                        enabled: toBool(src?.diff_vector_state?.enabled, defaults.diff_vector_state.enabled),
                        label: "Diff",
                        params: { mode: toMode(src?.diff_vector_state?.params?.mode ?? defaults.diff_vector_state.params.mode) },
                    },
                    frequency_vector_state: {
                        type: "frequency_vector_state",
                        enabled: toBool(src?.frequency_vector_state?.enabled, defaults.frequency_vector_state.enabled),
                        label: "Freq",
                        params: { mode: toMode(src?.frequency_vector_state?.params?.mode ?? defaults.frequency_vector_state.params.mode) },
                    },
                    frequency_line_gt: {
                        type: "frequency_line_gt",
                        enabled: toBool(src?.frequency_line_gt?.enabled, defaults.frequency_line_gt.enabled),
                        label: "FreqL",
                        params: { threshold: toFrequencyLineThreshold(src?.frequency_line_gt?.params?.threshold ?? defaults.frequency_line_gt.params.threshold) },
                    },
                    stake_players_vector_state: {
                        type: "stake_players_vector_state",
                        enabled: toBool(src?.stake_players_vector_state?.enabled, defaults.stake_players_vector_state.enabled),
                        label: "Clients",
                        params: { mode: toMode(src?.stake_players_vector_state?.params?.mode ?? defaults.stake_players_vector_state.params.mode) },
                    },
                    stake_bet_vector_state: {
                        type: "stake_bet_vector_state",
                        enabled: toBool(src?.stake_bet_vector_state?.enabled, defaults.stake_bet_vector_state.enabled),
                        label: "Bet",
                        params: { mode: toMode(src?.stake_bet_vector_state?.params?.mode ?? defaults.stake_bet_vector_state.params.mode) },
                    },
                    stake_players_line_gte: {
                        type: "stake_players_line_gte",
                        enabled: toBool(src?.stake_players_line_gte?.enabled, defaults.stake_players_line_gte.enabled),
                        label: "ClientsL",
                        params: { threshold: toStakeLineThreshold(src?.stake_players_line_gte?.params?.threshold ?? defaults.stake_players_line_gte.params.threshold) },
                    },
                    stake_bet_line_gte: {
                        type: "stake_bet_line_gte",
                        enabled: toBool(src?.stake_bet_line_gte?.enabled, defaults.stake_bet_line_gte.enabled),
                        label: "BetL",
                        params: { threshold: toStakeLineThreshold(src?.stake_bet_line_gte?.params?.threshold ?? defaults.stake_bet_line_gte.params.threshold) },
                    },
                });

                const rawBranches = cfg.conditionBranches && typeof cfg.conditionBranches === "object" ? cfg.conditionBranches : null;
                const plusRaw = rawBranches?.plus && typeof rawBranches.plus === "object" ? rawBranches.plus : legacySrc;
                const minusRaw = rawBranches?.minus && typeof rawBranches.minus === "object" ? rawBranches.minus : {};
                const plusOut = normalizeBranch(plusRaw, d);
                const minusOut = normalizeBranch(minusRaw, dMinus);
                cfg.conditionBranches = { plus: plusOut, minus: minusOut };
                cfg.conditionBlocks = plusOut;
                if (cfg.conditionSelectedBranch !== "minus") cfg.conditionSelectedBranch = "plus";
                return cfg.conditionBranches[key];
            },

            getConditionBranchPoolState(evaluated = []) {
                const active = (evaluated || []).filter((it) => it.enabled);
                const hasFalse = active.some((it) => !it.result);
                return {
                    activeCount: active.length,
                    hasFalse,
                    result: active.length > 0 ? !hasFalse : false,
                };
            },

            getRuntimeActiveBranch(st = null, plusPool = null, minusPool = null) {
                const state = st || this.getState();
                if (!state || !state.enabled) return "";
                const lossCount = Math.max(0, Math.floor(Number(state.cycle?.lossCount) || 0));
                if (lossCount === 0) return "plus";
                const route = this.routeBranch();
                if (route?.branch === "first") return "plus";
                if (route?.branch === "second") return "minus";
                if (plusPool?.result) return "plus";
                if (minusPool?.result) return "minus";
                return "minus";
            },

            getDiffVectorShortLabelByState(state = "") {
                const s = (state || "").toString().trim().toLowerCase();
                if (s === "up") return "mEMA > sEMA";
                if (s === "down") return "mEMA < sEMA";
                return "flat";
            },

            getDiffVectorShortLabelByMode(mode = "") {
                const m = (mode || "").toString().trim().toLowerCase();
                if (m === "lt") return "mEMA < sEMA";
                if (m === "flat") return "flat";
                return "mEMA > sEMA";
            },

            getFrequencyVectorShortLabelByState(state = "") {
                const s = (state || "").toString().trim().toLowerCase();
                if (s === "up") return "mEMA > sEMA";
                if (s === "down") return "mEMA < sEMA";
                return "flat";
            },

            getFrequencyVectorShortLabelByMode(mode = "") {
                const m = (mode || "").toString().trim().toLowerCase();
                if (m === "lt") return "mEMA < sEMA";
                if (m === "flat") return "flat";
                return "mEMA > sEMA";
            },

            getStakePlayersVectorShortLabelByState(state = "") {
                const s = (state || "").toString().trim().toLowerCase();
                if (s === "up") return "mEMA > sEMA";
                if (s === "down") return "mEMA < sEMA";
                return "flat";
            },

            getStakePlayersVectorShortLabelByMode(mode = "") {
                const m = (mode || "").toString().trim().toLowerCase();
                if (m === "lt") return "mEMA < sEMA";
                if (m === "flat") return "flat";
                return "mEMA > sEMA";
            },

            getStakeBetVectorShortLabelByState(state = "") {
                const s = (state || "").toString().trim().toLowerCase();
                if (s === "up") return "mEMA > sEMA";
                if (s === "down") return "mEMA < sEMA";
                return "flat";
            },

            getStakeBetVectorShortLabelByMode(mode = "") {
                const m = (mode || "").toString().trim().toLowerCase();
                if (m === "lt") return "mEMA < sEMA";
                if (m === "flat") return "flat";
                return "mEMA > sEMA";
            },

            getCurrentFrequencyValue() {
                const graph = MEP.FrequencyGraph;
                if (!graph || typeof graph._toOldestFirstNumbers !== "function" || typeof graph._buildSeries !== "function") return 0;
                const threshold = Math.max(0, Number(MEP.State?.frequencyThreshold) || 0);
                const period = Math.max(1, Math.floor(Number(MEP.State?.frequencyPeriod) || 1));
                const oldestFirst = graph._toOldestFirstNumbers();
                const fullSeries = graph._buildSeries(oldestFirst, threshold, period);
                const last = fullSeries.length ? Number(fullSeries[fullSeries.length - 1]) : 0;
                return Number.isFinite(last) ? last : 0;
            },

            getCurrentStakePlayersValue() {
                const src = Array.isArray(MEP.State?.roundPlayersCountHistory) ? MEP.State.roundPlayersCountHistory : [];
                for (let i = src.length - 1; i >= 0; i--) {
                    const n = Number(src[i]);
                    if (Number.isFinite(n)) return n;
                }
                return 0;
            },

            getCurrentStakeBetValue() {
                const src = Array.isArray(MEP.State?.roundBetSumHistory) ? MEP.State.roundBetSumHistory : [];
                for (let i = src.length - 1; i >= 0; i--) {
                    const n = Number(src[i]);
                    if (Number.isFinite(n)) return n;
                }
                return 0;
            },

            evaluateConditionBlocks(st = null, branch = "plus") {
                const state = st || this.getState();
                const blocks = this.ensureConditionBlocks(state, branch);
                const out = [];

                const strategyEnabled = !!state?.enabled;
                out.push({
                    key: "strategy_enabled",
                    enabled: true,
                    currentValue: strategyEnabled ? "on" : "off",
                    result: strategyEnabled,
                });

                const charterAllowed = state?.charterCheck?.allowed !== false;
                out.push({
                    key: "charter",
                    enabled: !!blocks.charter.enabled,
                    currentValue: charterAllowed ? "allowed" : "blocked",
                    result: !!charterAllowed,
                });

                const threshold = Math.max(0, Math.floor(Number(blocks?.streak_lt?.params?.threshold) || 0));
                const streakValue = MEP.Utils.countStreakLT(Math.max(0, threshold || 0));
                out.push({
                    key: "streak_lt",
                    enabled: !!blocks.streak_lt.enabled,
                    currentValue: Number.isFinite(streakValue) ? streakValue : 0,
                    result: Number.isFinite(streakValue) ? streakValue >= threshold : false,
                });

                const mode = (blocks?.diff_vector_state?.params?.mode || "gt").toString();
                const diffState = (MEP.State?.diffVectorState || "flat").toString().trim().toLowerCase();
                const diffResult = mode === "lt" ? diffState === "down" : mode === "flat" ? diffState === "flat" : diffState === "up";
                out.push({
                    key: "diff_vector_state",
                    enabled: !!blocks.diff_vector_state.enabled,
                    currentValue: this.getDiffVectorShortLabelByState(diffState),
                    result: !!diffResult,
                });

                const freqMode = (blocks?.frequency_vector_state?.params?.mode || "gt").toString();
                const freqState = (MEP.State?.frequencyVectorState || "flat").toString().trim().toLowerCase();
                const freqResult = freqMode === "lt" ? freqState === "down" : freqMode === "flat" ? freqState === "flat" : freqState === "up";
                out.push({
                    key: "frequency_vector_state",
                    enabled: !!blocks.frequency_vector_state.enabled,
                    currentValue: this.getFrequencyVectorShortLabelByState(freqState),
                    result: !!freqResult,
                });

                const frequencyValue = this.getCurrentFrequencyValue();
                const frequencyLineThreshold = Math.max(0, Math.floor(Number(blocks?.frequency_line_gt?.params?.threshold) || 0));
                out.push({
                    key: "frequency_line_gt",
                    enabled: !!blocks.frequency_line_gt.enabled,
                    currentValue: frequencyValue,
                    result: frequencyValue > frequencyLineThreshold,
                    resultText: `${frequencyValue} > ${frequencyLineThreshold}`,
                });

                const stakePlayersMode = (blocks?.stake_players_vector_state?.params?.mode || "gt").toString();
                const stakePlayersState = (MEP.State?.stakePlayersVectorState || "flat").toString().trim().toLowerCase();
                const stakePlayersResult =
                    stakePlayersMode === "lt" ? stakePlayersState === "down" : stakePlayersMode === "flat" ? stakePlayersState === "flat" : stakePlayersState === "up";
                out.push({
                    key: "stake_players_vector_state",
                    enabled: !!blocks.stake_players_vector_state.enabled,
                    currentValue: this.getStakePlayersVectorShortLabelByState(stakePlayersState),
                    result: !!stakePlayersResult,
                });

                const stakeBetMode = (blocks?.stake_bet_vector_state?.params?.mode || "gt").toString();
                const stakeBetState = (MEP.State?.stakeBetVectorState || "flat").toString().trim().toLowerCase();
                const stakeBetResult =
                    stakeBetMode === "lt" ? stakeBetState === "down" : stakeBetMode === "flat" ? stakeBetState === "flat" : stakeBetState === "up";
                out.push({
                    key: "stake_bet_vector_state",
                    enabled: !!blocks.stake_bet_vector_state.enabled,
                    currentValue: this.getStakeBetVectorShortLabelByState(stakeBetState),
                    result: !!stakeBetResult,
                });

                const currentPlayers = this.getCurrentStakePlayersValue();
                const playersThreshold = Math.max(0, Number(blocks?.stake_players_line_gte?.params?.threshold) || 0);
                out.push({
                    key: "stake_players_line_gte",
                    enabled: !!blocks.stake_players_line_gte.enabled,
                    currentValue: currentPlayers,
                    result: currentPlayers >= playersThreshold,
                    resultText: `${currentPlayers} >= ${playersThreshold}`,
                });

                const currentBet = this.getCurrentStakeBetValue();
                const betThreshold = Math.max(0, Number(blocks?.stake_bet_line_gte?.params?.threshold) || 0);
                out.push({
                    key: "stake_bet_line_gte",
                    enabled: !!blocks.stake_bet_line_gte.enabled,
                    currentValue: currentBet,
                    result: currentBet >= betThreshold,
                    resultText: `${currentBet} >= ${betThreshold}`,
                });

                return out;
            },

            pushSystemMessage(input = {}) {
                const st = this.getState();
                if (!st) return null;
                if (!Array.isArray(st.runtime.systemMessages)) st.runtime.systemMessages = [];
                const msg = input && typeof input === "object" ? input : {};
                const out = {
                    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                    ts: Date.now(),
                    level: ["info", "ok", "warn", "error"].includes(msg.level) ? msg.level : "info",
                    source: "strategy1",
                    action: (msg.action || "").toString(),
                    text: (msg.text || "").toString(),
                    code: (msg.code || "").toString(),
                    stage: (msg.stage || "").toString(),
                    reason: (msg.reason || "").toString(),
                    branch: (msg.branch || "").toString(),
                    payload: msg.payload && typeof msg.payload === "object" ? { ...msg.payload } : {},
                };
                st.runtime.systemMessages.push(out);
                const maxLen = 30;
                if (st.runtime.systemMessages.length > maxLen) {
                    st.runtime.systemMessages.splice(0, st.runtime.systemMessages.length - maxLen);
                }
                st.runtime.lastActionResponse = {
                    action: out.action,
                    code: out.code,
                    stage: out.stage,
                    reason: out.reason,
                    branch: out.branch,
                    ts: out.ts,
                    level: out.level,
                };
                MEP.UI?.setStrategy1InfoMessage?.((out.text || "Событие стратегии").toString());
                return out;
            },

            clearSystemMessages() {
                const st = this.getState();
                if (!st) return;
                st.runtime.systemMessages = [];
                this.updateUiCounters();
            },

            formatSystemMessageText(action = "", data = {}) {
                const a = (action || "").toString();
                if (a === "startCycle") return data.applied ? "Старт цикла выполнен" : "Старт цикла пропущен";
                if (a === "finishCycle") return data.applied ? "Цикл завершён вручную" : "Завершение цикла пропущено";
                if (a === "resetCycle") return "Состояние цикла сброшено";
                if (a === "pauseCycle")
                    return data.applied ? "Цикл поставлен на ручную паузу" : "Пауза не применена";
                if (a === "resumeCycle")
                    return data.applied ? "Ручная пауза снята" : "Продолжение не применено: пауза не активна";
                if (a === "enterWaitingBalanceRecovery")
                    return data.applied
                        ? "Включён режим ожидания восстановления баланса"
                        : "Режим ожидания не включён";
                if (a === "exitWaitingBalanceRecovery")
                    return data.applied
                        ? "Режим ожидания восстановления баланса отключён"
                        : "Режим ожидания не выключен";
                if (a === "evaluateBetPermission")
                    return data.allowed ? "Допуск к ставке разрешён" : "Допуск к ставке отклонён";
                if (a === "buildStakePlan") return data.ready ? "План ставки готов" : "План ставки невалиден";
                if (a === "checkFirstBranch")
                    return data.passed ? "Первая ветка пройдена" : "Первая ветка не пройдена";
                if (a === "checkSecondBranch")
                    return data.passed ? "Вторая ветка пройдена" : "Вторая ветка не пройдена";
                if (a === "updateAfterRound")
                    return data.applied ? "Результат раунда обработан" : "Результат раунда пропущен";
                return "Действие выполнено";
            },

            fmtBool(v) {
                return v ? "true" : "false";
            },

            fmtText(v) {
                const t = (v ?? "").toString().trim();
                return t ? t : "—";
            },

            fmtCode(v) {
                return this.fmtText(v);
            },

            fmtNum(v, digits = 2) {
                const n = Number(v);
                if (!Number.isFinite(n)) return "—";
                if (Number.isInteger(n)) return String(n);
                return n.toFixed(digits).replace(/\.?0+$/, "");
            },

            fmtBalance(v) {
                const n = Number(v);
                if (!Number.isFinite(n)) return "—";
                return n.toFixed(8).replace(/\.?0+$/, "");
            },

            fmtTs(v) {
                const n = Number(v);
                if (!Number.isFinite(n) || n <= 0) return "—";
                const d = new Date(n);
                const hh = String(d.getHours()).padStart(2, "0");
                const mm = String(d.getMinutes()).padStart(2, "0");
                const ss = String(d.getSeconds()).padStart(2, "0");
                return `${hh}:${mm}:${ss}`;
            },

            getExecutionTimeoutMs() {
                return 45000;
            },

            isExecutionDebugEnabled() {
                const st = this.getState();
                return st?.runtime?.debugExecution !== false;
            },

            executionDebug(label = "", payload = null) {
                if (!this.isExecutionDebugEnabled()) return;
                try {
                    if (arguments.length > 1) console.debug(label, payload);
                    else console.debug(label);
                } catch (e) {}
            },

            executionWarn(label = "", payload = null) {
                if (!this.isExecutionDebugEnabled()) return;
                try {
                    if (arguments.length > 1) console.warn(label, payload);
                    else console.warn(label);
                } catch (e) {}
            },

            formatDomNumber(v, fallback = "0") {
                const n = Number(v);
                if (!Number.isFinite(n) || n < 0) return fallback;
                const raw = n.toFixed(8).replace(/\.?0+$/, "");
                return raw && raw !== "-0" ? raw : "0";
            },

            findBySelectors(selectors = [], root = null) {
                if (!Array.isArray(selectors)) return null;
                const scope = root && typeof root.querySelector === "function" ? root : document;
                for (const sel of selectors) {
                    try {
                        const el = scope.querySelector(sel);
                        if (el) return el;
                    } catch (e) {}
                }
                return null;
            },

            findSidebarRoot() {
                return (
                    document.querySelector('[data-testid="game-frame"] .game-sidebar') ||
                    document.querySelector(".game-sidebar") ||
                    null
                );
            },

            findManualTabButton(root = null) {
                const scope = root || this.findSidebarRoot();
                if (!scope) return null;
                return scope.querySelector('button[data-testid="manual-tab"]');
            },

            findBetAmountInput(root = null) {
                const scope = root || this.findSidebarRoot();
                if (!scope) return null;
                return scope.querySelector('input[data-testid="input-game-amount"]');
            },

            findTargetMultiplierInput(root = null) {
                const scope = root || this.findSidebarRoot();
                if (!scope) return null;
                return scope.querySelector('input[type="number"][min="1.01"]');
            },

            findBetButton(root = null) {
                const scope = root || this.findSidebarRoot();
                if (!scope) return null;
                return scope.querySelector('button[data-testid="bet-button"]');
            },

            readBetButtonState(btn) {
                if (!btn) {
                    return {
                        found: false,
                        disabled: true,
                        actionEnabled: false,
                        actionBet: "disabled",
                        text: "",
                        canClick: false,
                        reason: "bet_button_not_found",
                    };
                }
                const disabled = !!btn.disabled || btn.getAttribute("aria-disabled") === "true";
                const actionEnabledRaw = (btn.getAttribute("data-test-action-enabled") || "").toString().toLowerCase();
                const actionBet = (btn.getAttribute("data-test-action-bet") || "").toString().toLowerCase();
                const actionEnabled = actionEnabledRaw !== "false";
                const text = (btn.textContent || "").toString().trim();
                const textBlocksClick = /начинается/i.test(text);
                const canClick = !disabled && actionEnabled && actionBet !== "disabled" && !textBlocksClick;
                let reason = "";
                if (disabled) reason = "bet_button_disabled";
                else if (!canClick) reason = "bet_button_unavailable_state";
                return { found: true, disabled, actionEnabled, actionBet, text, canClick, reason };
            },

            async ensureManualMode(root = null) {
                const scope = root || this.findSidebarRoot();
                if (!scope) return { applied: false, reason: "sidebar_not_found" };
                const manualBtn = this.findManualTabButton(scope);
                this.executionDebug("[MEP][Strategy1][sync] manual tab found", { found: !!manualBtn });
                if (!manualBtn) return { applied: false, reason: "manual_mode_unavailable" };
                try {
                    manualBtn.click();
                } catch (e) {
                    return { applied: false, reason: "manual_mode_unavailable" };
                }
                await MEP.Utils.sleep(150);
                const amountInput = this.findBetAmountInput(scope);
                const betButton = this.findBetButton(scope);
                if (!amountInput || !betButton) return { applied: false, reason: "manual_mode_unavailable" };
                return { applied: true, reason: "" };
            },

            setNativeInputValue(el, value) {
                if (!el) return false;
                const proto = Object.getPrototypeOf(el);
                const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
                const setter = descriptor?.set;
                try {
                    el.focus?.();
                    if (typeof setter === "function") setter.call(el, value);
                    else el.value = value;
                    el.dispatchEvent(new Event("input", { bubbles: true }));
                    el.dispatchEvent(new Event("change", { bubbles: true }));
                    el.blur?.();
                    return true;
                } catch (e) {
                    return false;
                }
            },

            async syncBetInputsToDom(plan = {}) {
                const root = this.findSidebarRoot();
                this.executionDebug("[MEP][Strategy1][sync] root found", { found: !!root });
                if (!root) {
                    const out = { applied: false, reason: "sidebar_not_found", stage: "find_dom" };
                    this.executionWarn("[MEP][Strategy1][sync] result", out);
                    return out;
                }
                const manual = await this.ensureManualMode(root);
                this.executionDebug("[MEP][Strategy1][sync] manual mode ensured", manual);
                if (!manual?.applied) {
                    const out = { applied: false, reason: manual?.reason || "manual_mode_unavailable", stage: "manual_mode" };
                    this.executionWarn("[MEP][Strategy1][sync] result", out);
                    return out;
                }
                const betInput = this.findBetAmountInput(root);
                const targetInput = this.findTargetMultiplierInput(root);
                this.executionDebug("[MEP][Strategy1][sync] bet input found", { found: !!betInput });
                this.executionDebug("[MEP][Strategy1][sync] target input found", { found: !!targetInput });
                if (!betInput) {
                    const out = { applied: false, reason: "amount_input_not_found", stage: "find_dom" };
                    this.executionWarn("[MEP][Strategy1][sync] result", out);
                    return out;
                }
                if (!targetInput) {
                    const out = { applied: false, reason: "target_input_not_found", stage: "find_dom" };
                    this.executionWarn("[MEP][Strategy1][sync] result", out);
                    return out;
                }
                const betValue = this.formatDomNumber(plan?.betAmount, "0");
                const targetValue = this.formatDomNumber(plan?.targetMultiplier, "2");
                this.executionDebug("[MEP][Strategy1][sync] set values", { betValue, targetValue });
                const betOk = this.setNativeInputValue(betInput, betValue);
                if (!betOk) {
                    const out = { applied: false, reason: "bet_amount_value_not_applied", stage: "set_dom", betValue };
                    this.executionWarn("[MEP][Strategy1][sync] result", out);
                    return out;
                }
                const targetOk = this.setNativeInputValue(targetInput, targetValue);
                if (!targetOk) {
                    const out = { applied: false, reason: "target_value_not_applied", stage: "set_dom", targetValue };
                    this.executionWarn("[MEP][Strategy1][sync] result", out);
                    return out;
                }
                const betApplied = (betInput.value || "").toString().trim();
                const targetApplied = (targetInput.value || "").toString().trim();
                this.executionDebug("[MEP][Strategy1][sync] verify values", { betApplied, targetApplied });
                if (!betApplied || betApplied !== betValue) {
                    const out = { applied: false, reason: "bet_amount_value_not_applied", stage: "verify_dom", betValue, betApplied };
                    this.executionWarn("[MEP][Strategy1][sync] result", out);
                    return out;
                }
                if (!targetApplied || targetApplied !== targetValue) {
                    const out = { applied: false, reason: "target_value_not_applied", stage: "verify_dom", targetValue, targetApplied };
                    this.executionWarn("[MEP][Strategy1][sync] result", out);
                    return out;
                }
                const st = this.getState();
                if (st?.runtime) st.runtime.lastDomSyncAtTs = Date.now();
                const out = { applied: true, reason: "", stage: "dom_synced", betValue, targetValue };
                this.executionDebug("[MEP][Strategy1][sync] result", out);
                return out;
            },

            clickBetButton() {
                const root = this.findSidebarRoot();
                if (!root) {
                    const out = { applied: false, reason: "sidebar_not_found", stage: "click" };
                    this.executionWarn("[MEP][Strategy1][clickBetButton state]", { ...out, found: false });
                    return out;
                }
                const btn = this.findBetButton(root);
                const state = this.readBetButtonState(btn);
                this.executionDebug("[MEP][Strategy1][clickBetButton state]", state);
                if (!state.found) return { applied: false, reason: "bet_button_not_found", stage: "click" };
                if (state.disabled) return { applied: false, reason: "bet_button_disabled", stage: "click" };
                if (!state.canClick) return { applied: false, reason: "bet_button_unavailable_state", stage: "click" };
                try {
                    btn.click();
                    const out = { applied: true, reason: "", stage: "clicked" };
                    this.executionDebug("[MEP][Strategy1][clickBetButton result]", out);
                    return out;
                } catch (e) {
                    const out = { applied: false, reason: "dom_click_failed", stage: "click" };
                    this.executionWarn("[MEP][Strategy1][clickBetButton result]", out);
                    return out;
                }
            },

            lockExecution(reason = "execution_locked") {
                const st = this.getState();
                if (!st) return false;
                st.executionLocked = true;
                st.runtime.executionState = "awaiting_round_result";
                st.runtime.lastExecutionReason = (reason || "").toString();
                return true;
            },

            unlockExecution(reason = "execution_unlocked") {
                const st = this.getState();
                if (!st) return false;
                st.executionLocked = false;
                st.runtime.waitingRoundResult = false;
                if (st.runtime.executionState === "awaiting_round_result") st.runtime.executionState = "idle";
                st.runtime.lastExecutionReason = (reason || "").toString();
                return true;
            },

            onExecutionRejected(reason = "execution_rejected", extra = {}) {
                const st = this.getState();
                if (!st) return { applied: false, reason: "strategy1_not_found", stage: "reject" };
                this.executionWarn("[MEP][Strategy1][execution rejected]", {
                    reason: (reason || "").toString(),
                    extra: extra && typeof extra === "object" ? { ...extra } : {},
                    state: {
                        cycleIsActive: !!st.cycle?.isActive,
                        executionLocked: !!st.executionLocked,
                        permissionSnapshot: st.runtime?.lastBetPermissionResult || null,
                        planSnapshot: st.runtime?.lastStakePlanResult || null,
                    },
                });
                st.runtime.lastExecutionAtTs = Date.now();
                st.runtime.lastExecutionReason = (reason || "").toString();
                st.runtime.lastExecutionResult = "rejected";
                st.runtime.executionState = "rejected";
                this.pushSystemMessage({
                    level: "warn",
                    action: "executeBet",
                    text: `Ставка не выполнена: ${reason}`,
                    code: "execution_rejected",
                    stage: "execution",
                    reason: (reason || "").toString(),
                    payload: extra && typeof extra === "object" ? { ...extra } : {},
                });
                this.announceStateTransition("execution", this.EVENT_CODES.EXECUTION_REJECTED, {
                    reason: (reason || "").toString(),
                });
                this.updateUiCounters();
                return { applied: false, reason: (reason || "").toString(), stage: "reject" };
            },

            onExecutionAccepted(payload = {}) {
                const st = this.getState();
                if (!st) return { applied: false, reason: "strategy1_not_found", stage: "accept" };
                const p = payload && typeof payload === "object" ? payload : {};
                const now = Date.now();
                this.lockExecution("bet_sent");
                st.runtime.lastExecutionAtTs = now;
                st.runtime.lastExecutionReason = "bet_sent";
                st.runtime.lastExecutionResult = "pending";
                st.runtime.pendingBetAmount = Number(p.betAmount) || 0;
                st.runtime.pendingTargetMultiplier = Number(p.targetMultiplier) || 0;
                st.runtime.pendingExecutionPayload = {
                    betAmount: Number(p.betAmount) || 0,
                    targetMultiplier: Number(p.targetMultiplier) || 0,
                    ts: now,
                    cycleId: (st.cycle?.cycleId || "").toString(),
                    branch: (p.branch || "").toString(),
                    stepIndex: Number(st.cycle?.stepIndex) || 0,
                };
                st.runtime.lastExecutionRoundId = "";
                st.runtime.waitingRoundResult = true;
                st.cycle.lastStake = Number(p.betAmount) || 0;
                st.cycle.lastTargetMultiplier = Number(p.targetMultiplier) || 0;
                st.cycle.betCount = (Number(st.cycle.betCount) || 0) + 1;
                st.counters.lastStake = Number(p.betAmount) || 0;
                this.executionDebug("[MEP][Strategy1][execution accepted]", {
                    betAmount: Number(p.betAmount) || 0,
                    targetMultiplier: Number(p.targetMultiplier) || 0,
                    branch: (p.branch || "").toString(),
                    cycleId: (st.cycle?.cycleId || "").toString(),
                    pendingExecutionPayload: st.runtime.pendingExecutionPayload ? { ...st.runtime.pendingExecutionPayload } : null,
                    executionLocked: !!st.executionLocked,
                    waitingRoundResult: !!st.runtime.waitingRoundResult,
                    executionState: (st.runtime.executionState || "").toString(),
                });
                this.pushSystemMessage({
                    level: "ok",
                    action: "executeBet",
                    text: "Ставка отправлена в игру",
                    code: "execution_started",
                    stage: "execution",
                    reason: "bet_sent",
                    payload: { ...st.runtime.pendingExecutionPayload },
                });
                this.announceStateTransition("execution", this.EVENT_CODES.EXECUTION_STARTED, { branch: (p.branch || "").toString() });
                this.announceStateTransition("execution", this.EVENT_CODES.EXECUTION_ROUND_WAIT, {});
                this.updateUiCounters();
                return {
                    applied: true,
                    reason: "",
                    stage: "awaiting_round_result",
                    betAmount: Number(p.betAmount) || 0,
                    targetMultiplier: Number(p.targetMultiplier) || 0,
                };
            },

            executeBet() {
                const st = this.getState();
                if (this.isExecutionDebugEnabled()) {
                    try {
                        console.groupCollapsed("[MEP][Strategy1][executeBet]");
                    } catch (e) {}
                }
                if (!st) {
                    this.executionWarn("[MEP][Strategy1][executeBet guard]", { code: "strategy1_not_found" });
                    if (this.isExecutionDebugEnabled()) console.groupEnd?.();
                    return this.onExecutionRejected("strategy1_not_found");
                }
                this.executionDebug("[MEP][Strategy1][executeBet state]", {
                    enabled: !!st.enabled,
                    isExecuting: !!st.isExecuting,
                    executionLocked: !!st.executionLocked,
                    cycleIsActive: !!st.cycle?.isActive,
                    cycleId: (st.cycle?.cycleId || "").toString(),
                    cycleLossCount: Number(st.cycle?.lossCount) || 0,
                    cycleStepIndex: Number(st.cycle?.stepIndex) || 0,
                    manualPauseActive: !!st.runtime?.manualPauseActive,
                    waitingBalanceRecoveryActive: !!st.runtime?.waitingBalanceRecoveryActive,
                    waitingRoundResult: !!st.runtime?.waitingRoundResult,
                    executionState: (st.runtime?.executionState || "").toString(),
                    activeStrategyId: (MEP.State?.activeStrategyId || "").toString(),
                });
                if (st.enabled !== true) {
                    this.executionWarn("[MEP][Strategy1][executeBet guard]", { code: "strategy_disabled" });
                    if (this.isExecutionDebugEnabled()) console.groupEnd?.();
                    return this.onExecutionRejected("strategy_disabled");
                }
                if (st.executionLocked) {
                    this.executionWarn("[MEP][Strategy1][executeBet guard]", { code: "execution_locked" });
                    if (this.isExecutionDebugEnabled()) console.groupEnd?.();
                    return this.onExecutionRejected("execution_locked");
                }
                if (!st.cycle?.isActive) {
                    this.executionWarn("[MEP][Strategy1][executeBet guard]", { code: "cycle_inactive" });
                    if (this.isExecutionDebugEnabled()) console.groupEnd?.();
                    return this.onExecutionRejected("cycle_inactive");
                }
                if (st.runtime?.manualPauseActive) {
                    this.executionWarn("[MEP][Strategy1][executeBet guard]", { code: "manual_pause_active" });
                    if (this.isExecutionDebugEnabled()) console.groupEnd?.();
                    return this.onExecutionRejected("manual_pause_active");
                }
                if (st.runtime?.waitingBalanceRecoveryActive) {
                    this.executionWarn("[MEP][Strategy1][executeBet guard]", { code: "waiting_balance_recovery_active" });
                    if (this.isExecutionDebugEnabled()) console.groupEnd?.();
                    return this.onExecutionRejected("waiting_balance_recovery_active");
                }
                if (st.runtime?.waitingRoundResult) {
                    this.executionWarn("[MEP][Strategy1][executeBet guard]", { code: "waiting_round_result" });
                    if (this.isExecutionDebugEnabled()) console.groupEnd?.();
                    return this.onExecutionRejected("waiting_round_result");
                }
                if ((st.runtime?.executionState || "") === "awaiting_round_result") {
                    this.executionWarn("[MEP][Strategy1][executeBet guard]", { code: "already_executing" });
                    if (this.isExecutionDebugEnabled()) console.groupEnd?.();
                    return this.onExecutionRejected("already_executing");
                }

                const permission = this.evaluateBetPermission();
                this.executionDebug("[MEP][Strategy1][permission]", permission);
                if (!permission?.allowed) {
                    this.executionWarn("[MEP][Strategy1][permission reject]", {
                        reason: permission?.reason || "permission_denied",
                        stage: permission?.stage || "",
                        shouldEndCycle: !!permission?.shouldEndCycle,
                        branch: permission?.branch || "",
                        statusCode: permission?.statusCode || "",
                    });
                    if (this.isExecutionDebugEnabled()) console.groupEnd?.();
                    return this.onExecutionRejected(permission?.reason || "permission_denied", { stage: permission?.stage || "" });
                }
                if (permission?.shouldEndCycle) {
                    this.executionWarn("[MEP][Strategy1][permission reject]", {
                        reason: "cycle_should_end",
                        stage: permission?.stage || "",
                        shouldEndCycle: true,
                        branch: permission?.branch || "",
                        statusCode: permission?.statusCode || "",
                    });
                    if (this.isExecutionDebugEnabled()) console.groupEnd?.();
                    return this.onExecutionRejected("cycle_should_end");
                }

                const plan = this.buildStakePlan();
                this.executionDebug("[MEP][Strategy1][plan]", {
                    ready: plan?.ready,
                    invalidReason: plan?.invalidReason,
                    betAmount: plan?.betAmount,
                    targetMultiplier: plan?.targetMultiplier,
                    riskCap: plan?.riskCap,
                    maxAllowedStake: plan?.maxAllowedStake,
                    allowedByRisk: plan?.allowedByRisk,
                    calcMode: plan?.calcMode,
                    sourceStep: plan?.sourceStep,
                });
                if (!plan?.ready) {
                    this.executionWarn("[MEP][Strategy1][plan reject]", plan);
                    if (this.isExecutionDebugEnabled()) console.groupEnd?.();
                    return this.onExecutionRejected(plan?.invalidReason || "stake_plan_invalid");
                }

                const sync = this.syncBetInputsToDom(plan);
                this.executionDebug("[MEP][Strategy1][sync result raw]", sync);
                if (!sync?.applied) {
                    if (this.isExecutionDebugEnabled()) console.groupEnd?.();
                    return this.onExecutionRejected(sync?.reason || "dom_sync_failed", sync || {});
                }

                const click = this.clickBetButton();
                this.executionDebug("[MEP][Strategy1][click result]", click);
                if (!click?.applied) {
                    if (this.isExecutionDebugEnabled()) console.groupEnd?.();
                    return this.onExecutionRejected(click?.reason || "dom_click_failed", click || {});
                }

                const accepted = this.onExecutionAccepted({
                    betAmount: plan.betAmount,
                    targetMultiplier: plan.targetMultiplier,
                    branch: permission?.branch || "",
                });
                if (this.isExecutionDebugEnabled()) console.groupEnd?.();
                return accepted;
            },

            handleRoundFinishedForExecution(payload = {}) {
                const st = this.getState();
                this.executionDebug("[MEP][Strategy1][handleRoundFinishedForExecution called]", {
                    hasState: !!st,
                    waitingRoundResult: !!st?.runtime?.waitingRoundResult,
                    isExecuting: !!st?.isExecuting,
                    payload: payload && typeof payload === "object" ? { ...payload } : {},
                });
                if (!st) return { applied: false, reason: "strategy1_not_found" };
                if (!st.isExecuting || !st.runtime?.waitingRoundResult) return { applied: false, reason: "execution_not_waiting" };
                const p = payload && typeof payload === "object" ? payload : {};
                const roundId = (p.roundId || "").toString();
                const ts = Number(p.ts) || Date.now();
                const currentBalance = Number(this.getCurrentBalance()) || 0;
                this.executionDebug("[MEP][Strategy1][handleRoundFinishedForExecution payload]", {
                    roundId,
                    balance: Number.isFinite(Number(p.balance)) ? Number(p.balance) : currentBalance,
                    ts,
                });
                const result = {
                    balance: Number.isFinite(Number(p.balance)) ? Number(p.balance) : currentBalance,
                    stake: Number(st.runtime.pendingBetAmount) || 0,
                    targetMultiplier: Number(st.runtime.pendingTargetMultiplier) || 0,
                    roundId: roundId || `exec_${ts}`,
                    ts,
                    rawMultiplier: Number.isFinite(Number(p.rawMultiplier)) ? Number(p.rawMultiplier) : null,
                    won: p.won === true,
                    lost: p.lost === true,
                    resultKind: "execution_bridge",
                };
                this.executionDebug("[MEP][Strategy1][handleRoundFinishedForExecution normalized]", result);
                const updated = this.updateAfterRound(result);
                this.executionDebug("[MEP][Strategy1][handleRoundFinishedForExecution updateAfterRound]", updated);
                st.runtime.lastExecutionRoundId = result.roundId;
                st.runtime.lastExecutionResult = updated?.applied ? "round_processed" : "round_apply_failed";
                st.runtime.executionState = "idle";
                st.runtime.pendingExecutionPayload = null;
                st.runtime.pendingBetAmount = 0;
                st.runtime.pendingTargetMultiplier = 0;
                st.runtime.waitingRoundResult = false;
                st.executionLocked = false;
                this.executionDebug("[MEP][Strategy1][handleRoundFinishedForExecution final]", {
                    executionLocked: !!st.executionLocked,
                    waitingRoundResult: !!st.runtime.waitingRoundResult,
                    executionState: st.runtime.executionState || "",
                });
                this.pushSystemMessage({
                    level: updated?.applied ? "ok" : "warn",
                    action: "executionRound",
                    text: "Результат раунда обработан",
                    code: "execution_round_processed",
                    stage: "execution",
                    reason: updated?.reason || "",
                    payload: { roundId: result.roundId },
                });
                this.announceStateTransition("execution", this.EVENT_CODES.EXECUTION_ROUND_PROCESSED, { roundId: result.roundId });
                this.updateUiCounters();
                return { applied: !!updated?.applied, reason: updated?.reason || "", roundId: result.roundId };
            },

            handleRoundFinishedFromDom(entry = {}) {
                const st = this.getState();
                if (!st || !st.enabled || !st.cycle?.isActive) {
                    return { applied: false, reason: "strategy_disabled_or_cycle_inactive" };
                }
                const roundId = entry?.raw ? `${entry.raw}|${entry.ts}` : `dom_${Date.now()}`;
                const ts = Number(entry?.ts) || Date.now();
                const rawMultiplier = Number(entry?.num);
                if (st.isExecuting && st.runtime?.waitingRoundResult) {
                    return this.handleRoundFinishedForExecution({
                        roundId,
                        ts,
                        rawMultiplier,
                    });
                }
                return this.updateAfterRound({
                    roundId,
                    ts,
                    balance: Number(this.getCurrentBalance()) || 0,
                    stake: 0,
                    targetMultiplier: 0,
                    rawMultiplier,
                    won: false,
                    lost: false,
                    resultKind: "dom_cycle_round",
                });
            },

            checkExecutionTimeout() {
                const st = this.getState();
                if (!st) return { applied: false, reason: "strategy1_not_found" };
                if (!st.isExecuting || !st.runtime?.waitingRoundResult) return { applied: false, reason: "no_pending_execution" };
                const timeoutMs = this.getExecutionTimeoutMs();
                const since = Date.now() - (Number(st.runtime.lastExecutionAtTs) || 0);
                if (since < timeoutMs) return { applied: false, reason: "timeout_not_reached" };
                st.runtime.executionState = "timeout";
                st.runtime.lastExecutionResult = "timeout";
                st.runtime.waitingRoundResult = false;
                st.executionLocked = false;
                st.runtime.pendingExecutionPayload = null;
                this.pushSystemMessage({
                    level: "warn",
                    action: "executionTimeout",
                    text: "Execution timeout — результат раунда не подтверждён",
                    code: "execution_timeout",
                    stage: "execution",
                    reason: "execution_timeout",
                });
                this.announceStateTransition("execution", this.EVENT_CODES.EXECUTION_TIMEOUT, { reason: "execution_timeout" });
                this.updateUiCounters();
                return { applied: true, reason: "execution_timeout" };
            },

            getEventText(code = "", payload = {}) {
                const c = (code || "").toString();
                const map = {
                    cycle_started: "Цикл стратегии запущен",
                    cycle_finished_profit: "Цикл завершён по прибыли",
                    cycle_finished_max_losses: "Цикл завершён по лимиту поражений",
                    cycle_finished_manual: "Цикл завершён вручную",
                    cycle_finished_hard_exit: "Цикл завершён через жёсткий выход",
                    manual_pause_on: "Включена ручная пауза цикла",
                    manual_pause_off: "Ручная пауза снята",
                    waiting_recovery_on: "Включён режим ожидания восстановления баланса",
                    waiting_recovery_off: "Режим ожидания восстановления баланса отключён",
                    waiting_recovery_reached: "Баланс восстановлен до целевого уровня",
                    charter_blocked: "Устав блокирует стратегию",
                    bet_allowed: "Ставка разрешена",
                    bet_denied: "Ставка не разрешена",
                    branch_first: "Стратегия перешла на первую ветку",
                    branch_second: "Стратегия перешла на вторую ветку",
                    first_branch_pass: "Условия первой ветки пройдены",
                    first_branch_fail: "Условия первой ветки не пройдены",
                    second_branch_pass: "Условия второй ветки пройдены",
                    second_branch_fail: "Условия второй ветки не пройдены",
                    second_branch_should_end: "Вторая ветка требует завершения цикла",
                    round_win: "Раунд завершён в плюс",
                    round_loss: "Раунд завершён в минус",
                    round_unknown: "Раунд завершён с неопределённым результатом",
                    new_cycle_started: "Запущен новый цикл стратегии",
                    execution_started: "Ставка отправлена в игру",
                    execution_rejected: "Ставка не выполнена",
                    execution_round_wait: "Ожидание результата раунда",
                    execution_round_processed: "Результат раунда обработан",
                    execution_timeout: "Execution timeout — результат раунда не подтверждён",
                };
                if (c === "bet_denied" && payload && payload.reason) {
                    return `Ставка не разрешена (${String(payload.reason)})`;
                }
                return map[c] || "Событие стратегии";
            },

            getEventLevel(code = "") {
                const c = (code || "").toString();
                if (
                    c === this.EVENT_CODES.CYCLE_FINISHED_PROFIT ||
                    c === this.EVENT_CODES.BET_ALLOWED ||
                    c === this.EVENT_CODES.ROUND_WIN ||
                    c === this.EVENT_CODES.CYCLE_STARTED ||
                    c === this.EVENT_CODES.NEW_CYCLE_STARTED ||
                    c === this.EVENT_CODES.MANUAL_PAUSE_OFF ||
                    c === this.EVENT_CODES.WAITING_RECOVERY_REACHED ||
                    c === this.EVENT_CODES.EXECUTION_STARTED ||
                    c === this.EVENT_CODES.EXECUTION_ROUND_PROCESSED
                ) {
                    return "ok";
                }
                if (
                    c === this.EVENT_CODES.CHARTER_BLOCKED ||
                    c === this.EVENT_CODES.BET_DENIED ||
                    c === this.EVENT_CODES.CYCLE_FINISHED_MAX_LOSSES ||
                    c === this.EVENT_CODES.CYCLE_FINISHED_HARD_EXIT ||
                    c === this.EVENT_CODES.SECOND_BRANCH_SHOULD_END ||
                    c === this.EVENT_CODES.EXECUTION_REJECTED ||
                    c === this.EVENT_CODES.EXECUTION_TIMEOUT
                ) {
                    return "warn";
                }
                return "info";
            },

            emitStatusEvent(code, payload = {}) {
                const st = this.getState();
                if (!st || !code) return null;
                const ts = Date.now();
                const event = {
                    code: String(code),
                    ts,
                    payload: payload && typeof payload === "object" ? { ...payload } : {},
                    text: this.getEventText(code, payload),
                    level: this.getEventLevel(code),
                };
                st.runtime.lastStatusEventCode = event.code;
                st.runtime.lastStatusEventAtTs = ts;
                this.pushSystemMessage({
                    level: event.level,
                    action: "status_event",
                    text: event.text,
                    code: event.code,
                    stage: "state_transition",
                    reason: (event.payload?.reason || "").toString(),
                    branch: (event.payload?.branch || "").toString(),
                    payload: event.payload,
                });
                return event;
            },

            emitVoiceEvent(code, payload = {}) {
                const st = this.getState();
                if (!st || !code) return { emitted: false, reason: "strategy1_not_found" };
                const ts = Date.now();
                const cooldown = Math.max(0, Math.floor(Number(st.config?.voiceCooldownMs) || 0));
                const lastCode = (st.runtime.lastVoiceEventCode || "").toString();
                const lastTs = Number(st.runtime.lastVoiceEventAtTs) || 0;
                const withinCooldown = cooldown > 0 && ts - lastTs < cooldown;
                if (withinCooldown) {
                    return {
                        emitted: false,
                        reason: lastCode === String(code) ? "voice_cooldown_same_code" : "voice_cooldown",
                        code: String(code),
                        ts,
                    };
                }
                st.runtime.lastVoiceEventCode = String(code);
                st.runtime.lastVoiceEventAtTs = ts;
                const text = this.getEventText(code, payload);
                this.pushSystemMessage({
                    level: "info",
                    action: "voice",
                    text: `[voice] ${text}`,
                    code: String(code),
                    stage: "voice_event",
                    reason: (payload?.reason || "").toString(),
                    branch: (payload?.branch || "").toString(),
                    payload: payload && typeof payload === "object" ? { ...payload } : {},
                });
                return { emitted: true, code: String(code), ts };
            },

            announceStateTransition(kind, code, payload = {}) {
                const st = this.getState();
                if (!st || !code) return null;
                st.runtime.lastAnnouncedDecisionCode = `${(kind || "generic").toString()}:${String(code)}`;
                const nextPayload = payload && typeof payload === "object" ? { ...payload } : {};
                if (st.runtime?.statusEventsEnabled !== false && st.config?.statusEventsEnabled !== false) {
                    this.emitStatusEvent(code, nextPayload);
                }
                if (st.runtime?.voiceEventsEnabled !== false && st.config?.voiceEnabled !== false) {
                    this.emitVoiceEvent(code, nextPayload);
                }
                return { kind: (kind || "generic").toString(), code: String(code), payload: nextPayload };
            },

            init() {
                const st = this.getState();
                if (!st) return;
                this.ensureConditionBlocks(st);
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
                if (MEP.State.activeStrategyId === st.id && !st.cycle.isActive) {
                    MEP.State.activeStrategyId = null;
                }
                this.evaluateDecisionState();
                this.updateUiCounters();
                return st.cycle;
            },

            getCurrentBalance() {
                const list = MEP.State?.balanceHistory;
                if (!Array.isArray(list) || !list.length) return 0;
                const last = Number(list[list.length - 1]);
                return Number.isFinite(last) ? last : 0;
            },

            getNowTs() {
                return Date.now();
            },

            buildTimeKeys(ts = this.getNowTs()) {
                const n = Number(ts);
                const safeTs = Number.isFinite(n) && n > 0 ? n : this.getNowTs();
                const d = new Date(safeTs);
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, "0");
                const day = String(d.getDate()).padStart(2, "0");
                const h = String(d.getHours()).padStart(2, "0");
                const sixBlock = Math.floor(d.getHours() / 6);
                return {
                    ts: safeTs,
                    hourKey: `${y}-${m}-${day} ${h}`,
                    sixHourKey: `${y}-${m}-${day} ${sixBlock}`,
                    dayKey: `${y}-${m}-${day}`,
                };
            },

            pushEvent(type, ts = this.getNowTs()) {
                const st = this.getState();
                if (!st || !type) return null;
                if (!Array.isArray(st.runtime.eventLog)) st.runtime.eventLog = [];
                const keys = this.buildTimeKeys(ts);
                st.timers.nowTs = keys.ts;
                st.timers.hourKey = keys.hourKey;
                st.timers.sixHourKey = keys.sixHourKey;
                st.timers.dayKey = keys.dayKey;
                const ev = {
                    type: String(type),
                    ts: keys.ts,
                    hourKey: keys.hourKey,
                    sixHourKey: keys.sixHourKey,
                    dayKey: keys.dayKey,
                };
                st.runtime.eventLog.push(ev);
                const maxLen = 5000;
                if (st.runtime.eventLog.length > maxLen) {
                    st.runtime.eventLog.splice(0, st.runtime.eventLog.length - maxLen);
                }
                return ev;
            },

            countEventsByKey(type, keyName, keyValue) {
                const st = this.getState();
                if (!st || !Array.isArray(st.runtime.eventLog) || !keyName) return 0;
                let cnt = 0;
                for (const ev of st.runtime.eventLog) {
                    if (!ev || (type && ev.type !== type)) continue;
                    if (ev[keyName] === keyValue) cnt += 1;
                }
                return cnt;
            },

            getConsecutiveLosses() {
                const st = this.getState();
                if (!st || !Array.isArray(st.runtime.eventLog)) return 0;
                let seq = 0;
                for (let i = st.runtime.eventLog.length - 1; i >= 0; i -= 1) {
                    const t = st.runtime.eventLog[i]?.type;
                    if (t === "loss") {
                        seq += 1;
                        continue;
                    }
                    if (t === "win") break;
                }
                return seq;
            },

            getCharterBlockStatusText(blockReason = "") {
                const map = {
                    rounds_hour_limit: "Устав блокирует — достигнут лимит раундов за час",
                    rounds_6h_limit: "Устав блокирует — достигнут лимит раундов за 6 часов",
                    rounds_day_limit: "Устав блокирует — достигнут лимит раундов за сутки",
                    wins_hour_limit: "Устав блокирует — достигнут лимит выигрышей за час",
                    wins_6h_limit: "Устав блокирует — достигнут лимит выигрышей за 6 часов",
                    wins_day_limit: "Устав блокирует — достигнут лимит выигрышей за сутки",
                    losses_hour_limit: "Устав блокирует — достигнут лимит поражений за час",
                    losses_6h_limit: "Устав блокирует — достигнут лимит поражений за 6 часов",
                    losses_day_limit: "Устав блокирует — достигнут лимит поражений за сутки",
                    break_active: "Активен перерыв после серии проигрышей",
                };
                return map[blockReason] || "Ожидание сигнала";
            },

            applyCharterDecision(charterResult = null) {
                const st = this.getState();
                if (!st) return null;
                const charter = charterResult || this.checkCharter();
                if (!charter?.allowed) {
                    return this.updateDecisionState({
                        canMakeBet: false,
                        shouldEndCycle: false,
                        statusCode: this.DECISION_STATUS.CHARTER_BLOCKED,
                        statusText: this.getCharterBlockStatusText(charter.blockReason),
                        branch: "",
                        waitReason: charter.blockReason || "",
                    });
                }
                return charter;
            },

            routeBranch() {
                const st = this.getState();
                if (!st) {
                    return { branch: "", reason: "strategy1_not_found", lossCount: 0 };
                }
                const lossCount = Math.max(0, Number(st.cycle?.lossCount) || 0);
                if (!st.cycle?.isActive) {
                    const info = { branch: "", reason: "cycle_inactive", lossCount };
                    st.runtime.lastBranchInfo = info;
                    return info;
                }
                if (lossCount === 0) {
                    const info = { branch: "first", reason: "loss_count_zero", lossCount };
                    st.runtime.lastBranchInfo = info;
                    return info;
                }
                const info = { branch: "second", reason: "loss_count_positive", lossCount };
                st.runtime.lastBranchInfo = info;
                return info;
            },

            getBranchStatusText(branchInfo = {}) {
                if (branchInfo.branch === "first") return "Первый вход в цикл — используется первая ветка";
                if (branchInfo.branch === "second") return "Цикл продолжается после минусов — используется вторая ветка";
                if (branchInfo.reason === "cycle_inactive") return "Цикл не активен — ветка не выбрана";
                return "Ветка стратегии не выбрана";
            },

            getLt2Streak() {
                const list = Array.isArray(MEP.State?.list) ? MEP.State.list : [];
                let streak = 0;
                for (let i = 0; i < list.length; i++) {
                    const n = MEP.Utils.cleanToNum(list[i]);
                    if (n === null) break;
                    if (n < 2) streak += 1;
                    else break;
                }
                return streak;
            },

            getFirstBranchFailText(failedAt = "") {
                const map = {
                    streak_lt2: "Раунд пропускаем — ждём 3 подряд результатов меньше 2",
                    lt2_streak: "Раунд пропускаем — ждём 3 подряд результатов меньше 2",
                    diff_vector: "Раунд пропускаем — ждём сигнал в сущности разниц",
                    frequency_vector: "Раунд пропускаем — ждём сигнал в сущности частотности",
                    stake_bet_vector: "Раунд пропускаем — ждём сигнал в сущности ставок",
                    stake_players_vector: "Раунд пропускаем — ждём сигнал в сущности клиентов",
                    extra_condition: "Раунд пропускаем — не выполнено дополнительное условие",
                };
                return map[failedAt] || "Раунд пропускаем — ждём сигнал первой ветки";
            },

            getSecondBranchFailText(failedAt = "", extra = {}) {
                const map = {
                    max_losses: "Раунд пропускаем — достигнут лимит проигрышей для цикла",
                    max_stake: "Цикл завершён — достигнут максимальный уровень ставки",
                    diff_vector: "Раунд пропускаем — ждём сигнал в сущности разниц",
                    frequency_vector: "Раунд пропускаем — ждём сигнал в сущности частотности",
                    stake_plan_invalid: "Раунд пропускаем — план ставки пока невалиден",
                    not_second_branch: "Раунд пропускаем — вторая ветка сейчас не активна",
                };
                if (failedAt === "stake_plan_invalid" && extra?.stakePlanInvalidReason) {
                    return `${map.stake_plan_invalid} (${extra.stakePlanInvalidReason})`;
                }
                return map[failedAt] || "Раунд пропускаем — ждём сигнал второй ветки";
            },

            buildConditionResult({ key = "", enabled = true, passed = false, waitReason = "", statusText = "", details = {} } = {}) {
                const rawPassed = !!passed;
                const isEnabled = !!enabled;
                return {
                    key: (key || "").toString(),
                    enabled: isEnabled,
                    passed: rawPassed,
                    effectivePassed: isEnabled ? rawPassed : true,
                    waitReason: (waitReason || "").toString(),
                    statusText: (statusText || "").toString(),
                    details: details && typeof details === "object" ? { ...details } : {},
                };
            },

            checkFirstBranch() {
                const st = this.getState();
                const config = st?.config || {};
                const details = {
                    lt2Streak: this.getLt2Streak(),
                    diffVectorState: (MEP.State.diffVectorState || "").toString(),
                    frequencyVectorState: (MEP.State.frequencyVectorState || "").toString(),
                    stakeBetVectorState: (MEP.State.stakeBetVectorState || "").toString(),
                    stakePlayersVectorState: (MEP.State.stakePlayersVectorState || "").toString(),
                    extraConditionPassed: true,
                };
                const conditions = [
                    this.buildConditionResult({
                        key: "lt2_streak",
                        enabled: config.firstCondLt2StreakEnabled !== false,
                        passed: details.lt2Streak >= 3,
                        waitReason: "lt2_streak",
                        statusText: this.getFirstBranchFailText("streak_lt2"),
                        details: { lt2Streak: details.lt2Streak },
                    }),
                    this.buildConditionResult({
                        key: "diff_vector",
                        enabled: config.firstCondDiffVectorEnabled !== false,
                        passed: details.diffVectorState === "up",
                        waitReason: "diff_vector",
                        statusText: this.getFirstBranchFailText("diff_vector"),
                        details: { state: details.diffVectorState },
                    }),
                    this.buildConditionResult({
                        key: "frequency_vector",
                        enabled: config.firstCondFrequencyVectorEnabled !== false,
                        passed: details.frequencyVectorState === "up",
                        waitReason: "frequency_vector",
                        statusText: this.getFirstBranchFailText("frequency_vector"),
                        details: { state: details.frequencyVectorState },
                    }),
                    this.buildConditionResult({
                        key: "stake_bet_vector",
                        enabled: config.firstCondStakeBetVectorEnabled !== false,
                        passed: details.stakeBetVectorState === "up",
                        waitReason: "stake_bet_vector",
                        statusText: this.getFirstBranchFailText("stake_bet_vector"),
                        details: { state: details.stakeBetVectorState },
                    }),
                    this.buildConditionResult({
                        key: "stake_players_vector",
                        enabled: config.firstCondStakePlayersVectorEnabled !== false,
                        passed: details.stakePlayersVectorState === "up",
                        waitReason: "stake_players_vector",
                        statusText: this.getFirstBranchFailText("stake_players_vector"),
                        details: { state: details.stakePlayersVectorState },
                    }),
                    this.buildConditionResult({
                        key: "extra_condition",
                        enabled: !!config.firstCondExtraEnabled,
                        passed: true,
                        waitReason: "extra_condition",
                        statusText: "Дополнительное условие пока не задано",
                        details: { placeholder: true },
                    }),
                ];
                const firstFailed = conditions.find((cond) => !cond.effectivePassed);
                if (firstFailed) {
                    const res = {
                        passed: false,
                        failedAt: firstFailed.key,
                        details,
                        waitReason: firstFailed.waitReason || firstFailed.key,
                        statusText: firstFailed.statusText || this.getFirstBranchFailText(firstFailed.key),
                        conditions,
                    };
                    if (st?.runtime) st.runtime.lastFirstBranchResult = res;
                    return res;
                }

                const ok = {
                    passed: true,
                    failedAt: "",
                    details,
                    waitReason: "",
                    statusText: "Первая ветка пройдена — ставка разрешена",
                    conditions,
                };
                if (st?.runtime) st.runtime.lastFirstBranchResult = ok;
                return ok;
            },

            checkSecondBranch() {
                const st = this.getState();
                const fallback = {
                    passed: false,
                    failedAt: "strategy1_not_found",
                    details: {},
                    waitReason: "strategy1_not_found",
                    statusText: "Стратегия1 не найдена",
                    shouldEndCycle: false,
                    endReason: "",
                    conditions: [],
                };
                if (!st) return fallback;

                const branchInfo = this.routeBranch();
                const branch = (branchInfo?.branch || "").toString();
                const lossCount = Math.max(0, Number(st.cycle?.lossCount) || 0);
                const maxLosses = Math.max(0, Math.floor(Number(st.config?.maxLosses) || 0));
                const stakePlan = this.buildStakePlan();
                const config = st?.config || {};
                const diffVectorState = (MEP.State.diffVectorState || "").toString();
                const frequencyVectorState = (MEP.State.frequencyVectorState || "").toString();

                const details = {
                    branch,
                    lossCount,
                    maxLosses,
                    diffVectorState,
                    frequencyVectorState,
                    stakePlanReady: !!stakePlan?.ready,
                    stakePlanBetAmount: Number(stakePlan?.betAmount) || 0,
                    stakePlanMaxAllowedStake: Number(stakePlan?.maxAllowedStake) || 0,
                    stakePlanInvalidReason: (stakePlan?.invalidReason || "").toString(),
                };

                if (branch !== "second") {
                    const res = {
                        passed: false,
                        failedAt: "not_second_branch",
                        details,
                        waitReason: "not_second_branch",
                        statusText: this.getSecondBranchFailText("not_second_branch", details),
                        shouldEndCycle: false,
                        endReason: "",
                        conditions: [],
                    };
                    if (st?.runtime) st.runtime.lastSecondBranchResult = res;
                    return res;
                }

                const invalidReason = (stakePlan?.invalidReason || "").toString();
                const maxStakeRawPassed =
                    !!stakePlan?.ready || (invalidReason !== "max_stake_exceeded" && invalidReason !== "max_stake_not_allowed");
                const conditions = [
                    this.buildConditionResult({
                        key: "max_losses",
                        enabled: config.secondCondMaxLossesEnabled !== false,
                        passed: maxLosses <= 0 ? true : lossCount < maxLosses,
                        waitReason: "max_losses",
                        statusText: this.getSecondBranchFailText("max_losses", details),
                        details: { lossCount, maxLosses },
                    }),
                    this.buildConditionResult({
                        key: "max_stake",
                        enabled: config.secondCondMaxStakeEnabled !== false,
                        passed: maxStakeRawPassed,
                        waitReason: maxStakeRawPassed ? "max_stake" : "max_stake_reached",
                        statusText: this.getSecondBranchFailText("max_stake", details),
                        details: {
                            stakePlanReady: !!stakePlan?.ready,
                            stakePlanInvalidReason: invalidReason,
                        },
                    }),
                    this.buildConditionResult({
                        key: "diff_vector",
                        enabled: config.secondCondDiffVectorEnabled !== false,
                        passed: diffVectorState === "up",
                        waitReason: "diff_vector",
                        statusText: this.getSecondBranchFailText("diff_vector", details),
                        details: { state: diffVectorState },
                    }),
                    this.buildConditionResult({
                        key: "frequency_vector",
                        enabled: config.secondCondFrequencyVectorEnabled !== false,
                        passed: frequencyVectorState === "up",
                        waitReason: "frequency_vector",
                        statusText: this.getSecondBranchFailText("frequency_vector", details),
                        details: { state: frequencyVectorState },
                    }),
                ];
                const firstFailed = conditions.find((cond) => !cond.effectivePassed);
                if (firstFailed) {
                    const maxStakeEnabled = config.secondCondMaxStakeEnabled !== false;
                    const shouldEndCycle =
                        firstFailed.key === "max_stake" &&
                        maxStakeEnabled &&
                        !maxStakeRawPassed &&
                        (invalidReason === "max_stake_exceeded" || invalidReason === "max_stake_not_allowed");
                    const res = {
                        passed: false,
                        failedAt: firstFailed.key,
                        details,
                        waitReason: shouldEndCycle ? "max_stake_reached" : firstFailed.waitReason || firstFailed.key,
                        statusText: firstFailed.statusText || this.getSecondBranchFailText(firstFailed.key, details),
                        shouldEndCycle,
                        endReason: shouldEndCycle ? "max_stake_reached" : "",
                        conditions,
                    };
                    if (st?.runtime) st.runtime.lastSecondBranchResult = res;
                    return res;
                }
                if (!stakePlan?.ready) {
                    const res = {
                        passed: false,
                        failedAt: "stake_plan_invalid",
                        details,
                        waitReason: invalidReason || "stake_plan_invalid",
                        statusText: this.getSecondBranchFailText("stake_plan_invalid", details),
                        shouldEndCycle: false,
                        endReason: "",
                        conditions,
                    };
                    if (st?.runtime) st.runtime.lastSecondBranchResult = res;
                    return res;
                }

                const ok = {
                    passed: true,
                    failedAt: "",
                    details,
                    waitReason: "",
                    statusText: "Вторая ветка пройдена — ставка разрешена",
                    shouldEndCycle: false,
                    endReason: "",
                    conditions,
                };
                if (st?.runtime) st.runtime.lastSecondBranchResult = ok;
                return ok;
            },

            isProfitReached() {
                const st = this.getState();
                if (!st) return false;
                return Number(st.cycle.currentBalance) > Number(st.cycle.startBalance);
            },

            isMaxLossesReached() {
                const st = this.getState();
                if (!st) return false;
                const maxLosses = Math.floor(Number(st.config?.maxLosses) || 0);
                if (!Number.isFinite(maxLosses) || maxLosses <= 0) return false;
                return Number(st.cycle.lossCount) >= maxLosses;
            },

            isMaxStakeReached(nextStake = null) {
                const st = this.getState();
                if (!st) return false;
                const stakePercent = Number(MEP.State?.charterMaxStakePercent) || 0;
                if (!Number.isFinite(stakePercent) || stakePercent <= 0) return false;
                const currentBalance = this.getCurrentBalance();
                const maxAllowedStake = currentBalance * (stakePercent / 100);
                if (Number.isFinite(Number(nextStake))) {
                    return Number(nextStake) > maxAllowedStake;
                }
                const lastStake = Number(st.cycle?.lastStake) || 0;
                if (lastStake <= 0) return false;
                return lastStake > maxAllowedStake;
            },

            startCycle() {
                const st = this.getState();
                this.executionDebug("[MEP][Strategy1][startCycle] enter", {
                    hasState: !!st,
                    activeStrategyIdBefore: (MEP.State?.activeStrategyId || "").toString(),
                    cycleIsActiveBefore: !!st?.cycle?.isActive,
                    enabled: !!st?.enabled,
                });
                if (!st) {
                    this.executionWarn("[MEP][Strategy1][startCycle] reject", { reason: "strategy1_not_found" });
                    return false;
                }
                if (MEP.State.activeStrategyId && MEP.State.activeStrategyId !== st.id) {
                    this.executionWarn("[MEP][Strategy1][startCycle] reject", {
                        reason: "other_strategy_active",
                        activeStrategyIdBefore: (MEP.State?.activeStrategyId || "").toString(),
                    });
                    return false;
                }
                const now = Date.now();
                const currentBalanceNow = this.getCurrentBalance();
                this.executionDebug("[MEP][Strategy1][startCycle] seed", {
                    currentBalanceNow: Number(currentBalanceNow) || 0,
                    cycleIdCandidate: `s1_${now}`,
                    cycleIsActiveBefore: !!st.cycle?.isActive,
                    activeStrategyIdBefore: (MEP.State?.activeStrategyId || "").toString(),
                });
                st.isExecuting = true;
                st.executionLocked = false;
                MEP.State.activeStrategyId = st.id;
                st.cycle.isActive = true;
                st.cycle.cycleId = `s1_${now}`;
                st.cycle.cycleNumber = Math.max(0, Math.floor(Number(st.cycle.cycleNumber) || 0)) + 1;
                st.cycle.endReason = "";
                st.cycle.startBalance = currentBalanceNow;
                st.cycle.currentBalance = currentBalanceNow;
                st.cycle.cyclePnL = 0;
                st.cycle.totalStakeSum = 0;
                st.cycle.roundCount = 0;
                st.cycle.betCount = 0;
                st.cycle.lossCount = 0;
                st.cycle.winCount = 0;
                st.cycle.stepIndex = 0;
                st.cycle.lastStake = 0;
                st.cycle.lastTargetMultiplier = 0;
                st.counters.startBalanceBeforeCycle = currentBalanceNow;
                st.counters.currentBalanceAfterRound = currentBalanceNow;
                st.counters.lastStake = 0;
                st.counters.totalStakeSumInCycle = 0;
                st.counters.lossRoundCount = 0;
                st.counters.winRoundCount = 0;
                st.timers.cycleStartedAtTs = now;
                st.timers.cycleFinishedAtTs = 0;
                st.timers.cycleDurationMs = 0;
                this.pushEvent("cycle_start", now);
                st.runtime.lastCycleAction = "startCycle";
                st.runtime.lastAnnouncedCycleState = "active";
                this.announceStateTransition("cycle", this.EVENT_CODES.CYCLE_STARTED, {
                    cycleId: st.cycle.cycleId,
                    branch: "",
                });
                this.evaluateDecisionState();
                this.updateUiCounters();
                this.executionDebug("[MEP][Strategy1][startCycle] applied", {
                    result: true,
                    cycleId: st.cycle.cycleId,
                    cycleIsActiveAfter: !!st.cycle?.isActive,
                    activeStrategyIdAfter: (MEP.State?.activeStrategyId || "").toString(),
                });
                return true;
            },

            finishCycle(reason = "") {
                const st = this.getState();
                if (!st) return null;
                const now = Date.now();
                st.cycle.isActive = false;
                st.isExecuting = false;
                st.cycle.endReason = (reason || "manual").toString();
                st.timers.cycleFinishedAtTs = now;
                st.timers.cycleDurationMs = Math.max(
                    0,
                    st.timers.cycleFinishedAtTs - (st.timers.cycleStartedAtTs || st.timers.cycleFinishedAtTs)
                );
                if (MEP.State.activeStrategyId === st.id) MEP.State.activeStrategyId = null;
                this.pushEvent("cycle_finish", now);
                st.runtime.lastCycleAction = "finishCycle";
                const finishCodeMap = {
                    profit_reached: this.EVENT_CODES.CYCLE_FINISHED_PROFIT,
                    max_losses_reached: this.EVENT_CODES.CYCLE_FINISHED_MAX_LOSSES,
                    stop_minus_reached: this.EVENT_CODES.CYCLE_FINISHED_MAX_LOSSES,
                    manual_stop: this.EVENT_CODES.CYCLE_FINISHED_MANUAL,
                    hard_exit: this.EVENT_CODES.CYCLE_FINISHED_HARD_EXIT,
                };
                const finishCode = finishCodeMap[st.cycle.endReason] || this.EVENT_CODES.CYCLE_FINISHED_MANUAL;
                st.runtime.lastAnnouncedCycleState = `finished:${st.cycle.endReason}`;
                this.announceStateTransition("cycle", finishCode, {
                    reason: st.cycle.endReason,
                    cycleId: st.cycle.cycleId,
                });
                if (
                    st.cycle.endReason === "profit_reached" ||
                    st.cycle.endReason === "max_losses_reached" ||
                    st.cycle.endReason === "stop_minus_reached"
                ) {
                    this.pushSystemMessage({
                        level: "ok",
                        action: "finishCycle",
                        text:
                            st.cycle.endReason === "profit_reached"
                                ? "Цикл завершён: достигнут профит"
                                : st.cycle.endReason === "stop_minus_reached"
                                ? "Цикл завершён: достигнут СтопМинус"
                                : "Цикл завершён: достигнут лимит проигрышей",
                        code: "cycle_finished",
                        stage: "post_round_finish",
                        reason: st.cycle.endReason,
                        payload: { endReason: st.cycle.endReason },
                    });
                }
                this.evaluateDecisionState();
                this.updateUiCounters();
                return st.cycle.endReason;
            },

            getManualPauseStatusText(reason = "") {
                const key = (reason || "").toString();
                const map = {
                    manual_pause: "Цикл на ручной паузе",
                    waiting_balance_topup: "Цикл на паузе — ожидание пополнения баланса",
                };
                return map[key] || "Цикл на паузе";
            },

            pauseCycle(reason = "manual_pause") {
                const st = this.getState();
                if (!st) return null;
                if (!st.cycle?.isActive) return { applied: false, reason: "cycle_inactive" };
                if (st.runtime?.manualPauseActive) return { applied: false, reason: "already_paused" };
                st.runtime.manualPauseActive = true;
                st.runtime.manualPauseReason = (reason || "manual_pause").toString();
                st.runtime.manualPauseAtTs = Date.now();
                st.runtime.lastCycleAction = "pauseCycle";
                st.runtime.lastAnnouncedCycleState = "manual_pause_on";
                this.announceStateTransition("manual_pause", this.EVENT_CODES.MANUAL_PAUSE_ON, {
                    reason: st.runtime.manualPauseReason,
                });
                this.pushSystemMessage({
                    level: "ok",
                    action: "pauseCycle",
                    text: this.formatSystemMessageText("pauseCycle", { applied: true }),
                    code: "manual_pause_applied",
                    stage: "manual_pause",
                    reason: st.runtime.manualPauseReason,
                });
                this.evaluateDecisionState();
                this.updateUiCounters();
                return { applied: true, reason: st.runtime.manualPauseReason };
            },

            resumeCycle() {
                const st = this.getState();
                if (!st) return null;
                if (!st.runtime?.manualPauseActive) return { applied: false, reason: "not_paused" };
                st.runtime.manualPauseActive = false;
                st.runtime.manualPauseReason = "";
                st.runtime.manualResumeAtTs = Date.now();
                st.runtime.lastCycleAction = "resumeCycle";
                st.runtime.lastAnnouncedCycleState = "manual_pause_off";
                this.announceStateTransition("manual_pause", this.EVENT_CODES.MANUAL_PAUSE_OFF, {
                    reason: "manual_pause_resumed",
                });
                this.pushSystemMessage({
                    level: "ok",
                    action: "resumeCycle",
                    text: this.formatSystemMessageText("resumeCycle", { applied: true }),
                    code: "manual_pause_resumed",
                    stage: "resume",
                    reason: "",
                });
                this.evaluateDecisionState();
                this.updateUiCounters();
                return { applied: true, reason: "" };
            },

            requestHardExit(reason = "hard_exit") {
                const st = this.getState();
                if (!st) return null;
                if (!st.cycle?.isActive) return { applied: false, reason: "cycle_inactive" };
                st.runtime.hardExitRequested = true;
                st.runtime.hardExitAtTs = Date.now();
                st.runtime.hardExitReason = (reason || "hard_exit").toString();
                st.runtime.lastCycleAction = "requestHardExit";
                this.finishCycle("hard_exit");
                this.pushSystemMessage({
                    level: "warn",
                    action: "hardExit",
                    text: "Цикл завершён вручную через hard exit",
                    code: "hard_exit",
                    stage: "cycle_finish",
                    reason: "hard_exit",
                    payload: { hardExitReason: st.runtime.hardExitReason },
                });
                this.evaluateDecisionState();
                this.updateUiCounters();
                return { applied: true, finishReason: "hard_exit" };
            },

            startNewCycle() {
                const st = this.getState();
                if (!st) return null;
                const active = (MEP.State?.activeStrategyId || "").toString();
                if (active && active !== st.id) return { applied: false, reason: "other_strategy_active" };
                if (st.cycle?.isActive) return { applied: false, reason: "cycle_already_active" };
                st.runtime.hardExitRequested = false;
                st.runtime.hardExitReason = "";
                if (st.runtime.waitingBalanceRecoveryActive) {
                    st.runtime.waitingBalanceRecoveryActive = false;
                    st.runtime.waitingBalanceRecoveryReason = "";
                    st.runtime.waitingBalanceRecoveryStartedAtTs = 0;
                    st.runtime.waitingBalanceRecoveryTargetBalance = 0;
                    st.runtime.waitingBalanceRecoveryCurrentBalance = Number(this.getCurrentBalance()) || 0;
                    st.runtime.waitingBalanceRecoveryReached = false;
                    st.runtime.waitingBalanceRecoveryReachedAtTs = 0;
                }
                const applied = !!this.startCycle();
                if (applied) {
                    this.announceStateTransition("cycle", this.EVENT_CODES.NEW_CYCLE_STARTED, {
                        cycleId: st.cycle?.cycleId || "",
                    });
                }
                this.evaluateDecisionState();
                this.updateUiCounters();
                return { applied, reason: applied ? "" : "cycle_already_active" };
            },

            enterWaitingBalanceRecovery(reason = "waiting_balance_recovery", targetBalance = 0) {
                const st = this.getState();
                if (!st) return null;
                if (st.runtime?.waitingBalanceRecoveryActive) return { applied: false, reason: "already_waiting_balance_recovery" };
                const cycleStartBalance = Number(st.cycle?.startBalance) || 0;
                const currentBalance = Number(this.getCurrentBalance()) || 0;
                const explicitTarget = Number(targetBalance);
                const resolvedTarget = Number.isFinite(explicitTarget) && explicitTarget > 0
                    ? explicitTarget
                    : Math.max(cycleStartBalance, currentBalance);
                st.runtime.waitingBalanceRecoveryActive = true;
                st.runtime.waitingBalanceRecoveryReason = (reason || "waiting_balance_recovery").toString();
                st.runtime.waitingBalanceRecoveryStartedAtTs = Date.now();
                st.runtime.waitingBalanceRecoveryTargetBalance = Number.isFinite(resolvedTarget) && resolvedTarget > 0 ? resolvedTarget : 0;
                st.runtime.waitingBalanceRecoveryCurrentBalance = currentBalance;
                st.runtime.waitingBalanceRecoveryReached = false;
                st.runtime.waitingBalanceRecoveryReachedAtTs = 0;
                st.runtime.lastCycleAction = "enterWaitingBalanceRecovery";
                st.runtime.lastAnnouncedWaitingState = "waiting_on";
                this.announceStateTransition("waiting_recovery", this.EVENT_CODES.WAITING_RECOVERY_ON, {
                    reason: st.runtime.waitingBalanceRecoveryReason,
                    targetBalance: Number(st.runtime.waitingBalanceRecoveryTargetBalance) || 0,
                });
                const refreshed = this.refreshWaitingBalanceRecovery();
                this.pushSystemMessage({
                    level: "ok",
                    action: "enterWaitingBalanceRecovery",
                    text: this.formatSystemMessageText("enterWaitingBalanceRecovery", { applied: true }),
                    code: "waiting_balance_recovery_entered",
                    stage: "waiting_balance_recovery",
                    reason: st.runtime.waitingBalanceRecoveryReason,
                    payload: {
                        targetBalance: Number(st.runtime.waitingBalanceRecoveryTargetBalance) || 0,
                        currentBalance: Number(st.runtime.waitingBalanceRecoveryCurrentBalance) || 0,
                        reached: !!(refreshed && refreshed.reached),
                    },
                });
                this.evaluateDecisionState();
                this.updateUiCounters();
                return { applied: true };
            },

            exitWaitingBalanceRecovery(reason = "recovery_cleared") {
                const st = this.getState();
                if (!st) return null;
                if (!st.runtime?.waitingBalanceRecoveryActive) return { applied: false, reason: "not_waiting_balance_recovery" };
                st.runtime.waitingBalanceRecoveryActive = false;
                st.runtime.waitingBalanceRecoveryReason = "";
                st.runtime.waitingBalanceRecoveryStartedAtTs = 0;
                st.runtime.waitingBalanceRecoveryTargetBalance = 0;
                st.runtime.waitingBalanceRecoveryCurrentBalance = Number(this.getCurrentBalance()) || 0;
                st.runtime.waitingBalanceRecoveryReached = false;
                st.runtime.waitingBalanceRecoveryReachedAtTs = 0;
                st.runtime.lastCycleAction = "exitWaitingBalanceRecovery";
                st.runtime.lastAnnouncedWaitingState = "waiting_off";
                this.announceStateTransition("waiting_recovery", this.EVENT_CODES.WAITING_RECOVERY_OFF, {
                    reason: (reason || "recovery_cleared").toString(),
                });
                this.pushSystemMessage({
                    level: "ok",
                    action: "exitWaitingBalanceRecovery",
                    text: this.formatSystemMessageText("exitWaitingBalanceRecovery", { applied: true }),
                    code: "waiting_balance_recovery_exited",
                    stage: "waiting_balance_recovery",
                    reason: (reason || "recovery_cleared").toString(),
                });
                this.evaluateDecisionState();
                this.updateUiCounters();
                return { applied: true, reason: (reason || "recovery_cleared").toString() };
            },

            refreshWaitingBalanceRecovery() {
                const st = this.getState();
                if (!st) return null;
                if (!st.runtime?.waitingBalanceRecoveryActive) return { applied: false, reason: "not_waiting_balance_recovery" };
                const currentBalance = Number(this.getCurrentBalance()) || 0;
                const targetBalance = Number(st.runtime.waitingBalanceRecoveryTargetBalance) || 0;
                const wasReached = !!st.runtime.waitingBalanceRecoveryReached;
                st.runtime.waitingBalanceRecoveryCurrentBalance = currentBalance;
                if (targetBalance > 0 && currentBalance >= targetBalance) {
                    st.runtime.waitingBalanceRecoveryReached = true;
                    if (!Number(st.runtime.waitingBalanceRecoveryReachedAtTs)) {
                        st.runtime.waitingBalanceRecoveryReachedAtTs = Date.now();
                    }
                    if (!wasReached) {
                        st.runtime.lastAnnouncedWaitingState = "waiting_reached";
                        this.announceStateTransition("waiting_recovery", this.EVENT_CODES.WAITING_RECOVERY_REACHED, {
                            targetBalance,
                            currentBalance,
                        });
                        this.pushSystemMessage({
                            level: "ok",
                            action: "refreshWaitingBalanceRecovery",
                            text: "Баланс восстановлен до целевого уровня",
                            code: "waiting_balance_recovery_reached",
                            stage: "waiting_balance_recovery",
                            reason: "balance_recovered",
                            payload: { targetBalance, currentBalance },
                        });
                    }
                } else {
                    st.runtime.waitingBalanceRecoveryReached = false;
                    st.runtime.waitingBalanceRecoveryReachedAtTs = 0;
                }
                this.updateUiCounters();
                return { applied: true, reached: !!st.runtime.waitingBalanceRecoveryReached };
            },

            checkCharter() {
                const st = this.getState();
                if (!st) return { allowed: false, blockReason: "strategy1_not_found" };
                const keys = this.buildTimeKeys(this.getNowTs());
                st.timers.nowTs = keys.ts;
                st.timers.hourKey = keys.hourKey;
                st.timers.sixHourKey = keys.sixHourKey;
                st.timers.dayKey = keys.dayKey;

                if (!Array.isArray(st.runtime.eventLog)) st.runtime.eventLog = [];

                if (st.timers.isBreakActive && st.timers.breakEndsAtTs > 0 && keys.ts >= st.timers.breakEndsAtTs) {
                    st.timers.isBreakActive = false;
                    st.timers.breakStartedAtTs = 0;
                    st.timers.breakEndsAtTs = 0;
                }

                // NOTE: break сейчас считается по глобальному runtime eventLog стратегии (не только в рамках текущего цикла).
                // При необходимости можно добавить отдельный режим break, привязанный строго к активному cycle.
                const consecutiveLosses = this.getConsecutiveLosses();
                const breakMin = Math.floor(Number(MEP.State?.charterBreakAfter3LossesMin) || 0);
                if (!st.timers.isBreakActive && breakMin > 0 && consecutiveLosses >= 3) {
                    st.timers.isBreakActive = true;
                    st.timers.breakStartedAtTs = keys.ts;
                    st.timers.breakEndsAtTs = keys.ts + breakMin * 60 * 1000;
                    this.pushEvent("break_start", keys.ts);
                }

                const allowedByLimit = (actual, limit) => {
                    const lim = Math.floor(Number(limit) || 0);
                    if (!Number.isFinite(lim) || lim <= 0) return true;
                    return actual < lim;
                };
                const roundsHour = this.countEventsByKey("round", "hourKey", keys.hourKey);
                const rounds6h = this.countEventsByKey("round", "sixHourKey", keys.sixHourKey);
                const roundsDay = this.countEventsByKey("round", "dayKey", keys.dayKey);
                const winsHour = this.countEventsByKey("win", "hourKey", keys.hourKey);
                const wins6h = this.countEventsByKey("win", "sixHourKey", keys.sixHourKey);
                const winsDay = this.countEventsByKey("win", "dayKey", keys.dayKey);
                const lossesHour = this.countEventsByKey("loss", "hourKey", keys.hourKey);
                const losses6h = this.countEventsByKey("loss", "sixHourKey", keys.sixHourKey);
                const lossesDay = this.countEventsByKey("loss", "dayKey", keys.dayKey);

                const roundsHourAllowed = allowedByLimit(roundsHour, MEP.State?.charterRoundsPerHour);
                const rounds6hAllowed = allowedByLimit(rounds6h, MEP.State?.charterRoundsPer6Hours);
                const roundsDayAllowed = allowedByLimit(roundsDay, MEP.State?.charterRoundsPerDay);
                const winsHourAllowed = allowedByLimit(winsHour, MEP.State?.charterWinsPerHour);
                const wins6hAllowed = allowedByLimit(wins6h, MEP.State?.charterWinsPer6Hours);
                const winsDayAllowed = allowedByLimit(winsDay, MEP.State?.charterWinsPerDay);
                const lossesHourAllowed = allowedByLimit(lossesHour, MEP.State?.charterLossesPerHour);
                const losses6hAllowed = allowedByLimit(losses6h, MEP.State?.charterLossesPer6Hours);
                const lossesDayAllowed = allowedByLimit(lossesDay, MEP.State?.charterLossesPerDay);
                const breakAllowed = !st.timers.isBreakActive;

                let blockReason = "";
                if (!roundsHourAllowed) blockReason = "rounds_hour_limit";
                else if (!rounds6hAllowed) blockReason = "rounds_6h_limit";
                else if (!roundsDayAllowed) blockReason = "rounds_day_limit";
                else if (!winsHourAllowed) blockReason = "wins_hour_limit";
                else if (!wins6hAllowed) blockReason = "wins_6h_limit";
                else if (!winsDayAllowed) blockReason = "wins_day_limit";
                else if (!lossesHourAllowed) blockReason = "losses_hour_limit";
                else if (!losses6hAllowed) blockReason = "losses_6h_limit";
                else if (!lossesDayAllowed) blockReason = "losses_day_limit";
                else if (!breakAllowed) blockReason = "break_active";

                st.charterCheck.allowed =
                    roundsHourAllowed &&
                    rounds6hAllowed &&
                    roundsDayAllowed &&
                    winsHourAllowed &&
                    wins6hAllowed &&
                    winsDayAllowed &&
                    lossesHourAllowed &&
                    losses6hAllowed &&
                    lossesDayAllowed &&
                    breakAllowed;
                st.charterCheck.blockReason = blockReason;
                st.charterCheck.roundsHourAllowed = roundsHourAllowed;
                st.charterCheck.rounds6hAllowed = rounds6hAllowed;
                st.charterCheck.roundsDayAllowed = roundsDayAllowed;
                st.charterCheck.winsHourAllowed = winsHourAllowed;
                st.charterCheck.wins6hAllowed = wins6hAllowed;
                st.charterCheck.winsDayAllowed = winsDayAllowed;
                st.charterCheck.lossesHourAllowed = lossesHourAllowed;
                st.charterCheck.losses6hAllowed = losses6hAllowed;
                st.charterCheck.lossesDayAllowed = lossesDayAllowed;
                st.charterCheck.breakAllowed = breakAllowed;
                st.runtime.lastCycleAction = "checkCharter";
                return { ...st.charterCheck };
            },

            checkConditions() {
                const st = this.getState();
                if (!st) return { canBet: false, shouldEndCycle: false, reason: "strategy1_not_found" };
                const evaluatedPlus = this.evaluateConditionBlocks(st, "plus");
                const evaluatedMinus = this.evaluateConditionBlocks(st, "minus");
                const plusPool = this.getConditionBranchPoolState(evaluatedPlus);
                const minusPool = this.getConditionBranchPoolState(evaluatedMinus);
                const result = {
                    canBet: plusPool.result,
                    shouldEndCycle: false,
                    reason: plusPool.activeCount ? (plusPool.hasFalse ? "condition_pool_false" : "") : "condition_pool_not_used",
                    items: evaluatedPlus,
                    plusResult: plusPool.result,
                    minusResult: minusPool.result,
                };
                if (st.conditions?.lastResult) {
                    st.conditions.lastResult.canBet = !!result.canBet;
                    st.conditions.lastResult.shouldEndCycle = false;
                    st.conditions.lastResult.reason = (result.reason || "").toString();
                }
                st.runtime.activeBranch = this.getRuntimeActiveBranch(st, plusPool, minusPool);
                st.runtime.lastConditionBranchResults = { plus: plusPool, minus: minusPool };
                st.runtime.lastConditionResult = result;
                st.runtime.lastCycleAction = "checkConditions";
                this.updateUiCounters();
                return result;
            },

            parseNumberArray(text) {
                const raw = (text || "").toString();
                if (!raw.trim()) return [];
                return raw
                    .split(/[\s,;]+/g)
                    .map((chunk) => MEP.Utils.cleanToNum(chunk))
                    .filter((n) => Number.isFinite(n));
            },

            getCycleArrayItem(arr = [], stepIndex = 0) {
                if (!Array.isArray(arr) || !arr.length) return 0;
                const idx = Math.max(0, Math.floor(Number(stepIndex) || 0)) % arr.length;
                return Number(arr[idx]) || 0;
            },

            getStakePlanStatusText(plan = null) {
                const p = plan || {};
                if (p.ready) return "План ставки готов";
                const reason = (p.invalidReason || "").toString();
                const map = {
                    risk_percent_not_set: "Не задан процент риска",
                    start_stake_invalid: "Некорректная начальная ставка",
                    growth_factor_invalid: "Некорректный коэффициент приращения",
                    target_invalid: "Некорректный целевой множитель",
                    max_stake_exceeded: "Следующая ставка превышает допустимый лимит",
                    start_array_empty: "Массив начальных ставок пуст",
                    growth_array_empty: "Массив приращения пуст",
                    target_array_empty: "Массив целевых множителей пуст",
                    stake_invalid: "Некорректно рассчитана сумма ставки",
                    max_stake_not_allowed: "Лимит допустимой ставки не задан",
                    stake_plan_invalid: "План ставки невалиден",
                };
                return map[reason] || "План ставки не готов";
            },

            buildStakePlan() {
                const st = this.getState();
                if (!st) {
                    return {
                        betAmount: 0,
                        targetMultiplier: 0,
                        maxAllowedStake: 0,
                        riskCap: 0,
                        allowedByRisk: false,
                        sourceStep: "step_0",
                        calcMode: "fixed:factor",
                        ready: false,
                        invalidReason: "strategy1_not_found",
                    };
                }
                const currentBalance = Math.max(0, Number(this.getCurrentBalance()) || 0);
                const lossCount = Math.max(0, Math.floor(Number(st.cycle?.lossCount) || 0));
                const stepIndex = lossCount;
                const sourceStep = `step_${stepIndex}`;
                const startMode = st.config?.startStakeMode === "array" ? "array" : "fixed";
                const growthMode = st.config?.stakeGrowthMode === "array" ? "array" : "factor";
                const targetMode = st.config?.targetMode === "array" ? "array" : "fixed";

                const plan = {
                    betAmount: 0,
                    targetMultiplier: 0,
                    maxAllowedStake: 0,
                    riskCap: 0,
                    allowedByRisk: false,
                    sourceStep,
                    calcMode: `${startMode}:${growthMode}`,
                    ready: false,
                    invalidReason: "",
                };

                const riskPercent = Number(st.config?.riskPercent) || 0;
                if (!(riskPercent > 0)) {
                    plan.invalidReason = "risk_percent_not_set";
                } else {
                    const riskCap = currentBalance * (riskPercent / 100);
                    plan.riskCap = Number.isFinite(riskCap) && riskCap > 0 ? riskCap : 0;
                    const charterMaxStakePercent = Number(MEP.State?.charterMaxStakePercent) || 0;
                    const charterCap =
                        charterMaxStakePercent > 0 ? currentBalance * (charterMaxStakePercent / 100) : 0;
                    const hasRiskCap = plan.riskCap > 0;
                    const hasCharterCap = charterCap > 0;
                    if (hasRiskCap && hasCharterCap) plan.maxAllowedStake = Math.min(plan.riskCap, charterCap);
                    else if (hasRiskCap) plan.maxAllowedStake = plan.riskCap;
                    else if (hasCharterCap) plan.maxAllowedStake = charterCap;
                    else plan.maxAllowedStake = 0;
                    plan.allowedByRisk = plan.maxAllowedStake > 0;
                }

                let baseStake = 0;
                if (!plan.invalidReason) {
                    if (startMode === "array") {
                        const startArr = this.parseNumberArray(st.config?.startStakeArrayText);
                        if (!startArr.length) plan.invalidReason = "start_array_empty";
                        else baseStake = this.getCycleArrayItem(startArr, stepIndex);
                    } else {
                        baseStake = Number(st.config?.startStakeValue) || 0;
                        if (!(baseStake > 0)) plan.invalidReason = "start_stake_invalid";
                    }
                }

                if (!plan.invalidReason) {
                    if (growthMode === "array") {
                        const growthArr = this.parseNumberArray(st.config?.stakeGrowthArrayText);
                        if (!growthArr.length) {
                            plan.invalidReason = "growth_array_empty";
                        } else {
                            const growthMultiplier = this.getCycleArrayItem(growthArr, stepIndex);
                            plan.betAmount = baseStake * growthMultiplier;
                        }
                    } else {
                        const factor = Number(st.config?.stakeGrowthFactor);
                        if (!Number.isFinite(factor) || factor <= 0) {
                            plan.invalidReason = "growth_factor_invalid";
                        } else if (stepIndex === 0) {
                            plan.betAmount = baseStake;
                        } else {
                            plan.betAmount = baseStake * Math.pow(factor, stepIndex);
                        }
                    }
                }

                if (!plan.invalidReason) {
                    if (targetMode === "array") {
                        const targetArr = this.parseNumberArray(st.config?.targetMultiplierArrayText);
                        if (!targetArr.length) plan.invalidReason = "target_array_empty";
                        else plan.targetMultiplier = this.getCycleArrayItem(targetArr, stepIndex);
                    } else {
                        plan.targetMultiplier = Number(st.config?.targetMultiplierValue) || 0;
                    }
                    if (!plan.invalidReason && (!Number.isFinite(plan.targetMultiplier) || plan.targetMultiplier <= 1)) {
                        plan.invalidReason = "target_invalid";
                    }
                }

                if (!plan.invalidReason) {
                    if (!Number.isFinite(plan.betAmount) || plan.betAmount <= 0) {
                        plan.invalidReason = "stake_invalid";
                    } else if (!(plan.maxAllowedStake > 0)) {
                        plan.invalidReason = "max_stake_not_allowed";
                    } else if (plan.betAmount > plan.maxAllowedStake) {
                        plan.invalidReason = "max_stake_exceeded";
                    }
                }

                plan.ready = !plan.invalidReason;

                st.stakePlan = {
                    ...st.stakePlan,
                    ...plan,
                };
                st.runtime.lastStakePlanResult = { ...plan };
                st.runtime.lastCycleAction = "buildStakePlan";
                this.updateUiCounters();
                return { ...plan };
            },

            normalizeRoundResult(result = {}) {
                const raw = result && typeof result === "object" ? result : {};
                const balanceNum = Number(raw.balance);
                const stakeNum = Number(raw.stake);
                const targetNum = Number(raw.targetMultiplier);
                const tsNum = Number(raw.ts);
                const rawMultiplierNum = Number(raw.rawMultiplier);
                const fallbackBalance = this.getCurrentBalance();
                const roundIdRaw = raw.roundId !== undefined && raw.roundId !== null ? String(raw.roundId).trim() : "";
                return {
                    balance: Number.isFinite(balanceNum) ? balanceNum : fallbackBalance,
                    stake: Number.isFinite(stakeNum) ? stakeNum : 0,
                    targetMultiplier: Number.isFinite(targetNum) ? targetNum : 0,
                    won: !!raw.won,
                    lost: !!raw.lost,
                    roundId: roundIdRaw,
                    ts: Number.isFinite(tsNum) && tsNum > 0 ? tsNum : Date.now(),
                    rawMultiplier: Number.isFinite(rawMultiplierNum) ? rawMultiplierNum : null,
                    resultKind: (raw.resultKind || "").toString(),
                };
            },

            deriveRoundOutcome(normalizedResult = {}, previousBalance = 0) {
                const n = normalizedResult && typeof normalizedResult === "object" ? normalizedResult : {};
                const nextBalance = Number(n.balance);
                const prevBalance = Number(previousBalance);
                const targetMultiplier = Number(n.targetMultiplier);
                const rawMultiplier = Number(n.rawMultiplier);
                if (n.won === true) return { isWin: true, isLoss: false, isUnknown: false, outcomeCode: "win" };
                if (n.lost === true) return { isWin: false, isLoss: true, isUnknown: false, outcomeCode: "loss" };
                if (Number.isFinite(rawMultiplier) && Number.isFinite(targetMultiplier) && targetMultiplier > 1) {
                    if (rawMultiplier >= targetMultiplier) return { isWin: true, isLoss: false, isUnknown: false, outcomeCode: "win" };
                    if (rawMultiplier < targetMultiplier) return { isWin: false, isLoss: true, isUnknown: false, outcomeCode: "loss" };
                }
                if (Number.isFinite(nextBalance) && Number.isFinite(prevBalance)) {
                    if (nextBalance > prevBalance) return { isWin: true, isLoss: false, isUnknown: false, outcomeCode: "win" };
                    if (nextBalance < prevBalance) return { isWin: false, isLoss: true, isUnknown: false, outcomeCode: "loss" };
                }
                return { isWin: false, isLoss: false, isUnknown: true, outcomeCode: "unknown" };
            },

            updateAfterRound(result = {}) {
                const st = this.getState();
                if (!st) {
                    return {
                        applied: false,
                        reason: "strategy1_not_found",
                        outcome: "unknown",
                        finished: false,
                        finishReason: "",
                        cycleSnapshot: null,
                        permission: null,
                    };
                }
                if (!st.enabled) {
                    this.updateUiCounters();
                    return {
                        applied: false,
                        reason: "strategy_disabled",
                        outcome: "unknown",
                        finished: false,
                        finishReason: "",
                        cycleSnapshot: null,
                        permission: null,
                    };
                }
                if (!st.cycle?.isActive) {
                    this.updateUiCounters();
                    return {
                        applied: false,
                        reason: "cycle_inactive",
                        outcome: "unknown",
                        finished: false,
                        finishReason: "",
                        cycleSnapshot: null,
                        permission: null,
                    };
                }

                const normalized = this.normalizeRoundResult(result);
                const previousRoundId = (st.runtime?.lastProcessedRoundId || "").toString();
                if (normalized.roundId && previousRoundId && normalized.roundId === previousRoundId) {
                    this.pushSystemMessage({
                        level: "warn",
                        action: "updateAfterRound",
                        text: "Результат раунда пропущен: duplicate roundId",
                        code: "duplicate_round",
                        stage: "post_round",
                        reason: "duplicate_round",
                        payload: { roundId: normalized.roundId },
                    });
                    this.updateUiCounters();
                    return {
                        applied: false,
                        reason: "duplicate_round",
                        outcome: "unknown",
                        finished: false,
                        finishReason: "",
                        cycleSnapshot: st.runtime?.lastCycleSnapshot ? { ...st.runtime.lastCycleSnapshot } : null,
                        permission: st.runtime?.lastBetPermissionResult ? { ...st.runtime.lastBetPermissionResult } : null,
                    };
                }

                const previousCycleBalance = Number(st.cycle.currentBalance) || 0;
                const outcome = this.deriveRoundOutcome(normalized, previousCycleBalance);

                st.cycle.currentBalance = normalized.balance;
                st.cycle.cyclePnL = normalized.balance - (Number(st.cycle.startBalance) || 0);
                st.cycle.roundCount = (Number(st.cycle.roundCount) || 0) + 1;
                st.cycle.lastStake = normalized.stake;
                st.cycle.lastTargetMultiplier = normalized.targetMultiplier;
                st.cycle.totalStakeSum = (Number(st.cycle.totalStakeSum) || 0) + normalized.stake;
                if (outcome.isLoss) st.cycle.lossCount = (Number(st.cycle.lossCount) || 0) + 1;
                if (outcome.isWin) st.cycle.winCount = (Number(st.cycle.winCount) || 0) + 1;
                st.cycle.stepIndex = Math.max(0, Number(st.cycle.lossCount) || 0);

                st.counters.currentBalanceAfterRound = normalized.balance;
                st.counters.lastStake = normalized.stake;
                st.counters.totalStakeSumInCycle = st.cycle.totalStakeSum;
                st.counters.lossRoundCount = st.cycle.lossCount;
                st.counters.winRoundCount = st.cycle.winCount;

                st.timers.lastRoundResultAtTs = normalized.ts;
                st.timers.lastRoundFinishedAtTs = normalized.ts;

                if (normalized.roundId) st.runtime.lastProcessedRoundId = normalized.roundId;
                st.runtime.waitingRoundResult = false;
                st.runtime.lastCycleAction = "updateAfterRound";
                st.runtime.lastRoundOutcome = outcome.outcomeCode;
                st.runtime.lastRoundResult = { ...normalized };

                this.pushEvent("round", normalized.ts);
                if (outcome.isWin) this.pushEvent("win", normalized.ts);
                if (outcome.isLoss) this.pushEvent("loss", normalized.ts);
                if (outcome.outcomeCode === "win") {
                    this.announceStateTransition("round", this.EVENT_CODES.ROUND_WIN, {
                        roundId: normalized.roundId,
                    });
                } else if (outcome.outcomeCode === "loss") {
                    this.announceStateTransition("round", this.EVENT_CODES.ROUND_LOSS, {
                        roundId: normalized.roundId,
                    });
                } else {
                    this.announceStateTransition("round", this.EVENT_CODES.ROUND_UNKNOWN, {
                        roundId: normalized.roundId,
                    });
                }

                let finishReason = "";
                if (this.isProfitReached()) finishReason = "profit_reached";
                else if (this.isMaxLossesReached()) finishReason = "max_losses_reached";
                else {
                    const stopMinusCount = Math.max(0, Math.floor(Number(st.config?.stopMinusCount) || 0));
                    if (stopMinusCount > 0 && Number(st.cycle.lossCount) >= stopMinusCount) {
                        finishReason = "stop_minus_reached";
                    }
                }

                let finished = false;
                if (
                    finishReason === "profit_reached" ||
                    finishReason === "max_losses_reached" ||
                    finishReason === "stop_minus_reached"
                ) {
                    this.finishCycle(finishReason);
                    if (finishReason === "stop_minus_reached" && st.enabled) {
                        this.startCycle();
                    }
                    finished = true;
                }

                const cycleSnapshot = {
                    cycleId: (st.cycle.cycleId || "").toString(),
                    currentBalance: Number(st.cycle.currentBalance) || 0,
                    cyclePnL: Number(st.cycle.cyclePnL) || 0,
                    totalStakeSum: Number(st.cycle.totalStakeSum) || 0,
                    roundCount: Number(st.cycle.roundCount) || 0,
                    lossCount: Number(st.cycle.lossCount) || 0,
                    winCount: Number(st.cycle.winCount) || 0,
                    endReason: (st.cycle.endReason || "").toString(),
                };
                st.runtime.lastCycleSnapshot = { ...cycleSnapshot };

                if (st.runtime?.waitingBalanceRecoveryActive) {
                    this.refreshWaitingBalanceRecovery();
                }
                const permission = this.evaluateDecisionState();
                this.pushSystemMessage({
                    level: "ok",
                    action: "updateAfterRound",
                    text: this.formatSystemMessageText("updateAfterRound", { applied: true }),
                    code: finished ? "round_applied_and_finished" : "round_applied",
                    stage: "post_round",
                    reason: finished ? finishReason : "",
                    branch: (permission?.branch || "").toString(),
                    payload: { outcome: outcome.outcomeCode, finished },
                });
                this.updateUiCounters();

                return {
                    applied: true,
                    reason: "",
                    outcome: outcome.outcomeCode,
                    finished,
                    finishReason: finished ? finishReason : "",
                    cycleSnapshot,
                    permission: permission ? { ...permission } : null,
                };
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

            normalizeDecisionResult(result = {}) {
                const safe = result && typeof result === "object" ? result : {};
                const branchRaw = (safe.branch || "").toString();
                const statusCodeRaw = (safe.statusCode || "").toString();
                return {
                    allowed: !!safe.allowed,
                    shouldEndCycle: !!safe.shouldEndCycle,
                    branch: branchRaw === "first" || branchRaw === "second" ? branchRaw : "",
                    stage: (safe.stage || "init").toString(),
                    reason: (safe.reason || "").toString(),
                    statusCode: statusCodeRaw || this.DECISION_STATUS.IDLE,
                    statusText: (safe.statusText || "Стратегия в ожидании").toString(),
                    details: safe.details && typeof safe.details === "object" ? { ...safe.details } : {},
                };
            },

            evaluateBetPermission() {
                const st = this.getState();
                const fallback = this.normalizeDecisionResult({
                    allowed: false,
                    shouldEndCycle: false,
                    branch: "",
                    stage: "init",
                    reason: "strategy1_not_found",
                    statusCode: this.DECISION_STATUS.IDLE,
                    statusText: "Стратегия в ожидании",
                    details: {},
                });
                if (!st) return fallback;

                let result = this.normalizeDecisionResult({
                    allowed: false,
                    shouldEndCycle: false,
                    branch: "",
                    stage: "init",
                    reason: "",
                    statusCode: this.DECISION_STATUS.IDLE,
                    statusText: "Стратегия в ожидании",
                    details: {},
                });

                if (!st.enabled) {
                    result = this.normalizeDecisionResult({
                        ...result,
                        stage: "disabled",
                        statusCode: this.DECISION_STATUS.IDLE,
                        statusText: "Стратегия выключена",
                    });
                } else if (st.runtime?.waitingBalanceRecoveryActive) {
                    const waitingRefresh = this.refreshWaitingBalanceRecovery();
                    const reached = !!waitingRefresh?.reached;
                    const waitingReason = (st.runtime.waitingBalanceRecoveryReason || "waiting_balance_recovery").toString();
                    result = this.normalizeDecisionResult({
                        ...result,
                        allowed: false,
                        shouldEndCycle: false,
                        branch: "",
                        stage: "waiting_balance_recovery",
                        reason: reached ? "balance_recovered" : waitingReason,
                        statusCode: this.DECISION_STATUS.WAITING_BALANCE_RECOVERY,
                        statusText: reached
                            ? "Баланс восстановлен — можно запускать новый цикл вручную"
                            : "Ожидание восстановления баланса",
                        details: {
                            targetBalance: Number(st.runtime.waitingBalanceRecoveryTargetBalance) || 0,
                            currentBalance: Number(st.runtime.waitingBalanceRecoveryCurrentBalance) || 0,
                            reached,
                        },
                    });
                } else if (!st.cycle?.isActive) {
                    const endReason = (st.cycle?.endReason || "").toString().trim();
                    result = this.normalizeDecisionResult({
                        ...result,
                        stage: "cycle_inactive",
                        reason: endReason,
                        statusCode: this.DECISION_STATUS.IDLE,
                        statusText: endReason ? "Цикл завершён" : "Ожидание запуска цикла",
                    });
                } else {
                    if (st.runtime?.manualPauseActive) {
                        result = this.normalizeDecisionResult({
                            ...result,
                            allowed: false,
                            shouldEndCycle: false,
                            branch: "",
                            stage: "manual_pause",
                            reason: (st.runtime.manualPauseReason || "manual_pause").toString(),
                            statusCode: this.DECISION_STATUS.PAUSED_MANUAL,
                            statusText: this.getManualPauseStatusText(st.runtime.manualPauseReason || "manual_pause"),
                            details: {
                                manualPauseActive: true,
                                manualPauseReason: (st.runtime.manualPauseReason || "").toString(),
                                manualPauseAtTs: Number(st.runtime.manualPauseAtTs) || 0,
                            },
                        });
                    } else {
                        const charter = this.checkCharter();
                        if (charter && charter.allowed === false) {
                            result = this.normalizeDecisionResult({
                                ...result,
                                stage: "charter",
                                reason: (charter.blockReason || "").toString(),
                                statusCode: this.DECISION_STATUS.CHARTER_BLOCKED,
                                statusText: this.getCharterBlockStatusText(charter.blockReason),
                                details: { charter: { ...charter } },
                            });
                        } else {
                            const branchInfo = this.routeBranch();
                            const branch = (branchInfo?.branch || "").toString();
                            if (!branch) {
                                result = this.normalizeDecisionResult({
                                    ...result,
                                    stage: "routing",
                                    reason: (branchInfo?.reason || "branch_not_selected").toString(),
                                    statusCode: this.DECISION_STATUS.WAITING_SIGNAL,
                                    statusText: this.getBranchStatusText(branchInfo),
                                    details: { branchInfo: { ...(branchInfo || {}) } },
                                });
                            } else if (branch === "first") {
                                const first = this.checkFirstBranch();
                                if (!first?.passed) {
                                    result = this.normalizeDecisionResult({
                                        ...result,
                                        branch: "first",
                                        stage: "first_branch",
                                        reason: (first?.failedAt || "").toString(),
                                        statusCode: this.DECISION_STATUS.WAITING_SIGNAL,
                                        statusText: (first?.statusText || "Раунд пропускаем — ждём сигнал первой ветки").toString(),
                                        details: { firstBranch: { ...(first || {}) } },
                                    });
                                } else {
                                    const plan = this.buildStakePlan();
                                    if (!plan?.ready) {
                                        result = this.normalizeDecisionResult({
                                            ...result,
                                            branch: "first",
                                            stage: "stake_plan",
                                            reason: (plan?.invalidReason || "stake_plan_invalid").toString(),
                                            statusCode: this.DECISION_STATUS.WAITING_SIGNAL,
                                            statusText: this.getStakePlanStatusText(plan),
                                            details: { stakePlan: { ...(plan || {}) } },
                                        });
                                    } else {
                                        result = this.normalizeDecisionResult({
                                            ...result,
                                            allowed: true,
                                            branch: "first",
                                            stage: "ready",
                                            reason: "",
                                            statusCode: this.DECISION_STATUS.BET_ALLOWED,
                                            statusText: "Первая ветка пройдена — план ставки готов",
                                            details: { firstBranch: { ...(first || {}) }, stakePlan: { ...(plan || {}) } },
                                        });
                                    }
                                }
                            } else {
                                const second = this.checkSecondBranch();
                                if (!second?.passed && second?.shouldEndCycle) {
                                    result = this.normalizeDecisionResult({
                                        ...result,
                                        allowed: false,
                                        shouldEndCycle: true,
                                        branch: "second",
                                        stage: "second_branch",
                                        reason: (second?.endReason || second?.failedAt || "").toString(),
                                        statusCode: this.DECISION_STATUS.CYCLE_SHOULD_END,
                                        statusText: (second?.statusText || "Цикл завершён — достигнут максимальный уровень ставки").toString(),
                                        details: { secondBranch: { ...(second || {}) } },
                                    });
                                } else if (!second?.passed) {
                                    result = this.normalizeDecisionResult({
                                        ...result,
                                        allowed: false,
                                        shouldEndCycle: false,
                                        branch: "second",
                                        stage: "second_branch",
                                        reason: (second?.failedAt || second?.waitReason || "").toString(),
                                        statusCode: this.DECISION_STATUS.WAITING_SIGNAL,
                                        statusText: (second?.statusText || "Раунд пропускаем — ждём сигнал второй ветки").toString(),
                                        details: { secondBranch: { ...(second || {}) } },
                                    });
                                } else {
                                    result = this.normalizeDecisionResult({
                                        ...result,
                                        allowed: true,
                                        shouldEndCycle: false,
                                        branch: "second",
                                        stage: "ready",
                                        reason: "",
                                        statusCode: this.DECISION_STATUS.BET_ALLOWED,
                                        statusText: "Вторая ветка пройдена — ставка разрешена",
                                        details: { secondBranch: { ...(second || {}) } },
                                    });
                                }
                            }
                        }
                    }
                }

                if (result.shouldEndCycle) {
                    const lastCode = (st.runtime?.lastActionResponse?.code || "").toString();
                    const nextCode = `permission_cycle_should_end:${result.reason || "unknown"}`;
                    if (lastCode !== nextCode) {
                        this.pushSystemMessage({
                            level: "warn",
                            action: "evaluateBetPermission",
                            text: "Цикл должен быть завершён по результату проверки допуска",
                            code: nextCode,
                            stage: result.stage || "",
                            reason: result.reason || "",
                            branch: result.branch || "",
                            payload: { shouldEndCycle: true },
                        });
                    }
                }
                const decisionCode = (result.statusCode || "").toString();
                const charterMarker = "__charter_blocked__";
                const lastPermissionStateBefore = (st.runtime?.lastAnnouncedPermissionReason || "").toString();
                if (decisionCode === this.DECISION_STATUS.CHARTER_BLOCKED && lastPermissionStateBefore !== charterMarker) {
                    st.runtime.lastAnnouncedPermissionReason = charterMarker;
                    this.announceStateTransition("permission", this.EVENT_CODES.CHARTER_BLOCKED, {
                        reason: result.reason || "",
                        branch: result.branch || "",
                    });
                } else if (decisionCode !== this.DECISION_STATUS.CHARTER_BLOCKED && lastPermissionStateBefore === charterMarker) {
                    st.runtime.lastAnnouncedPermissionReason = "";
                }
                const branchCode = result.branch === "first" ? "first" : result.branch === "second" ? "second" : "";
                const previousBranchCode = (st.runtime?.lastAnnouncedBranchState || "").toString();
                if (branchCode && previousBranchCode !== branchCode) {
                    st.runtime.lastAnnouncedBranchState = branchCode;
                    this.announceStateTransition(
                        "branch",
                        branchCode === "first" ? this.EVENT_CODES.BRANCH_FIRST : this.EVENT_CODES.BRANCH_SECOND,
                        { branch: branchCode, reason: result.reason || "" }
                    );
                } else if (!branchCode && previousBranchCode) {
                    st.runtime.lastAnnouncedBranchState = "";
                }
                if (result.branch === "first") {
                    const firstStateCode = result.allowed ? "first_pass" : "first_fail";
                    if (st.runtime.lastAnnouncedDecisionCode !== `first:${firstStateCode}`) {
                        st.runtime.lastAnnouncedDecisionCode = `first:${firstStateCode}`;
                        this.announceStateTransition(
                            "first_branch",
                            result.allowed ? this.EVENT_CODES.FIRST_BRANCH_PASS : this.EVENT_CODES.FIRST_BRANCH_FAIL,
                            { reason: result.reason || "", branch: "first" }
                        );
                    }
                } else if (result.branch === "second") {
                    let secondStateCode = "second_fail";
                    let secondCode = this.EVENT_CODES.SECOND_BRANCH_FAIL;
                    if (result.allowed) {
                        secondStateCode = "second_pass";
                        secondCode = this.EVENT_CODES.SECOND_BRANCH_PASS;
                    } else if (result.shouldEndCycle) {
                        secondStateCode = "second_should_end";
                        secondCode = this.EVENT_CODES.SECOND_BRANCH_SHOULD_END;
                    }
                    if (st.runtime.lastAnnouncedDecisionCode !== `second:${secondStateCode}`) {
                        st.runtime.lastAnnouncedDecisionCode = `second:${secondStateCode}`;
                        this.announceStateTransition("second_branch", secondCode, {
                            reason: result.reason || "",
                            branch: "second",
                        });
                    }
                }
                const canBetNow = !!result.allowed;
                const lastPermissionState = (st.runtime?.lastAnnouncedPermissionReason || "").toString();
                const canBetPrev = lastPermissionState === "__allowed__";
                if (canBetNow && !canBetPrev) {
                    st.runtime.lastAnnouncedPermissionReason = "__allowed__";
                    this.announceStateTransition("permission", this.EVENT_CODES.BET_ALLOWED, {
                        branch: result.branch || "",
                    });
                } else if (!canBetNow && canBetPrev) {
                    const denyReason = (result.reason || "").toString();
                    const previousDenyReason = lastPermissionState;
                    if (denyReason !== previousDenyReason) {
                        st.runtime.lastAnnouncedPermissionReason = denyReason;
                        this.announceStateTransition("permission", this.EVENT_CODES.BET_DENIED, {
                            reason: denyReason,
                            branch: result.branch || "",
                        });
                    }
                } else if (!canBetNow && !canBetPrev) {
                    const denyReason = (result.reason || "").toString();
                    if (denyReason && denyReason !== lastPermissionState) {
                        st.runtime.lastAnnouncedPermissionReason = denyReason;
                        this.announceStateTransition("permission", this.EVENT_CODES.BET_DENIED, {
                            reason: denyReason,
                            branch: result.branch || "",
                        });
                    }
                }
                if (!canBetNow && !lastPermissionState) {
                    st.runtime.lastAnnouncedPermissionReason = (result.reason || "").toString();
                }
                if (st.conditions?.lastResult) {
                    st.conditions.lastResult.canBet = !!result.allowed;
                    st.conditions.lastResult.shouldEndCycle = !!result.shouldEndCycle;
                    st.conditions.lastResult.reason = (result.reason || "").toString();
                }
                st.runtime.lastBetPermissionResult = { ...result };
                st.runtime.lastCycleAction = "evaluateBetPermission";
                return { ...result };
            },

            evaluateDecisionState() {
                const st = this.getState();
                if (!st) return null;
                const permission = this.evaluateBetPermission();
                this.updateDecisionState({
                    canMakeBet: !!permission.allowed,
                    shouldEndCycle: !!permission.shouldEndCycle,
                    statusCode: permission.statusCode || this.DECISION_STATUS.IDLE,
                    statusText: (permission.statusText || "Стратегия в ожидании").toString(),
                    branch: (permission.branch || "").toString(),
                    waitReason: (permission.reason || "").toString(),
                });
                this.updateUiCounters();
                return permission;
            },

            updateUiCounters() {
                const st = this.getState();
                const ui = MEP.UI?.ui;
                if (!st || !ui) return;
                this.checkExecutionTimeout();
                MEP.UI.renderStrategyMinimalUi();
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
                MEP.UI.syncStrategiesUiState();
            },

            getStrategyState(strategyId = "") {
                return MEP.State?.strategies?.[strategyId] || null;
            },

            canEnableStrategy(strategyId = "") {
                const id = (strategyId || "").toString();
                if (!id) return false;
                const otherId = id === "strategy1" ? "strategy2" : "strategy1";
                const own = MEP.UI.getStrategyState(id);
                const other = MEP.UI.getStrategyState(otherId);
                if (!own) return false;
                if (own.enabled) return true;
                if (other?.enabled) return false;
                const active = (MEP.State?.activeStrategyId || "").toString();
                return !active || active === id;
            },

            formatStrategy1Timer(ms = 0) {
                const totalSec = Math.max(0, Math.floor((Number(ms) || 0) / 1000));
                const hh = String(Math.floor(totalSec / 3600)).padStart(2, "0");
                const mm = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
                const ss = String(totalSec % 60).padStart(2, "0");
                return `${hh}:${mm}:${ss}`;
            },

            formatCurrentDateTimeParts(ts = Date.now()) {
                const d = new Date(Number(ts) || Date.now());
                const dd = String(d.getDate()).padStart(2, "0");
                const mm = String(d.getMonth() + 1).padStart(2, "0");
                const yy = String(d.getFullYear()).slice(-2);
                const hh = String(d.getHours()).padStart(2, "0");
                const mi = String(d.getMinutes()).padStart(2, "0");
                const ss = String(d.getSeconds()).padStart(2, "0");
                return { date: `${dd}.${mm}.${yy}`, time: `${hh}:${mi}:${ss}` };
            },

            readCurrentBalanceFromDom() {
                const wrap = document.querySelector('[data-testid="coin-toggle-default-wrap"]');
                if (!wrap) return { amount: 0, amountText: "0", iconHtml: "◎" };
                const amountEl = wrap.querySelector('span[data-ds-text="true"]');
                const raw = (amountEl?.textContent || "0").replace(",", ".").replace(/[^\d.\-]/g, "");
                const amount = Number(raw);
                const iconSvg = wrap.querySelector('svg[data-ds-icon]');
                const amountText = Number.isFinite(amount) ? amount.toFixed(8).replace(/\.?0+$/, "") : "0";
                return { amount: Number.isFinite(amount) ? amount : 0, amountText, iconHtml: iconSvg ? iconSvg.outerHTML : "◎" };
            },

            formatCoinValue(v) {
                const n = Number(v);
                if (!Number.isFinite(n)) return "0";
                return n.toFixed(8).replace(/\.?0+$/, "").replace(".", ",");
            },

            getStrategy1SelectedConditionBranch(st = null) {
                const s = st || MEP.UI.getStrategyState("strategy1");
                if (!s) return "plus";
                const cfg = s.config && typeof s.config === "object" ? s.config : (s.config = {});
                const branch = (cfg.conditionSelectedBranch || "plus").toString().trim().toLowerCase();
                const safe = branch === "minus" ? "minus" : "plus";
                cfg.conditionSelectedBranch = safe;
                return safe;
            },

            setStrategy1SelectedConditionBranch(branch = "plus") {
                const st = MEP.UI.getStrategyState("strategy1");
                if (!st) return;
                const cfg = st.config && typeof st.config === "object" ? st.config : (st.config = {});
                const safe = (branch || "").toString().trim().toLowerCase() === "minus" ? "minus" : "plus";
                if (cfg.conditionSelectedBranch === safe) return;
                cfg.conditionSelectedBranch = safe;
                MEP.Storage.save();
                MEP.UI.renderStrategy1MinimalUi(MEP.UI.getStrategyState("strategy1"));
            },

            getStrategy1ConditionBlocks(st = null, branch = null) {
                const s = st || MEP.UI.getStrategyState("strategy1");
                const selected = branch || MEP.UI.getStrategy1SelectedConditionBranch(s);
                return MEP.Strategy1?.ensureConditionBlocks?.(s, selected) || buildStrategy1ConditionBlocksDefault();
            },

            removeConditionIdFromStrategyPool(strategyId = "strategy1", objectId = "") {
                const sid = (strategyId || "strategy1").toString().trim().toLowerCase();
                const id = (objectId || "").toString().trim();
                if (!id) return false;
                const st = MEP.UI.getStrategyState(sid);
                if (!st || !st.config || typeof st.config !== "object") return false;
                if (!Array.isArray(st.config.conditionPoolIds)) st.config.conditionPoolIds = [];
                const prevLen = st.config.conditionPoolIds.length;
                st.config.conditionPoolIds = st.config.conditionPoolIds.map((x) => (x ?? "").toString().trim()).filter((x) => x && x !== id);
                return st.config.conditionPoolIds.length !== prevLen;
            },

            setStrategy1ConditionEnabled(blockType = "", enabled = false) {
                const st = MEP.UI.getStrategyState("strategy1");
                if (!st) return;
                const type = (blockType || "").toString().trim().toLowerCase();
                const blocks = MEP.UI.getStrategy1ConditionBlocks(st);
                if (!blocks[type]) return;
                blocks[type].enabled = !!enabled;
                MEP.Storage.save();
                MEP.Strategy1?.checkConditions?.();
            },

            setStrategy1StreakThreshold(value = 0) {
                const st = MEP.UI.getStrategyState("strategy1");
                if (!st) return;
                const blocks = MEP.UI.getStrategy1ConditionBlocks(st);
                let threshold = Math.floor(Number(value));
                if (!Number.isFinite(threshold) || threshold < 0) threshold = 0;
                blocks.streak_lt.params.threshold = threshold;
                MEP.Storage.save();
                MEP.Strategy1?.checkConditions?.();
            },

            setStrategy1DiffMode(mode = "gt") {
                const st = MEP.UI.getStrategyState("strategy1");
                if (!st) return;
                const blocks = MEP.UI.getStrategy1ConditionBlocks(st);
                const m = (mode || "").toString().trim().toLowerCase();
                blocks.diff_vector_state.params.mode = m === "lt" || m === "flat" ? m : "gt";
                MEP.Storage.save();
                MEP.Strategy1?.checkConditions?.();
            },

            setStrategy1FrequencyMode(mode = "gt") {
                const st = MEP.UI.getStrategyState("strategy1");
                if (!st) return;
                const blocks = MEP.UI.getStrategy1ConditionBlocks(st);
                const m = (mode || "").toString().trim().toLowerCase();
                blocks.frequency_vector_state.params.mode = m === "lt" || m === "flat" ? m : "gt";
                MEP.Storage.save();
                MEP.Strategy1?.checkConditions?.();
            },

            setStrategy1FrequencyLineThreshold(value = 0) {
                const st = MEP.UI.getStrategyState("strategy1");
                if (!st) return;
                const blocks = MEP.UI.getStrategy1ConditionBlocks(st);
                let threshold = Math.floor(Number(value));
                if (!Number.isFinite(threshold) || threshold < 0) threshold = 0;
                blocks.frequency_line_gt.params.threshold = threshold;
                MEP.Storage.save();
                MEP.Strategy1?.checkConditions?.();
            },

            setStrategy1StakePlayersMode(mode = "gt") {
                const st = MEP.UI.getStrategyState("strategy1");
                if (!st) return;
                const blocks = MEP.UI.getStrategy1ConditionBlocks(st);
                const m = (mode || "").toString().trim().toLowerCase();
                blocks.stake_players_vector_state.params.mode = m === "lt" || m === "flat" ? m : "gt";
                MEP.Storage.save();
                MEP.Strategy1?.checkConditions?.();
            },

            setStrategy1StakeBetMode(mode = "gt") {
                const st = MEP.UI.getStrategyState("strategy1");
                if (!st) return;
                const blocks = MEP.UI.getStrategy1ConditionBlocks(st);
                const m = (mode || "").toString().trim().toLowerCase();
                blocks.stake_bet_vector_state.params.mode = m === "lt" || m === "flat" ? m : "gt";
                MEP.Storage.save();
                MEP.Strategy1?.checkConditions?.();
            },

            setStrategy1StakePlayersThreshold(value = 0) {
                const st = MEP.UI.getStrategyState("strategy1");
                if (!st) return;
                const blocks = MEP.UI.getStrategy1ConditionBlocks(st);
                let threshold = Number(value);
                if (!Number.isFinite(threshold) || threshold < 0) threshold = 0;
                blocks.stake_players_line_gte.params.threshold = threshold;
                MEP.Storage.save();
                MEP.Strategy1?.checkConditions?.();
            },

            setStrategy1StakeBetThreshold(value = 0) {
                const st = MEP.UI.getStrategyState("strategy1");
                if (!st) return;
                const blocks = MEP.UI.getStrategy1ConditionBlocks(st);
                let threshold = Number(value);
                if (!Number.isFinite(threshold) || threshold < 0) threshold = 0;
                blocks.stake_bet_line_gte.params.threshold = threshold;
                MEP.Storage.save();
                MEP.Strategy1?.checkConditions?.();
            },

            calcStrategy1NextStakeByMode(baseStake = 0, st = null, stepIndex = 0) {
                const s = st || MEP.UI.getStrategyState("strategy1");
                if (!s) return 0;
                const safeBase = Number(baseStake) || 0;
                if (!(safeBase > 0)) return 0;
                const idx = Math.max(0, Math.floor(Number(stepIndex) || 0));
                const parse = MEP.Strategy1?.parseNumberArray?.bind(MEP.Strategy1);
                const growthArr = parse ? parse(s.config?.stakeGrowthArrayText) : [];
                if (growthArr.length === 1) {
                    const g = Number(growthArr[0]) || 0;
                    return g > 0 ? safeBase * Math.pow(g, idx) : 0;
                }
                if (growthArr.length > 1) {
                    const g = Number(growthArr[idx % growthArr.length]) || 0;
                    return g > 0 ? safeBase * g : 0;
                }
                const factor = Number(s.config?.stakeGrowthFactor);
                if (!Number.isFinite(factor) || factor <= 0) return 0;
                return safeBase * Math.pow(factor, idx);
            },

            getStrategy1CycleArrayActiveValue(text = "", stepIndex = 0) {
                const parse = MEP.Strategy1?.parseNumberArray?.bind(MEP.Strategy1);
                const arr = parse ? parse(text) : [];
                if (!arr.length) return 0;
                const idx = Math.max(0, Math.floor(Number(stepIndex) || 0)) % arr.length;
                return Number(arr[idx]) || 0;
            },

            getStrategy1TargetValueByStep(st = null, stepIndex = 0) {
                const s = st || MEP.UI.getStrategyState("strategy1");
                if (!s) return 0;
                const cfg = s.config && typeof s.config === "object" ? s.config : (s.config = {});
                const idx = Math.max(0, Math.floor(Number(stepIndex) || 0));
                const base = Math.max(0, Number(cfg.targetMultiplierValue) || 0);
                if (!(base > 0)) return 0;
                const parse = MEP.Strategy1?.parseNumberArray?.bind(MEP.Strategy1);
                const arr = parse ? parse(cfg.targetMultiplierArrayText) : [];
                if (arr.length === 1) {
                    const g = Number(arr[0]) || 0;
                    return g > 0 ? base * Math.pow(g, idx) : 0;
                }
                if (arr.length > 1) {
                    const g = Number(arr[idx % arr.length]) || 0;
                    return g > 0 ? base * g : 0;
                }
                const fallback = Number(cfg.targetMultiplierValue) || 0;
                return fallback > 0 ? fallback : 0;
            },

            getStrategy1TargetBaseValue(st = null) {
                const s = st || MEP.UI.getStrategyState("strategy1");
                if (!s) return 0;
                const cfg = s.config && typeof s.config === "object" ? s.config : (s.config = {});
                return Number(cfg.targetMultiplierValue) || 0;
            },

            formatStrategyTargetValue(value = 0) {
                const n = Number(value) || 0;
                if (!(n > 0)) return "0";
                if (Number.isInteger(n)) return String(n);
                return n.toFixed(4).replace(/\.?0+$/g, "");
            },

            formatStrategyStakeBaseValue(value = 0) {
                const n = Number(value) || 0;
                if (!(n > 0)) return "0";
                if (Number.isInteger(n)) return String(n);
                return n.toFixed(8).replace(/\.?0+$/g, "");
            },

            getStrategy1StakeServiceData(st = null) {
                const s = st || MEP.UI.getStrategyState("strategy1");
                if (!s) return null;
                const cfg = s.config && typeof s.config === "object" ? s.config : (s.config = {});
                const enabled = !!s.enabled;
                const currentBalance = Math.max(0, Number(MEP.UI.readCurrentBalanceFromDom().amount) || 0);
                const riskPercent = Math.max(0, Number(cfg.riskPercent) || 0);
                const fixedStart = Math.max(0, Number(cfg.startStakeValue) || 0);
                const percentStart = Math.max(0, currentBalance * (riskPercent / 100));
                const lossCount = enabled ? Math.max(0, Math.floor(Number(s.cycle?.lossCount) || 0)) : 0;
                const roundCount = enabled ? Math.max(0, Math.floor(Number(s.cycle?.roundCount) || 0)) : 0;
                const betCount = enabled ? Math.max(0, Math.floor(Number(s.cycle?.betCount) || 0)) : 0;
                const cycleNumber = enabled ? Math.max(0, Math.floor(Number(s.cycle?.cycleNumber) || 0)) : 0;
                const activeStakeGrowthMultiplier = MEP.UI.getStrategy1CycleArrayActiveValue(cfg.stakeGrowthArrayText, lossCount);
                const activeTargetMultiplier = MEP.UI.getStrategy1CycleArrayActiveValue(cfg.targetMultiplierArrayText, lossCount);
                const targetBaseValue = MEP.UI.getStrategy1TargetBaseValue(s);
                const targetLossCount = lossCount;
                const targetNextValue = MEP.UI.getStrategy1TargetValueByStep(s, lossCount);
                return {
                    mode: cfg.startStakeMode === "percent" ? "percent" : "fixed",
                    riskPercent,
                    lossCount,
                    fixedStart,
                    percentStart,
                    stakeGrowthArrayText: (cfg.stakeGrowthArrayText || "").toString(),
                    targetMultiplierArrayText: (cfg.targetMultiplierArrayText || "").toString(),
                    activeStakeGrowthMultiplier,
                    activeTargetMultiplier,
                    targetBaseValue,
                    targetLossCount,
                    targetNextValue,
                    cycleNumber,
                    cycleRoundCount: roundCount,
                    cycleBetCount: betCount,
                    cycleLossCount: lossCount,
                    nextFixed: MEP.UI.calcStrategy1NextStakeByMode(fixedStart, s, lossCount),
                    nextPercent: MEP.UI.calcStrategy1NextStakeByMode(percentStart, s, lossCount),
                };
            },

            getGameBetButton() {
                const s1 = MEP.Strategy1;
                const root = s1?.findSidebarRoot?.() || document;
                return (
                    s1?.findBetButton?.(root) ||
                    root.querySelector?.('button[data-testid="bet-button"]') ||
                    root.querySelector?.(".game-sidebar button") ||
                    null
                );
            },

            normalizeGameBetButtonText(text = "") {
                return (text || "").toString().replace(/\s+/g, " ").trim();
            },

            getGameBetButtonText() {
                const btn = MEP.UI.getGameBetButton();
                if (!btn) return "";
                return MEP.UI.normalizeGameBetButtonText(btn.innerText || btn.textContent || "");
            },

            resolveGamePhaseFromBetButtonText(text = "") {
                const t = MEP.UI.normalizeGameBetButtonText(text).toLowerCase();
                if (!t) return "";
                if (t.includes("сделать ставку") && t.includes("след")) return "game";
                if (t.includes("начинается")) return "launch";
                if (t === "ставка") return "bet";
                return "";
            },

            updateGamePhaseFromDom() {
                const text = MEP.UI.getGameBetButtonText();
                const phase = MEP.UI.resolveGamePhaseFromBetButtonText(text);
                MEP.State.gamePhase = phase;
                return phase;
            },

            renderGamePhaseRow() {
                const ui = MEP.UI.ui;
                if (!ui || !ui.gamePhaseRowEl) return;
                const phase = MEP.UI.updateGamePhaseFromDom();
                const cells = [ui.gamePhaseCellGameEl, ui.gamePhaseCellLaunchEl, ui.gamePhaseCellBetEl];
                for (const cell of cells) {
                    if (!cell) continue;
                    const key = (cell.dataset.phase || "").toString();
                    cell.classList.toggle("is-active", !!phase && phase === key);
                }
            },

            getGameAmountInput() {
                const s1 = MEP.Strategy1;
                const root = s1?.findSidebarRoot?.() || document;
                return s1?.findBetAmountInput?.(root) || root.querySelector?.('input[data-testid="input-game-amount"]') || null;
            },

            getGameTargetInput() {
                const s1 = MEP.Strategy1;
                const root = s1?.findSidebarRoot?.() || document;
                const byHelper = s1?.findTargetMultiplierInput?.(root);
                if (byHelper) return byHelper;
                const labels = root.querySelectorAll?.("label, div, span") || [];
                for (const node of labels) {
                    const text = (node.textContent || "").toString().toLowerCase();
                    if (!text.includes("целевой коэффициент")) continue;
                    const candidate =
                        node.querySelector?.('input[type="number"]') ||
                        node.parentElement?.querySelector?.('input[type="number"]') ||
                        node.closest?.("label, div")?.querySelector?.('input[type="number"]');
                    if (candidate) return candidate;
                }
                return root.querySelector?.('input[type="number"][min="1.01"]') || null;
            },

            setNativeInputValue(el, value) {
                if (!el) return false;
                const proto = Object.getPrototypeOf(el);
                const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
                const setter = descriptor?.set;
                try {
                    el.focus?.();
                    if (typeof setter === "function") setter.call(el, value);
                    else el.value = value;
                    el.dispatchEvent(new Event("input", { bubbles: true }));
                    el.dispatchEvent(new Event("change", { bubbles: true }));
                    el.blur?.();
                    return true;
                } catch (e) {
                    return false;
                }
            },

            formatGameNumericValue(value, fallback = "0") {
                const n = Number(value);
                if (!Number.isFinite(n) || n < 0) return fallback;
                const raw = n.toFixed(8).replace(/\.?0+$/, "");
                return raw && raw !== "-0" ? raw : fallback;
            },

            applyGameAmountValue(value) {
                const input = MEP.UI.getGameAmountInput();
                if (!input) {
                    console.warn("[MEP][Strategy1] amount input not found");
                    return false;
                }
                const text = MEP.UI.formatGameNumericValue(value, "0");
                return MEP.UI.setNativeInputValue(input, text);
            },

            applyGameTargetValue(value) {
                const input = MEP.UI.getGameTargetInput();
                if (!input) {
                    console.warn("[MEP][Strategy1] target input not found");
                    return false;
                }
                const text = MEP.UI.formatGameNumericValue(value, "2");
                return MEP.UI.setNativeInputValue(input, text);
            },

            setStrategy1StartStakeMode(mode = "fixed") {
                const st = MEP.UI.getStrategyState("strategy1");
                if (!st) return;
                const cfg = st.config && typeof st.config === "object" ? st.config : (st.config = {});
                const next = mode === "percent" ? "percent" : "fixed";
                if (cfg.startStakeMode === next) return;
                cfg.startStakeMode = next;
                MEP.Storage.save();
                MEP.Strategy1?.checkConditions?.();
                MEP.UI.renderStrategy1MinimalUi(MEP.UI.getStrategyState("strategy1"));
            },

            setStrategy1StakeGrowthArrayText(value = "") {
                const st = MEP.UI.getStrategyState("strategy1");
                if (!st) return;
                const cfg = st.config && typeof st.config === "object" ? st.config : (st.config = {});
                cfg.stakeGrowthArrayText = (value ?? "").toString();
                cfg.stakeGrowthMode = "array";
                MEP.Storage.save();
                MEP.Strategy1?.checkConditions?.();
                MEP.UI.renderStrategy1MinimalUi(MEP.UI.getStrategyState("strategy1"));
            },

            setStrategy1TargetMultiplierArrayText(value = "") {
                const st = MEP.UI.getStrategyState("strategy1");
                if (!st) return;
                const cfg = st.config && typeof st.config === "object" ? st.config : (st.config = {});
                cfg.targetMultiplierArrayText = (value ?? "").toString();
                cfg.targetMode = "array";
                MEP.Storage.save();
                MEP.Strategy1?.checkConditions?.();
                MEP.UI.renderStrategy1MinimalUi(MEP.UI.getStrategyState("strategy1"));
            },

            setStrategy1TargetBaseValue(value = "") {
                const st = MEP.UI.getStrategyState("strategy1");
                if (!st) return;
                const cfg = st.config && typeof st.config === "object" ? st.config : (st.config = {});
                let v = Number((value ?? "").toString().replace(",", "."));
                if (!Number.isFinite(v) || v <= 0) v = 0;
                cfg.targetMultiplierValue = v;
                cfg.targetMode = "fixed";
                MEP.Storage.save();
                MEP.Strategy1?.checkConditions?.();
                MEP.UI.renderStrategy1MinimalUi(MEP.UI.getStrategyState("strategy1"));
            },

            setStrategy1StartStakeBaseValue(value = "") {
                const st = MEP.UI.getStrategyState("strategy1");
                if (!st) return;
                const cfg = st.config && typeof st.config === "object" ? st.config : (st.config = {});
                let v = Number((value ?? "").toString().replace(",", "."));
                if (!Number.isFinite(v) || v < 0) v = 0;
                cfg.startStakeValue = v;
                cfg.startStakeMode = "fixed";
                MEP.Storage.save();
                MEP.Strategy1?.checkConditions?.();
                MEP.UI.renderStrategy1MinimalUi(MEP.UI.getStrategyState("strategy1"));
            },

            setStrategy1StopMinusCount(value = "") {
                const st = MEP.UI.getStrategyState("strategy1");
                if (!st) return;
                const cfg = st.config && typeof st.config === "object" ? st.config : (st.config = {});
                let v = Math.floor(Number((value ?? "").toString().replace(",", ".")));
                if (!Number.isFinite(v) || v < 0) v = 0;
                cfg.stopMinusCount = v;
                MEP.Storage.save();
                MEP.UI.renderStrategy1MinimalUi(MEP.UI.getStrategyState("strategy1"));
            },

            renderStrategy1ConditionBridge(st = null) {
                const ui = MEP.UI.ui;
                const s = st || MEP.UI.getStrategyState("strategy1");
                if (!ui || !s || !ui.strategy1CondListEl || !ui.strategy1CondSummaryEl) return;
                const activeEl = document.activeElement;
                let stakeServiceWrapEl = ui.strategy1CondWrapEl?.querySelector?.(".mep-strategy1-stake-service-wrap") || null;
                const isEditingConditionControl =
                    !!activeEl &&
                    ui.strategy1CondListEl.contains(activeEl) &&
                    (activeEl.classList.contains("mep-strategy1-cond-vector-mode") ||
                        activeEl.classList.contains("mep-strategy1-cond-threshold") ||
                        activeEl.classList.contains("mep-strategy1-cond-frequency-line-threshold"));
                const isEditingServiceArrayControl =
                    !!activeEl &&
                    !!stakeServiceWrapEl &&
                    stakeServiceWrapEl.contains(activeEl) &&
                    (activeEl.classList.contains("mep-strategy1-stake-growth-array-input") ||
                        activeEl.classList.contains("mep-strategy1-start-stake-base-input") ||
                        activeEl.classList.contains("mep-strategy1-target-multiplier-array-input") ||
                        activeEl.classList.contains("mep-strategy1-target-base-input") ||
                        activeEl.classList.contains("mep-strategy1-stop-minus-input") ||
                        activeEl.classList.contains("mep-strategy1-service-array-input"));
                if (isEditingConditionControl || isEditingServiceArrayControl) return;
                const selectedBranch = MEP.UI.getStrategy1SelectedConditionBranch(s);
                const blocks = MEP.UI.getStrategy1ConditionBlocks(s, selectedBranch);
                const evaluatedPlus = MEP.Strategy1?.evaluateConditionBlocks?.(s, "plus") || [];
                const evaluatedMinus = MEP.Strategy1?.evaluateConditionBlocks?.(s, "minus") || [];
                const evaluated = selectedBranch === "minus" ? evaluatedMinus : evaluatedPlus;
                const byKey = Object.create(null);
                for (const it of evaluated) byKey[it.key] = it;
                const plusPool = MEP.Strategy1?.getConditionBranchPoolState?.(evaluatedPlus) || { activeCount: 0, hasFalse: false, result: false };
                const minusPool = MEP.Strategy1?.getConditionBranchPoolState?.(evaluatedMinus) || { activeCount: 0, hasFalse: false, result: false };
                const activeBranch = MEP.Strategy1?.getRuntimeActiveBranch?.(s, plusPool, minusPool) || "";
                s.runtime = s.runtime && typeof s.runtime === "object" ? s.runtime : {};
                s.runtime.activeBranch = activeBranch;
                const currentPool = selectedBranch === "minus" ? minusPool : plusPool;
                const rows = [];
                const threshold = Math.max(0, Math.floor(Number(blocks?.streak_lt?.params?.threshold) || 0));
                const diffMode = (blocks?.diff_vector_state?.params?.mode || "gt").toString().trim().toLowerCase();
                const freqMode = (blocks?.frequency_vector_state?.params?.mode || "gt").toString().trim().toLowerCase();
                const freqLineThreshold = Math.max(0, Math.floor(Number(blocks?.frequency_line_gt?.params?.threshold) || 0));
                const stakePlayersMode = (blocks?.stake_players_vector_state?.params?.mode || "gt").toString().trim().toLowerCase();
                const stakeBetMode = (blocks?.stake_bet_vector_state?.params?.mode || "gt").toString().trim().toLowerCase();
                const stakePlayersLineThreshold = Math.max(0, Number(blocks?.stake_players_line_gte?.params?.threshold) || 0);
                const stakeBetLineThreshold = Math.max(0, Number(blocks?.stake_bet_line_gte?.params?.threshold) || 0);
                rows.push(
                    `<div class="mep-strategy1-condition-row is-system">
<span class="mep-strategy1-cond-toggle-wrap is-locked"><span class="mep-strategy1-cond-lock-indicator ${byKey?.strategy_enabled?.result ? "is-on" : "is-off"}"></span></span>
<span class="mep-strategy1-cond-text">Вкл/Откл</span>
<span class="mep-strategy1-cond-current">${byKey?.strategy_enabled?.currentValue ?? "off"}</span>
<span class="mep-strategy1-cond-result ${byKey?.strategy_enabled?.result ? "is-true" : "is-false"}">${byKey?.strategy_enabled?.result ? "true" : "false"}</span>
</div>`
                );
                rows.push(
                    `<div class="mep-strategy1-condition-row">
<span class="mep-strategy1-cond-toggle-wrap"><input class="mep-strategy1-cond-enabled" type="checkbox" data-block-type="charter" ${blocks?.charter?.enabled ? "checked" : ""} /></span>
<span class="mep-strategy1-cond-text">Устав</span>
<span class="mep-strategy1-cond-current">${byKey?.charter?.currentValue ?? "—"}</span>
<span class="mep-strategy1-cond-result ${blocks?.charter?.enabled ? (byKey?.charter?.result ? "is-true" : "is-false") : "is-idle"}">${blocks?.charter?.enabled ? (byKey?.charter?.result ? "true" : "false") : "not use"}</span>
</div>`
                );
                rows.push(
                    `<div class="mep-strategy1-condition-row">
<span class="mep-strategy1-cond-toggle-wrap"><input class="mep-strategy1-cond-enabled" type="checkbox" data-block-type="streak_lt" ${blocks?.streak_lt?.enabled ? "checked" : ""} /></span>
<span class="mep-strategy1-cond-text"><span class="mep-strategy1-cond-title">Подряд</span><span class="mep-strategy1-cond-inline">x &lt;</span><input class="mep-strategy1-cond-threshold" type="number" min="0" step="1" value="${threshold}" /></span>
<span class="mep-strategy1-cond-current">${byKey?.streak_lt?.currentValue ?? "—"}</span>
<span class="mep-strategy1-cond-result ${blocks?.streak_lt?.enabled ? (byKey?.streak_lt?.result ? "is-true" : "is-false") : "is-idle"}">${blocks?.streak_lt?.enabled ? (byKey?.streak_lt?.result ? "true" : "false") : "not use"}</span>
</div>`
                );
                rows.push(
                    `<div class="mep-strategy1-condition-row is-diff">
<span class="mep-strategy1-cond-toggle-wrap"><input class="mep-strategy1-cond-enabled" type="checkbox" data-block-type="diff_vector_state" ${blocks?.diff_vector_state?.enabled ? "checked" : ""} /></span>
<span class="mep-strategy1-cond-text"><span class="mep-strategy1-cond-title">Diff</span></span>
<span class="mep-strategy1-cond-control"><select class="mep-strategy1-cond-vector-mode mep-strategy1-cond-diff-mode"><option value="gt" ${diffMode === "gt" ? "selected" : ""}>mEMA &gt; sEMA</option><option value="lt" ${diffMode === "lt" ? "selected" : ""}>mEMA &lt; sEMA</option><option value="flat" ${diffMode === "flat" ? "selected" : ""}>flat</option></select></span>
<span class="mep-strategy1-cond-current">${byKey?.diff_vector_state?.currentValue ?? "flat"}</span>
<span class="mep-strategy1-cond-result ${blocks?.diff_vector_state?.enabled ? (byKey?.diff_vector_state?.result ? "is-true" : "is-false") : "is-idle"}">${blocks?.diff_vector_state?.enabled ? (byKey?.diff_vector_state?.result ? "true" : "false") : "not use"}</span>
</div>`
                );
                rows.push(
                    `<div class="mep-strategy1-condition-row is-diff">
<span class="mep-strategy1-cond-toggle-wrap"><input class="mep-strategy1-cond-enabled" type="checkbox" data-block-type="frequency_vector_state" ${blocks?.frequency_vector_state?.enabled ? "checked" : ""} /></span>
<span class="mep-strategy1-cond-text"><span class="mep-strategy1-cond-title">Freq</span></span>
<span class="mep-strategy1-cond-control"><select class="mep-strategy1-cond-vector-mode mep-strategy1-cond-frequency-mode"><option value="gt" ${freqMode === "gt" ? "selected" : ""}>mEMA &gt; sEMA</option><option value="lt" ${freqMode === "lt" ? "selected" : ""}>mEMA &lt; sEMA</option><option value="flat" ${freqMode === "flat" ? "selected" : ""}>flat</option></select></span>
<span class="mep-strategy1-cond-current">${byKey?.frequency_vector_state?.currentValue ?? "flat"}</span>
<span class="mep-strategy1-cond-result ${blocks?.frequency_vector_state?.enabled ? (byKey?.frequency_vector_state?.result ? "is-true" : "is-false") : "is-idle"}">${blocks?.frequency_vector_state?.enabled ? (byKey?.frequency_vector_state?.result ? "true" : "false") : "not use"}</span>
</div>`
                );
                rows.push(
                    `<div class="mep-strategy1-condition-row">
<span class="mep-strategy1-cond-toggle-wrap"><input class="mep-strategy1-cond-enabled" type="checkbox" data-block-type="frequency_line_gt" ${blocks?.frequency_line_gt?.enabled ? "checked" : ""} /></span>
<span class="mep-strategy1-cond-text"><span class="mep-strategy1-cond-title">Freq</span><span class="mep-strategy1-cond-inline">f &gt;</span><input class="mep-strategy1-cond-threshold mep-strategy1-cond-frequency-line-threshold" type="number" min="0" step="1" value="${freqLineThreshold}" /></span>
<span class="mep-strategy1-cond-current">${byKey?.frequency_line_gt?.currentValue ?? 0}</span>
<span class="mep-strategy1-cond-result ${blocks?.frequency_line_gt?.enabled ? (byKey?.frequency_line_gt?.result ? "is-true" : "is-false") : "is-idle"}">${blocks?.frequency_line_gt?.enabled ? (byKey?.frequency_line_gt?.result ? "true" : "false") : "not use"}</span>
</div>`
                );
                rows.push(
                    `<div class="mep-strategy1-condition-row is-diff">
<span class="mep-strategy1-cond-toggle-wrap"><input class="mep-strategy1-cond-enabled" type="checkbox" data-block-type="stake_players_vector_state" ${blocks?.stake_players_vector_state?.enabled ? "checked" : ""} /></span>
<span class="mep-strategy1-cond-text"><span class="mep-strategy1-cond-title">Clients</span></span>
<span class="mep-strategy1-cond-control"><select class="mep-strategy1-cond-vector-mode mep-strategy1-cond-stake-players-mode"><option value="gt" ${stakePlayersMode === "gt" ? "selected" : ""}>mEMA &gt; sEMA</option><option value="lt" ${stakePlayersMode === "lt" ? "selected" : ""}>mEMA &lt; sEMA</option><option value="flat" ${stakePlayersMode === "flat" ? "selected" : ""}>flat</option></select></span>
<span class="mep-strategy1-cond-current">${byKey?.stake_players_vector_state?.currentValue ?? "flat"}</span>
<span class="mep-strategy1-cond-result ${blocks?.stake_players_vector_state?.enabled ? (byKey?.stake_players_vector_state?.result ? "is-true" : "is-false") : "is-idle"}">${blocks?.stake_players_vector_state?.enabled ? (byKey?.stake_players_vector_state?.result ? "true" : "false") : "not use"}</span>
</div>`
                );
                rows.push(
                    `<div class="mep-strategy1-condition-row is-diff">
<span class="mep-strategy1-cond-toggle-wrap"><input class="mep-strategy1-cond-enabled" type="checkbox" data-block-type="stake_bet_vector_state" ${blocks?.stake_bet_vector_state?.enabled ? "checked" : ""} /></span>
<span class="mep-strategy1-cond-text"><span class="mep-strategy1-cond-title">Bet</span></span>
<span class="mep-strategy1-cond-control"><select class="mep-strategy1-cond-vector-mode mep-strategy1-cond-stake-bet-mode"><option value="gt" ${stakeBetMode === "gt" ? "selected" : ""}>mEMA &gt; sEMA</option><option value="lt" ${stakeBetMode === "lt" ? "selected" : ""}>mEMA &lt; sEMA</option><option value="flat" ${stakeBetMode === "flat" ? "selected" : ""}>flat</option></select></span>
<span class="mep-strategy1-cond-current">${byKey?.stake_bet_vector_state?.currentValue ?? "flat"}</span>
<span class="mep-strategy1-cond-result ${blocks?.stake_bet_vector_state?.enabled ? (byKey?.stake_bet_vector_state?.result ? "is-true" : "is-false") : "is-idle"}">${blocks?.stake_bet_vector_state?.enabled ? (byKey?.stake_bet_vector_state?.result ? "true" : "false") : "not use"}</span>
</div>`
                );
                rows.push(
                    `<div class="mep-strategy1-condition-row">
<span class="mep-strategy1-cond-toggle-wrap"><input class="mep-strategy1-cond-enabled" type="checkbox" data-block-type="stake_players_line_gte" ${blocks?.stake_players_line_gte?.enabled ? "checked" : ""} /></span>
<span class="mep-strategy1-cond-text"><span class="mep-strategy1-cond-title">Clients</span><span class="mep-strategy1-cond-inline">c &gt;=</span><input class="mep-strategy1-cond-threshold mep-strategy1-cond-stake-players-threshold" type="number" min="0" step="1" value="${stakePlayersLineThreshold}" /></span>
<span class="mep-strategy1-cond-current">${byKey?.stake_players_line_gte?.currentValue ?? 0}</span>
<span class="mep-strategy1-cond-result ${blocks?.stake_players_line_gte?.enabled ? (byKey?.stake_players_line_gte?.result ? "is-true" : "is-false") : "is-idle"}">${blocks?.stake_players_line_gte?.enabled ? (byKey?.stake_players_line_gte?.result ? "true" : "false") : "not use"}</span>
</div>`
                );
                rows.push(
                    `<div class="mep-strategy1-condition-row">
<span class="mep-strategy1-cond-toggle-wrap"><input class="mep-strategy1-cond-enabled" type="checkbox" data-block-type="stake_bet_line_gte" ${blocks?.stake_bet_line_gte?.enabled ? "checked" : ""} /></span>
<span class="mep-strategy1-cond-text"><span class="mep-strategy1-cond-title">Bet</span><span class="mep-strategy1-cond-inline">b &gt;=</span><input class="mep-strategy1-cond-threshold mep-strategy1-cond-stake-bet-threshold" type="number" min="0" step="0.01" value="${stakeBetLineThreshold}" /></span>
<span class="mep-strategy1-cond-current">${byKey?.stake_bet_line_gte?.currentValue ?? 0}</span>
<span class="mep-strategy1-cond-result ${blocks?.stake_bet_line_gte?.enabled ? (byKey?.stake_bet_line_gte?.result ? "is-true" : "is-false") : "is-idle"}">${blocks?.stake_bet_line_gte?.enabled ? (byKey?.stake_bet_line_gte?.result ? "true" : "false") : "not use"}</span>
</div>`
                );
                ui.strategy1CondListEl.innerHTML = rows.join("");

                let summaryText = "Пул условий: not use";
                let summaryClass = "is-idle";
                if (currentPool.activeCount > 0) {
                    if (currentPool.hasFalse) {
                        summaryText = "Пул условий: false";
                        summaryClass = "is-false";
                    } else {
                        summaryText = "Пул условий: true";
                        summaryClass = "is-true";
                    }
                }
                ui.strategy1CondSummaryEl.textContent = summaryText;
                ui.strategy1CondSummaryEl.classList.remove("is-true", "is-false", "is-idle");
                ui.strategy1CondSummaryEl.classList.add(summaryClass);
                if (ui.strategy1CondBranchTabsEl) {
                    const plusBtn = ui.strategy1CondBranchTabsEl.querySelector(".mep-strategy1-branch-tab-plus");
                    const minusBtn = ui.strategy1CondBranchTabsEl.querySelector(".mep-strategy1-branch-tab-minus");
                    const applyTabState = (btn, branchKey) => {
                        if (!btn) return;
                        const isSelected = selectedBranch === branchKey;
                        const isRuntimeActive = activeBranch === branchKey;
                        btn.classList.toggle("is-selected", isSelected);
                        btn.classList.toggle("is-runtime-active", isRuntimeActive);
                    };
                    applyTabState(plusBtn, "plus");
                    applyTabState(minusBtn, "minus");
                }

                stakeServiceWrapEl = ui.strategy1CondWrapEl?.querySelector?.(".mep-strategy1-stake-service-wrap") || null;
                if (!stakeServiceWrapEl && ui.strategy1CondSummaryEl?.parentNode) {
                    stakeServiceWrapEl = document.createElement("div");
                    stakeServiceWrapEl.className = "mep-strategy1-stake-service-wrap";
                    ui.strategy1CondSummaryEl.insertAdjacentElement("afterend", stakeServiceWrapEl);
                }
                const serviceData = MEP.UI.getStrategy1StakeServiceData(s);
                if (stakeServiceWrapEl && serviceData) {
                    const safeStakeGrowthArrayText = (serviceData.stakeGrowthArrayText || "")
                        .replace(/&/g, "&amp;")
                        .replace(/\"/g, "&quot;")
                        .replace(/</g, "&lt;")
                        .replace(/>/g, "&gt;");
                    const safeTargetMultiplierArrayText = (serviceData.targetMultiplierArrayText || "")
                        .replace(/&/g, "&amp;")
                        .replace(/\"/g, "&quot;")
                        .replace(/</g, "&lt;")
                        .replace(/>/g, "&gt;");
                    stakeServiceWrapEl.innerHTML = `
<div class="mep-strategy1-cycle-info-row">
<span class="mep-strategy1-cycle-info-cell">Циклов: <b>${serviceData.cycleNumber}</b></span>
<span class="mep-strategy1-cycle-info-cell">Раунд: <b>${serviceData.cycleRoundCount}</b></span>
<span class="mep-strategy1-cycle-info-cell">Ставок: <b>${serviceData.cycleBetCount}</b></span>
<span class="mep-strategy1-cycle-info-cell">Минусов: <b>${serviceData.cycleLossCount}</b></span>
</div>
<div class="mep-strategy1-service-array-row">
<span class="mep-strategy1-service-array-spacer"></span>
<span class="mep-strategy1-stake-col label">Множ.ставок</span>
<span class="mep-strategy1-stake-col start"><input class="mep-strategy1-service-array-input mep-strategy1-stake-growth-array-input" type="text" value="${safeStakeGrowthArrayText}" placeholder="2 3 4" /></span>
<span class="mep-strategy1-stake-col active">${serviceData.activeStakeGrowthMultiplier > 0 ? serviceData.activeStakeGrowthMultiplier : "—"}</span>
</div>
<div class="mep-strategy1-stake-row ${serviceData.mode === "fixed" ? "is-active" : "is-inactive"}">
<span class="mep-strategy1-cond-toggle-wrap"><input class="mep-strategy1-stake-mode-toggle mep-strategy1-stake-mode-fixed" type="checkbox" ${serviceData.mode === "fixed" ? "checked" : ""} /></span>
<span class="mep-strategy1-stake-col label">Ставка фикс.</span>
<span class="mep-strategy1-stake-col start"><input class="mep-strategy1-service-array-input mep-strategy1-start-stake-base-input" type="text" value="${MEP.UI.formatStrategyStakeBaseValue(serviceData.fixedStart)}" placeholder="0" /></span>
<span class="mep-strategy1-stake-col loss">${serviceData.lossCount}</span>
<span class="mep-strategy1-stake-col next mep-strategy1-click-apply mep-strategy1-click-apply-stake" data-value="${serviceData.nextFixed}">${MEP.UI.formatCoinValue(serviceData.nextFixed)}</span>
</div>
<div class="mep-strategy1-stake-row ${serviceData.mode === "percent" ? "is-active" : "is-inactive"}">
<span class="mep-strategy1-cond-toggle-wrap"><input class="mep-strategy1-stake-mode-toggle mep-strategy1-stake-mode-percent" type="checkbox" ${serviceData.mode === "percent" ? "checked" : ""} /></span>
<span class="mep-strategy1-stake-col label">Ставка ${serviceData.riskPercent}%</span>
<span class="mep-strategy1-stake-col start">${MEP.UI.formatCoinValue(serviceData.percentStart)}</span>
<span class="mep-strategy1-stake-col loss">${serviceData.lossCount}</span>
<span class="mep-strategy1-stake-col next mep-strategy1-click-apply mep-strategy1-click-apply-stake" data-value="${serviceData.nextPercent}">${MEP.UI.formatCoinValue(serviceData.nextPercent)}</span>
</div>
<div class="mep-strategy1-service-array-row">
<span class="mep-strategy1-service-array-spacer"></span>
<span class="mep-strategy1-stake-col label">Множ.коэф</span>
<span class="mep-strategy1-stake-col start"><input class="mep-strategy1-service-array-input mep-strategy1-target-multiplier-array-input" type="text" value="${safeTargetMultiplierArrayText}" placeholder="2 3 4" /></span>
<span class="mep-strategy1-stake-col active">${serviceData.activeTargetMultiplier > 0 ? serviceData.activeTargetMultiplier : "—"}</span>
</div>
<div class="mep-strategy1-stake-row is-inactive">
<span class="mep-strategy1-cond-toggle-wrap"><span class="mep-strategy1-service-array-spacer"></span></span>
<span class="mep-strategy1-stake-col label">Цел.коэф.</span>
<span class="mep-strategy1-stake-col start"><input class="mep-strategy1-service-array-input mep-strategy1-target-base-input" type="number" min="0" step="0.01" value="${MEP.UI.formatStrategyTargetValue(serviceData.targetBaseValue)}" placeholder="2" /></span>
<span class="mep-strategy1-stake-col loss">${serviceData.targetLossCount}</span>
<span class="mep-strategy1-stake-col next mep-strategy1-click-apply mep-strategy1-click-apply-target" data-value="${serviceData.targetNextValue}">${MEP.UI.formatStrategyTargetValue(serviceData.targetNextValue)}</span>
</div>
<div class="mep-strategy1-service-array-row">
<span class="mep-strategy1-service-array-spacer"></span>
<span class="mep-strategy1-stake-col label">СтопМинус</span>
<span class="mep-strategy1-stake-col start"><input class="mep-strategy1-service-array-input mep-strategy1-stop-minus-input" type="number" min="0" step="1" value="${Math.max(0, Math.floor(Number(s.config?.stopMinusCount) || 0))}" placeholder="0" /></span>
<span class="mep-strategy1-stake-col active"></span>
</div>`;
                }
            },

            renderStrategyBalanceRow(strategyId = "strategy1") {
                const ui = MEP.UI.ui;
                const st = MEP.UI.getStrategyState(strategyId);
                if (!ui || !st) return;
                const isS2 = strategyId === "strategy2";
                const coinIconEl = isS2 ? ui.strategy2CoinIconEl : ui.strategy1CoinIconEl;
                const startEl = isS2 ? ui.strategy2StartBalanceEl : ui.strategy1StartBalanceEl;
                const startDividerEl = isS2 ? ui.strategy2StartBalanceDividerEl : ui.strategy1StartBalanceDividerEl;
                const currentEl = isS2 ? ui.strategy2CurrentBalanceEl : ui.strategy1CurrentBalanceEl;
                const pnlEl = isS2 ? ui.strategy2PnlEl : ui.strategy1PnlEl;
                const riskAmountEl = isS2 ? ui.strategy2RiskAmountEl : ui.strategy1RiskAmountEl;
                const riskPercentInput = isS2 ? ui.strategy2RiskPercentInput : ui.strategy1RiskPercentInput;
                const domBalance = MEP.UI.readCurrentBalanceFromDom();
                const current = Number(domBalance.amount) || 0;
                if (coinIconEl) coinIconEl.innerHTML = domBalance.iconHtml || "◎";
                if (currentEl) currentEl.textContent = MEP.UI.formatCoinValue(current);

                const enabled = !!st.enabled;
                const startBalance = Number(st.runtime?.startBalanceSnapshot) || 0;
                const hasStart = enabled && startBalance > 0;
                if (startEl) {
                    startEl.style.display = hasStart ? "" : "none";
                    startEl.textContent = MEP.UI.formatCoinValue(startBalance);
                }
                if (startDividerEl) startDividerEl.style.display = hasStart ? "" : "none";

                let pnlPct = 0;
                if (hasStart) pnlPct = ((current - startBalance) / startBalance) * 100;
                if (pnlEl) {
                    pnlEl.textContent = hasStart ? `${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(1)}%` : "0%";
                    pnlEl.classList.toggle("is-pos", hasStart && pnlPct > 0);
                    pnlEl.classList.toggle("is-neg", hasStart && pnlPct < 0);
                    pnlEl.classList.toggle("is-neutral", !hasStart || pnlPct === 0);
                }

                const cfg = st.config && typeof st.config === "object" ? st.config : (st.config = {});
                let riskPercent = Number(cfg.riskPercent);
                if (!Number.isFinite(riskPercent) || riskPercent < 0) riskPercent = 5;
                cfg.riskPercent = riskPercent;
                if (riskPercentInput && document.activeElement !== riskPercentInput) riskPercentInput.value = String(riskPercent);
                const riskAmount = current * (riskPercent / 100);
                if (riskAmountEl) {
                    riskAmountEl.textContent = MEP.UI.formatCoinValue(riskAmount);
                    riskAmountEl.dataset.value = String(riskAmount);
                }
            },

            truncateStrategy1InfoText(text = "", maxChars = 72) {
                const raw = (text || "").toString().trim();
                if (!raw) return "—";
                if (raw.length <= maxChars) return raw;
                return `${raw.slice(0, Math.max(1, maxChars - 3)).trimEnd()}...`;
            },

            replayStrategy1InfoTicker() {
                MEP.UI.replayStrategyInfoTicker("strategy1");
            },

            replayStrategy2InfoTicker() {
                MEP.UI.replayStrategyInfoTicker("strategy2");
            },

            replayStrategyInfoTicker(strategyId = "strategy1") {
                const ui = MEP.UI.ui;
                if (!ui) return;
                const isS2 = strategyId === "strategy2";
                const bar = isS2 ? ui.strategy2InfoBar : ui.strategy1InfoBar;
                const ticker = isS2 ? ui.strategy2InfoTicker : ui.strategy1InfoTicker;
                if (!bar || !ticker) return;
                const textKey = isS2 ? "_strategy2InfoText" : "_strategy1InfoText";
                const timerKey = isS2 ? "_strategy2TickerTimer" : "_strategy1TickerTimer";
                const fullText = (ui[textKey] || ticker.textContent || "—").toString();
                ticker.textContent = fullText;
                const barWidth = bar.clientWidth || 1;
                const textWidth = ticker.scrollWidth || 1;
                ticker.classList.remove("is-running");
                ticker.style.removeProperty("--mep-s1-ticker-shift");
                ticker.style.removeProperty("--mep-s1-ticker-duration");
                if (ui[timerKey]) clearTimeout(ui[timerKey]);
                const startShift = Math.max(1, Math.floor(barWidth));
                const endShift = Math.max(1, Math.floor(textWidth));
                const travel = startShift + endShift;
                const durationMs = Math.min(13000, Math.max(1800, Math.floor((travel / 75) * 1000)));
                ticker.style.setProperty("--mep-s1-ticker-start", `${startShift}px`);
                ticker.style.setProperty("--mep-s1-ticker-shift", `${endShift}px`);
                ticker.style.setProperty("--mep-s1-ticker-duration", `${durationMs}ms`);
                void ticker.offsetWidth;
                ticker.classList.add("is-running");
                ui[timerKey] = setTimeout(() => {
                    ticker.classList.remove("is-running");
                    ticker.textContent = MEP.UI.truncateStrategy1InfoText(fullText, 72);
                }, durationMs + 40);
            },

            setStrategy1InfoMessage(text, opts) {
                MEP.UI.setStrategyInfoMessage("strategy1", text, opts);
            },

            setStrategy2InfoMessage(text, opts) {
                MEP.UI.setStrategyInfoMessage("strategy2", text, opts);
            },

            setStrategyInfoMessage(strategyId = "strategy1", text, opts = {}) {
                const ui = MEP.UI.ui;
                if (!ui) return;
                const isS2 = strategyId === "strategy2";
                const ticker = isS2 ? ui.strategy2InfoTicker : ui.strategy1InfoTicker;
                const textKey = isS2 ? "_strategy2InfoText" : "_strategy1InfoText";
                if (!ticker) return;
                const nextText = (text || "").toString().trim() || "—";
                const force = !!opts?.force;
                if (!force && ui[textKey] === nextText) return;
                ui[textKey] = nextText;
                MEP.UI.replayStrategyInfoTicker(strategyId);
            },

            renderStrategy1MinimalUi(st) {
                const ui = MEP.UI.ui;
                if (!ui || !st) return;
                const enabled = !!st.enabled;
                const nowTs = Date.now();
                if (ui.strategy1EnabledToggle && ui.strategy1EnabledToggle.checked !== enabled) {
                    ui.strategy1EnabledToggle.checked = enabled;
                }
                ui.strategy1TabBtn?.classList.toggle("mep-strategy1-tab-live", enabled);
                const dt1 = MEP.UI.formatCurrentDateTimeParts(nowTs);
                if (ui.strategy1CurrentDate) ui.strategy1CurrentDate.textContent = dt1.date;
                if (ui.strategy1CurrentTime) ui.strategy1CurrentTime.textContent = dt1.time;
                if (ui.strategy1WorkTimer) {
                    const startTs = Number(st.timers?.enabledAtTs) || 0;
                    const elapsed = enabled && startTs > 0 ? nowTs - startTs : 0;
                    ui.strategy1WorkTimer.textContent = MEP.UI.formatStrategy1Timer(elapsed);
                    ui.strategy1WorkTimer.classList.toggle("is-active", enabled);
                    ui.strategy1WorkTimer.classList.toggle("is-inactive", !enabled);
                }
                const blocked = !enabled && !MEP.UI.canEnableStrategy("strategy1");
                if (ui.strategy1EnabledToggle) ui.strategy1EnabledToggle.disabled = blocked;
                MEP.UI.renderStrategyBalanceRow("strategy1");
                MEP.UI.renderStrategy1ConditionBridge(st);
            },

            renderStrategy2MinimalUi(st) {
                const ui = MEP.UI.ui;
                if (!ui || !st) return;
                const enabled = !!st.enabled;
                const nowTs = Date.now();
                if (ui.strategy2EnabledToggle && ui.strategy2EnabledToggle.checked !== enabled) {
                    ui.strategy2EnabledToggle.checked = enabled;
                }
                ui.strategy2TabBtn?.classList.toggle("mep-strategy2-tab-live", enabled);
                const dt2 = MEP.UI.formatCurrentDateTimeParts(nowTs);
                if (ui.strategy2CurrentDate) ui.strategy2CurrentDate.textContent = dt2.date;
                if (ui.strategy2CurrentTime) ui.strategy2CurrentTime.textContent = dt2.time;
                if (ui.strategy2WorkTimer) {
                    const startTs = Number(st.timers?.enabledAtTs) || 0;
                    const elapsed = enabled && startTs > 0 ? nowTs - startTs : 0;
                    ui.strategy2WorkTimer.textContent = MEP.UI.formatStrategy1Timer(elapsed);
                    ui.strategy2WorkTimer.classList.toggle("is-active", enabled);
                    ui.strategy2WorkTimer.classList.toggle("is-inactive", !enabled);
                }
                const blocked = !enabled && !MEP.UI.canEnableStrategy("strategy2");
                if (ui.strategy2EnabledToggle) ui.strategy2EnabledToggle.disabled = blocked;
                MEP.UI.renderStrategyBalanceRow("strategy2");
            },

            renderStrategyMinimalUi() {
                MEP.UI.renderGamePhaseRow();
                MEP.UI.renderStrategy1MinimalUi(MEP.UI.getStrategyState("strategy1"));
                MEP.UI.renderStrategy2MinimalUi(MEP.UI.getStrategyState("strategy2"));
            },

            syncStrategiesUiState(meta = {}) {
                const s1 = MEP.UI.getStrategyState("strategy1");
                const s2 = MEP.UI.getStrategyState("strategy2");
                if (!s1 || !s2) return;
                MEP.UI.renderStrategyMinimalUi();
                const src = (meta.source || "").toString();
                const action = (meta.action || "").toString();
                if (s1.enabled) {
                    MEP.UI.setStrategyInfoMessage("strategy1", "Стратегия 1 запущена...");
                    MEP.UI.setStrategyInfoMessage("strategy2", "Стратегия2 невозможно запустить, запущена другая стратегия");
                    return;
                }
                if (s2.enabled) {
                    MEP.UI.setStrategyInfoMessage("strategy1", "Стратегия1 невозможно запустить, запущена другая стратегия");
                    MEP.UI.setStrategyInfoMessage("strategy2", "Стратегия 2 запущена...");
                    return;
                }
                const s1Idle = src === "strategy1" && action === "stop" ? "Стратегия 1 остановлена..." : "Стратегия 1 готова к работе";
                const s2Idle = src === "strategy2" && action === "stop" ? "Стратегия 2 остановлена..." : "Стратегия 2 готова к работе";
                MEP.UI.setStrategyInfoMessage("strategy1", s1Idle);
                MEP.UI.setStrategyInfoMessage("strategy2", s2Idle);
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
    <div class="mep-tracking-wrap">
    <div class="mep-section-head">
        <div class="mep-section-title">Отслеживание</div>
        <div class="mep-track-head-controls">
            <input class="mep-track-count" type="number" min="1" step="1" />
            <button class="mep-track-collapse" type="button" title="Свернуть параметры">▲</button>
        </div>
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
            <label class="mep-stake-density-label">Клиенты цвет<input class="mep-stake-color-players" type="color" value="#52d56a" /></label>
            <label class="mep-stake-density-label">Ставка цвет<input class="mep-stake-color-bet" type="color" value="#ffad3c" /></label>
        </div>
        <div class="mep-stake-vector-row">
            <label class="mep-stake-vector-label"><input class="mep-stake-players-vector-enabled" type="checkbox" checked /><span>Клиенты вектор</span></label>
            <label class="mep-stake-vector-label"><span>P</span><input class="mep-stake-players-vector-period" type="number" min="1" step="1" value="9" /></label>
            <label class="mep-stake-vector-label"><span>S</span><input class="mep-stake-players-vector-shift" type="number" min="1" step="1" value="3" /></label>
            <label class="mep-stake-vector-label"><span>Flat</span><input class="mep-stake-players-vector-flat" type="number" min="0" step="0.01" value="0.15" /></label>
        </div>
        <div class="mep-stake-vector-row">
            <label class="mep-stake-vector-label"><input class="mep-stake-bet-vector-enabled" type="checkbox" checked /><span>Ставки вектор</span></label>
            <label class="mep-stake-vector-label"><span>P</span><input class="mep-stake-bet-vector-period" type="number" min="1" step="1" value="9" /></label>
            <label class="mep-stake-vector-label"><span>S</span><input class="mep-stake-bet-vector-shift" type="number" min="1" step="1" value="3" /></label>
            <label class="mep-stake-vector-label"><span>Flat</span><input class="mep-stake-bet-vector-flat" type="number" min="0" step="0.01" value="0.15" /></label>
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
        <div class="mep-settings-tabs">
            <button class="mep-settings-tab-btn is-active" type="button" data-tab="settings">Настройки</button>
            <button class="mep-settings-tab-btn" type="button" data-tab="objects">Объекты</button>
        </div>
        <div class="mep-settings-tab-panel mep-settings-tab-panel-settings is-active">
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
        <div class="mep-settings-tab-panel mep-settings-tab-panel-objects">
            <div class="mep-form-row">
                <div class="mep-label">Контекст стратегии для quick-add</div>
                <select class="mep-input mep-objects-strategy-context">
                    <option value="strategy1">Стратегия1</option>
                    <option value="strategy2">Стратегия2</option>
                </select>
            </div>
            <div class="mep-objects-list"></div>
            <div class="mep-modal-actions mep-objects-quick-add">
                <button class="mep-btn mep-quick-streak2">+ streak&lt;2</button>
                <button class="mep-btn mep-quick-streak3">+ streak&lt;3</button>
                <button class="mep-btn mep-quick-streak4">+ streak&lt;4</button>
                <button class="mep-btn mep-quick-streak5">+ streak&lt;5</button>
                <button class="mep-btn mep-quick-charter">+ charter</button>
            </div>
            <div class="mep-modal-actions">
                <button class="mep-btn mep-objects-refresh">Обновить список</button>
                <button class="mep-btn mep-objects-add">+ Добавить объект</button>
            </div>
        </div>
    </div>
</div>
<div class="mep-modal-overlay" data-mep-modal="object-editor" style="display: none">
    <div class="mep-modal" role="dialog" aria-modal="true" aria-label="Объект условия">
        <div class="mep-modal-head">
            <div class="mep-modal-title">Объект условия</div>
            <button class="mep-modal-close mep-object-modal-close" aria-label="Закрыть">×</button>
        </div>
        <div class="mep-form-row mep-object-preset-wrap">
            <div class="mep-label">Быстрое создание (preset)</div>
                <select class="mep-input mep-object-preset-type">
                    <option value="streak_lt">streak_lt</option>
                    <option value="charter">charter</option>
                    <option value="diff_vector_state">diff (MA compare)</option>
                </select>
                <select class="mep-input mep-object-preset-strategy-id">
                    <option value="strategy1">Стратегия1</option>
                    <option value="strategy2">Стратегия2</option>
                </select>
            <div class="mep-object-preset-grid">
                <input class="mep-input mep-object-preset-threshold" type="number" min="1" step="1" value="3" placeholder="Threshold" />
                <input class="mep-input mep-object-preset-label" value="Подряд x <" placeholder="Label" />
                <input class="mep-input mep-object-preset-group-id" value="streak_lt" placeholder="Group ID" />
                <select class="mep-input mep-object-preset-group-mode">
                    <option value="single">single</option>
                    <option value="multi">multi</option>
                    <option value="">none</option>
                </select>
                <select class="mep-input mep-object-preset-diff-mode">
                    <option value="gt">mainEMA &gt; shiftedEMA</option>
                    <option value="lt">mainEMA &lt; shiftedEMA</option>
                    <option value="flat">false / flat</option>
                </select>
                <label class="mep-label"><input class="mep-object-preset-enabled" type="checkbox" checked /> Enabled</label>
                <button class="mep-btn mep-object-preset-apply" type="button">Подставить</button>
            </div>
        </div>
        <div class="mep-form-row mep-object-editor-row"><div class="mep-label">ID объекта</div><input class="mep-input mep-object-id" /></div>
        <div class="mep-form-row mep-object-editor-row"><div class="mep-label">Type объекта</div><input class="mep-input mep-object-type" placeholder="streak_lt" /></div>
        <div class="mep-form-row mep-object-editor-row">
            <div class="mep-label">Стратегия</div>
            <select class="mep-input mep-object-strategy-id">
                <option value="strategy1">Стратегия1</option>
                <option value="strategy2">Стратегия2</option>
            </select>
        </div>
        <div class="mep-form-row mep-object-editor-row mep-object-source-row">
            <div class="mep-label">Source</div>
            <div class="mep-object-source-controls">
                <select class="mep-input mep-object-source-select"></select>
                <input class="mep-input mep-object-source-custom" placeholder="custom.source.key" />
            </div>
        </div>
        <div class="mep-form-row mep-object-editor-row"><div class="mep-label">Label</div><input class="mep-input mep-object-label" /></div>
        <div class="mep-form-row mep-object-editor-row">
            <div class="mep-label">Condition (diff)</div>
            <select class="mep-input mep-object-diff-mode">
                <option value="gt">mainEMA &gt; shiftedEMA</option>
                <option value="lt">mainEMA &lt; shiftedEMA</option>
                <option value="flat">false / flat</option>
            </select>
        </div>
        <div class="mep-form-row mep-object-editor-row"><div class="mep-label">Group ID</div><input class="mep-input mep-object-group-id" /></div>
        <div class="mep-form-row mep-object-editor-row">
            <div class="mep-label">Group Mode</div>
            <select class="mep-input mep-object-group-mode">
                <option value="single">single</option>
                <option value="multi">multi</option>
            </select>
        </div>
        <div class="mep-form-row"><label class="mep-label"><input class="mep-object-enabled" type="checkbox" checked /> Enabled по умолчанию</label></div>
        <div class="mep-form-row mep-object-json-toggle-row"><button class="mep-btn mep-json-toggle" type="button" data-target="params">▸ JSON params</button></div>
        <div class="mep-form-row mep-object-json-field mep-object-json-params" style="display:none;"><textarea class="mep-input mep-object-params" spellcheck="false">{}</textarea></div>
        <div class="mep-form-row mep-object-json-toggle-row"><button class="mep-btn mep-json-toggle" type="button" data-target="ui">▸ JSON ui</button></div>
        <div class="mep-form-row mep-object-json-field mep-object-json-ui" style="display:none;"><textarea class="mep-input mep-object-ui" spellcheck="false">{}</textarea></div>
        <div class="mep-form-row mep-object-json-toggle-row"><button class="mep-btn mep-json-toggle" type="button" data-target="runtime">▸ JSON runtimeDefaults</button></div>
        <div class="mep-form-row mep-object-json-field mep-object-json-runtime" style="display:none;"><textarea class="mep-input mep-object-runtime" spellcheck="false">{}</textarea></div>
        <div class="mep-form-row"><div class="mep-label mep-object-editor-msg"></div></div>
        <div class="mep-modal-actions">
            <button class="mep-btn mep-object-save">Сохранить</button>
            <button class="mep-btn mep-object-cancel">Отмена</button>
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
<div class="mep-game-phase-row">
    <div class="mep-game-phase-cell mep-game-phase-cell-game" data-phase="game">Игра</div>
    <div class="mep-game-phase-cell mep-game-phase-cell-launch" data-phase="launch">Запуск</div>
    <div class="mep-game-phase-cell mep-game-phase-cell-bet" data-phase="bet">Ставка</div>
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
    <div class="mep-strategy1-minimal-root">
        <div class="mep-strategy1-info-bar" title="Последнее событие стратегии">
            <div class="mep-strategy1-info-track">
                <span class="mep-strategy1-info-ticker">Стратегия 1 не запущена...</span>
            </div>
        </div>
        <div class="mep-strategy1-control-row">
            <span class="mep-strategy1-control-label">Вкл/Откл</span>
            <label class="mep-strategy1-toggle" aria-label="Включить стратегию 1">
                <input class="mep-strategy1-enabled" type="checkbox" />
                <span class="mep-strategy1-toggle-ui" aria-hidden="true"></span>
            </label>
            <span class="mep-strategy1-control-divider" aria-hidden="true"></span>
            <span class="mep-strategy1-right-meta">
                <span class="mep-strategy1-current-date">01.01.26</span>
                <span class="mep-strategy1-current-time">00:00:00</span>
                <span class="mep-strategy1-work-timer">00:00:00</span>
            </span>
        </div>
        <div class="mep-strategy1-balance-row">
            <span class="mep-strategy1-coin-icon">◎</span>
            <span class="mep-strategy1-start-balance" style="display:none;">0</span>
            <span class="mep-strategy1-start-divider" style="display:none;"></span>
            <span class="mep-strategy1-current-balance">0</span>
            <span class="mep-strategy1-balance-divider"></span>
            <span class="mep-strategy1-pnl">0%</span>
            <span class="mep-strategy1-balance-divider"></span>
            <span class="mep-strategy1-risk-amount" title="Клик: скопировать в стартовую позицию">0</span>
            <input class="mep-strategy1-risk-percent" type="number" min="0" step="0.1" value="5" />
            <span class="mep-strategy1-risk-percent-sign">%</span>
        </div>
        <div class="mep-strategy1-conditions-wrap">
            <div class="mep-strategy1-branch-tabs">
                <button class="mep-strategy1-branch-tab mep-strategy1-branch-tab-plus is-selected" type="button" data-branch="plus">ПЛЮС</button>
                <button class="mep-strategy1-branch-tab mep-strategy1-branch-tab-minus" type="button" data-branch="minus">МИНУС</button>
            </div>
            <div class="mep-strategy1-cond-list"></div>
            <div class="mep-strategy1-cond-summary is-idle">Пул условий: not use</div>
        </div>
    </div>
</div>
<div class="mep-game-tab-panel mep-game-tab-panel-strategy2">
    <div class="mep-strategy2-minimal-root">
        <div class="mep-strategy2-info-bar" title="Последнее событие стратегии">
            <div class="mep-strategy2-info-track">
                <span class="mep-strategy2-info-ticker">Стратегия 2 не запущена...</span>
            </div>
        </div>
        <div class="mep-strategy2-control-row">
            <span class="mep-strategy2-control-label">Вкл/Откл</span>
            <label class="mep-strategy2-toggle" aria-label="Включить стратегию 2">
                <input class="mep-strategy2-enabled" type="checkbox" />
                <span class="mep-strategy2-toggle-ui" aria-hidden="true"></span>
            </label>
            <span class="mep-strategy2-control-divider" aria-hidden="true"></span>
            <span class="mep-strategy2-right-meta">
                <span class="mep-strategy2-current-date">01.01.26</span>
                <span class="mep-strategy2-current-time">00:00:00</span>
                <span class="mep-strategy2-work-timer">00:00:00</span>
            </span>
        </div>
        <div class="mep-strategy2-balance-row">
            <span class="mep-strategy2-coin-icon">◎</span>
            <span class="mep-strategy2-start-balance" style="display:none;">0</span>
            <span class="mep-strategy2-start-divider" style="display:none;"></span>
            <span class="mep-strategy2-current-balance">0</span>
            <span class="mep-strategy2-balance-divider"></span>
            <span class="mep-strategy2-pnl">0%</span>
            <span class="mep-strategy2-balance-divider"></span>
            <span class="mep-strategy2-risk-amount" title="Клик: скопировать в стартовую позицию">0</span>
            <input class="mep-strategy2-risk-percent" type="number" min="0" step="0.1" value="5" />
            <span class="mep-strategy2-risk-percent-sign">%</span>
        </div>
    </div>
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
                const objectOverlay = panel.querySelector('.mep-modal-overlay[data-mep-modal="object-editor"]');

                MEP.UI.ui = {
                    panel,
                    mainTabButtons: [...panel.querySelectorAll("button.mep-main-tab-btn")],
                    mainPanel: panel.querySelector(".mep-tab-panel-main"),
                    gamePanel: panel.querySelector(".mep-tab-panel-game"),
                    gameTabButtons: [...panel.querySelectorAll("button.mep-game-tab-btn")],
                    gamePhaseRowEl: panel.querySelector(".mep-game-phase-row"),
                    gamePhaseCellGameEl: panel.querySelector(".mep-game-phase-cell-game"),
                    gamePhaseCellLaunchEl: panel.querySelector(".mep-game-phase-cell-launch"),
                    gamePhaseCellBetEl: panel.querySelector(".mep-game-phase-cell-bet"),
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
                    strategy1EnabledToggle: panel.querySelector("input.mep-strategy1-enabled"),
                    strategy1InfoBar: panel.querySelector(".mep-strategy1-info-bar"),
                    strategy1InfoTicker: panel.querySelector(".mep-strategy1-info-ticker"),
                    strategy1CurrentDate: panel.querySelector(".mep-strategy1-current-date"),
                    strategy1CurrentTime: panel.querySelector(".mep-strategy1-current-time"),
                    strategy1WorkTimer: panel.querySelector(".mep-strategy1-work-timer"),
                    strategy1CoinIconEl: panel.querySelector(".mep-strategy1-coin-icon"),
                    strategy1StartBalanceEl: panel.querySelector(".mep-strategy1-start-balance"),
                    strategy1StartBalanceDividerEl: panel.querySelector(".mep-strategy1-start-divider"),
                    strategy1CurrentBalanceEl: panel.querySelector(".mep-strategy1-current-balance"),
                    strategy1PnlEl: panel.querySelector(".mep-strategy1-pnl"),
                    strategy1RiskAmountEl: panel.querySelector(".mep-strategy1-risk-amount"),
                    strategy1RiskPercentInput: panel.querySelector(".mep-strategy1-risk-percent"),
                    strategy1CondWrapEl: panel.querySelector(".mep-strategy1-conditions-wrap"),
                    strategy1CondBranchTabsEl: panel.querySelector(".mep-strategy1-branch-tabs"),
                    strategy1CondSummaryEl: panel.querySelector(".mep-strategy1-cond-summary"),
                    strategy1CondListEl: panel.querySelector(".mep-strategy1-cond-list"),
                    strategy1TabBtn: panel.querySelector('button.mep-game-tab-btn[data-tab="strategy1"]'),
                    strategy2EnabledToggle: panel.querySelector("input.mep-strategy2-enabled"),
                    strategy2InfoBar: panel.querySelector(".mep-strategy2-info-bar"),
                    strategy2InfoTicker: panel.querySelector(".mep-strategy2-info-ticker"),
                    strategy2CurrentDate: panel.querySelector(".mep-strategy2-current-date"),
                    strategy2CurrentTime: panel.querySelector(".mep-strategy2-current-time"),
                    strategy2WorkTimer: panel.querySelector(".mep-strategy2-work-timer"),
                    strategy2CoinIconEl: panel.querySelector(".mep-strategy2-coin-icon"),
                    strategy2StartBalanceEl: panel.querySelector(".mep-strategy2-start-balance"),
                    strategy2StartBalanceDividerEl: panel.querySelector(".mep-strategy2-start-divider"),
                    strategy2CurrentBalanceEl: panel.querySelector(".mep-strategy2-current-balance"),
                    strategy2PnlEl: panel.querySelector(".mep-strategy2-pnl"),
                    strategy2RiskAmountEl: panel.querySelector(".mep-strategy2-risk-amount"),
                    strategy2RiskPercentInput: panel.querySelector(".mep-strategy2-risk-percent"),
                    strategy2TabBtn: panel.querySelector('button.mep-game-tab-btn[data-tab="strategy2"]'),
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
                    stakePlayersColorInput: panel.querySelector("input.mep-stake-color-players"),
                    stakeBetColorInput: panel.querySelector("input.mep-stake-color-bet"),
                    stakeShowPlayersInput: panel.querySelector("input.mep-stake-show-players"),
                    stakeShowBetInput: panel.querySelector("input.mep-stake-show-bet"),
                    stakeLegendPlayersLine: panel.querySelector(".mep-stake-legend-line.mep-stake-legend-players"),
                    stakeLegendBetLine: panel.querySelector(".mep-stake-legend-line.mep-stake-legend-bets"),
                    stakePlayersVectorEnabledInput: panel.querySelector("input.mep-stake-players-vector-enabled"),
                    stakePlayersVectorPeriodInput: panel.querySelector("input.mep-stake-players-vector-period"),
                    stakePlayersVectorShiftInput: panel.querySelector("input.mep-stake-players-vector-shift"),
                    stakePlayersVectorFlatInput: panel.querySelector("input.mep-stake-players-vector-flat"),
                    stakeBetVectorEnabledInput: panel.querySelector("input.mep-stake-bet-vector-enabled"),
                    stakeBetVectorPeriodInput: panel.querySelector("input.mep-stake-bet-vector-period"),
                    stakeBetVectorShiftInput: panel.querySelector("input.mep-stake-bet-vector-shift"),
                    stakeBetVectorFlatInput: panel.querySelector("input.mep-stake-bet-vector-flat"),
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
                    trackingWrap: panel.querySelector(".mep-tracking-wrap"),
                    trackCollapseBtn: panel.querySelector("button.mep-track-collapse"),

                    historyBtn: panel.querySelector("button.mep-history-load"),
                    historySteps: panel.querySelector("input.mep-history-steps"),

                    gearBtn: panel.querySelector("button.mep-gear"),

                    // settings
                    settingsOverlay,
                    objectOverlay,
                    settingsCloseBtn: settingsOverlay?.querySelector(".mep-modal-close"),
                    settingsSaveBtn: settingsOverlay?.querySelector(".mep-save-settings"),
                    settingsCancelBtn: settingsOverlay?.querySelector(".mep-cancel-settings"),
                    settingsLoadBtn: settingsOverlay?.querySelector(".mep-load-settings"),
                    settingsTabButtons: [...(settingsOverlay?.querySelectorAll(".mep-settings-tab-btn") || [])],
                    settingsTabPanelSettings: settingsOverlay?.querySelector(".mep-settings-tab-panel-settings"),
                    settingsTabPanelObjects: settingsOverlay?.querySelector(".mep-settings-tab-panel-objects"),
                    endpointInput: settingsOverlay?.querySelector("input.mep-endpoint"),
                    testEndpointBtn: settingsOverlay?.querySelector(".mep-test-endpoint"),
                    testSoundBtn: settingsOverlay?.querySelector(".mep-test-sound"),
                    objectsList: settingsOverlay?.querySelector(".mep-objects-list"),
                    objectsStrategyContextSelect: settingsOverlay?.querySelector(".mep-objects-strategy-context"),
                    objectsRefreshBtn: settingsOverlay?.querySelector(".mep-objects-refresh"),
                    objectsAddBtn: settingsOverlay?.querySelector(".mep-objects-add"),
                    quickStreak2Btn: settingsOverlay?.querySelector(".mep-quick-streak2"),
                    quickStreak3Btn: settingsOverlay?.querySelector(".mep-quick-streak3"),
                    quickStreak4Btn: settingsOverlay?.querySelector(".mep-quick-streak4"),
                    quickStreak5Btn: settingsOverlay?.querySelector(".mep-quick-streak5"),
                    quickCharterBtn: settingsOverlay?.querySelector(".mep-quick-charter"),

                    soundsInput: settingsOverlay?.querySelector("textarea.mep-sounds"),
                    soundDefaultSelect: settingsOverlay?.querySelector("select.mep-sound-default"),
                    hitMsInput: settingsOverlay?.querySelector("input.mep-hit-ms"),
                    historyNextMsInput: settingsOverlay?.querySelector("input.mep-history-next-ms"),
                    priorityModeSelect: settingsOverlay?.querySelector("select.mep-priority-mode"),
                    gamesInput: settingsOverlay?.querySelector("textarea.mep-games"),

                    objectModalCloseBtn: objectOverlay?.querySelector(".mep-object-modal-close"),
                    objectIdInput: objectOverlay?.querySelector(".mep-object-id"),
                    objectTypeInput: objectOverlay?.querySelector(".mep-object-type"),
                    objectStrategyIdSelect: objectOverlay?.querySelector(".mep-object-strategy-id"),
                    objectSourceSelect: objectOverlay?.querySelector(".mep-object-source-select"),
                    objectSourceCustomInput: objectOverlay?.querySelector(".mep-object-source-custom"),
                    objectLabelInput: objectOverlay?.querySelector(".mep-object-label"),
                    objectDiffModeSelect: objectOverlay?.querySelector(".mep-object-diff-mode"),
                    objectGroupIdInput: objectOverlay?.querySelector(".mep-object-group-id"),
                    objectGroupModeSelect: objectOverlay?.querySelector(".mep-object-group-mode"),
                    objectEnabledInput: objectOverlay?.querySelector(".mep-object-enabled"),
                    objectParamsInput: objectOverlay?.querySelector(".mep-object-params"),
                    objectUiInput: objectOverlay?.querySelector(".mep-object-ui"),
                    objectRuntimeInput: objectOverlay?.querySelector(".mep-object-runtime"),
                    objectJsonToggleBtns: [...(objectOverlay?.querySelectorAll(".mep-json-toggle") || [])],
                    objectJsonParamsRow: objectOverlay?.querySelector(".mep-object-json-params"),
                    objectJsonUiRow: objectOverlay?.querySelector(".mep-object-json-ui"),
                    objectJsonRuntimeRow: objectOverlay?.querySelector(".mep-object-json-runtime"),
                    objectSaveBtn: objectOverlay?.querySelector(".mep-object-save"),
                    objectCancelBtn: objectOverlay?.querySelector(".mep-object-cancel"),
                    objectEditorMsg: objectOverlay?.querySelector(".mep-object-editor-msg"),
                    objectPresetTypeSelect: objectOverlay?.querySelector(".mep-object-preset-type"),
                    objectPresetStrategyIdSelect: objectOverlay?.querySelector(".mep-object-preset-strategy-id"),
                    objectPresetThresholdInput: objectOverlay?.querySelector(".mep-object-preset-threshold"),
                    objectPresetLabelInput: objectOverlay?.querySelector(".mep-object-preset-label"),
                    objectPresetGroupIdInput: objectOverlay?.querySelector(".mep-object-preset-group-id"),
                    objectPresetGroupModeSelect: objectOverlay?.querySelector(".mep-object-preset-group-mode"),
                    objectPresetDiffModeSelect: objectOverlay?.querySelector(".mep-object-preset-diff-mode"),
                    objectPresetEnabledInput: objectOverlay?.querySelector(".mep-object-preset-enabled"),
                    objectPresetApplyBtn: objectOverlay?.querySelector(".mep-object-preset-apply"),
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
                const s2 = MEP.State?.strategies?.strategy2;
                if (s1) {
                    if (s1.enabled && (!s1.timers || !Number(s1.timers.enabledAtTs))) {
                        if (!s1.timers || typeof s1.timers !== "object") s1.timers = {};
                        s1.timers.enabledAtTs = Date.now();
                    }
                    if (s1.enabled && !(Number(s1.runtime?.startBalanceSnapshot) > 0)) {
                        s1.runtime = s1.runtime && typeof s1.runtime === "object" ? s1.runtime : {};
                        s1.runtime.startBalanceSnapshot = MEP.UI.readCurrentBalanceFromDom().amount || 0;
                    }
                    if (s1.enabled && !s1.cycle?.isActive) {
                        MEP.Strategy1?.startNewCycle?.();
                    }
                    if (ui.strategy1EnabledToggle) {
                        ui.strategy1EnabledToggle.checked = !!s1.enabled;
                        ui.strategy1EnabledToggle.addEventListener("change", () => {
                            const next = !!ui.strategy1EnabledToggle.checked;
                            if (next && !MEP.UI.canEnableStrategy("strategy1")) {
                                ui.strategy1EnabledToggle.checked = false;
                                MEP.UI.setStrategy1InfoMessage("Стратегия1 невозможно запустить, запущена другая стратегия", { force: true });
                                return;
                            }
                            s1.enabled = next;
                            if (next) {
                                if (!s1.timers || typeof s1.timers !== "object") s1.timers = {};
                                s1.timers.enabledAtTs = Date.now();
                                s1.runtime = s1.runtime && typeof s1.runtime === "object" ? s1.runtime : {};
                                s1.runtime.startBalanceSnapshot = MEP.UI.readCurrentBalanceFromDom().amount || 0;
                                MEP.State.activeStrategyId = "strategy1";
                                MEP.Strategy1?.startNewCycle?.();
                            } else {
                                if (!s1.timers || typeof s1.timers !== "object") s1.timers = {};
                                s1.timers.enabledAtTs = 0;
                                s1.runtime = s1.runtime && typeof s1.runtime === "object" ? s1.runtime : {};
                                s1.runtime.startBalanceSnapshot = 0;
                                s1.cycle = s1.cycle && typeof s1.cycle === "object" ? s1.cycle : {};
                                s1.cycle.isActive = false;
                                s1.cycle.cycleNumber = 0;
                                s1.cycle.roundCount = 0;
                                s1.cycle.betCount = 0;
                                s1.cycle.lossCount = 0;
                                if (MEP.State.activeStrategyId === "strategy1" && !s1.isExecuting) MEP.State.activeStrategyId = null;
                            }
                            MEP.Storage.save();
                            MEP.Strategy1?.evaluateDecisionState?.();
                            MEP.UI.syncStrategiesUiState({ source: "strategy1", action: next ? "start" : "stop" });
                        });
                    }
                }
                if (s2) {
                    if (s2.enabled && (!s2.timers || !Number(s2.timers.enabledAtTs))) {
                        if (!s2.timers || typeof s2.timers !== "object") s2.timers = {};
                        s2.timers.enabledAtTs = Date.now();
                    }
                    if (s2.enabled && !(Number(s2.runtime?.startBalanceSnapshot) > 0)) {
                        s2.runtime = s2.runtime && typeof s2.runtime === "object" ? s2.runtime : {};
                        s2.runtime.startBalanceSnapshot = MEP.UI.readCurrentBalanceFromDom().amount || 0;
                    }
                    if (ui.strategy2EnabledToggle) {
                        ui.strategy2EnabledToggle.checked = !!s2.enabled;
                        ui.strategy2EnabledToggle.addEventListener("change", () => {
                            const next = !!ui.strategy2EnabledToggle.checked;
                            if (next && !MEP.UI.canEnableStrategy("strategy2")) {
                                ui.strategy2EnabledToggle.checked = false;
                                MEP.UI.setStrategy2InfoMessage("Стратегия2 невозможно запустить, запущена другая стратегия", { force: true });
                                return;
                            }
                            s2.enabled = next;
                            if (next) {
                                if (!s2.timers || typeof s2.timers !== "object") s2.timers = {};
                                s2.timers.enabledAtTs = Date.now();
                                s2.runtime = s2.runtime && typeof s2.runtime === "object" ? s2.runtime : {};
                                s2.runtime.startBalanceSnapshot = MEP.UI.readCurrentBalanceFromDom().amount || 0;
                                MEP.State.activeStrategyId = "strategy2";
                            } else {
                                if (!s2.timers || typeof s2.timers !== "object") s2.timers = {};
                                s2.timers.enabledAtTs = 0;
                                s2.runtime = s2.runtime && typeof s2.runtime === "object" ? s2.runtime : {};
                                s2.runtime.startBalanceSnapshot = 0;
                                if (MEP.State.activeStrategyId === "strategy2" && !s2.isExecuting) MEP.State.activeStrategyId = null;
                            }
                            MEP.Storage.save();
                            MEP.UI.syncStrategiesUiState({ source: "strategy2", action: next ? "start" : "stop" });
                        });
                    }
                }
                if (ui.strategy1RiskPercentInput && s1) {
                    ui.strategy1RiskPercentInput.value = String(Math.max(0, Number(s1.config?.riskPercent) || 5));
                    ui.strategy1RiskPercentInput.addEventListener("input", () => {
                        const cfg = s1.config && typeof s1.config === "object" ? s1.config : (s1.config = {});
                        let v = Number(ui.strategy1RiskPercentInput.value);
                        if (!Number.isFinite(v) || v < 0) v = 0;
                        cfg.riskPercent = v;
                        MEP.Storage.save();
                        MEP.UI.renderStrategyBalanceRow("strategy1");
                    });
                }
                if (ui.strategy2RiskPercentInput && s2) {
                    ui.strategy2RiskPercentInput.value = String(Math.max(0, Number(s2.config?.riskPercent) || 5));
                    ui.strategy2RiskPercentInput.addEventListener("input", () => {
                        const cfg = s2.config && typeof s2.config === "object" ? s2.config : (s2.config = {});
                        let v = Number(ui.strategy2RiskPercentInput.value);
                        if (!Number.isFinite(v) || v < 0) v = 0;
                        cfg.riskPercent = v;
                        MEP.Storage.save();
                        MEP.UI.renderStrategyBalanceRow("strategy2");
                    });
                }
                if (ui.strategy1RiskAmountEl && s1) {
                    ui.strategy1RiskAmountEl.addEventListener("click", () => {
                        const val = Number(ui.strategy1RiskAmountEl.dataset.value) || 0;
                        s1.runtime = s1.runtime && typeof s1.runtime === "object" ? s1.runtime : {};
                        s1.runtime.copiedRiskAmount = val;
                        const cfg = s1.config && typeof s1.config === "object" ? s1.config : (s1.config = {});
                        cfg.startStakeValue = Math.max(0, val);
                        MEP.Storage.save();
                        MEP.UI.renderStrategy1MinimalUi(MEP.UI.getStrategyState("strategy1"));
                        MEP.UI.setStrategy1InfoMessage("Сумма риска скопирована в стартовую позицию");
                    });
                }
                if (ui.strategy1CondWrapEl && s1) {
                    ui.strategy1CondWrapEl.addEventListener("change", (e) => {
                        const fixedToggle = e.target?.closest?.("input.mep-strategy1-stake-mode-fixed");
                        if (fixedToggle) {
                            fixedToggle.checked = true;
                            MEP.UI.setStrategy1StartStakeMode("fixed");
                            return;
                        }
                        const percentToggle = e.target?.closest?.("input.mep-strategy1-stake-mode-percent");
                        if (percentToggle) {
                            percentToggle.checked = true;
                            MEP.UI.setStrategy1StartStakeMode("percent");
                            return;
                        }
                        const stakeGrowthArrayInput = e.target?.closest?.("input.mep-strategy1-stake-growth-array-input");
                        if (stakeGrowthArrayInput) {
                            MEP.UI.setStrategy1StakeGrowthArrayText(stakeGrowthArrayInput.value);
                            return;
                        }
                        const targetMultiplierArrayInput = e.target?.closest?.("input.mep-strategy1-target-multiplier-array-input");
                        if (targetMultiplierArrayInput) {
                            MEP.UI.setStrategy1TargetMultiplierArrayText(targetMultiplierArrayInput.value);
                            return;
                        }
                        const startStakeBaseInput = e.target?.closest?.("input.mep-strategy1-start-stake-base-input");
                        if (startStakeBaseInput) {
                            MEP.UI.setStrategy1StartStakeBaseValue(startStakeBaseInput.value);
                            return;
                        }
                        const targetBaseInput = e.target?.closest?.("input.mep-strategy1-target-base-input");
                        if (targetBaseInput) {
                            MEP.UI.setStrategy1TargetBaseValue(targetBaseInput.value);
                            return;
                        }
                        const stopMinusInput = e.target?.closest?.("input.mep-strategy1-stop-minus-input");
                        if (stopMinusInput) {
                            MEP.UI.setStrategy1StopMinusCount(stopMinusInput.value);
                        }
                    });
                    ui.strategy1CondWrapEl.addEventListener("keydown", (e) => {
                        const arrayInput = e.target?.closest?.(
                            "input.mep-strategy1-stake-growth-array-input, input.mep-strategy1-target-multiplier-array-input, input.mep-strategy1-start-stake-base-input, input.mep-strategy1-target-base-input, input.mep-strategy1-stop-minus-input"
                        );
                        if (!arrayInput) return;
                        if (e.key === "Enter") {
                            e.preventDefault();
                            arrayInput.blur();
                        }
                    });
                    ui.strategy1CondWrapEl.addEventListener("click", (e) => {
                        const branchTab = e.target?.closest?.(".mep-strategy1-branch-tab");
                        if (branchTab) {
                            const branch = (branchTab.dataset.branch || "plus").toString();
                            MEP.UI.setStrategy1SelectedConditionBranch(branch);
                            return;
                        }
                        const stakeApply = e.target?.closest?.(".mep-strategy1-click-apply-stake");
                        if (stakeApply) {
                            const value = Number(stakeApply.dataset.value) || 0;
                            MEP.UI.applyGameAmountValue(value);
                            return;
                        }
                        const targetApply = e.target?.closest?.(".mep-strategy1-click-apply-target");
                        if (targetApply) {
                            const value = Number(targetApply.dataset.value) || 0;
                            MEP.UI.applyGameTargetValue(value);
                        }
                    });
                }
                if (ui.strategy1CondListEl && s1) {
                    ui.strategy1CondListEl.addEventListener("change", (e) => {
                        const inp = e.target?.closest?.("input.mep-strategy1-cond-enabled");
                        if (inp) {
                            const blockType = (inp.dataset.blockType || "").trim();
                            if (!blockType) {
                                inp.checked = false;
                                return;
                            }
                            MEP.UI.setStrategy1ConditionEnabled(blockType, !!inp.checked);
                            MEP.UI.renderStrategy1MinimalUi(MEP.UI.getStrategyState("strategy1"));
                            return;
                        }
                        const thresholdInput = e.target?.closest?.("input.mep-strategy1-cond-threshold");
                        if (thresholdInput) {
                            if (thresholdInput.classList.contains("mep-strategy1-cond-frequency-line-threshold")) {
                                MEP.UI.setStrategy1FrequencyLineThreshold(thresholdInput.value);
                                MEP.UI.renderStrategy1MinimalUi(MEP.UI.getStrategyState("strategy1"));
                                return;
                            }
                            if (thresholdInput.classList.contains("mep-strategy1-cond-stake-players-threshold")) {
                                MEP.UI.setStrategy1StakePlayersThreshold(thresholdInput.value);
                                MEP.UI.renderStrategy1MinimalUi(MEP.UI.getStrategyState("strategy1"));
                                return;
                            }
                            if (thresholdInput.classList.contains("mep-strategy1-cond-stake-bet-threshold")) {
                                MEP.UI.setStrategy1StakeBetThreshold(thresholdInput.value);
                                MEP.UI.renderStrategy1MinimalUi(MEP.UI.getStrategyState("strategy1"));
                                return;
                            }
                            MEP.UI.setStrategy1StreakThreshold(thresholdInput.value);
                            MEP.UI.renderStrategy1MinimalUi(MEP.UI.getStrategyState("strategy1"));
                            return;
                        }
                        const diffModeSelect = e.target?.closest?.("select.mep-strategy1-cond-diff-mode");
                        if (diffModeSelect) {
                            MEP.UI.setStrategy1DiffMode(diffModeSelect.value);
                            MEP.UI.renderStrategy1MinimalUi(MEP.UI.getStrategyState("strategy1"));
                            return;
                        }
                        const frequencyModeSelect = e.target?.closest?.("select.mep-strategy1-cond-frequency-mode");
                        if (frequencyModeSelect) {
                            MEP.UI.setStrategy1FrequencyMode(frequencyModeSelect.value);
                            MEP.UI.renderStrategy1MinimalUi(MEP.UI.getStrategyState("strategy1"));
                            return;
                        }
                        const stakePlayersModeSelect = e.target?.closest?.("select.mep-strategy1-cond-stake-players-mode");
                        if (stakePlayersModeSelect) {
                            MEP.UI.setStrategy1StakePlayersMode(stakePlayersModeSelect.value);
                            MEP.UI.renderStrategy1MinimalUi(MEP.UI.getStrategyState("strategy1"));
                            return;
                        }
                        const stakeBetModeSelect = e.target?.closest?.("select.mep-strategy1-cond-stake-bet-mode");
                        if (stakeBetModeSelect) {
                            MEP.UI.setStrategy1StakeBetMode(stakeBetModeSelect.value);
                            MEP.UI.renderStrategy1MinimalUi(MEP.UI.getStrategyState("strategy1"));
                            return;
                        }
                        MEP.UI.renderStrategy1MinimalUi(MEP.UI.getStrategyState("strategy1"));
                    });
                }
                if (ui.strategy2RiskAmountEl && s2) {
                    ui.strategy2RiskAmountEl.addEventListener("click", () => {
                        const val = Number(ui.strategy2RiskAmountEl.dataset.value) || 0;
                        s2.runtime = s2.runtime && typeof s2.runtime === "object" ? s2.runtime : {};
                        s2.runtime.copiedRiskAmount = val;
                        MEP.UI.setStrategy2InfoMessage("Сумма риска скопирована в стартовую позицию");
                    });
                }
                if (ui.strategy1InfoBar) {
                    ui._strategy1InfoHoverLocked = false;
                    ui.strategy1InfoBar.addEventListener("mouseenter", () => {
                        if (ui._strategy1InfoHoverLocked) return;
                        ui._strategy1InfoHoverLocked = true;
                        MEP.UI.replayStrategy1InfoTicker();
                    });
                    ui.strategy1InfoBar.addEventListener("mouseleave", () => {
                        ui._strategy1InfoHoverLocked = false;
                    });
                }
                if (ui.strategy2InfoBar) {
                    ui._strategy2InfoHoverLocked = false;
                    ui.strategy2InfoBar.addEventListener("mouseenter", () => {
                        if (ui._strategy2InfoHoverLocked) return;
                        ui._strategy2InfoHoverLocked = true;
                        MEP.UI.replayStrategy2InfoTicker();
                    });
                    ui.strategy2InfoBar.addEventListener("mouseleave", () => {
                        ui._strategy2InfoHoverLocked = false;
                    });
                }
                MEP.UI.syncStrategiesUiState();
                if (ui._strategy1TimerInterval) clearInterval(ui._strategy1TimerInterval);
                ui._strategy1TimerInterval = setInterval(() => {
                    MEP.UI.renderStrategyMinimalUi();
                }, 1000);
                MEP.UI.renderStrategyMinimalUi();


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

                const normalizeStakeColor = (value, fallback) => {
                    const raw = (value || "").toString().trim();
                    return /^#[0-9a-fA-F]{6}$/.test(raw) ? raw : fallback;
                };
                if (ui.stakePlayersColorInput) {
                    const current = normalizeStakeColor(MEP.State.stakeGraphPlayersColor, "#52d56a");
                    MEP.State.stakeGraphPlayersColor = current;
                    ui.stakePlayersColorInput.value = current;
                    ui.stakePlayersColorInput.addEventListener("input", () => {
                        const v = normalizeStakeColor(ui.stakePlayersColorInput.value, "#52d56a");
                        MEP.State.stakeGraphPlayersColor = v;
                        ui.stakePlayersColorInput.value = v;
                        MEP.Storage.save();
                        MEP.StakeGraph?.render?.();
                    });
                }
                if (ui.stakeBetColorInput) {
                    const current = normalizeStakeColor(MEP.State.stakeGraphBetColor, "#ffad3c");
                    MEP.State.stakeGraphBetColor = current;
                    ui.stakeBetColorInput.value = current;
                    ui.stakeBetColorInput.addEventListener("input", () => {
                        const v = normalizeStakeColor(ui.stakeBetColorInput.value, "#ffad3c");
                        MEP.State.stakeGraphBetColor = v;
                        ui.stakeBetColorInput.value = v;
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

                if (ui.stakePlayersVectorEnabledInput) {
                    ui.stakePlayersVectorEnabledInput.checked = MEP.State.stakePlayersVectorEnabled !== false;
                    ui.stakePlayersVectorEnabledInput.addEventListener("change", () => {
                        MEP.State.stakePlayersVectorEnabled = !!ui.stakePlayersVectorEnabledInput.checked;
                        MEP.Storage.save();
                        MEP.StakeGraph?.render?.();
                    });
                }
                if (ui.stakePlayersVectorPeriodInput) {
                    const current = Math.max(1, Math.floor(Number(MEP.State.stakePlayersVectorPeriod) || 9));
                    MEP.State.stakePlayersVectorPeriod = current;
                    ui.stakePlayersVectorPeriodInput.value = String(current);
                    ui.stakePlayersVectorPeriodInput.addEventListener("input", () => {
                        const v = Math.max(1, Math.floor(Number(ui.stakePlayersVectorPeriodInput.value) || 1));
                        MEP.State.stakePlayersVectorPeriod = v;
                        ui.stakePlayersVectorPeriodInput.value = String(v);
                        MEP.Storage.save();
                        MEP.StakeGraph?.render?.();
                    });
                }
                if (ui.stakePlayersVectorShiftInput) {
                    const current = Math.max(1, Math.floor(Number(MEP.State.stakePlayersVectorPhaseShift) || 3));
                    MEP.State.stakePlayersVectorPhaseShift = current;
                    ui.stakePlayersVectorShiftInput.value = String(current);
                    ui.stakePlayersVectorShiftInput.addEventListener("input", () => {
                        const v = Math.max(1, Math.floor(Number(ui.stakePlayersVectorShiftInput.value) || 1));
                        MEP.State.stakePlayersVectorPhaseShift = v;
                        ui.stakePlayersVectorShiftInput.value = String(v);
                        MEP.Storage.save();
                        MEP.StakeGraph?.render?.();
                    });
                }
                if (ui.stakePlayersVectorFlatInput) {
                    const current = Math.max(0, Number(MEP.State.stakePlayersVectorFlatEpsilon) || 0);
                    MEP.State.stakePlayersVectorFlatEpsilon = current;
                    ui.stakePlayersVectorFlatInput.value = String(current);
                    ui.stakePlayersVectorFlatInput.addEventListener("input", () => {
                        const v = Math.max(0, Number(ui.stakePlayersVectorFlatInput.value) || 0);
                        MEP.State.stakePlayersVectorFlatEpsilon = v;
                        ui.stakePlayersVectorFlatInput.value = String(v);
                        MEP.Storage.save();
                        MEP.StakeGraph?.render?.();
                    });
                }

                if (ui.stakeBetVectorEnabledInput) {
                    ui.stakeBetVectorEnabledInput.checked = MEP.State.stakeBetVectorEnabled !== false;
                    ui.stakeBetVectorEnabledInput.addEventListener("change", () => {
                        MEP.State.stakeBetVectorEnabled = !!ui.stakeBetVectorEnabledInput.checked;
                        MEP.Storage.save();
                        MEP.StakeGraph?.render?.();
                    });
                }
                if (ui.stakeBetVectorPeriodInput) {
                    const current = Math.max(1, Math.floor(Number(MEP.State.stakeBetVectorPeriod) || 9));
                    MEP.State.stakeBetVectorPeriod = current;
                    ui.stakeBetVectorPeriodInput.value = String(current);
                    ui.stakeBetVectorPeriodInput.addEventListener("input", () => {
                        const v = Math.max(1, Math.floor(Number(ui.stakeBetVectorPeriodInput.value) || 1));
                        MEP.State.stakeBetVectorPeriod = v;
                        ui.stakeBetVectorPeriodInput.value = String(v);
                        MEP.Storage.save();
                        MEP.StakeGraph?.render?.();
                    });
                }
                if (ui.stakeBetVectorShiftInput) {
                    const current = Math.max(1, Math.floor(Number(MEP.State.stakeBetVectorPhaseShift) || 3));
                    MEP.State.stakeBetVectorPhaseShift = current;
                    ui.stakeBetVectorShiftInput.value = String(current);
                    ui.stakeBetVectorShiftInput.addEventListener("input", () => {
                        const v = Math.max(1, Math.floor(Number(ui.stakeBetVectorShiftInput.value) || 1));
                        MEP.State.stakeBetVectorPhaseShift = v;
                        ui.stakeBetVectorShiftInput.value = String(v);
                        MEP.Storage.save();
                        MEP.StakeGraph?.render?.();
                    });
                }
                if (ui.stakeBetVectorFlatInput) {
                    const current = Math.max(0, Number(MEP.State.stakeBetVectorFlatEpsilon) || 0);
                    MEP.State.stakeBetVectorFlatEpsilon = current;
                    ui.stakeBetVectorFlatInput.value = String(current);
                    ui.stakeBetVectorFlatInput.addEventListener("input", () => {
                        const v = Math.max(0, Number(ui.stakeBetVectorFlatInput.value) || 0);
                        MEP.State.stakeBetVectorFlatEpsilon = v;
                        ui.stakeBetVectorFlatInput.value = String(v);
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

                const applyTrackingCollapse = () => {
                    if (!ui.trackingWrap || !ui.trackCollapseBtn) return;
                    const collapsed = !!MEP.State.trackingCollapsed;
                    ui.trackingWrap.classList.toggle("mep-collapsed", collapsed);
                    ui.trackCollapseBtn.textContent = collapsed ? "▼" : "▲";
                    ui.trackCollapseBtn.title = collapsed ? "Развернуть параметры" : "Свернуть параметры";
                };
                applyTrackingCollapse();
                if (ui.trackCollapseBtn) {
                    ui.trackCollapseBtn.addEventListener("click", () => {
                        MEP.State.trackingCollapsed = !MEP.State.trackingCollapsed;
                        MEP.Storage.save();
                        applyTrackingCollapse();
                    });
                }

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
                const setSettingsTab = (tab = "settings") => {
                    ui._settingsTab = tab === "objects" ? "objects" : "settings";
                    for (const btn of ui.settingsTabButtons || []) {
                        const is = (btn.dataset.tab || "") === ui._settingsTab;
                        btn.classList.toggle("is-active", is);
                    }
                    ui.settingsTabPanelSettings?.classList.toggle("is-active", ui._settingsTab === "settings");
                    ui.settingsTabPanelObjects?.classList.toggle("is-active", ui._settingsTab === "objects");
                };

                const renderObjectsList = () => {
                    if (!ui.objectsList) return;
                    const items = MEP.ConditionObjects.list();
                    console.debug("[MEP][ConditionObjects][UI] renderObjectsList", {
                        count: items.length,
                        items: items.map((it) => ({ id: it?.id || "", type: it?.type || "" })),
                    });
                    const head = `<div class="mep-object-head-row">
<span>Название</span><span>Type</span><span>ID</span><span>Стратегия</span><span>Actions</span>
</div>`;
                    if (!items.length) {
                        ui.objectsList.innerHTML = `${head}<div class="mep-objects-empty">Пока нет объектов</div>`;
                        return;
                    }
                    const lines = items
                        .map((it) => {
                            const label = (it.label || "").replace(/</g, "&lt;");
                            const type = (it.type || "").replace(/</g, "&lt;");
                            const id = (it.id || "").replace(/</g, "&lt;");
                            const strategyId = (it.strategyId || "strategy1").replace(/</g, "&lt;");
                            return `<div class="mep-object-row">
<div class="mep-object-meta"><span class="mep-object-col-label" title="${label}">${label}</span><span class="mep-object-col-type" title="${type}">${type}</span><code class="mep-object-col-id" title="${id}">${id}</code><span class="mep-object-col-strategy">${strategyId}</span></div>
<div class="mep-object-actions">
<button class="mep-btn mep-object-edit" data-object-id="${id}" title="Редактировать" aria-label="Редактировать">✎</button>
<button class="mep-btn mep-object-delete" data-object-id="${id}" title="Удалить" aria-label="Удалить">🗑</button>
</div>
</div>`;
                        })
                        .join("");
                    ui.objectsList.innerHTML = `${head}${lines}`;
                };

                const closeObjectEditor = () => {
                    if (ui.objectOverlay) ui.objectOverlay.style.display = "none";
                    if (ui.objectEditorMsg) ui.objectEditorMsg.textContent = "";
                    ui._objectEditId = "";
                };

                const getObjectJsonRowByKey = (key = "") => {
                    const k = (key || "").toString().trim().toLowerCase();
                    if (k === "params") return ui.objectJsonParamsRow;
                    if (k === "ui") return ui.objectJsonUiRow;
                    if (k === "runtime") return ui.objectJsonRuntimeRow;
                    return null;
                };

                const setObjectJsonRowVisible = (key = "", visible = false) => {
                    const row = getObjectJsonRowByKey(key);
                    if (!row) return;
                    row.style.display = visible ? "" : "none";
                    for (const btn of ui.objectJsonToggleBtns || []) {
                        if ((btn.dataset.target || "") !== key) continue;
                        const text = btn.textContent || "";
                        btn.textContent = visible ? text.replace(/^▸/, "▾") : text.replace(/^▾/, "▸");
                    }
                };

                const renderObjectSourceOptions = (selectedSource = "", currentType = "") => {
                    if (!ui.objectSourceSelect) return;
                    const srcItems = MEP.ConditionObjects.SOURCES || [];
                    const typeDef = MEP.ConditionObjects.getTypeDef(currentType);
                    const allowedSet = new Set((typeDef?.allowedSources || []).map((v) => (v || "").toString().trim()));
                    const mustRestrict = allowedSet.size > 0;
                    ui.objectSourceSelect.innerHTML = "";
                    const emptyOpt = document.createElement("option");
                    emptyOpt.value = "";
                    emptyOpt.textContent = "(выберите source)";
                    ui.objectSourceSelect.appendChild(emptyOpt);

                    for (const srcDef of srcItems) {
                        const key = (srcDef?.key || "").toString().trim();
                        if (!key) continue;
                        if (mustRestrict && !allowedSet.has(key)) continue;
                        const opt = document.createElement("option");
                        opt.value = key;
                        opt.textContent = `${srcDef.label || key} (${key})`;
                        ui.objectSourceSelect.appendChild(opt);
                    }

                    const normalizedSelected = (selectedSource || "").toString().trim();
                    const hasSelected = normalizedSelected && Array.from(ui.objectSourceSelect.options).some((o) => o.value === normalizedSelected);
                    ui.objectSourceSelect.value = hasSelected ? normalizedSelected : "";
                    if (ui.objectSourceCustomInput) {
                        ui.objectSourceCustomInput.value = hasSelected ? "" : normalizedSelected;
                    }
                };

                const getObjectSourceFromUi = () => {
                    const selectVal = (ui.objectSourceSelect?.value || "").trim();
                    const customVal = (ui.objectSourceCustomInput?.value || "").trim();
                    return customVal || selectVal;
                };

                const openObjectEditor = (existingObj = null) => {
                    const obj = existingObj ? MEP.ConditionObjects.normalizeConditionObject(existingObj) : MEP.ConditionObjects.makeDefault();
                    ui._objectEditId = obj.id || "";
                    if (ui.objectPresetTypeSelect) ui.objectPresetTypeSelect.value = obj.type === "charter" ? "charter" : "streak_lt";
                    if (ui.objectPresetTypeSelect && obj.type === "diff_vector_state") ui.objectPresetTypeSelect.value = "diff_vector_state";
                    if (ui.objectPresetStrategyIdSelect) ui.objectPresetStrategyIdSelect.value = obj.strategyId || "strategy1";
                    syncPresetInputsByType();
                    if (ui.objectPresetThresholdInput) ui.objectPresetThresholdInput.value = String(Math.max(1, Math.floor(Number(obj?.params?.threshold) || 3)));
                    if (ui.objectPresetLabelInput) ui.objectPresetLabelInput.value = obj.label || (obj.type === "charter" ? "Устав" : "Подряд x <");
                    if (ui.objectPresetGroupIdInput) ui.objectPresetGroupIdInput.value = obj.groupId || "streak_lt";
                    if (ui.objectPresetGroupModeSelect) ui.objectPresetGroupModeSelect.value = obj.groupMode || "single";
                    if (ui.objectPresetEnabledInput) ui.objectPresetEnabledInput.checked = !!obj.enabled;
                    if (ui.objectIdInput) ui.objectIdInput.value = obj.id || "";
                    if (ui.objectTypeInput) ui.objectTypeInput.value = obj.type || "";
                    if (ui.objectStrategyIdSelect) ui.objectStrategyIdSelect.value = obj.strategyId || "strategy1";
                    renderObjectSourceOptions(obj.source || "", obj.type || "");
                    if (ui.objectLabelInput) ui.objectLabelInput.value = obj.label || "";
                    if (ui.objectDiffModeSelect) ui.objectDiffModeSelect.value = (obj?.params?.mode || "gt").toString();
                    if (ui.objectGroupIdInput) ui.objectGroupIdInput.value = obj.groupId || "";
                    if (ui.objectGroupModeSelect) ui.objectGroupModeSelect.value = obj.groupMode || "single";
                    if (ui.objectEnabledInput) ui.objectEnabledInput.checked = !!obj.enabled;
                    if (ui.objectParamsInput) ui.objectParamsInput.value = JSON.stringify(obj.params || {}, null, 2);
                    if (ui.objectUiInput) ui.objectUiInput.value = JSON.stringify(obj.ui || {}, null, 2);
                    if (ui.objectRuntimeInput) ui.objectRuntimeInput.value = JSON.stringify(obj.runtimeDefaults || {}, null, 2);
                    setObjectJsonRowVisible("params", false);
                    setObjectJsonRowVisible("ui", false);
                    setObjectJsonRowVisible("runtime", false);
                    if (ui.objectEditorMsg) ui.objectEditorMsg.textContent = "";
                    if (ui.objectOverlay) ui.objectOverlay.style.display = "flex";
                };

                const parseJsonField = (txt, fallback = {}) => {
                    const s = (txt ?? "").toString().trim();
                    if (!s) return fallback;
                    const v = JSON.parse(s);
                    if (!v || typeof v !== "object" || Array.isArray(v)) throw new Error("JSON должен быть объектом");
                    return v;
                };

                const buildPresetObjectDraft = (presetType = "streak_lt", override = {}) => {
                    const t = (presetType || "").toString().trim().toLowerCase();
                    const strategyId = (override.strategyId || ui.objectsStrategyContextSelect?.value || "strategy1").toString().trim().toLowerCase() || "strategy1";
                    if (t === "diff_vector_state") {
                        const mode = (override.diffMode || override.mode || "gt").toString().trim().toLowerCase();
                        const modeSafe = mode === "lt" || mode === "flat" ? mode : "gt";
                        const labelByMode = {
                            gt: "Diff: mainEMA > shiftedEMA",
                            lt: "Diff: mainEMA < shiftedEMA",
                            flat: "Diff: false (flat)",
                        };
                        const label = (override.label ?? labelByMode[modeSafe]).toString().trim() || labelByMode[modeSafe];
                        const enabled = override.enabled !== false;
                        return MEP.ConditionObjects.normalizeConditionObject({
                            id: `diff_vector_${modeSafe}`,
                            type: "diff_vector_state",
                            strategyId,
                            source: "diff.vector.state",
                            label,
                            enabled,
                            groupId: "diff_vector_state",
                            groupMode: "single",
                            params: { mode: modeSafe },
                            ui: { order: 0, visible: true },
                            runtimeDefaults: {
                                currentValue: "flat",
                                reached: false,
                                result: false,
                                resultText: "",
                            },
                        });
                    }
                    if (t === "charter") {
                        const label = (override.label ?? "Устав").toString().trim() || "Устав";
                        const enabled = override.enabled !== false;
                        return MEP.ConditionObjects.normalizeConditionObject({
                            id: "charter_main",
                            type: "charter",
                            strategyId,
                            source: "charter.allowed",
                            label,
                            enabled,
                            groupId: "",
                            groupMode: "",
                            params: {},
                            ui: { order: 0, visible: true },
                            runtimeDefaults: {
                                currentValue: false,
                                reached: false,
                                result: false,
                                resultText: "",
                            },
                        });
                    }

                    const threshold = Math.max(1, Math.floor(Number(override.threshold) || 3));
                    const label = (override.label ?? "Подряд x <").toString().trim() || "Подряд x <";
                    const groupId = (override.groupId ?? "streak_lt").toString().trim();
                    const groupMode = (override.groupMode ?? "single").toString().trim();
                    const enabled = override.enabled !== false;
                    return MEP.ConditionObjects.normalizeConditionObject({
                        id: `streak_lt_${threshold}`,
                        type: "streak_lt",
                        strategyId,
                        source: "lt2_streak",
                        label,
                        enabled,
                        groupId,
                        groupMode,
                        params: { threshold },
                        ui: { order: 0, visible: true },
                        runtimeDefaults: {
                            currentValue: 0,
                            reached: false,
                            result: false,
                            resultText: "",
                        },
                    });
                };

                const applyPresetToObjectForm = (presetType = "streak_lt", override = {}) => {
                    const draft = buildPresetObjectDraft(presetType, override);
                    console.debug("[MEP][ConditionObjects][UI] applyPresetToObjectForm", {
                        presetType,
                        override,
                        draft: {
                            id: draft?.id || "",
                            type: draft?.type || "",
                            source: draft?.source || "",
                            threshold: draft?.params?.threshold,
                        },
                    });
                    if (ui.objectIdInput) ui.objectIdInput.value = draft.id || "";
                    if (ui.objectTypeInput) ui.objectTypeInput.value = draft.type || "";
                    if (ui.objectStrategyIdSelect) ui.objectStrategyIdSelect.value = draft.strategyId || "strategy1";
                    renderObjectSourceOptions(draft.source || "", draft.type || "");
                    if (ui.objectLabelInput) ui.objectLabelInput.value = draft.label || "";
                    if (ui.objectDiffModeSelect) ui.objectDiffModeSelect.value = (draft?.params?.mode || "gt").toString();
                    if (ui.objectGroupIdInput) ui.objectGroupIdInput.value = draft.groupId || "";
                    if (ui.objectGroupModeSelect) ui.objectGroupModeSelect.value = draft.groupMode || "single";
                    if (ui.objectEnabledInput) ui.objectEnabledInput.checked = !!draft.enabled;
                    if (ui.objectParamsInput) ui.objectParamsInput.value = JSON.stringify(draft.params || {}, null, 2);
                    if (ui.objectUiInput) ui.objectUiInput.value = JSON.stringify(draft.ui || {}, null, 2);
                    if (ui.objectRuntimeInput) ui.objectRuntimeInput.value = JSON.stringify(draft.runtimeDefaults || {}, null, 2);
                    return draft;
                };

                const syncPresetInputsByType = () => {
                    const t = (ui.objectPresetTypeSelect?.value || "streak_lt").trim();
                    const isStreak = t === "streak_lt";
                    const isDiff = t === "diff_vector_state";
                    const isCharter = t === "charter";

                    if (ui.objectPresetThresholdInput) ui.objectPresetThresholdInput.style.display = isStreak ? "" : "none";
                    if (ui.objectPresetGroupIdInput) ui.objectPresetGroupIdInput.style.display = isStreak ? "" : "none";
                    if (ui.objectPresetGroupModeSelect) ui.objectPresetGroupModeSelect.style.display = isStreak ? "" : "none";
                    if (ui.objectPresetDiffModeSelect) ui.objectPresetDiffModeSelect.style.display = isDiff ? "" : "none";

                    if (ui.objectPresetLabelInput && !ui.objectPresetLabelInput.value.trim()) {
                        if (isStreak) ui.objectPresetLabelInput.value = "Подряд x <";
                        else if (isDiff) ui.objectPresetLabelInput.value = "Diff: mainEMA > shiftedEMA";
                        else if (isCharter) ui.objectPresetLabelInput.value = "Устав";
                    }
                };

                const openPresetObjectEditor = (presetType = "streak_lt", override = {}) => {
                    const draft = buildPresetObjectDraft(presetType, override);
                    console.debug("[MEP][ConditionObjects][UI] openPresetObjectEditor", {
                        presetType,
                        override,
                        draft: {
                            id: draft?.id || "",
                            type: draft?.type || "",
                            source: draft?.source || "",
                            threshold: draft?.params?.threshold,
                        },
                    });
                    const existing = MEP.ConditionObjects.get(draft.id);
                    if (existing) {
                        openObjectEditor(existing);
                        if (ui.objectEditorMsg) ui.objectEditorMsg.textContent = `Объект ${draft.id} уже существует, открыт режим редактирования`;
                        return;
                    }
                    openObjectEditor(null);
                    if (ui.objectPresetTypeSelect) ui.objectPresetTypeSelect.value = (presetType || "streak_lt").toString();
                    if (ui.objectPresetStrategyIdSelect) ui.objectPresetStrategyIdSelect.value = draft.strategyId || "strategy1";
                    syncPresetInputsByType();
                    if (ui.objectPresetThresholdInput && typeof override.threshold !== "undefined")
                        ui.objectPresetThresholdInput.value = String(Math.max(1, Math.floor(Number(override.threshold) || 3)));
                    if (ui.objectPresetLabelInput)
                        ui.objectPresetLabelInput.value = (
                            override.label ||
                            (presetType === "charter"
                                ? "Устав"
                                : presetType === "diff_vector_state"
                                  ? "Diff: mainEMA > shiftedEMA"
                                  : "Подряд x <")
                        ).toString();
                    if (ui.objectPresetGroupIdInput) ui.objectPresetGroupIdInput.value = (override.groupId || "streak_lt").toString();
                    if (ui.objectPresetGroupModeSelect) ui.objectPresetGroupModeSelect.value = (override.groupMode || "single").toString();
                    if (ui.objectPresetDiffModeSelect) ui.objectPresetDiffModeSelect.value = (override.diffMode || override.mode || "gt").toString();
                    if (ui.objectPresetEnabledInput) ui.objectPresetEnabledInput.checked = override.enabled !== false;
                    applyPresetToObjectForm(presetType, override);
                };

                const refreshObjectsFromDb = async () => {
                    try {
                        console.debug("[MEP][ConditionObjects][UI] refreshObjectsFromDb start");
                        const loaded = await MEP.ConditionObjects.loadFromDb("settings_tab_objects");
                        console.debug("[MEP][ConditionObjects][UI] refreshObjectsFromDb loaded", {
                            count: Array.isArray(loaded) ? loaded.length : 0,
                            items: (loaded || []).map((it) => ({ id: it?.id || "", type: it?.type || "" })),
                        });
                        console.debug("[MEP][ConditionObjects][UI] refreshObjectsFromDb renderObjectsList call");
                        renderObjectsList();
                        console.debug("[MEP][ConditionObjects][UI] refreshObjectsFromDb renderStrategy1MinimalUi trigger");
                        MEP.UI.renderStrategy1MinimalUi(MEP.UI.getStrategyState("strategy1"));
                    } catch (e) {
                        console.warn("[MEP][ConditionObjects][UI] refreshObjectsFromDb failed", e);
                        if (ui.objectsList) ui.objectsList.innerHTML = `<div class="mep-objects-empty">Ошибка загрузки объектов</div>`;
                    }
                };

                const applyCodePriorityUi = () => {
                    const endpointForced = !!MEP.Settings.hasCodeEndpoint?.();
                    const soundsForced = !!MEP.Settings.hasCodeSoundsText?.();

                    if (ui.endpointInput) {
                        ui.endpointInput.readOnly = endpointForced;
                        ui.endpointInput.title = endpointForced ? "Значение задано в коде (MEP.CodeSettings.endpointUrl)" : "";
                    }
                    if (ui.soundsInput) {
                        ui.soundsInput.readOnly = soundsForced;
                        ui.soundsInput.title = soundsForced ? "Значение задано в коде (MEP.CodeSettings.soundsText)" : "";
                    }
                };

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
                    applyCodePriorityUi();

                    ui.settingsOverlay.style.display = "flex";
                    setSettingsTab("settings");
                };

                const closeSettings = () => {
                    if (!ui.settingsOverlay) return;
                    ui.settingsOverlay.style.display = "none";
                    closeObjectEditor();
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
                for (const btn of ui.settingsTabButtons || []) {
                    btn.addEventListener("click", async () => {
                        const tab = btn.dataset.tab || "settings";
                        setSettingsTab(tab);
                        if (tab === "objects") await refreshObjectsFromDb();
                    });
                }

                ui.objectsRefreshBtn?.addEventListener("click", refreshObjectsFromDb);
                const getObjectsContextStrategyId = () =>
                    (ui.objectsStrategyContextSelect?.value || ui.objectPresetStrategyIdSelect?.value || "strategy1").toString().trim().toLowerCase() ||
                    "strategy1";
                ui.objectsAddBtn?.addEventListener("click", () => openObjectEditor({ strategyId: getObjectsContextStrategyId() }));
                ui.quickStreak2Btn?.addEventListener("click", () => openPresetObjectEditor("streak_lt", { threshold: 2, strategyId: getObjectsContextStrategyId() }));
                ui.quickStreak3Btn?.addEventListener("click", () => openPresetObjectEditor("streak_lt", { threshold: 3, strategyId: getObjectsContextStrategyId() }));
                ui.quickStreak4Btn?.addEventListener("click", () => openPresetObjectEditor("streak_lt", { threshold: 4, strategyId: getObjectsContextStrategyId() }));
                ui.quickStreak5Btn?.addEventListener("click", () => openPresetObjectEditor("streak_lt", { threshold: 5, strategyId: getObjectsContextStrategyId() }));
                ui.quickCharterBtn?.addEventListener("click", () => openPresetObjectEditor("charter", { strategyId: getObjectsContextStrategyId() }));
                ui.objectsList?.addEventListener("click", (e) => {
                    const editBtn = e.target?.closest?.("button.mep-object-edit");
                    const deleteBtn = e.target?.closest?.("button.mep-object-delete");
                    const id = (editBtn?.getAttribute("data-object-id") || deleteBtn?.getAttribute("data-object-id") || "").trim();
                    if (!id) return;
                    const obj = MEP.ConditionObjects.get(id);
                    if (!obj) return;
                    if (editBtn) {
                        openObjectEditor(obj);
                        return;
                    }
                    if (deleteBtn) {
                        const ok = window.confirm(`Удалить объект ${id}?`);
                        if (!ok) return;
                        MEP.ConditionObjects.remove(id)
                            .then((deleted) => {
                                if (!deleted) throw new Error("Удаление не подтверждено backend");
                                const strategyId = (obj?.strategyId || "strategy1").toString().trim().toLowerCase();
                                let changed = false;
                                changed = MEP.UI.removeConditionIdFromStrategyPool(strategyId, id) || changed;
                                if (changed) MEP.Storage.save();
                                refreshObjectsFromDb();
                            })
                            .catch((err) => {
                                if (ui.objectEditorMsg) ui.objectEditorMsg.textContent = `Ошибка удаления: ${err?.message || err}`;
                            });
                    }
                });
                ui.objectModalCloseBtn?.addEventListener("click", closeObjectEditor);
                ui.objectCancelBtn?.addEventListener("click", closeObjectEditor);
                ui.objectOverlay?.addEventListener("click", (e) => {
                    if (e.target === ui.objectOverlay) closeObjectEditor();
                });
                for (const btn of ui.objectJsonToggleBtns || []) {
                    btn.addEventListener("click", () => {
                        const key = (btn.dataset.target || "").toString().trim().toLowerCase();
                        const row = getObjectJsonRowByKey(key);
                        if (!row) return;
                        const willShow = row.style.display === "none";
                        setObjectJsonRowVisible(key, willShow);
                    });
                }
                ui.objectPresetTypeSelect?.addEventListener("change", syncPresetInputsByType);
                ui.objectsStrategyContextSelect?.addEventListener("change", () => {
                    if (ui.objectPresetStrategyIdSelect) ui.objectPresetStrategyIdSelect.value = ui.objectsStrategyContextSelect.value || "strategy1";
                });
                ui.objectPresetApplyBtn?.addEventListener("click", () => {
                    const presetType = (ui.objectPresetTypeSelect?.value || "streak_lt").trim().toLowerCase();
                    const threshold = Math.max(1, Math.floor(Number(ui.objectPresetThresholdInput?.value) || 3));
                    const diffMode = (ui.objectPresetDiffModeSelect?.value || "gt").trim();
                    const override = {
                        threshold,
                        strategyId: (ui.objectPresetStrategyIdSelect?.value || getObjectsContextStrategyId() || "strategy1").trim(),
                        label: (ui.objectPresetLabelInput?.value || "").trim(),
                        groupId: (ui.objectPresetGroupIdInput?.value || "").trim(),
                        groupMode: (ui.objectPresetGroupModeSelect?.value || "single").trim(),
                        enabled: !!ui.objectPresetEnabledInput?.checked,
                    };
                    if (presetType === "diff_vector_state") override.diffMode = diffMode;
                    console.debug("[MEP][ConditionObjects][UI] preset apply click", { presetType, override });
                    const draft = applyPresetToObjectForm(presetType, override);
                    console.debug("[MEP][ConditionObjects][UI] preset apply draft result", {
                        id: draft?.id || "",
                        type: draft?.type || "",
                        source: draft?.source || "",
                        threshold: draft?.params?.threshold,
                    });
                    const existing = MEP.ConditionObjects.get(draft.id);
                    if (existing) {
                        if (ui.objectEditorMsg) ui.objectEditorMsg.textContent = `Объект ${draft.id} уже существует: сохранение обновит его`;
                    } else if (ui.objectEditorMsg) {
                        ui.objectEditorMsg.textContent = `Preset подставлен: ${draft.id}`;
                    }
                });
                ui.objectTypeInput?.addEventListener("input", () => {
                    const type = (ui.objectTypeInput?.value || "").trim().toLowerCase();
                    const currentSource = getObjectSourceFromUi();
                    const nextSource = currentSource || MEP.ConditionObjects.getDefaultSourceForType(type) || "";
                    renderObjectSourceOptions(nextSource, type);
                    if (type === "diff_vector_state") {
                        if (ui.objectSourceSelect && !ui.objectSourceSelect.value) ui.objectSourceSelect.value = "diff.vector.state";
                        if (ui.objectLabelInput && !ui.objectLabelInput.value.trim()) ui.objectLabelInput.value = "Diff: mainEMA > shiftedEMA";
                    }
                });
                ui.objectSourceSelect?.addEventListener("change", () => {
                    if ((ui.objectSourceSelect?.value || "").trim()) {
                        if (ui.objectSourceCustomInput) ui.objectSourceCustomInput.value = "";
                    }
                });
                ui.objectSaveBtn?.addEventListener("click", async () => {
                    try {
                        const obj = {
                            id: (ui.objectIdInput?.value || "").trim(),
                            type: (ui.objectTypeInput?.value || "").trim(),
                            strategyId: (ui.objectStrategyIdSelect?.value || "strategy1").trim(),
                            source: getObjectSourceFromUi(),
                            label: (ui.objectLabelInput?.value || "").trim(),
                            groupId: (ui.objectGroupIdInput?.value || "").trim(),
                            groupMode: (ui.objectGroupModeSelect?.value || "single").trim(),
                            enabled: !!ui.objectEnabledInput?.checked,
                            params: parseJsonField(ui.objectParamsInput?.value || "{}", {}),
                            ui: parseJsonField(ui.objectUiInput?.value || "{}", {}),
                            runtimeDefaults: parseJsonField(ui.objectRuntimeInput?.value || "{}", {}),
                        };
                        if (obj.type === "diff_vector_state") {
                            const m = (ui.objectDiffModeSelect?.value || obj?.params?.mode || "gt").toString().trim().toLowerCase();
                            obj.params.mode = m === "lt" || m === "flat" ? m : "gt";
                        }
                        console.debug("[MEP][ConditionObjects][UI] modal save click: object draft", obj);
                        const vr = MEP.ConditionObjects.validateConditionObject(obj);
                        console.debug("[MEP][ConditionObjects][UI] modal save click: validate result", vr);
                        if (!vr.ok) throw new Error(vr.error || "validation failed");
                        console.debug("[MEP][ConditionObjects][UI] modal save click: saveToDb call", {
                            endpoint: (MEP.Settings.getEndpoint?.() ?? "").toString().trim(),
                            reason: ui._objectEditId ? "object_update_modal" : "object_create_modal",
                            payloadObject: vr.value,
                        });
                        await MEP.ConditionObjects.saveToDb(vr.value, ui._objectEditId ? "object_update_modal" : "object_create_modal");
                        await refreshObjectsFromDb();
                        closeObjectEditor();
                    } catch (e) {
                        console.warn("[MEP][ConditionObjects][UI] modal save click failed", e);
                        if (ui.objectEditorMsg) ui.objectEditorMsg.textContent = `Ошибка: ${e?.message || e}`;
                    }
                });

                // save settings
                // load settings from DB (по endpoint из поля)
                ui.settingsLoadBtn?.addEventListener("click", async () => {
                    const btn = ui.settingsLoadBtn;
                    if (!btn) return;

                    const url = (ui.endpointInput?.value || "").trim();
                    if (!MEP.Settings.hasCodeEndpoint?.()) {
                        MEP.Settings.setEndpoint(url); // сохраняем url перед запросом
                    }

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
                        applyCodePriorityUi();

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
                    if (!MEP.Settings.hasCodeEndpoint?.()) {
                        MEP.Settings.setEndpoint(url);
                    }

                    // sounds
                    if (ui.soundsInput && !MEP.Settings.hasCodeSoundsText?.()) {
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
                    if (!MEP.Settings.hasCodeEndpoint?.()) {
                        MEP.Settings.setEndpoint(url); // сразу сохраняем
                    }

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

                        try {
                            MEP.Strategy1?.handleRoundFinishedFromDom?.(e);
                        } catch (e) {
                            console.warn("[MEP] reconcile strategy1 round bridge failed:", e);
                        }
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
                try {
                    MEP.Strategy1?.handleRoundFinishedFromDom?.(entry);
                } catch (e) {
                    console.warn("[MEP] execution round bridge failed:", e);
                }
            },

            handleUpdate() {
                const root = MEP.Tracker.state.root;
                if (!root) return;
                try {
                    MEP.Strategy1?.checkExecutionTimeout?.();
                } catch (e) {}

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
            resetStrategiesAfterStorageLoad() {
                const strategies = MEP.State?.strategies;
                if (!strategies || typeof strategies !== "object") return;

                const s1 = strategies.strategy1;
                if (s1 && typeof s1 === "object") {
                    const d1 = buildStrategy1DefaultState();
                    s1.enabled = false;
                    s1.isExecuting = false;
                    s1.executionLocked = false;
                    s1.cycle = { ...d1.cycle };
                    s1.counters = { ...d1.counters };
                    s1.timers = { ...d1.timers };
                    s1.runtime = { ...d1.runtime };
                    s1.conditions = { ...d1.conditions };
                    s1.stakePlan = { ...d1.stakePlan };
                }

                const s2 = strategies.strategy2;
                if (s2 && typeof s2 === "object") {
                    const d2 = buildStrategy2DefaultState();
                    s2.enabled = false;
                    s2.isExecuting = false;
                    s2.executionLocked = d2.executionLocked;
                    s2.timers = { ...d2.timers };
                    s2.runtime = { ...d2.runtime };
                }

                MEP.State.activeStrategyId = null;
            },

            boot() {
                MEP.Storage.load();
                MEP.Main.resetStrategiesAfterStorageLoad();

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

                // bridge-step: подгрузим реестр объектов для первой живой строки Strategy1
                try {
                    MEP.ConditionObjects?.loadFromDb?.("strategy1_bridge_boot")
                        ?.then(() => MEP.UI.renderStrategy1MinimalUi(MEP.UI.getStrategyState("strategy1")))
                        ?.catch(() => {});
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
