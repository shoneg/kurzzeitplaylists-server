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
exports.recognize = exports.submitEditPlaylist = exports.editPlaylistView = exports.playlistsView = exports.recognizePlaylistsOfUser = void 0;
const moment_1 = __importDefault(require("moment"));
const spotifyApi_1 = require("../../spotifyApi");
const db_1 = __importDefault(require("../../db"));
const types_1 = require("../../types");
const logger_1 = __importStar(require("../../utils/logger"));
const config_1 = require("../../config");
const logger = new logger_1.default(logger_1.DEBUG.WARN, '/handlers/playlists');
const asString = (value) => Array.isArray(value) ? value[0] : value;
const asNumberOrNull = (value) => {
    const str = asString(value);
    if (!str) {
        return null;
    }
    const parsed = Number(str);
    return Number.isFinite(parsed) ? parsed : null;
};
/**
 * Sync the user's playlists against Spotify and return counts of changes.
 */
const recognizePlaylistsOfUser = (user) => {
    const db = db_1.default.getInstance();
    const spotify = (0, spotifyApi_1.getSpotify)(user);
    return new Promise((res, rej) => {
        types_1.Playlist.getMany(0, 50, spotify)
            .then((spotifyPlaylists) => {
            const usersOwnPlaylists = spotifyPlaylists
                .filter((p) => p.owner.id === user.spotifyId)
                .filter((p, i, ps) => {
                // De-duplicate playlists with the same ID to prevent DB conflicts.
                const ret = ps.findIndex((o) => o.id === p.id) === i;
                if (!ret) {
                    logger.warn(`The user ${user.displayName} has two playlists with the id=${p.id} ("${p.name}")`);
                }
                return ret;
            });
            const insertPromise = new Promise((res, rej) => {
                db.playlist
                    .filterUnknown(usersOwnPlaylists)
                    .then((notYetInserted) => {
                    if (notYetInserted.length === 0) {
                        res(0);
                    }
                    else {
                        const playlists = notYetInserted.map((p) => types_1.Playlist.fromApiObj(p));
                        db.playlist.insert(playlists).then(res).catch(rej);
                    }
                })
                    .catch(rej);
            });
            const deletePromise = new Promise((res, rej) => {
                db.user
                    .getPlaylists(user)
                    .then((usersPlaylists) => {
                    const spotifyListIds = usersOwnPlaylists.map((p) => p.id);
                    const toDelete = usersPlaylists.filter((p) => !spotifyListIds.includes(p.spotifyId));
                    if (toDelete.length === 0) {
                        res(0);
                    }
                    else {
                        db.playlist.delete(toDelete).then(res).catch(rej);
                    }
                })
                    .catch(rej);
            });
            Promise.all([insertPromise, deletePromise])
                .then(([newPlaylists, deletedPlaylists]) => {
                res({ newPlaylists, deletedPlaylists });
            })
                .catch(rej);
        })
            .catch(rej);
    });
};
exports.recognizePlaylistsOfUser = recognizePlaylistsOfUser;
/**
 * Render the server-side playlists view (legacy UI).
 */
const playlistsView = (req, res, next) => {
    const db = db_1.default.getInstance();
    const user = types_1.User.fromExpress(req.user);
    const newOnes = asString(req.query.newOnes);
    const deleted = asString(req.query.deleted);
    const recognizeRes = newOnes && deleted ? { newPlaylists: newOnes, deletedPlaylists: deleted } : undefined;
    db.user
        .getPlaylists(user, 'lexicographic_az')
        .then((playlists) => {
        res.render('playlists.html', { user, playlists, recognizeRes });
    })
        .catch(next);
};
exports.playlistsView = playlistsView;
/**
 * Render the playlist edit screen (legacy UI).
 */
const editPlaylistView = (req, res, next) => {
    const id = asString(req.params.id);
    if (!id) {
        res.status(400).send('Missing playlist id');
        return;
    }
    const user = types_1.User.fromExpress(req.user);
    const db = db_1.default.getInstance();
    db.playlist
        .get(id)
        .then((p) => p
        .refresh(user.credentials, true)
        .then((p) => db.user
        .getPlaylists(user, 'lexicographic_az')
        .then((playlists) => {
        var _a, _b, _c;
        return res.render('edit.html', {
            name: p.name,
            oldestTrack: {
                date: p.oldestTrack.format('DD.MM.YYYY'),
                duration: (0, moment_1.default)().diff(p.oldestTrack, 'd'),
            },
            numberOfTracks: p.numberOfTracks,
            maxAge: (_a = p.maxTrackAge) !== null && _a !== void 0 ? _a : '',
            maxTracks: (_b = p.maxTracks) !== null && _b !== void 0 ? _b : '',
            discardPlaylist: (_c = p.discardPlaylist) !== null && _c !== void 0 ? _c : '',
            playlists: playlists.filter((x) => x.spotifyId !== p.spotifyId),
        });
    })
        .catch(next))
        .catch(next))
        .catch(next);
};
exports.editPlaylistView = editPlaylistView;
/**
 * Persist updated playlist cleanup settings.
 */
const submitEditPlaylist = (req, res, next) => {
    const id = asString(req.params.id);
    if (!id) {
        res.status(400).send('Missing playlist id');
        return;
    }
    const user = types_1.User.fromExpress(req.user);
    const maxAge = asNumberOrNull(req.body.maxAge);
    const maxTracks = asNumberOrNull(req.body.maxTracks);
    const discardPlaylist = asString(req.body.discardPlaylist);
    const db = db_1.default.getInstance();
    db.playlist
        .get(id)
        .then((p) => db.playlist
        .update({
        spotifyId: id,
        maxTrackAge: maxAge,
        maxTracks: maxTracks,
        discardPlaylist: discardPlaylist ? discardPlaylist : null,
    }, user)
        .then(() => res.redirect((0, config_1.buildServerPath)('/playlists')))
        .catch(next))
        .catch(next);
};
exports.submitEditPlaylist = submitEditPlaylist;
/**
 * Sync playlists and redirect with the result counts (legacy UI).
 */
const recognize = (req, res, next) => {
    (0, exports.recognizePlaylistsOfUser)(types_1.User.fromExpress(req.user))
        .then(({ newPlaylists, deletedPlaylists }) => res.redirect((0, config_1.buildServerPath)('/playlists') + '?newOnes=' + newPlaylists + '&deleted=' + deletedPlaylists))
        .catch(next);
};
exports.recognize = recognize;
