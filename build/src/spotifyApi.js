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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshAllSessions = exports.getSpotifyClientCredentials = exports.getSpotify = exports.strategy = void 0;
const config_1 = require("./config");
const passport_spotify_1 = require("passport-spotify");
const types_1 = require("./types");
const moment_1 = __importDefault(require("moment"));
const spotify_web_api_node_1 = __importDefault(require("spotify-web-api-node"));
const db_1 = __importDefault(require("./db"));
const logger_1 = __importStar(require("./utils/logger"));
const logger = new logger_1.default(logger_1.DEBUG.WARN, '/spotifyApi');
let clientCredentialsCache;
/** OAuth callback path registered with Spotify. */
const authCallbackPath = Object.freeze((0, config_1.buildServerPath)('/auth/callback'));
/**
 * Full redirect URI passed to Spotify for OAuth.
 * Uses `URI` as canonical origin when configured to avoid host mismatches.
 */
const redirectUri = Object.freeze(`${config_1.URI || `${config_1.RUNNING_WITH_TLS ? 'https' : 'http'}://${config_1.HOST}:${config_1.PROXY_PORT}`}${authCallbackPath}`);
/**
 * Passport strategy for Spotify OAuth.
 */
exports.strategy = new passport_spotify_1.Strategy({
    clientID: config_1.CLIENT_ID,
    clientSecret: config_1.CLIENT_SECRET,
    callbackURL: redirectUri,
}, function (accessToken, refreshToken, expires_in, profile, done) {
    const db = db_1.default.getInstance();
    process.nextTick(() => {
        db.user
            .exist(profile.id)
            .then((loadedUser) => {
            const { displayName, id } = profile;
            const expiresAt = (0, moment_1.default)().add(expires_in, 's');
            const newUser = new types_1.User([accessToken, expiresAt, refreshToken, id], displayName, id);
            if (loadedUser) {
                // Always persist fresh credentials from the OAuth callback.
                // This ensures newly granted scopes are immediately usable.
                db.user
                    .update(newUser)
                    .then((updatedUser) => done(null, updatedUser))
                    .catch(done);
            }
            else {
                db.user
                    .insert(newUser)
                    .then(() => done(null, newUser))
                    .catch(() => done(new Error('registration failed')));
            }
        })
            .catch(() => done(new Error('login failed')));
    });
});
/**
 * Create a Spotify API client for either a user or raw tokens.
 */
const getSpotify = (arg) => {
    var _a, _b;
    return new spotify_web_api_node_1.default({
        clientId: config_1.CLIENT_ID,
        clientSecret: config_1.CLIENT_SECRET,
        redirectUri,
        accessToken: ((_a = arg.credentials) === null || _a === void 0 ? void 0 : _a.accessToken) || arg.accessToken,
        refreshToken: ((_b = arg.credentials) === null || _b === void 0 ? void 0 : _b.refreshToken) || arg.refreshToken,
    });
};
exports.getSpotify = getSpotify;
/**
 * Create a Spotify API client authenticated via client credentials.
 * Useful for reading public resources that might not be visible via a user token.
 */
const getSpotifyClientCredentials = () => __awaiter(void 0, void 0, void 0, function* () {
    const spotify = new spotify_web_api_node_1.default({
        clientId: config_1.CLIENT_ID,
        clientSecret: config_1.CLIENT_SECRET,
        redirectUri,
    });
    if (clientCredentialsCache && clientCredentialsCache.expiresAt.isAfter((0, moment_1.default)().add(30, 's'))) {
        spotify.setAccessToken(clientCredentialsCache.accessToken);
        return spotify;
    }
    const grantResult = yield spotify.clientCredentialsGrant();
    clientCredentialsCache = {
        accessToken: grantResult.body.access_token,
        expiresAt: (0, moment_1.default)().add(grantResult.body.expires_in, 's'),
    };
    spotify.setAccessToken(clientCredentialsCache.accessToken);
    return spotify;
});
exports.getSpotifyClientCredentials = getSpotifyClientCredentials;
/**
 * Refresh all sessions that expire before the given time.
 */
const refreshAllSessions = (expireBefore = (0, moment_1.default)(), deps) => {
    var _a;
    const db = (_a = deps === null || deps === void 0 ? void 0 : deps.db) !== null && _a !== void 0 ? _a : db_1.default.getInstance();
    return db.credentials
        .getAllExpiresBefore(expireBefore)
        .then((credentials) => {
        const refreshPromises = credentials.map((c) => c.refresh({ db }));
        return Promise.all(refreshPromises).then(() => {
            logger.info(`All user credentials, that expires before ${expireBefore.toISOString()} were successfully refreshed.`);
        });
    })
        .catch((err) => {
        logger.warn('While refreshing user credentials we got an err:', err);
        return Promise.reject(err);
    });
};
exports.refreshAllSessions = refreshAllSessions;
