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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const moment_1 = __importDefault(require("moment"));
const db_1 = __importDefault(require("../db"));
const spotifyApi_1 = require("../spotifyApi");
const logger_1 = __importStar(require("../utils/logger"));
const logger = new logger_1.default(logger_1.DEBUG.WARN, '/types/playlist');
/**
 * Playlist domain model with Spotify sync helpers.
 */
class Playlist {
    //* getter, setter
    get discardPlaylist() {
        return this._discardPlaylist;
    }
    set discardPlaylist(value) {
        this._discardPlaylist = value;
    }
    get maxTrackAge() {
        return this._maxTrackAge;
    }
    set maxTrackAge(value) {
        this._maxTrackAge = value;
    }
    get maxTracks() {
        return this._maxTracks;
    }
    set maxTracks(value) {
        this._maxTracks = value;
    }
    get name() {
        return this._name;
    }
    set name(value) {
        this._name = value;
    }
    get numberOfTracks() {
        return this._numberOfTracks;
    }
    set numberOfTracks(value) {
        this._numberOfTracks = value;
    }
    get oldestTrack() {
        return this._oldestTrack;
    }
    set oldestTrack(value) {
        this._oldestTrack = value;
    }
    get ownerId() {
        return this._ownerId;
    }
    get spotifyId() {
        return this._spotifyId;
    }
    // * constructors
    constructor({ discardPlaylist, maxTrackAge, maxTracks, name, numberOfTracks, oldestTrack, ownerId, spotifyId, }) {
        this._discardPlaylist = discardPlaylist;
        this._maxTrackAge = maxTrackAge;
        this._maxTracks = maxTracks;
        this._name = name;
        this._numberOfTracks = numberOfTracks;
        this._oldestTrack = oldestTrack;
        this._ownerId = ownerId;
        this._spotifyId = spotifyId;
    }
    /**
     * Compare playlists by name (A-Z).
     */
    static compareLexicographic(p1, p2) {
        return p1._name.localeCompare(p2.name);
    }
    /**
     * Sort playlists lexicographically in ascending or descending order.
     */
    static sortLexicographic(playlists, order) {
        const az = [...playlists].sort(this.compareLexicographic);
        if (order === 'az') {
            return az;
        }
        return az.reverse();
    }
    /**
     * Build a Playlist from Spotify's simplified playlist response.
     */
    static fromApiObj(simplePlaylist, oldestTrackValue = (0, moment_1.default)()) {
        const { name, tracks, owner, id } = simplePlaylist;
        const playlist = new _a({
            name,
            numberOfTracks: tracks.total,
            oldestTrack: oldestTrackValue,
            ownerId: owner.id,
            spotifyId: id,
        });
        return playlist;
    }
    //* methods
    /**
     * Refresh playlist metadata and optionally oldest track info.
     */
    refresh(credentials, includeOldestTrack = false) {
        const spotify = (0, spotifyApi_1.getSpotify)(credentials);
        const db = db_1.default.getInstance();
        return spotify
            .getPlaylist(this._spotifyId, {
            fields: `name,tracks(total${includeOldestTrack ? ',items(added_at),next' : ''})`,
        })
            .then((data) => __awaiter(this, void 0, void 0, function* () {
            const { name, tracks } = data.body;
            const { total, items, next } = tracks;
            let allItems = items;
            if (next) {
                const nextOffset = new URL(next).searchParams.get('offset');
                const nextLimit = new URL(next).searchParams.get('limit');
                if (nextOffset && nextLimit) {
                    const moreItems = yield _a.getTracks(spotify, this._spotifyId, parseInt(nextOffset), parseInt(nextLimit));
                    allItems = allItems.concat(moreItems);
                }
            }
            let oldestTrackDate = (0, moment_1.default)();
            if (includeOldestTrack) {
                // Identify the oldest `added_at` entry across all items.
                allItems.forEach((i) => {
                    const addedAt = (0, moment_1.default)(i.added_at);
                    if (addedAt.isBefore(oldestTrackDate)) {
                        oldestTrackDate = addedAt;
                    }
                });
            }
            return db.playlist.update({
                spotifyId: this._spotifyId,
                name: name !== this._name ? name : undefined,
                numberOfTracks: total !== this._numberOfTracks ? total : undefined,
                oldestTrack: includeOldestTrack ? oldestTrackDate : undefined,
            });
        }));
    }
}
_a = Playlist;
//* static methods
/**
 * Fetch all tracks for a playlist, handling pagination.
 */
Playlist.getTracks = (spotify, id, offset = 0, limit = 50, itemFields = 'added_at', market) => {
    return spotify
        .getPlaylistTracks(id, { offset, limit, market, fields: `items(${itemFields}),next` })
        .then((result) => {
        var _b;
        if (result.statusCode !== 200) {
            const body = result.body;
            return Promise.reject(`Got statusCode=${result.statusCode} from spotify with message='${(_b = body === null || body === void 0 ? void 0 : body.error) === null || _b === void 0 ? void 0 : _b.message}'`);
        }
        const nextURL = result.body.next;
        if (!nextURL) {
            return result.body.items;
        }
        const nextOffset = new URL(nextURL).searchParams.get('offset');
        const nextLimit = new URL(nextURL).searchParams.get('limit');
        if (!nextOffset || !nextLimit) {
            return Promise.reject(`nextURL='${nextURL}' doesn't contain nextOffset (${nextOffset}) or nextLimit (${nextLimit})`);
        }
        return _a.getTracks(spotify, id, parseInt(nextOffset), parseInt(nextLimit), itemFields, market).then((nextResult) => nextResult.concat(result.body.items));
    });
};
/**
 * Fetch all playlists for the current user, handling pagination.
 */
Playlist.getMany = (offset = 0, limit = 50, spotify) => {
    return spotify.getUserPlaylists({ offset, limit }).then((result) => {
        var _b;
        if (result.statusCode !== 200) {
            const body = result.body;
            return Promise.reject(`Got statusCode=${result.statusCode} from spotify with message='${(_b = body === null || body === void 0 ? void 0 : body.error) === null || _b === void 0 ? void 0 : _b.message}'`);
        }
        const nextURL = result.body.next;
        if (!nextURL) {
            return result.body.items;
        }
        const nextOffset = new URL(nextURL).searchParams.get('offset');
        const nextLimit = new URL(nextURL).searchParams.get('limit');
        if (!nextOffset || !nextLimit) {
            return Promise.reject(`nextURL='${nextURL}' doesn't contain nextOffset (${nextOffset}) or nextLimit (${nextLimit})`);
        }
        return _a.getMany(parseInt(nextOffset), parseInt(nextLimit), spotify).then((nextResult) => nextResult.concat(result.body.items));
    });
};
exports.default = Playlist;
