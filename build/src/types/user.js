"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = require("crypto");
const moment_1 = __importDefault(require("moment"));
const db_1 = __importDefault(require("../db"));
const logger_1 = __importStar(require("../utils/logger"));
const spotifyCredentials_1 = __importDefault(require("./spotifyCredentials"));
const logger = new logger_1.default(logger_1.DEBUG.WARN, '/types/user');
/**
 * Authenticated Spotify user plus credentials and helper utilities.
 */
class User {
    //* getter, setter
    get credentials() {
        return this._credentials;
    }
    get displayName() {
        return this._displayName;
    }
    set displayName(value) {
        this._displayName = value;
    }
    get spotifyId() {
        return this._spotifyId;
    }
    /**
     * Start background cleanup for temporary login tokens.
     */
    static startWaitingForCleanup() {
        if (this.waitingForCleanupTimer) {
            return;
        }
        this.waitingForCleanupTimer = setInterval(() => {
            const cutoff = (0, moment_1.default)().subtract(30, 's');
            this.waitingFor = this.waitingFor.filter((elm) => (0, moment_1.default)(elm.timestamp).isAfter(cutoff));
        }, moment_1.default.duration(60, 's').asMilliseconds());
    }
    /**
     * Stop the background cleanup timer.
     */
    static stopWaitingForCleanup() {
        if (this.waitingForCleanupTimer) {
            clearInterval(this.waitingForCleanupTimer);
            this.waitingForCleanupTimer = undefined;
        }
    }
    // * constructors
    constructor(credentials, displayName, spotifyId) {
        if (credentials instanceof spotifyCredentials_1.default) {
            this._credentials = credentials;
        }
        else {
            this._credentials = new spotifyCredentials_1.default(credentials[0], credentials[1], credentials[2], credentials[3]);
        }
        this._displayName = displayName;
        this._spotifyId = spotifyId;
    }
    //* static methods
    /**
     * Re-hydrate a User instance from the serialized Express session.
     */
    static fromExpress(eUser) {
        const { _credentials, _displayName, _spotifyId } = eUser;
        const { _accessToken, _expiresAt, _refreshToken } = _credentials;
        const user = new _a([_accessToken, _expiresAt, _refreshToken, _spotifyId], _displayName, _spotifyId);
        return user;
    }
    //* methods
    /**
     * Refresh Spotify credentials and return the latest user model.
     */
    refreshCredentials(deps) {
        var _b;
        const db = (_b = deps === null || deps === void 0 ? void 0 : deps.db) !== null && _b !== void 0 ? _b : db_1.default.getInstance();
        return this._credentials.refresh({ db }).then(() => db.user.get(this._spotifyId));
    }
}
_a = User;
User.waitingFor = [];
/**
 * Register a one-time token for external login flows.
 */
User.addWaitFor = (token) => {
    const _token = token || (0, crypto_1.randomUUID)();
    _a.waitingFor.push({ timestamp: new Date(), token: _token });
    return _token;
};
/**
 * Consume a one-time token if it exists.
 */
User.isInWaitingFor = (token) => {
    const i = _a.waitingFor.findIndex((w) => w.token === token);
    if (i >= 0) {
        _a.waitingFor.splice(i, 1);
        return true;
    }
    return false;
};
exports.default = User;
