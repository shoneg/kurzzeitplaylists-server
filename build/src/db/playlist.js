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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const moment_1 = __importDefault(require("moment"));
const types_1 = require("../types");
const logger_1 = __importStar(require("../utils/logger"));
const logger = new logger_1.default(logger_1.DEBUG.WARN, '/db/playlist');
class Playlist {
    constructor(pool) {
        this.pool = pool;
    }
    static model2Playlist(dbPlaylist) {
        const { discardPlaylist, maxTrackAge, maxTracks, oldestTrack, owner: ownerId } = dbPlaylist, rest = __rest(dbPlaylist, ["discardPlaylist", "maxTrackAge", "maxTracks", "oldestTrack", "owner"]);
        const f = (v) => v !== null && v !== void 0 ? v : undefined;
        const playlist = new types_1.Playlist(Object.assign(Object.assign({}, rest), { discardPlaylist: f(discardPlaylist), maxTrackAge: f(maxTrackAge), maxTracks: f(maxTracks), oldestTrack: (0, moment_1.default)(oldestTrack), ownerId }));
        return playlist;
    }
    filterUnknown(playlists) {
        let query = `
      SELECT * FROM playlist WHERE spotifyId IN (
    `;
        for (let i = 0; i < playlists.length; i++) {
            query += '?, ';
        }
        query = query.substring(0, query.length - 2) + ')';
        const idList = playlists.map((p) => p.id);
        return new Promise((res, rej) => {
            this.pool
                .query(query, idList)
                .then((results) => {
                const foundIDs = results[0].map((f) => f.spotifyId);
                const ret = playlists.filter((p) => !foundIDs.includes(p.id));
                res(ret);
            })
                .catch((err) => {
                logger.error('Got an unexpected error while looking for known playlists:', err);
                rej('Unexpectedly we got an Error while filtering the playlists');
            });
        });
    }
    get(id) {
        return new Promise((res, rej) => {
            this.pool
                .query('SELECT * FROM playlist WHERE spotifyId = ?', [id])
                .then((queryResult) => {
                const count = queryResult[0].length;
                if (count >= 1) {
                    if (count > 1) {
                        logger.warn(`There were found ${count} playlists with id='${id}'`);
                    }
                    const dbPlaylist = queryResult[0][0];
                    const playlist = Playlist.model2Playlist(dbPlaylist);
                    res(playlist);
                }
                else {
                    logger.info(`no playlist found for id='${id}'`);
                    rej('Cannot find playlist');
                }
            })
                .catch((err) => {
                logger.error(`Got an unexpected error while getting playlist with id='${id}':`, err);
                rej('Error while querying playlist');
            });
        });
    }
    /**
     * @returns number of added rows
     */
    insert(playlists) {
        let insertQuery = `
    INSERT INTO playlist (
      name,
      numberOfTracks,
      oldestTrack,
      owner,
      spotifyId
    )
    VALUES `;
        let insertValues = [];
        playlists.forEach((p) => {
            const { name, numberOfTracks, oldestTrack, ownerId, spotifyId } = p;
            insertQuery += ' (?, ?, ?, ?, ? ),';
            insertValues.push(name, numberOfTracks, oldestTrack.toDate(), ownerId, spotifyId);
        });
        insertQuery = insertQuery.substring(0, insertQuery.length - 1);
        return new Promise((res, rej) => {
            this.pool
                .query(insertQuery, insertValues)
                .then((insertResult) => {
                res(insertResult[0].affectedRows);
            })
                .catch((err) => {
                logger.error('While inserting playlists we got an unexpected error:', err);
                rej(err);
            });
        });
    }
    update(playlist, user) {
        const { discardPlaylist, maxTrackAge, maxTracks, name, numberOfTracks, oldestTrack, spotifyId } = playlist;
        const shouldUpdate = [discardPlaylist, maxTrackAge, maxTracks, name, numberOfTracks, oldestTrack].some((value) => value !== undefined);
        if (shouldUpdate) {
            const userId = typeof user == 'string' ? user : user === null || user === void 0 ? void 0 : user.spotifyId;
            let query = 'UPDATE playlist SET ';
            let values = [];
            [
                { v: discardPlaylist, n: 'discardPlaylist' },
                { v: maxTrackAge, n: 'maxTrackAge' },
                { v: maxTracks, n: 'maxTracks' },
                { v: name, n: 'name' },
                { v: numberOfTracks, n: 'numberOfTracks' },
                { v: oldestTrack === null || oldestTrack === void 0 ? void 0 : oldestTrack.toDate(), n: 'oldestTrack' },
            ].forEach(({ v, n }) => {
                if (v !== undefined) {
                    query += n + ' = ?, ';
                    values.push(v);
                }
            });
            query = query.substring(0, query.length - 2) + ' WHERE spotifyId = ?';
            values.push(spotifyId);
            if (userId) {
                query += 'AND owner = ?';
                values.push(userId);
            }
            return new Promise((res, rej) => {
                this.pool
                    .query(query, values)
                    .then((updateResult) => {
                    const { affectedRows } = updateResult[0];
                    if (affectedRows >= 1) {
                        if (affectedRows > 1) {
                            logger.warn(`Instead of 1 row, we've updated ${affectedRows}`);
                        }
                        this.get(playlist.spotifyId).then(res).catch(rej);
                    }
                    else {
                        logger.warn('We did inserted 0 instead of 1 row into playlist');
                        rej('Could not find playlist');
                    }
                })
                    .catch((err) => {
                    logger.error(`Got an unexpected error while updating playlist with id='${spotifyId}':`, err);
                    rej('Error while updating');
                });
            });
        }
        else {
            return this.get(playlist.spotifyId);
        }
    }
    /**
     * @returns number of deleted rows
     */
    delete(playlists) {
        return new Promise((res, rej) => {
            let deleteQuery = 'DELETE FROM playlist WHERE spotifyId IN (';
            for (let i = 0; i < playlists.length; i++) {
                deleteQuery += '?, ';
            }
            deleteQuery = deleteQuery.substring(0, deleteQuery.length - 2) + ')';
            const deleteIds = playlists.map((p) => p.spotifyId);
            this.pool
                .query(deleteQuery, deleteIds)
                .then((deleteResult) => {
                res(deleteResult[0].affectedRows);
            })
                .catch((err) => {
                logger.error('While deleting playlists we got an unexpected error:', err);
                rej(err);
            });
        });
    }
    /**
     * Queries all the playlist where maxTrackAge less than the oldest Track
     * or maxTracks is set.
     */
    getTrackDeletionCandidates() {
        return new Promise((res, rej) => {
            this.pool
                .query('SELECT * FROM playlist WHERE maxTracks IS NOT NULL OR ( maxTrackAge IS NOT NULL AND oldestTrack < DATE_SUB( NOW(), INTERVAL maxTrackAge DAY ) )')
                .then((queryResult) => {
                const dbPlaylists = queryResult[0];
                const playlists = dbPlaylists.map((p) => Playlist.model2Playlist(p));
                res(playlists);
            })
                .catch((err) => {
                logger.error('Got an unexpected error while getting track deletion candidates:', err);
                rej('Error while querying deletion candidates');
            });
        });
    }
}
exports.default = Playlist;
