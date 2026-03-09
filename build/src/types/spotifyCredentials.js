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
Object.defineProperty(exports, "__esModule", { value: true });
const moment_1 = __importDefault(require("moment"));
const db_1 = __importDefault(require("../db"));
const spotifyApi_1 = require("../spotifyApi");
const logger_1 = __importStar(require("../utils/logger"));
const logger = new logger_1.default(logger_1.DEBUG.WARN, '/types/spotifyCredentials');
/**
 * Spotify OAuth credentials with refresh support.
 */
class SpotifyCredentials {
    //* getter, setter
    get accessToken() {
        return this._accessToken;
    }
    get expiresAt() {
        return this._expiresAt;
    }
    get refreshToken() {
        return this._refreshToken;
    }
    // * constructors
    constructor(accessToken, expiresAt, refreshToken, spotifyId) {
        this._accessToken = accessToken;
        this._expiresAt = (0, moment_1.default)(expiresAt);
        this._refreshToken = refreshToken;
        this._spotifyId = spotifyId;
    }
    //* methods
    /**
     * Refresh the access token and persist it.
     */
    refresh(deps) {
        var _a, _b, _c;
        const db = (_a = deps === null || deps === void 0 ? void 0 : deps.db) !== null && _a !== void 0 ? _a : db_1.default.getInstance();
        const spotify = (_b = deps === null || deps === void 0 ? void 0 : deps.spotify) !== null && _b !== void 0 ? _b : ((deps === null || deps === void 0 ? void 0 : deps.spotifyFactory) ? deps.spotifyFactory(this) : (0, spotifyApi_1.getSpotify)(this));
        const now = (_c = deps === null || deps === void 0 ? void 0 : deps.now) !== null && _c !== void 0 ? _c : (0, moment_1.default)();
        return spotify
            .refreshAccessToken()
            .then((refreshResult) => {
            const { access_token, refresh_token, expires_in } = refreshResult.body;
            this._accessToken = access_token;
            this._expiresAt = now.clone().add(expires_in, 's');
            if (refresh_token)
                this._refreshToken = refresh_token;
            return db.credentials.update(this, this._spotifyId).then(() => undefined);
        })
            .catch((err) => {
            logger.error(`While refreshing access token of user with id='${this._spotifyId}', we got an error:`, err);
            return Promise.reject(err);
        });
    }
}
exports.default = SpotifyCredentials;
