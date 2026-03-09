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
exports.deleteAccount = exports.recognize = exports.deleteAggregation = exports.runAggregation = exports.upsertAggregation = exports.updatePlaylist = exports.playlistDetail = exports.aggregations = exports.playlists = exports.session = void 0;
const https = __importStar(require("https"));
const moment_1 = __importDefault(require("moment"));
const aggregation_1 = require("../../aggregation");
const db_1 = __importDefault(require("../../db"));
const spotifyApi_1 = require("../../spotifyApi");
const types_1 = require("../../types");
const logger_1 = __importStar(require("../../utils/logger"));
const service_1 = require("../playlists/service");
const asString = (value) => Array.isArray(value) ? value[0] : value;
const logger = new logger_1.default(logger_1.DEBUG.WARN, '/handlers/api');
const asStringArray = (value) => {
    if (!Array.isArray(value)) {
        return [];
    }
    return value
        .filter((entry) => typeof entry === 'string')
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
};
const toAggregationRuleResponse = (rule) => ({
    mode: rule.mode,
    sourcePlaylistIds: [...rule.sourcePlaylistIds],
    targetSpotifyId: rule.targetSpotifyId,
});
const dedupeSpotifyPlaylists = (playlists) => {
    const seen = new Set();
    const deduped = [];
    playlists.forEach((playlist) => {
        if (!seen.has(playlist.id)) {
            seen.add(playlist.id);
            deduped.push(playlist);
        }
    });
    return deduped;
};
const getAccessibleSpotifyPlaylists = (user) => types_1.Playlist.getMany(0, 50, (0, spotifyApi_1.getSpotify)(user)).then((playlists) => dedupeSpotifyPlaylists(playlists).sort((a, b) => a.name.localeCompare(b.name)));
const playlistMarketFallbacks = [undefined, 'from_token', 'DE', 'US', 'SE', 'GB', 'AT', 'CH'];
const requestJson = (url) => new Promise((resolve, reject) => {
    const req = https.get(url, {
        headers: { Accept: 'application/json' },
    }, (response) => {
        var _a;
        if (((_a = response.statusCode) !== null && _a !== void 0 ? _a : 500) >= 400) {
            response.resume();
            reject(new Error(`Request to '${url}' failed with status=${response.statusCode}`));
            return;
        }
        const chunks = [];
        response.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        response.on('end', () => {
            try {
                const body = Buffer.concat(chunks).toString('utf-8');
                resolve(JSON.parse(body));
            }
            catch (err) {
                reject(err);
            }
        });
    });
    req.on('error', reject);
    req.setTimeout(5000, () => req.destroy(new Error(`Request to '${url}' timed out`)));
});
const tryGetPlaylistWithMarkets = (spotify, playlistId, fields) => __awaiter(void 0, void 0, void 0, function* () {
    for (const market of playlistMarketFallbacks) {
        try {
            const result = yield spotify.getPlaylist(playlistId, market ? { fields, market } : { fields });
            if (result.statusCode === 200) {
                return result.body;
            }
        }
        catch (_err) { }
    }
    return undefined;
});
const tryGetPlaylistTracksWithMarkets = (spotify, playlistId) => __awaiter(void 0, void 0, void 0, function* () {
    for (const market of playlistMarketFallbacks) {
        try {
            const result = yield spotify.getPlaylistTracks(playlistId, market
                ? { limit: 1, offset: 0, fields: 'items(track(uri)),next', market }
                : { limit: 1, offset: 0, fields: 'items(track(uri)),next' });
            if (result.statusCode === 200) {
                return true;
            }
        }
        catch (_err) { }
    }
    return false;
});
const resolvePlaylistNameFromOEmbed = (playlistId) => __awaiter(void 0, void 0, void 0, function* () {
    const url = `https://open.spotify.com/oembed?url=${encodeURIComponent(`spotify:playlist:${playlistId}`)}`;
    try {
        const data = (yield requestJson(url));
        if (typeof data.title === 'string' && data.title.trim().length > 0) {
            return data.title.trim();
        }
    }
    catch (_err) { }
    return undefined;
});
const canAccessPlaylistById = (spotify, playlistId) => __awaiter(void 0, void 0, void 0, function* () {
    const fromUserToken = yield tryGetPlaylistWithMarkets(spotify, playlistId, 'id');
    if (fromUserToken) {
        return true;
    }
    const fromUserTokenTracks = yield tryGetPlaylistTracksWithMarkets(spotify, playlistId);
    if (fromUserTokenTracks) {
        return true;
    }
    try {
        const publicSpotify = yield (0, spotifyApi_1.getSpotifyClientCredentials)();
        const fromAppToken = yield tryGetPlaylistWithMarkets(publicSpotify, playlistId, 'id');
        if (fromAppToken) {
            return true;
        }
        const fromAppTokenTracks = yield tryGetPlaylistTracksWithMarkets(publicSpotify, playlistId);
        if (fromAppTokenTracks) {
            return true;
        }
    }
    catch (_publicErr) { }
    const fromOEmbed = yield resolvePlaylistNameFromOEmbed(playlistId);
    if (fromOEmbed) {
        return true;
    }
    logger.warn(`Source playlist '${playlistId}' is not accessible via user/app token nor oEmbed`);
    return false;
});
const resolvePlaylistNameById = (spotify, playlistId) => __awaiter(void 0, void 0, void 0, function* () {
    const fromUserToken = yield tryGetPlaylistWithMarkets(spotify, playlistId, 'id,name');
    if ((fromUserToken === null || fromUserToken === void 0 ? void 0 : fromUserToken.id) && (fromUserToken === null || fromUserToken === void 0 ? void 0 : fromUserToken.name)) {
        return {
            name: fromUserToken.name,
            spotifyId: fromUserToken.id,
        };
    }
    try {
        const publicSpotify = yield (0, spotifyApi_1.getSpotifyClientCredentials)();
        const fromAppToken = yield tryGetPlaylistWithMarkets(publicSpotify, playlistId, 'id,name');
        if ((fromAppToken === null || fromAppToken === void 0 ? void 0 : fromAppToken.id) && (fromAppToken === null || fromAppToken === void 0 ? void 0 : fromAppToken.name)) {
            return {
                name: fromAppToken.name,
                spotifyId: fromAppToken.id,
            };
        }
    }
    catch (_err) { }
    const oEmbedName = yield resolvePlaylistNameFromOEmbed(playlistId);
    if (oEmbedName) {
        return {
            name: oEmbedName,
            spotifyId: playlistId,
        };
    }
    return undefined;
});
/**
 * Convert a playlist model to a client-safe summary payload.
 */
const toPlaylistSummary = (playlist) => {
    var _a, _b, _c;
    return ({
        spotifyId: playlist.spotifyId,
        name: playlist.name,
        numberOfTracks: playlist.numberOfTracks,
        maxTrackAge: (_a = playlist.maxTrackAge) !== null && _a !== void 0 ? _a : null,
        maxTracks: (_b = playlist.maxTracks) !== null && _b !== void 0 ? _b : null,
        discardPlaylist: (_c = playlist.discardPlaylist) !== null && _c !== void 0 ? _c : null,
    });
};
/**
 * Return current session info for the client shell.
 */
const session = (req, res) => {
    if (!req.user) {
        res.json({ authenticated: false });
        return;
    }
    const user = types_1.User.fromExpress(req.user);
    res.json({
        authenticated: true,
        user: {
            displayName: user.displayName,
            spotifyId: user.spotifyId,
        },
    });
};
exports.session = session;
/**
 * Return a list of playlists for the authenticated user.
 */
const playlists = (req, res, next) => {
    const db = db_1.default.getInstance();
    const user = types_1.User.fromExpress(req.user);
    db.user
        .getPlaylists(user, 'lexicographic_az')
        .then((list) => res.json(list.map(toPlaylistSummary)))
        .catch(next);
};
exports.playlists = playlists;
/**
 * Return configured aggregation rules and available playlists.
 */
const aggregations = (req, res, next) => {
    const db = db_1.default.getInstance();
    const user = types_1.User.fromExpress(req.user);
    Promise.all([
        db.playlistAggregation.getForUser(user.spotifyId),
        db.user.getPlaylists(user, 'lexicographic_az'),
        getAccessibleSpotifyPlaylists(user),
    ])
        .then((_a) => __awaiter(void 0, [_a], void 0, function* ([rules, targetPlaylists, sourcePlaylists]) {
        const sourceMap = new Map();
        sourcePlaylists.forEach((playlist) => {
            sourceMap.set(playlist.id, { name: playlist.name, spotifyId: playlist.id });
        });
        const missingRuleSources = [...new Set(rules.flatMap((rule) => rule.sourcePlaylistIds))].filter((sourceId) => !sourceMap.has(sourceId));
        if (missingRuleSources.length > 0) {
            const spotify = (0, spotifyApi_1.getSpotify)(user);
            const resolved = yield Promise.all(missingRuleSources.map((sourceId) => resolvePlaylistNameById(spotify, sourceId)));
            resolved.forEach((entry) => {
                if (entry) {
                    sourceMap.set(entry.spotifyId, entry);
                }
            });
        }
        const sortedSourceOptions = [...sourceMap.values()].sort((a, b) => a.name.localeCompare(b.name));
        return res.json({
            playlists: sortedSourceOptions,
            targetPlaylists: targetPlaylists.map((playlist) => ({
                name: playlist.name,
                spotifyId: playlist.spotifyId,
            })),
            rules: rules.map(toAggregationRuleResponse),
        });
    }))
        .catch(next);
};
exports.aggregations = aggregations;
/**
 * Return playlist detail along with discard options and oldest track info.
 */
const playlistDetail = (req, res, next) => {
    const id = asString(req.params.id);
    if (!id) {
        res.status(400).json({ message: 'Missing playlist id' });
        return;
    }
    const user = types_1.User.fromExpress(req.user);
    const db = db_1.default.getInstance();
    db.playlist
        .get(id)
        .then((playlist) => playlist
        .refresh(user.credentials, true)
        .then(() => db.playlist
        .get(id)
        .then((fresh) => db.user.getPlaylists(user, 'lexicographic_az').then((playlists) => {
        const oldestTrackDate = fresh.oldestTrack.format('YYYY-MM-DD');
        const ageDays = (0, moment_1.default)().diff(fresh.oldestTrack, 'd');
        res.json({
            playlist: Object.assign(Object.assign({}, toPlaylistSummary(fresh)), { oldestTrack: {
                    date: oldestTrackDate,
                    ageDays,
                } }),
            discardOptions: playlists
                .filter((playlistOption) => playlistOption.spotifyId !== fresh.spotifyId)
                .map((playlistOption) => ({
                spotifyId: playlistOption.spotifyId,
                name: playlistOption.name,
            })),
        });
    }))
        .catch(next))
        .catch(next))
        .catch(next);
};
exports.playlistDetail = playlistDetail;
/**
 * Update cleanup settings for a playlist.
 */
const updatePlaylist = (req, res, next) => {
    const id = asString(req.params.id);
    if (!id) {
        res.status(400).json({ message: 'Missing playlist id' });
        return;
    }
    const user = types_1.User.fromExpress(req.user);
    const { maxAge, maxTracks, discardPlaylist } = req.body;
    const db = db_1.default.getInstance();
    db.playlist
        .update({
        spotifyId: id,
        maxTrackAge: maxAge !== null && maxAge !== void 0 ? maxAge : null,
        maxTracks: maxTracks !== null && maxTracks !== void 0 ? maxTracks : null,
        discardPlaylist: discardPlaylist !== null && discardPlaylist !== void 0 ? discardPlaylist : null,
    }, user)
        .then(() => res.json({ ok: true }))
        .catch(next);
};
exports.updatePlaylist = updatePlaylist;
/**
 * Create or update an aggregation rule and run it immediately once.
 */
const upsertAggregation = (req, res, next) => {
    const user = types_1.User.fromExpress(req.user);
    const db = db_1.default.getInstance();
    const { mode, newTargetName, targetSpotifyId: requestTargetId } = req.body;
    const sourcePlaylistIds = asStringArray(req.body.sourcePlaylistIds);
    if (!(0, types_1.isAggregationMode)(mode)) {
        res.status(400).json({ message: 'Invalid aggregation mode' });
        return;
    }
    if (sourcePlaylistIds.length < 1) {
        res.status(400).json({ message: 'At least one source playlist must be provided' });
        return;
    }
    if (new Set(sourcePlaylistIds).size !== sourcePlaylistIds.length) {
        res.status(400).json({ message: 'Duplicate source playlists are not allowed' });
        return;
    }
    if (requestTargetId && typeof newTargetName === 'string' && newTargetName.trim().length > 0) {
        res.status(400).json({ message: 'Provide either targetSpotifyId or newTargetName, not both' });
        return;
    }
    if (!requestTargetId && (!newTargetName || newTargetName.trim().length < 1)) {
        res.status(400).json({ message: 'Missing target playlist identifier' });
        return;
    }
    Promise.all([db.user.getPlaylists(user), getAccessibleSpotifyPlaylists(user)])
        .then((_a) => __awaiter(void 0, [_a], void 0, function* ([playlists, accessiblePlaylists]) {
        const spotify = (0, spotifyApi_1.getSpotify)(user);
        let targetSpotifyId = requestTargetId;
        const ownPlaylistIds = new Set(playlists.map((playlist) => playlist.spotifyId));
        const accessibleSourceIds = new Set(accessiblePlaylists.map((playlist) => playlist.id));
        if (!targetSpotifyId) {
            const created = yield spotify.createPlaylist(newTargetName.trim(), {
                collaborative: false,
                description: 'Managed by Kurzzeitplaylists aggregation',
                public: false,
            });
            const createdPlaylist = types_1.Playlist.fromApiObj(created.body);
            try {
                yield db.playlist.insert([createdPlaylist]);
            }
            catch (_err) {
                // If the playlist row already exists, we can continue with the existing target.
            }
            targetSpotifyId = created.body.id;
            ownPlaylistIds.add(targetSpotifyId);
            accessibleSourceIds.add(targetSpotifyId);
        }
        if (!targetSpotifyId || !ownPlaylistIds.has(targetSpotifyId)) {
            res.status(400).json({ message: 'Target playlist must belong to the authenticated user' });
            return;
        }
        if (sourcePlaylistIds.includes(targetSpotifyId)) {
            res.status(400).json({ message: 'Target playlist cannot be part of source playlists' });
            return;
        }
        const unknownSourceIds = sourcePlaylistIds.filter((sourceSpotifyId) => !accessibleSourceIds.has(sourceSpotifyId));
        if (unknownSourceIds.length > 0) {
            const accessChecks = yield Promise.all(unknownSourceIds.map((sourceSpotifyId) => canAccessPlaylistById(spotify, sourceSpotifyId)));
            const stillUnknown = [];
            unknownSourceIds.forEach((sourceSpotifyId, index) => {
                if (accessChecks[index]) {
                    accessibleSourceIds.add(sourceSpotifyId);
                }
                else {
                    stillUnknown.push(sourceSpotifyId);
                }
            });
            if (stillUnknown.length > 0) {
                logger.warn(`Sources not verifiable during save for user='${user.spotifyId}': ${stillUnknown.join(', ')}`);
                res.status(400).json({
                    message: `All source playlists must be accessible to the authenticated user. Not accessible: ${stillUnknown.join(', ')}`,
                });
                return;
            }
        }
        const savedRule = yield db.playlistAggregation.upsert({
            mode,
            ownerId: user.spotifyId,
            sourcePlaylistIds,
            targetSpotifyId,
        });
        const execution = yield (0, aggregation_1.aggregateConfiguredPlaylistForUser)(targetSpotifyId, user, { db });
        res.json({
            execution,
            rule: toAggregationRuleResponse(savedRule),
        });
    }))
        .catch(next);
};
exports.upsertAggregation = upsertAggregation;
/**
 * Execute one configured aggregation rule immediately.
 */
const runAggregation = (req, res, next) => {
    const targetSpotifyId = asString(req.params.targetId);
    if (!targetSpotifyId) {
        res.status(400).json({ message: 'Missing target playlist id' });
        return;
    }
    const user = types_1.User.fromExpress(req.user);
    (0, aggregation_1.aggregateConfiguredPlaylistForUser)(targetSpotifyId, user)
        .then((result) => res.json(result))
        .catch((err) => {
        if (String(err).includes('not found')) {
            res.status(404).json({ message: 'Aggregation rule not found' });
        }
        else {
            next(err);
        }
    });
};
exports.runAggregation = runAggregation;
/**
 * Delete one configured aggregation rule.
 */
const deleteAggregation = (req, res, next) => {
    const targetSpotifyId = asString(req.params.targetId);
    if (!targetSpotifyId) {
        res.status(400).json({ message: 'Missing target playlist id' });
        return;
    }
    const user = types_1.User.fromExpress(req.user);
    db_1.default.getInstance()
        .playlistAggregation.delete(targetSpotifyId, user.spotifyId)
        .then((deleted) => {
        if (!deleted) {
            res.status(404).json({ message: 'Aggregation rule not found' });
            return;
        }
        res.json({ ok: true });
    })
        .catch(next);
};
exports.deleteAggregation = deleteAggregation;
/**
 * Trigger a server-side playlist discovery run.
 */
const recognize = (req, res, next) => {
    (0, service_1.recognizePlaylistsOfUser)(types_1.User.fromExpress(req.user))
        .then((result) => res.json(result))
        .catch(next);
};
exports.recognize = recognize;
/**
 * Delete the current account after explicit confirmation.
 */
const deleteAccount = (req, res, next) => {
    const { sure } = req.body;
    if (sure !== "Yes, I'm sure!") {
        res.status(400).json({ message: 'Incorrect confirmation phrase' });
        return;
    }
    const user = types_1.User.fromExpress(req.user);
    db_1.default.getInstance()
        .user.delete(user)
        .then(() => req.logout((e) => {
        if (e) {
            next(e);
        }
        else {
            res.json({ ok: true });
        }
    }))
        .catch(next);
};
exports.deleteAccount = deleteAccount;
