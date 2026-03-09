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
exports.aggregateAllConfiguredPlaylists = exports.aggregateConfiguredPlaylistForUser = exports.aggregatePlaylistRule = exports.buildDesiredUrisFromSourceTracks = void 0;
const moment_1 = __importDefault(require("moment"));
const https = __importStar(require("https"));
const db_1 = __importDefault(require("./db"));
const spotifyApi_1 = require("./spotifyApi");
const types_1 = require("./types");
const logger_1 = __importStar(require("./utils/logger"));
const logger = new logger_1.default(logger_1.DEBUG.WARN, '/aggregation');
const chunk = (items, size) => {
    const chunks = [];
    for (let i = 0; i < items.length; i += size) {
        chunks.push(items.slice(i, i + size));
    }
    return chunks;
};
const runAddTracks = (spotify, playlistId, uris) => __awaiter(void 0, void 0, void 0, function* () {
    for (const uriChunk of chunk(uris, 100)) {
        const result = yield spotify.addTracksToPlaylist(playlistId, uriChunk);
        if (!(result.statusCode === 201 || result.statusCode === 200)) {
            throw new Error(`Could not add tracks to playlist '${playlistId}' (status=${result.statusCode})`);
        }
    }
});
const runRemoveTracks = (spotify, playlistId, uris) => __awaiter(void 0, void 0, void 0, function* () {
    for (const uriChunk of chunk(uris, 100)) {
        const result = yield spotify.removeTracksFromPlaylist(playlistId, uriChunk.map((uri) => ({ uri })));
        if (result.statusCode !== 200) {
            throw new Error(`Could not remove tracks from playlist '${playlistId}' (status=${result.statusCode})`);
        }
    }
});
const sortByAddedAtOldestFirst = (tracks) => [...tracks].sort((a, b) => (0, moment_1.default)(a.added_at).valueOf() - (0, moment_1.default)(b.added_at).valueOf());
const playlistMarketFallbacks = [undefined, 'from_token', 'DE', 'US', 'SE', 'GB', 'AT', 'CH'];
const requestText = (url, redirectCount = 0) => new Promise((resolve, reject) => {
    const req = https.get(url, {
        headers: {
            Accept: 'text/html,application/xhtml+xml',
            'User-Agent': 'Mozilla/5.0 (compatible; kurzzeitplaylists/1.0)',
        },
    }, (response) => {
        var _a;
        const status = (_a = response.statusCode) !== null && _a !== void 0 ? _a : 500;
        const locationHeader = response.headers.location;
        if (status >= 300 && status < 400 && typeof locationHeader === 'string') {
            response.resume();
            if (redirectCount >= 5) {
                reject(new Error(`Request to '${url}' exceeded redirect limit`));
                return;
            }
            const redirectUrl = new URL(locationHeader, url).toString();
            requestText(redirectUrl, redirectCount + 1).then(resolve).catch(reject);
            return;
        }
        if (status >= 400) {
            response.resume();
            reject(new Error(`Request to '${url}' failed with status=${status}`));
            return;
        }
        const chunks = [];
        response.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        response.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    });
    req.on('error', reject);
    req.setTimeout(7000, () => req.destroy(new Error(`Request to '${url}' timed out`)));
});
const extractTrackUrisFromEmbedHtml = (html) => {
    var _a, _b, _c, _d, _e, _f;
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (nextDataMatch === null || nextDataMatch === void 0 ? void 0 : nextDataMatch[1]) {
        try {
            const nextData = JSON.parse(nextDataMatch[1]);
            const audioItems = (_e = (_d = (_c = (_b = (_a = nextData.props) === null || _a === void 0 ? void 0 : _a.pageProps) === null || _b === void 0 ? void 0 : _b.state) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.entity) === null || _e === void 0 ? void 0 : _e.audioItems;
            if (Array.isArray(audioItems)) {
                const fromJson = audioItems
                    .map((item) => item === null || item === void 0 ? void 0 : item.uri)
                    .filter((uri) => typeof uri === 'string' && uri.startsWith('spotify:track:'));
                if (fromJson.length > 0) {
                    return fromJson;
                }
            }
        }
        catch (_err) { }
    }
    const matches = (_f = html.match(/spotify:track:[A-Za-z0-9]{22}/g)) !== null && _f !== void 0 ? _f : [];
    const seen = new Set();
    const uniqueInOrder = [];
    matches.forEach((uri) => {
        if (!seen.has(uri)) {
            seen.add(uri);
            uniqueInOrder.push(uri);
        }
    });
    return uniqueInOrder;
};
const loadSourceTrackUrisFromEmbed = (sourceSpotifyId) => __awaiter(void 0, void 0, void 0, function* () {
    const embedUrl = `https://open.spotify.com/embed/playlist/${encodeURIComponent(sourceSpotifyId)}`;
    try {
        const html = yield requestText(embedUrl);
        const uris = extractTrackUrisFromEmbedHtml(html);
        if (uris.length > 0) {
            return uris;
        }
    }
    catch (_err) { }
    return undefined;
});
const toSyntheticPlaylistTrackObjects = (uris) => uris.map((uri, index) => ({
    added_at: moment_1.default.utc(0).add(index, 'seconds').toISOString(),
    track: { uri },
}));
const buildDesiredUrisFromSourceTracks = (sourceTracks) => {
    const seen = new Set();
    const uris = [];
    let skippedNoUri = 0;
    sourceTracks.forEach((tracks) => {
        sortByAddedAtOldestFirst(tracks).forEach((track) => {
            var _a;
            const uri = (_a = track.track) === null || _a === void 0 ? void 0 : _a.uri;
            if (!uri) {
                skippedNoUri += 1;
                return;
            }
            if (!seen.has(uri)) {
                seen.add(uri);
                uris.push(uri);
            }
        });
    });
    return { skippedNoUri, uris };
};
exports.buildDesiredUrisFromSourceTracks = buildDesiredUrisFromSourceTracks;
const loadSourceTracksWithMarketFallback = (spotify, sourceSpotifyId) => __awaiter(void 0, void 0, void 0, function* () {
    for (const market of playlistMarketFallbacks) {
        try {
            return yield types_1.Playlist.getTracks(spotify, sourceSpotifyId, 0, 50, 'added_at,track.uri', market);
        }
        catch (_err) { }
    }
    return undefined;
});
const loadDesiredUris = (spotify, sourcePlaylistIds) => __awaiter(void 0, void 0, void 0, function* () {
    const sourceTracks = [];
    let publicSpotify;
    let appTokenUnavailable = false;
    for (const sourceSpotifyId of sourcePlaylistIds) {
        const tracksFromUserToken = yield loadSourceTracksWithMarketFallback(spotify, sourceSpotifyId);
        if (tracksFromUserToken) {
            sourceTracks.push(tracksFromUserToken);
            continue;
        }
        if (!publicSpotify && !appTokenUnavailable) {
            try {
                publicSpotify = yield (0, spotifyApi_1.getSpotifyClientCredentials)();
            }
            catch (err) {
                appTokenUnavailable = true;
                logger.warn('Skipping app-token source fallback because client-credentials grant failed', err);
            }
        }
        if (publicSpotify) {
            const tracksFromAppToken = yield loadSourceTracksWithMarketFallback(publicSpotify, sourceSpotifyId);
            if (tracksFromAppToken) {
                sourceTracks.push(tracksFromAppToken);
                continue;
            }
        }
        const tracksFromEmbed = yield loadSourceTrackUrisFromEmbed(sourceSpotifyId);
        if (tracksFromEmbed) {
            sourceTracks.push(toSyntheticPlaylistTrackObjects(tracksFromEmbed));
            continue;
        }
        logger.warn(`Could not load source playlist '${sourceSpotifyId}' via user/app token nor embed`);
        throw new Error(`Could not load source playlist '${sourceSpotifyId}'`);
    }
    return (0, exports.buildDesiredUrisFromSourceTracks)(sourceTracks);
});
const aggregatePlaylistRule = (rule, user, deps) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const db = (_a = deps === null || deps === void 0 ? void 0 : deps.db) !== null && _a !== void 0 ? _a : db_1.default.getInstance();
    const spotify = (_b = deps === null || deps === void 0 ? void 0 : deps.spotify) !== null && _b !== void 0 ? _b : (0, spotifyApi_1.getSpotify)(user);
    const desired = yield loadDesiredUris(spotify, rule.sourcePlaylistIds);
    const targetTracks = yield types_1.Playlist.getTracks(spotify, rule.targetSpotifyId, 0, 50, 'track.uri');
    const currentUris = targetTracks.map((track) => { var _a; return (_a = track.track) === null || _a === void 0 ? void 0 : _a.uri; }).filter((uri) => Boolean(uri));
    let skippedNoUri = desired.skippedNoUri + (targetTracks.length - currentUris.length);
    let removed = 0;
    let added = 0;
    if (rule.mode === 'add_missing') {
        const existing = new Set(currentUris);
        const missing = desired.uris.filter((uri) => !existing.has(uri));
        if (missing.length > 0) {
            yield runAddTracks(spotify, rule.targetSpotifyId, missing);
            added = missing.length;
        }
    }
    else {
        const desiredSet = new Set(desired.uris);
        const keptDesired = new Set();
        const toRemove = [];
        currentUris.forEach((uri) => {
            if (!desiredSet.has(uri)) {
                toRemove.push(uri);
            }
            else if (keptDesired.has(uri)) {
                toRemove.push(uri);
            }
            else {
                keptDesired.add(uri);
            }
        });
        if (toRemove.length > 0) {
            yield runRemoveTracks(spotify, rule.targetSpotifyId, toRemove);
            removed = toRemove.length;
        }
        const missing = desired.uris.filter((uri) => !keptDesired.has(uri));
        if (missing.length > 0) {
            yield runAddTracks(spotify, rule.targetSpotifyId, missing);
            added = missing.length;
        }
    }
    try {
        const playlist = yield db.playlist.get(rule.targetSpotifyId);
        yield playlist.refresh(user.credentials, true);
    }
    catch (err) {
        logger.warn(`Could not refresh playlist '${rule.targetSpotifyId}' after aggregation:`, err);
    }
    return {
        added,
        desiredUnique: desired.uris.length,
        mode: rule.mode,
        removed,
        skippedNoUri,
        sourcePlaylistIds: [...rule.sourcePlaylistIds],
        targetSpotifyId: rule.targetSpotifyId,
    };
});
exports.aggregatePlaylistRule = aggregatePlaylistRule;
const aggregateConfiguredPlaylistForUser = (targetSpotifyId, user, deps) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const db = (_a = deps === null || deps === void 0 ? void 0 : deps.db) !== null && _a !== void 0 ? _a : db_1.default.getInstance();
    const rule = yield db.playlistAggregation.getForTarget(targetSpotifyId, user.spotifyId);
    if (rule.sourcePlaylistIds.length < 1) {
        throw new Error(`Aggregation rule for target '${targetSpotifyId}' has no source playlists`);
    }
    return (0, exports.aggregatePlaylistRule)(rule, user, deps);
});
exports.aggregateConfiguredPlaylistForUser = aggregateConfiguredPlaylistForUser;
const aggregateAllConfiguredPlaylists = (deps) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const db = (_a = deps === null || deps === void 0 ? void 0 : deps.db) !== null && _a !== void 0 ? _a : db_1.default.getInstance();
    const rules = yield db.playlistAggregation.getAll();
    const results = [];
    for (const rule of rules) {
        if (rule.sourcePlaylistIds.length < 1) {
            logger.warn(`Skipping aggregation for target='${rule.targetSpotifyId}' because no source playlists are configured`);
            continue;
        }
        try {
            const user = yield db.user.get(rule.ownerId);
            const result = yield (0, exports.aggregatePlaylistRule)(rule, user, { db });
            results.push(result);
        }
        catch (err) {
            logger.error(`Could not aggregate target='${rule.targetSpotifyId}'`, err);
        }
    }
    return results;
});
exports.aggregateAllConfiguredPlaylists = aggregateAllConfiguredPlaylists;
