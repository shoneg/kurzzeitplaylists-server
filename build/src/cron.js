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
exports.aggregateThenCleanup = exports.trackDeletion = void 0;
const moment_1 = __importDefault(require("moment"));
const aggregation_1 = require("./aggregation");
const db_1 = __importDefault(require("./db"));
const spotifyApi_1 = require("./spotifyApi");
const types_1 = require("./types");
const logger_1 = __importStar(require("./utils/logger"));
const logger = new logger_1.default(logger_1.DEBUG.INFO, '/cron');
/**
 * Convert a moment duration to milliseconds.
 */
const d = (inp, unit) => moment_1.default.duration(inp, unit).asMilliseconds();
/**
 * Refresh tokens that are close to expiring.
 */
const refreshSessions = () => {
    logger.info('Start token refreshing');
    const expiresBefore = (0, moment_1.default)().subtract(6, 'h');
    (0, spotifyApi_1.refreshAllSessions)(expiresBefore)
        .then(() => { })
        .catch(() => { });
};
/**
 * Add tracks to a playlist and normalize response handling.
 */
const addTracks = (spotify, playlistId, tracks) => {
    return new Promise((res, rej) => {
        spotify
            .addTracksToPlaylist(playlistId, tracks)
            .then((result) => {
            if (result.statusCode === 201 || result.statusCode === 200) {
                res();
            }
            else {
                logger.error('Got an error while adding tracks to playlist:', result);
                rej('Got error while adding tracks to playlist');
            }
        })
            .catch((err) => {
            logger.error(err), rej(err);
        });
    });
};
/**
 * Remove tracks from a playlist and normalize response handling.
 */
const removeTracks = (spotify, playlistId, tracks) => {
    return new Promise((res, rej) => {
        spotify
            .removeTracksFromPlaylist(playlistId, tracks)
            .then((removingResponse) => {
            if (removingResponse.statusCode === 200) {
                res();
            }
            else {
                logger.error('Got an error while removing tracks from playlist:', removingResponse);
                rej('Got an error while removing tracks from playlist');
            }
        })
            .catch((err) => {
            logger.error(err), rej(err);
        });
    });
};
/**
 * Periodic cleanup for playlists that exceed configured limits.
 */
const trackDeletion = () => {
    logger.info('Start track deletion');
    const db = db_1.default.getInstance();
    db.playlist
        .getTrackDeletionCandidates()
        .then((playlists) => {
        const promises = playlists.map((p) => {
            return new Promise((res, rej) => {
                db.credentials.get(p.ownerId).then((c) => {
                    const spotify = (0, spotifyApi_1.getSpotify)(c);
                    const maxAgeMoment = (0, moment_1.default)().subtract(p.maxTrackAge, 'd');
                    types_1.Playlist.getTracks(spotify, p.spotifyId, undefined, undefined, 'added_at,track.uri')
                        .then((tracks) => {
                        let remove = [];
                        if (p.maxTrackAge !== undefined && (0, moment_1.default)(p.oldestTrack).isBefore(maxAgeMoment)) {
                            remove = tracks.filter((t) => (0, moment_1.default)(t.added_at).isBefore(maxAgeMoment));
                        }
                        if (p.maxTracks && tracks.length - remove.length > p.maxTracks) {
                            // Trim oldest remaining tracks to respect the maxTracks limit.
                            const sortedRest = tracks
                                .filter((t) => !remove.includes(t))
                                .sort((a, b) => (0, moment_1.default)(a.added_at).diff((0, moment_1.default)(b.added_at)));
                            remove = remove.concat(sortedRest.slice(0, sortedRest.length - p.maxTracks));
                        }
                        const tooOldUris = remove.map((t) => { var _a; return ({ uri: (_a = t.track) === null || _a === void 0 ? void 0 : _a.uri }); }).filter((t) => t.uri !== undefined);
                        if (tooOldUris.length === 0) {
                            res();
                            return;
                        }
                        const getRemovePromise = () => removeTracks(spotify, p.spotifyId, tooOldUris)
                            .then(() => p
                            .refresh(c, true)
                            .then(() => res())
                            .catch(() => rej()))
                            .catch(() => rej());
                        if (p.discardPlaylist) {
                            addTracks(spotify, p.discardPlaylist, tooOldUris.map((u) => u.uri))
                                .then(() => getRemovePromise())
                                .catch(() => rej());
                        }
                        else {
                            getRemovePromise();
                        }
                    })
                        .catch(() => rej());
                });
            });
        });
        Promise.all(promises)
            .then(() => { })
            .catch(() => { });
    })
        .catch(() => { });
};
exports.trackDeletion = trackDeletion;
/**
 * Aggregate configured playlist unions and then run cleanup rules.
 */
const aggregateThenCleanup = (deps) => {
    var _a, _b;
    const aggregatePlaylists = (_a = deps === null || deps === void 0 ? void 0 : deps.aggregateAllConfiguredPlaylists) !== null && _a !== void 0 ? _a : aggregation_1.aggregateAllConfiguredPlaylists;
    const cleanup = (_b = deps === null || deps === void 0 ? void 0 : deps.trackDeletion) !== null && _b !== void 0 ? _b : exports.trackDeletion;
    logger.info('Start aggregation + cleanup maintenance cycle');
    aggregatePlaylists()
        .catch((err) => {
        logger.error('Playlist aggregation cycle failed:', err);
    })
        .finally(() => {
        cleanup();
    });
};
exports.aggregateThenCleanup = aggregateThenCleanup;
/**
 * Start scheduled background tasks.
 */
const cron = () => {
    setInterval(refreshSessions, d(30, 'm'));
    setInterval(exports.aggregateThenCleanup, d(1, 'h'));
};
exports.default = cron;
