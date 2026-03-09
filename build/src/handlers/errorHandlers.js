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
Object.defineProperty(exports, "__esModule", { value: true });
exports.spotifyErrorHandler = exports.authErrorHandler = exports.defaultErrorHandler = void 0;
const logger_1 = __importStar(require("../utils/logger"));
const logger = new logger_1.default(logger_1.DEBUG.WARN, '/handlers/errorHandlers');
/**
 * Fallback error handler for unexpected failures.
 */
const defaultErrorHandler = (err, req, res, next) => {
    logger.error('Unhandled error:', err);
    res.status(500).send('Internal server error');
};
exports.defaultErrorHandler = defaultErrorHandler;
/**
 * Handle known authentication errors from the Spotify OAuth flow.
 */
const authErrorHandler = (err, req, res, next) => {
    const m = err.message;
    if (!m || !(m.includes('login failed') || m.includes('registration failed') || m.includes('TokenError'))) {
        next(err);
    }
    else {
        logger.info('Spotify login failed for any reason:', err);
        if (m.includes('registration failed')) {
            res.status(401).send('Registration failed');
        }
        else if (m.includes('TokenError')) {
            res.status(401).send("You're login is expired. Please <a href='/auth/logout'>logout</a> and then login again.");
        }
        else {
            res.status(401).send('Login failed');
        }
    }
};
exports.authErrorHandler = authErrorHandler;
/**
 * Handle Spotify API errors in a user-friendly way.
 */
const spotifyErrorHandler = (err, req, res, next) => {
    var _a;
    const m = err.message;
    if (!m || m.includes("Spotify's Web API")) {
        next(err);
    }
    else {
        logger.warn('Got Spotify Error:', err);
        if (((_a = err === null || err === void 0 ? void 0 : err.body) === null || _a === void 0 ? void 0 : _a.error) && err.body.error.status && err.body.error.message) {
            if (err.body.error.status === 404) {
                res
                    .status(404)
                    .send("Spotify couldn't find this playlist. Maybe it doesn't exist anymore… Try to <a href='/playlists/recognize'>recognize</a> playlist to show only your current existing playlists.");
            }
            else {
                res.status(err.body.error.status).send(err.body.error.message);
            }
        }
        else {
            logger.error('Got Spotify Error with unknown format');
            res.status(500).send('There was an unknown error.');
        }
    }
};
exports.spotifyErrorHandler = spotifyErrorHandler;
