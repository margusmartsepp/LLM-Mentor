/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
var __assign = (undefined && undefined.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (undefined && undefined.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var lastRequest = null;
var isSidebarOpen = true;
var normalizeText = function (text) {
    return text.trim().replace(/\s+/g, ' ');
};
var isRequestDuplicate = function (current, last) {
    if (!last)
        return false;
    var currentPrompt = normalizeText(current.messages[current.messages.length - 1].content);
    var lastPrompt = normalizeText(last.messages[last.messages.length - 1].content);
    return currentPrompt === lastPrompt &&
        current.model === last.model &&
        current.maxTokens === last.maxTokens &&
        current.temperature === last.temperature &&
        current.url === last.url &&
        JSON.stringify(current.messages.slice(0, -1)) === JSON.stringify(last.messages.slice(0, -1));
};
var calculateAverageResponseTime = function (model, maxTokens) { return __awaiter(void 0, void 0, void 0, function () {
    var result, history, relevantRequests, totalTime;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, chrome.storage.local.get(['history'])];
            case 1:
                result = _a.sent();
                history = result.history || {};
                relevantRequests = Object.values(history).flat();
                if (!relevantRequests || relevantRequests.length === 0)
                    return [2 /*return*/, 5]; // Default expectation
                totalTime = relevantRequests.reduce(function (acc, curr) { return acc + curr.requestTime; }, 0);
                return [2 /*return*/, totalTime / relevantRequests.length];
        }
    });
}); };
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    console.log("Message received in background:", message);
    if (message.type === 'API_CALL') {
        var apiRequest = {
            type: message.type,
            model: message.model || '',
            url: message.url || '',
            messages: message.messages || [],
            maxTokens: message.maxTokens,
            temperature: message.temperature,
            timestamp: new Date()
        };
        if (isRequestDuplicate(apiRequest, lastRequest)) {
            console.log("Duplicate request detected, returning cached response");
            if (lastRequest === null || lastRequest === void 0 ? void 0 : lastRequest.response) {
                sendResponse({ success: true, data: lastRequest.response, cached: true });
            }
            else {
                sendResponse({ success: false, error: 'Cached response not available' });
            }
            return true;
        }
        lastRequest = __assign(__assign({}, apiRequest), { response: null });
        var startTime_1 = Date.now();
        if (!message.url) {
            sendResponse({ success: false, error: 'URL is required' });
            return true;
        }
        fetch(message.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: message.model,
                messages: message.messages,
                max_tokens: message.max_tokens,
                temperature: message.temperature
            })
        })
            .then(function (response) { return response.json(); })
            .then(function (data) {
            var requestTime = (Date.now() - startTime_1) / 1000;
            data.requestTime = requestTime;
            if (lastRequest) {
                lastRequest.response = data;
            }
            sendResponse({ success: true, data: data, cached: false });
        })
            .catch(function (error) {
            lastRequest = null;
            sendResponse({ success: false, error: error.message });
        });
        return true;
    }
    if (message.type === 'SAVE_HISTORY') {
        var date = new Date(message.data.timestamp);
        var fileName_1 = "".concat(date.getFullYear(), "-").concat(String(date.getMonth() + 1).padStart(2, '0'), "-").concat(String(date.getDate()).padStart(2, '0'), ".json");
        chrome.storage.local.get(['history'], function (result) {
            var history = result.history || {};
            if (!history[fileName_1]) {
                history[fileName_1] = [];
            }
            history[fileName_1].push(message.data);
            chrome.storage.local.set({ history: history }, function () { return sendResponse({ success: true }); });
        });
        return true;
    }
    if (message.type === 'GET_AVG_RESPONSE_TIME') {
        calculateAverageResponseTime(message.model || '', message.maxTokens || 0) // provide defaults
            .then(function (avgTime) {
            sendResponse({ success: true, avgTime: avgTime });
        });
        return true;
    }
    if (message.type === 'GET_AVAILABLE_MODELS') {
        var models = ['model-a', 'model-b', 'model-c']; // Replace with actual models retrieved according to selected provider
        sendResponse({ success: true, models: models });
        return true;
    }
    if (message.type === 'PURGE_HISTORY') {
        chrome.storage.local.remove('history').then(function () {
            sendResponse({ success: true });
        });
        return true;
    }
    if (message.type === 'DELETE_HISTORY_ITEM') {
        chrome.storage.local.get(['history'], function (result) {
            var history = result.history || {};
            Object.keys(history).forEach(function (dateKey) {
                history[dateKey] = history[dateKey].filter(function (item) { return item.id !== message.id; });
            });
            chrome.storage.local.set({ history: history }, function () { return sendResponse({ success: true }); });
        });
        return true;
    }
    if (message.type === 'GET_HISTORY') {
        chrome.storage.local.get(['history'], function (result) {
            var history = result.history || {};
            var allItems = [];
            Object.values(history).forEach(function (items) {
                if (Array.isArray(items)) {
                    allItems = allItems.concat(items);
                }
            });
            sendResponse({ success: true, data: allItems });
        });
        return true;
    }
    if (message.type === 'GET_MEMORY_PROFILES') {
        chrome.storage.local.get(['memoryProfiles'], function (result) {
            var profiles = result.memoryProfiles || [];
            sendResponse({ success: true, profiles: profiles }); // Type cast here
        });
        return true;
    }
});
chrome.action.onClicked.addListener(function () {
    if (isSidebarOpen) {
        chrome.sidePanel.setOptions({ path: '' });
        isSidebarOpen = false;
    }
    else {
        chrome.sidePanel.setOptions({ path: 'sidebar.html' });
        isSidebarOpen = true;
    }
});


/******/ })()
;
//# sourceMappingURL=server-bundle.js.map