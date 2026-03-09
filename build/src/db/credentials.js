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
const logger = new logger_1.default(logger_1.DEBUG.WARN, '/db/credentials');
class Credentials {
    constructor(pool) {
        this.pool = pool;
    }
    static model2Credentials(credentials) {
        const { accessToken, expiresAt, refreshToken, userId } = credentials;
        const ret = new types_1.SpotifyCredentials(accessToken, expiresAt, refreshToken, userId);
        return ret;
    }
    get(userId) {
        return new Promise((res, rej) => {
            this.pool
                .query('SELECT * FROM credentials WHERE userId = ?', [userId])
                .then((queryResult) => {
                const count = queryResult[0].length;
                if (count >= 1) {
                    if (count > 1) {
                        logger.warn(`Got ${count} instead of 1 credentials for id='${userId}'`);
                    }
                    const credentials = Credentials.model2Credentials(queryResult[0][0]);
                    res(credentials);
                }
                else {
                    rej(`Could not find credentials with id='${userId}'`);
                }
            })
                .catch((err) => {
                logger.error('Got an unexpected error while looking for credentials:', err);
                rej('Got error while querying');
            });
        });
    }
    getAllExpiresBefore(expiresBefore) {
        return new Promise((res, rej) => {
            this.pool
                .query('SELECT * FROM credentials WHERE expiresAt < ?', [expiresBefore.toDate()])
                .then((queryResult) => {
                const dbCredentials = queryResult[0];
                const credentialPromises = dbCredentials.map(Credentials.model2Credentials);
                Promise.all(credentialPromises).then(res).catch(rej);
            })
                .catch((err) => {
                logger.error('Got an unexpected error while getting credentials:', err);
                rej('Error while querying credentials');
            });
        });
    }
    insert(credentials, ownerId) {
        const { accessToken, expiresAt, refreshToken } = credentials;
        return new Promise((res, rej) => {
            this.pool
                .query(`INSERT INTO credentials (accessToken, expiresAt, refreshToken, userId)
        VALUES ( ?, ?, ?, ? )`, [accessToken, expiresAt.toDate(), refreshToken, ownerId])
                .then((insertionResult) => {
                const { affectedRows } = insertionResult[0];
                if (affectedRows >= 1) {
                    if (affectedRows > 1) {
                        logger.warn(`Instead of 1 row, we've inserted ${affectedRows}`);
                    }
                    res();
                }
                else {
                    logger.warn('We have inserted 0 instead of 1 row into credentials');
                    rej();
                }
            })
                .catch((err) => {
                logger.error('Got an unexpected error while inserting credentials:', err);
                rej('Insertion failed unexpected');
            });
        });
    }
    update(credentials, userId) {
        const db = _1.default.getInstance();
        const { accessToken, expiresAt, refreshToken } = credentials;
        if (accessToken || expiresAt || refreshToken) {
            let query = 'UPDATE credentials SET ';
            let values = [];
            [
                { v: accessToken, n: 'accessToken' },
                { v: expiresAt === null || expiresAt === void 0 ? void 0 : expiresAt.toDate(), n: 'expiresAt' },
                { v: refreshToken, n: 'refreshToken' },
            ].forEach(({ v, n }) => {
                if (v) {
                    query += n + ' = ?, ';
                    values.push(v);
                }
            });
            query = query.substring(0, query.length - 2) + ' WHERE userId = ?';
            values.push(userId);
            return new Promise((res, rej) => {
                this.pool
                    .query(query, values)
                    .then((updateResult) => {
                    const { affectedRows } = updateResult[0];
                    if (affectedRows >= 1) {
                        if (affectedRows > 1) {
                            logger.warn(`Instead of 1 row, we've updated ${affectedRows}`);
                        }
                        db.credentials.get(userId).then(res).catch(rej);
                    }
                    else {
                        logger.warn('We have updated 0 instead of 1 row of credentials');
                        rej('Could not find credentials');
                    }
                })
                    .catch((err) => {
                    logger.error(`Got an unexpected error while updating credentials with id='${userId}':`, err);
                    rej('Error while updating');
                });
            });
        }
        else {
            return db.credentials.get(userId);
        }
    }
    delete(ownerId) {
        return new Promise((res, rej) => {
            this.pool
                .query('DELETE FROM credentials WHERE userId = ?', [ownerId])
                .then((deleteResult) => {
                const { affectedRows } = deleteResult[0];
                if (affectedRows >= 1) {
                    if (affectedRows > 1) {
                        logger.error(`Seems like there were ${affectedRows} (more than 1) credentials with id '${ownerId}', now we've deleted all of theme… ups`);
                    }
                    res();
                }
                else {
                    logger.warn(`Tried to delete not existing credentials with id='${ownerId}'`);
                    rej('Could not find credentials');
                }
            })
                .catch((err) => {
                logger.error(`Got an unexpected error while deleting credentials with id='${ownerId}':`, err);
                rej('Cannot delete credentials');
            });
        });
    }
}
exports.default = Credentials;
