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
const _1 = __importDefault(require("."));
const types_1 = require("../types");
const logger_1 = __importStar(require("../utils/logger"));
const playlist_1 = __importDefault(require("./playlist"));
const logger = new logger_1.default(logger_1.DEBUG.WARN, '/db/user');
class User {
    constructor(pool) {
        this.pool = pool;
    }
    static model2User(dbUser) {
        const db = _1.default.getInstance();
        const { displayName, spotifyId } = dbUser;
        return new Promise((res, rej) => {
            db.credentials
                .get(spotifyId)
                .then((credentials) => {
                const user = new types_1.User(credentials, displayName, spotifyId);
                res(user);
            })
                .catch(rej);
        });
    }
    insert(user) {
        const { credentials, displayName, spotifyId } = user;
        const db = _1.default.getInstance();
        return new Promise((res, rej) => {
            db.credentials
                .insert(credentials, spotifyId)
                .then(() => {
                this.pool
                    .query('INSERT INTO user (displayName,spotifyId,credentialsId)VALUES ( ?, ?, ? )', [displayName, spotifyId, spotifyId])
                    .then((insertionResult) => {
                    const { affectedRows } = insertionResult[0];
                    if (affectedRows === 1) {
                        res();
                    }
                    else {
                        logger.warn(`unexpectedly ${affectedRows} rows where inserted into user instead of 1.`);
                        res();
                    }
                })
                    .catch((err) => {
                    logger.error('Got error while inserting user:', err);
                    rej("Couldn't insert user");
                });
            })
                .catch(rej);
        });
    }
    exist(id) {
        return new Promise((res) => this.pool
            .query('SELECT * FROM user WHERE spotifyId = ?', [id])
            .then((result) => {
            const count = result[0].length;
            if (count >= 1) {
                if (count > 1) {
                    logger.warn(`Seems like there's ${count} (more than 1) user with id '${id}'`);
                }
                const dbUser = result[0][0];
                const user = User.model2User(dbUser);
                res(user);
            }
            else {
                res(false);
            }
        })
            .catch((err) => {
            logger.error('Got an unexpected error while looking for user:', err);
            res(false);
        }));
    }
    get(id) {
        return new Promise((res, rej) => {
            this.pool
                .query('SELECT * FROM user WHERE spotifyId = ?', [id])
                .then((queryResult) => {
                const count = queryResult[0].length;
                if (count >= 1) {
                    if (count > 1) {
                        logger.warn(`There were found ${count} users with id='${id}'`);
                    }
                    const dbUser = queryResult[0][0];
                    User.model2User(dbUser).then(res).catch(rej);
                }
                else {
                    logger.info(`no user found for id='${id}'`);
                    rej('Cannot find user');
                }
            })
                .catch((err) => {
                logger.error(`Got an unexpected error while getting user with id='${id}':`, err);
                rej('Error while querying user');
            });
        });
    }
    update(user) {
        const db = _1.default.getInstance();
        const { spotifyId, displayName, credentials = {} } = user;
        return new Promise((res, rej) => {
            db.credentials
                .update(credentials, spotifyId)
                .then(() => {
                if (displayName) {
                    this.pool
                        .query('UPDATE user SET displayName = ? WHERE spotifyId = ?', [displayName, spotifyId])
                        .then((result) => {
                        const { affectedRows } = result[0];
                        if (affectedRows >= 1) {
                            if (affectedRows > 1) {
                                logger.error(`Seems like there's ${affectedRows} (more than 1) user with id '${spotifyId}', now all the false one have wrong credentials`);
                            }
                            db.user.get(spotifyId).then(res).catch(rej);
                        }
                        else {
                            logger.warn(`Tried to update not existing user with id='${spotifyId}'`);
                            rej('Could not find user');
                        }
                    })
                        .catch((err) => {
                        logger.error(`Unexpectedly we couldn't update user with id='${spotifyId}' and got error:`, err);
                        rej(`Couldn't update user, got an error`);
                    });
                }
                else {
                    db.user.get(spotifyId).then(res).catch(rej);
                }
            })
                .catch(rej);
        });
    }
    getPlaylists(user, sort) {
        let userId;
        if (typeof user === 'string') {
            userId = user;
        }
        else {
            userId = user.spotifyId;
        }
        return new Promise((res, rej) => {
            this.pool
                .query('SELECT * FROM playlist WHERE owner = ?', [userId])
                .then((result) => {
                const dbPlaylists = result[0];
                const playlists = dbPlaylists.map(playlist_1.default.model2Playlist);
                if (sort) {
                    const sorted = types_1.Playlist.sortLexicographic(playlists, sort.split('_')[1]);
                    res(sorted);
                }
                else {
                    res(playlists);
                }
            })
                .catch((err) => {
                logger.error(`Got an unexpected error while getting playlists of user with id='${userId}':`, err);
                rej('Cannot get playlists');
            });
        });
    }
    delete(user) {
        const db = _1.default.getInstance();
        const id = user.spotifyId;
        return new Promise((res, rej) => {
            this.pool
                .query('DELETE FROM user WHERE spotifyId = ?', [id])
                .then((deleteResult) => {
                const { affectedRows } = deleteResult[0];
                if (affectedRows >= 1) {
                    if (affectedRows > 1) {
                        logger.error(`Seems like there were ${affectedRows} (more than 1) user with id '${id}', now we've deleted all of theme… ups`);
                    }
                    db.credentials.delete(id).then(res).catch(rej);
                }
                else {
                    logger.warn(`Tried to delete not existing user with id='${id}'`);
                    rej('Could not find user');
                }
            })
                .catch((err) => {
                logger.error(`Got an unexpected error while deleting user with id='${id}':`, err);
                rej('Cannot delete user');
            });
        });
    }
}
exports.default = User;
